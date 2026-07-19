import asyncio
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse

from src.api.metrics import (
    jobs_active,
    jobs_total,
    processing_duration_seconds,
    scenes_total,
    vlm_calls_total,
)
from src.core.logging_config import get_logger
from src.core.schemas import (
    AnalyzeResponse,
    AnalyzeResultResponse,
    AnalyzeStatusResponse,
    JobMetrics,
    JobResult,
    JobStatus,
)

router = APIRouter()

_jobs: dict[str, JobResult] = {}


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())[:8]
    log = get_logger(correlation_id=job_id)
    log.info("job_created", filename=file.filename)

    temp_dir = Path("/tmp/rutube-jobs") / job_id
    temp_dir.mkdir(parents=True, exist_ok=True)
    filename = file.filename or "video.mp4"
    video_path = temp_dir / filename

    content = await file.read()
    video_path.write_bytes(content)
    log.info("video_saved", path=str(video_path), size_mb=round(len(content) / 1e6, 2))
    del content

    _jobs[job_id] = JobResult(job_id=job_id, status=JobStatus.pending)
    jobs_total.labels(status="pending").inc()
    jobs_active.inc()

    asyncio.create_task(_run_pipeline(job_id, str(video_path), log))

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


async def _run_pipeline(job_id: str, video_path: str, log) -> None:
    # Lazy imports — heavy dependencies loaded only at runtime
    from src.audio_engine.pyannote_diarization import diarize
    from src.audio_engine.pyav_reader import extract_audio, extract_iframes
    from src.audio_engine.timeline_merger import merge
    from src.audio_engine.whisper_asr import transcribe
    from src.passport_builder.passport_builder import build_passport
    from src.semantic_analyzer.scene_analyzer import analyze_scenes
    from src.vision_scanner.domain_router import detect_genre, is_vision_blocked
    from src.vision_scanner.ocr_buffer import OCRBuffer
    from src.vision_scanner.rapid_ocr import process_frames

    pipeline_start = time.monotonic()
    _jobs[job_id].status = JobStatus.processing

    try:
        log.info("pipeline_started")

        audio_path = extract_audio(video_path, log=log)

        asr_segments = transcribe(audio_path, log=log)

        speaker_segments = diarize(audio_path, log=log)

        timeline = merge(asr_segments, speaker_segments, log=log)

        timestamps = [(s.start_sec + s.end_sec) / 2 for s in timeline]
        frames = extract_iframes(video_path, timestamps, log=log)
        iframe_map = {f["timestamp_sec"]: f["path"] for f in frames}

        ocr_results = process_frames(frames, log=log)
        ocr_buffer = OCRBuffer()
        ocr_buffer.feed(ocr_results)

        full_asr_text = "\n".join(s.text for s in timeline if s.text)
        genre = await detect_genre(
            full_asr_text=full_asr_text or Path(video_path).stem,
            log=log,
        )

        scene_results, vlm_count = await analyze_scenes(
            timeline=timeline,
            genre=genre.value,
            vision_blocked=is_vision_blocked(genre),
            ocr_buffer=ocr_buffer,
            iframe_map=iframe_map,
            log=log,
        )

        passport = await build_passport(
            video_id=Path(video_path).stem,
            timeline_segments=timeline,
            scene_results=scene_results,
            log=log,
        )

        total_sec = time.monotonic() - pipeline_start
        ad_count = sum(1 for s in scene_results if s.ad_slot is not None)
        ecom_count = sum(len(s.monetization) for s in scene_results)
        clip_count = sum(1 for s in scene_results if s.clip_candidate is not None)
        fallbacks = sum(1 for s in scene_results if s.fallback_used is not None)

        metrics = JobMetrics(
            video_duration_sec=sum(s.end_sec - s.start_sec for s in timeline) if timeline else 0,
            processing_time_sec=total_sec,
            total_scenes=len(scene_results),
            vlm_calls=vlm_count,
            vlm_percent=round(vlm_count / len(scene_results) * 100, 2) if scene_results else 0,
            ad_slots=ad_count,
            ecom_items=ecom_count,
            clip_candidates=clip_count,
            fallbacks_used=fallbacks,
        )

        _jobs[job_id] = JobResult(
            job_id=job_id,
            status=JobStatus.done,
            passport=passport,
            metrics=metrics,
        )
        jobs_total.labels(status="done").inc()

        processing_duration_seconds.observe(total_sec)
        scenes_total.inc(len(scene_results))
        for _ in range(vlm_count):
            vlm_calls_total.inc()

        log.info("pipeline_completed",
            duration_sec=round(total_sec, 2),
            scenes=len(scene_results),
            vlm_pct=metrics.vlm_percent,
        )

    except asyncio.CancelledError:
        log.warning("pipeline_cancelled")
        _jobs[job_id].status = JobStatus.error
        _jobs[job_id].error = "Pipeline cancelled"
        jobs_total.labels(status="error").inc()
        raise

    except Exception as e:
        log.error("pipeline_failed", error=str(e))
        _jobs[job_id].status = JobStatus.error
        _jobs[job_id].error = str(e)
        jobs_total.labels(status="error").inc()

    finally:
        jobs_active.dec()
