# MODULE_MAP: src/audio_engine/
# MODULE_CONTRACT: M-AUDIO
# PURPOSE: Audio extraction (ffmpeg), ASR (Whisper large-v3), diarization (SpeechBrain), timeline merge
# SCOPE: extract_audio, extract_iframes, transcribe, diarize, merge_timeline. TimelineSegment, SpeakerSegment.
# DEPENDS: M-CORE
# LINKS: .grace/graph/index.xml | .grace/context/requirements.xml | .grace/verification/index.xml
# START_BLOCK: M-AUDIO/INIT
from src.audio_engine.audio_fingerprinter import (
    analyze_audio_for_monetization,
    detect_celebrity,
    fingerprint_audio,
    match_audio,
)
from src.audio_engine.diarization_speechbrain import diarize
from src.audio_engine.pyav_reader import extract_audio, extract_iframes
from src.audio_engine.timeline_merger import merge
from src.audio_engine.whisper_asr import transcribe

__all__ = [
    "analyze_audio_for_monetization", "detect_celebrity", "fingerprint_audio",
    "match_audio", "diarize", "extract_audio", "extract_iframes",
    "merge", "transcribe",
]
# END_BLOCK: M-AUDIO/INIT
