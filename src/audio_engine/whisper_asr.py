import json
import subprocess
from pathlib import Path

from src.config import config
from src.core.exceptions import ASRError
from src.core.logging_config import get_logger
from src.core.schemas import TimelineSegment, WordTimestamp


def transcribe(audio_path: str | Path, log=None) -> list[TimelineSegment]:
    log = log or get_logger()
    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise ASRError(f"Audio file not found: {audio_path}")

    output_path = audio_path.with_suffix(".json")
    cmd = [
        config.whisper_binary,
        "-m", config.whisper_model,
        "-f", str(audio_path),
        "--language", "ru",
        "--word-timestamps", "True",
        "--output-json",
        "-of", str(output_path.with_suffix("")),
    ]
    log.info("whisper_start", cmd=" ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=config.timeout("whisper_asr"))
    if result.returncode != 0:
        raise ASRError(f"whisper.cpp failed: {result.stderr}")

    json_path = output_path
    if not json_path.exists():
        json_path = audio_path.parent / f"{audio_path.stem}.json"
    if not json_path.exists():
        raise ASRError("whisper.cpp output JSON not found")

    with open(json_path) as f:
        data = json.load(f)

    segments = []
    for seg in data.get("segments", []):
        words = []
        for w in seg.get("words", []):
            words.append(WordTimestamp(
                word=w.get("word", ""),
                start_sec=w.get("start", seg["start"]),
                end_sec=w.get("end", seg["end"]),
            ))
        segments.append(TimelineSegment(
            speaker="unknown",
            start_sec=seg.get("start", 0),
            end_sec=seg.get("end", 0),
            text=seg.get("text", "").strip(),
            word_timestamps=words,
        ))

    log.info("whisper_done", segments=len(segments), words=sum(len(s.word_timestamps) for s in segments))
    return segments
