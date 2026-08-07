from src.core.logging_config import get_logger
from src.core.schemas import SpeakerSegment, TimelineSegment


# START_BLOCK: M-AUDIO/MERGER/MERGE_TIMELINE
def merge_timeline(
    transcript_segments: list[TimelineSegment],
    speaker_segments: list[SpeakerSegment],
    log=None,
) -> list[TimelineSegment]:
    log = log or get_logger()
    if not speaker_segments:
        log.warning("[M-AUDIO][MERGER][NO_SPEAKERS]")
        return transcript_segments

    merged = []
    for ts in transcript_segments:
        ts_mid = (ts.start_sec + ts.end_sec) / 2
        assigned_speaker = "unknown"
        for ss in speaker_segments:
            if ss.start_sec <= ts_mid <= ss.end_sec:
                assigned_speaker = ss.speaker
                break
        merged.append(TimelineSegment(
            speaker=assigned_speaker,
            start_sec=ts.start_sec,
            end_sec=ts.end_sec,
            text=ts.text,
            word_timestamps=ts.word_timestamps,
        ))

    log.info("[M-AUDIO][MERGER][DONE]", segments=len(merged))
    return merged
# END_BLOCK: M-AUDIO/MERGER/MERGE_TIMELINE
