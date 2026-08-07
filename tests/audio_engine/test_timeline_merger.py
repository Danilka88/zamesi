from src.audio_engine.timeline_merger import merge_timeline
from src.core.schemas import SpeakerSegment, TimelineSegment


def test_merge_assigns_speaker():
    transcript = [
        TimelineSegment(speaker="unknown", start_sec=0, end_sec=10, text="hello", word_timestamps=[]),
    ]
    speakers = [
        SpeakerSegment(speaker="SPEAKER_01", start_sec=0, end_sec=15),
    ]
    merged = merge_timeline(transcript, speakers)
    assert merged[0].speaker == "SPEAKER_01"


def test_merge_no_speakers_keeps_unknown():
    transcript = [
        TimelineSegment(speaker="unknown", start_sec=0, end_sec=10, text="hello"),
    ]
    merged = merge_timeline(transcript, [])
    assert merged[0].speaker == "unknown"
