# MODULE_MAP: src/audio_engine/
# MODULE_CONTRACT: M-AUDIO
# PURPOSE: Audio extraction (ffmpeg), ASR (Whisper large-v3), diarization (SpeechBrain), timeline merge
# SCOPE: extract_audio, extract_iframes, transcribe, diarize, merge_timeline. TimelineSegment, SpeakerSegment.
# DEPENDS: M-CORE
# LINKS: docs/knowledge-graph.xml | docs/development-plan.xml | docs/verification-plan.xml
# START_BLOCK: M-AUDIO/INIT
# END_BLOCK: M-AUDIO/INIT
