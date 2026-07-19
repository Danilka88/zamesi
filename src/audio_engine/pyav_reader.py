import asyncio
import os
import tempfile
from pathlib import Path

from src.config import config
from src.core.exceptions import AudioExtractionError
from src.core.logging_config import get_logger


async def _run_ffmpeg(cmd: list[str], timeout_sec: int, log) -> tuple[str, str]:
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout_sec)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise AudioExtractionError(f"ffmpeg timed out after {timeout_sec}s: {' '.join(cmd)}")

    if proc.returncode != 0:
        msg = stderr.decode("utf-8", errors="replace")
        raise AudioExtractionError(f"ffmpeg failed: {msg}")
    return stdout.decode("utf-8", errors="replace"), stderr.decode("utf-8", errors="replace")


# START_BLOCK: M-AUDIO/PYAV/EXTRACT_AUDIO
async def extract_audio(video_path: str | Path, log=None) -> str:
    log = log or get_logger()
    video_path = Path(video_path)
    if not video_path.exists():
        raise AudioExtractionError(f"Video file not found: {video_path}")

    temp_dir = Path(config.audio_temp_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)
    output_path = temp_dir / f"{video_path.stem}.wav"

    if output_path.exists():
        log.info("[M-AUDIO][PYAV][CACHE_HIT]", path=str(output_path))
        return str(output_path)

    cmd = [
        "ffmpeg",
        "-i", str(video_path),
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", str(config.audio_sample_rate),
        "-ac", "1",
        "-y",
        str(output_path),
    ]
    log.info("[M-AUDIO][PYAV][EXTRACT_START]", cmd=" ".join(cmd))
    await _run_ffmpeg(cmd, timeout_sec=120, log=log)
    log.info("[M-AUDIO][PYAV][EXTRACT_DONE]", path=str(output_path))
    return str(output_path)
# END_BLOCK: M-AUDIO/PYAV/EXTRACT_AUDIO


# START_BLOCK: M-AUDIO/PYAV/EXTRACT_IFRAMES
async def extract_iframes(video_path: str | Path, timestamps: list[float], log=None) -> list[dict]:
    log = log or get_logger()
    log.info("[M-AUDIO][PYAV][IFRAME_START]", count=len(timestamps))
    frames = []
    for ts in timestamps:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            frame_path = tmp.name
        cmd = [
            "ffmpeg",
            "-ss", str(ts),
            "-i", str(video_path),
            "-vframes", "1",
            "-q:v", "2",
            "-y",
            frame_path,
        ]
        try:
            await _run_ffmpeg(cmd, timeout_sec=30, log=log)
        except AudioExtractionError:
            log.warning("[M-AUDIO][PYAV][IFRAME_FAILED]", timestamp=ts)
            continue
        size = os.path.getsize(frame_path)
        if size == 0:
            log.warning("[M-AUDIO][PYAV][IFRAME_EMPTY]", timestamp=ts)
            os.unlink(frame_path)
            continue
        frames.append({"timestamp_sec": ts, "path": frame_path})
    return frames
# END_BLOCK: M-AUDIO/PYAV/EXTRACT_IFRAMES
