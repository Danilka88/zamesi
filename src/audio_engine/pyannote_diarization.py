from pathlib import Path

from pyannote.audio import Pipeline

from src.core.exceptions import DiarizationError
from src.core.logging_config import get_logger
from src.core.schemas import SpeakerSegment


def diarize(audio_path: str | Path, log=None) -> list[SpeakerSegment]:
    log = log or get_logger()
    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise DiarizationError(f"Audio file not found: {audio_path}")

    log.info("diarization_start")
    try:
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=None,
        )
    except Exception as e:
        raise DiarizationError(f"Failed to load PyAnnote pipeline: {e}") from e

    try:
        diarization = pipeline(str(audio_path))
    except Exception as e:
        raise DiarizationError(f"PyAnnote inference failed: {e}") from e

    segments = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        segments.append(SpeakerSegment(
            speaker=speaker,
            start_sec=turn.start,
            end_sec=turn.end,
        ))

    log.info("diarization_done", segments=len(segments), speakers=len(set(s.speaker for s in segments)))
    return segments
