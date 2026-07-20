import asyncio
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse

from src.api.metrics import jobs_active, jobs_total
from src.api.pipeline import run_pipeline
from src.core.logging_config import get_logger
from src.core.schemas import (
    AnalyzeResponse,
    AnalyzeResultResponse,
    AnalyzeStatusResponse,
    JobResult,
    JobStatus,
)
from src.core.store import MemoryStore

router = APIRouter()

_jobs: MemoryStore[JobResult] = MemoryStore()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())[:8]
    log = get_logger(correlation_id=job_id)
    log.info("[M-API][ROUTES][JOB_CREATED]", filename=file.filename)

    temp_dir = Path("/tmp/rutube-jobs") / job_id
    temp_dir.mkdir(parents=True, exist_ok=True)
    filename = file.filename or "video.mp4"
    video_path = temp_dir / filename

    content = await file.read()
    video_path.write_bytes(content)
    log.info("[M-API][ROUTES][VIDEO_SAVED]", path=str(video_path), size_mb=round(len(content) / 1e6, 2))
    del content

    _jobs[job_id] = JobResult(job_id=job_id, status=JobStatus.pending, updated_at=time.time())
    jobs_total.labels(status="pending").inc()
    jobs_active.inc()

    asyncio.create_task(run_pipeline(job_id, str(video_path), temp_dir, _jobs, log=log))

    return AnalyzeResponse(job_id=job_id)


@router.get("/analyze/{job_id}", response_model=AnalyzeResultResponse)
async def get_result(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return AnalyzeResultResponse(
        job_id=job.job_id,
        status=job.status,
        passport=job.passport,
        metrics=job.metrics,
        error=job.error,
    )


@router.get("/analyze/{job_id}/status", response_model=AnalyzeStatusResponse)
async def get_status(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return AnalyzeStatusResponse(
        job_id=job.job_id,
        status=job.status,
        metrics=job.metrics,
        error=job.error,
    )


@router.get("/analyze/{job_id}/markdown")
async def get_markdown(job_id: str):
    from src.passport_builder.passport_builder import passport_to_markdown

    job = _jobs.get(job_id)
    if not job or job.status != JobStatus.done or not job.passport:
        raise HTTPException(status_code=404, detail="Result not ready")
    md = passport_to_markdown(job.passport)
    return PlainTextResponse(md, media_type="text/markdown")
