from unittest.mock import MagicMock

import pytest

from src.audio_engine.pyannote_diarization import diarize
from src.core.exceptions import DiarizationError


def _make_fake_turn(start: float, end: float, speaker: str = "SPEAKER_00"):
    turn = MagicMock()
    turn.start = start
    turn.end = end
    return turn, None, speaker


def test_diarize_success(tmp_path, monkeypatch):
    audio = tmp_path / "test.wav"
    audio.write_text("fake")

    diarization_result = MagicMock()
    diarization_result.itertracks.return_value = [
        _make_fake_turn(0.0, 5.0, "SPEAKER_00"),
        _make_fake_turn(5.0, 10.0, "SPEAKER_01"),
    ]

    fake_pipeline = MagicMock()
    fake_pipeline.return_value = diarization_result
    monkeypatch.setattr(
        "src.audio_engine.pyannote_diarization.Pipeline.from_pretrained",
        lambda *a, **kw: fake_pipeline,
    )

    segments = diarize(str(audio))
    assert len(segments) == 2
    assert segments[0].speaker == "SPEAKER_00"
    assert segments[1].speaker == "SPEAKER_01"


def test_diarize_file_not_found():
    with pytest.raises(DiarizationError, match="not found"):
        diarize("/nonexistent/audio.wav")


def test_diarize_pipeline_load_fails(tmp_path, monkeypatch):
    audio = tmp_path / "test.wav"
    audio.write_text("fake")

    def fail_load(*a, **kw):
        msg = "Model not found"
        raise OSError(msg)

    monkeypatch.setattr("src.audio_engine.pyannote_diarization.Pipeline.from_pretrained", fail_load)

    with pytest.raises(DiarizationError, match="Failed to load"):
        diarize(str(audio))


def test_diarize_no_speakers(tmp_path, monkeypatch):
    audio = tmp_path / "test.wav"
    audio.write_text("fake")

    diarization_result = MagicMock()
    diarization_result.itertracks.return_value = []

    fake_pipeline = MagicMock()
    fake_pipeline.return_value = diarization_result
    monkeypatch.setattr(
        "src.audio_engine.pyannote_diarization.Pipeline.from_pretrained",
        lambda *a, **kw: fake_pipeline,
    )

    segments = diarize(str(audio))
    assert segments == []
