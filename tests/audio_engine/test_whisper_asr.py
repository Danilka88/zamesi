import json
import subprocess
from pathlib import Path

import pytest

from src.audio_engine.whisper_asr import transcribe
from src.core.exceptions import ASRError


def _make_whisper_json(text: str = "Привет мир", start: float = 0.0, end: float = 2.0) -> str:
    return json.dumps({
        "segments": [{
            "start": start,
            "end": end,
            "text": text,
            "words": [
                {"word": "Привет", "start": 0.0, "end": 1.0},
                {"word": "мир", "start": 1.0, "end": 2.0},
            ],
        }],
    })


def test_transcribe_success(tmp_path, monkeypatch):
    audio = tmp_path / "test.wav"
    audio.write_text("fake audio")

    monkeypatch.setattr(subprocess, "run", lambda *a, **kw: type("R", (), {"returncode": 0})())
    json_path = audio.with_suffix(".json")
    json_path.write_text(_make_whisper_json())

    segments = transcribe(str(audio))
    assert len(segments) == 1
    assert segments[0].text == "Привет мир"
    assert len(segments[0].word_timestamps) == 2


def test_transcribe_file_not_found():
    with pytest.raises(ASRError, match="not found"):
        transcribe("/nonexistent/audio.wav")


def test_transcribe_ffmpeg_fails(tmp_path, monkeypatch):
    audio = tmp_path / "test.wav"
    audio.write_text("fake")
    monkeypatch.setattr(subprocess, "run", lambda *a, **kw: type("R", (), {"returncode": 1, "stderr": "error"})())
    with pytest.raises(ASRError, match="whisper.cpp failed"):
        transcribe(str(audio))


def test_transcribe_no_output_json(tmp_path, monkeypatch):
    audio = tmp_path / "test.wav"
    audio.write_text("fake")
    monkeypatch.setattr(subprocess, "run", lambda *a, **kw: type("R", (), {"returncode": 0})())
    with pytest.raises(ASRError, match="output JSON not found"):
        transcribe(str(audio))


def test_transcribe_empty_segments(tmp_path, monkeypatch):
    audio = tmp_path / "test.wav"
    audio.write_text("fake")
    monkeypatch.setattr(subprocess, "run", lambda *a, **kw: type("R", (), {"returncode": 0})())
    json_path = audio.with_suffix(".json")
    json_path.write_text(json.dumps({"segments": []}))
    segments = transcribe(str(audio))
    assert segments == []
