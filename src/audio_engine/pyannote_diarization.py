import asyncio
from pathlib import Path

from src.core.exceptions import DiarizationError
from src.core.logging_config import get_logger
from src.core.schemas import SpeakerSegment


# START_BLOCK: M-AUDIO/PYANNOTE/DIARIZE
async def diarize(audio_path: str | Path, log=None) -> list[SpeakerSegment]:
    log = log or get_logger()
    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise DiarizationError(f"Audio file not found: {audio_path}")

    log.info("[M-AUDIO][PYANNOTE][START]")

    def _run() -> list[SpeakerSegment]:
        from pyannote.audio import Pipeline  # type: ignore[import-untyped]
        try:
            pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1")  # type: ignore[arg-type]
        except Exception as e:
            raise DiarizationError(f"Failed to load PyAnnote pipeline: {e}") from e
        try:
            diarization = pipeline(str(audio_path))  # type: ignore[misc]
        except Exception as e:
            raise DiarizationError(f"PyAnnote inference failed: {e}") from e
        segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):  # type: ignore[union-attr]
            segments.append(SpeakerSegment(
                speaker=speaker,
                start_sec=turn.start,
                end_sec=turn.end,
            ))
        return segments

    segments = await asyncio.to_thread(_run)

    log.info("[M-AUDIO][PYANNOTE][DONE]", segments=len(segments), speakers=len(set(s.speaker for s in segments)))
    return segments
# END_BLOCK: M-AUDIO/PYANNOTE/DIARIZE
