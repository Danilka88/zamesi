import asyncio
import shutil
import time
from pathlib import Path

from src.api.metrics import (
    jobs_active,
    jobs_total,
    processing_duration_seconds,
    scenes_total,
    vlm_calls_total,
)
from src.core.logging_config import get_logger
from src.core.schemas import JobMetrics, JobResult, JobStatus
from src.core.store import MemoryStore


def _set_job(jobs: MemoryStore[JobResult], job_id: str, **kwargs):
    try:
        job = jobs[job_id]
    except KeyError:
        return
    for k, v in kwargs.items():
        setattr(job, k, v)
    job.updated_at = time.time()


async def _cleanup_expired_jobs(jobs: MemoryStore[JobResult], ttl_sec: int = 3600):
    while True:
        await asyncio.sleep(3600)
        jobs._ttl_sec = ttl_sec
        jobs.cleanup()


async def run_pipeline(
    job_id: str,
    video_path: str,
    temp_dir: Path,
    jobs: MemoryStore[JobResult],
    log=None,
) -> None:
    from src.audio_engine.diarization_speechbrain import diarize
    from src.audio_engine.pyav_reader import extract_audio, extract_iframes
    from src.audio_engine.timeline_merger import merge
    from src.audio_engine.whisper_asr import transcribe
    from src.passport_builder.passport_builder import build_passport, save_passport_to_disk
    from src.semantic_analyzer.scene_analyzer import analyze_scenes
    from src.vision_scanner.domain_router import detect_genre, is_vision_blocked
    from src.vision_scanner.ocr_buffer import OCRBuffer
    from src.vision_scanner.rapid_ocr import process_frames

    log = log or get_logger(correlation_id=job_id)
    pipeline_start = time.monotonic()
    jobs[job_id].status = JobStatus.processing

    try:
        log.info("[M-API][PIPELINE][START]")

        audio_path = await extract_audio(video_path, log=log)
        asr_segments = await transcribe(audio_path, log=log)
        speaker_segments = await diarize(audio_path, log=log)
        timeline = merge(asr_segments, speaker_segments, log=log)

        timestamps = [(s.start_sec + s.end_sec) / 2 for s in timeline]
        frames = await extract_iframes(video_path, timestamps, log=log)
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
        save_passport_to_disk(passport, log=log)

        total_sec = time.monotonic() - pipeline_start
        ad_count = sum(1 for s in scene_results if any(m.type == "ad_slot" for m in s.monetization))
        ecom_count = sum(1 for s in scene_results for m in s.monetization if m.type == "ecom_item")
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

        _set_job(jobs, job_id, status=JobStatus.done, passport=passport, metrics=metrics)
        jobs_total.labels(status="done").inc()

        processing_duration_seconds.observe(total_sec)
        scenes_total.inc(len(scene_results))
        for _ in range(vlm_count):
            vlm_calls_total.inc()

        log.info("[M-API][PIPELINE][DONE]",
            duration_sec=round(total_sec, 2),
            scenes=len(scene_results),
            vlm_pct=metrics.vlm_percent,
        )

    except asyncio.CancelledError:
        log.warning("[M-API][PIPELINE][CANCELLED]")
        _set_job(jobs, job_id, status=JobStatus.error, error="Pipeline cancelled")
        jobs_total.labels(status="error").inc()
        raise

    except Exception as e:
        log.error("[M-API][PIPELINE][FAILED]", error=str(e))
        _set_job(jobs, job_id, status=JobStatus.error, error=str(e))
        jobs_total.labels(status="error").inc()

    finally:
        jobs_active.dec()
        if str(temp_dir).startswith("/tmp/rutube-jobs/") and temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)
            log.info("[M-API][ROUTES][TEMP_CLEANED]", path=str(temp_dir))
