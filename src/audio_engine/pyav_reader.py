import subprocess
import tempfile
from pathlib import Path

from src.config import config
from src.core.exceptions import AudioExtractionError
from src.core.logging_config import get_logger


def extract_audio(video_path: str | Path, log=None) -> str:
    log = log or get_logger()
    video_path = Path(video_path)
    if not video_path.exists():
        raise AudioExtractionError(f"Video file not found: {video_path}")

    temp_dir = Path(config.audio_temp_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)
    output_path = temp_dir / f"{video_path.stem}.wav"

    if output_path.exists():
        log.info("audio_cache_hit", path=str(output_path))
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
    log.info("extracting_audio", cmd=" ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise AudioExtractionError(f"ffmpeg failed: {result.stderr}")
    log.info("audio_extracted", path=str(output_path))
    return str(output_path)


def extract_iframes(video_path: str | Path, timestamps: list[float], log=None) -> list[dict]:
    log = log or get_logger()
    log.info("extracting_iframes", count=len(timestamps))
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
        result = subprocess.run(cmd, capture_output=True, timeout=30)
        if result.returncode != 0:
            log.warning("iframe_extract_failed", timestamp=ts, stderr=result.stderr[:200])
            continue
        frames.append({"timestamp_sec": ts, "path": frame_path})
    return frames
