import asyncio
import json
from pathlib import Path

from src.core.config import config
from src.core.exceptions import ASRError
from src.core.logging_config import get_logger
from src.core.schemas import TimelineSegment, WordTimestamp


def _parse_tokens_to_words(tokens: list[dict]) -> list[WordTimestamp]:
    words: list[WordTimestamp] = []
    buf = ""
    buf_start = 0.0
    buf_end = 0.0
    for t in tokens:
        text = t.get("text", "")
        if text.startswith("[_") and text.endswith("_]"):
            continue
        offsets = t.get("offsets", {})
        ts = offsets.get("from", 0) / 1000.0
        te = offsets.get("to", 0) / 1000.0
        if not buf and ts > 0:
            buf_start = ts
        if text.startswith(" "):
            if buf:
                words.append(WordTimestamp(word=buf.strip(), start_sec=buf_start, end_sec=buf_end))
            buf = text.lstrip()
            buf_start = ts
        else:
            buf += text
        buf_end = te
    if buf:
        words.append(WordTimestamp(word=buf.strip(), start_sec=buf_start, end_sec=buf_end))
    return words


# START_BLOCK: M-AUDIO/WHISPER/TRANSCRIBE
async def transcribe(audio_path: str | Path, log=None) -> list[TimelineSegment]:
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
        "-ojf",
        "-of", str(output_path.with_suffix("")),
    ]
    log.info("[M-AUDIO][WHISPER][START]", cmd=" ".join(cmd))

    timeout = config.timeout("whisper_asr")
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    try:
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise ASRError(f"whisper.cpp timed out after {timeout}s")

    if proc.returncode != 0:
        raise ASRError(f"whisper.cpp failed: {stderr.decode('utf-8', errors='replace')}")

    json_path = output_path
    if not json_path.exists():
        json_path = audio_path.parent / f"{audio_path.stem}.json"
    if not json_path.exists():
        raise ASRError("whisper.cpp output JSON not found")

    with open(json_path) as f:
        data = json.load(f)

    segments = []
    raw_segments = data.get("transcription") or data.get("segments", [])
    for seg in raw_segments:
        offsets = seg.get("offsets", {})
        start_ms = offsets.get("from", 0)
        end_ms = offsets.get("to", 0)
        tokens = seg.get("tokens", [])
        words = _parse_tokens_to_words(tokens) if tokens else []
        segments.append(TimelineSegment(
            speaker="unknown",
            start_sec=start_ms / 1000.0,
            end_sec=end_ms / 1000.0,
            text=seg.get("text", "").strip(),
            word_timestamps=words,
        ))

    log.info("[M-AUDIO][WHISPER][DONE]", segments=len(segments), words=sum(len(s.word_timestamps) for s in segments))
    return segments
# END_BLOCK: M-AUDIO/WHISPER/TRANSCRIBE
