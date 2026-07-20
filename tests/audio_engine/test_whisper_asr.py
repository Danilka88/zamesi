import asyncio
import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.audio_engine.whisper_asr import transcribe
from src.core.exceptions import ASRError


def _make_whisper_json(text: str = "Привет мир", start: float = 0.0, end: float = 2.0) -> str:
    start_ms = int(start * 1000)
    end_ms = int(end * 1000)
    return json.dumps({
        "transcription": [{
            "text": text,
            "offsets": {"from": start_ms, "to": end_ms},
            "tokens": [
                {"text": " При", "offsets": {"from": start_ms, "to": start_ms + 300}},
                {"text": "вет", "offsets": {"from": start_ms + 300, "to": 1000}},
                {"text": " мир", "offsets": {"from": 1000, "to": end_ms}},
            ],
        }],
    })


@pytest.fixture(autouse=True)
def _fake_whisper_proc(monkeypatch):
    async def fake_create_subprocess_exec(*args, **kwargs):
        proc = MagicMock()
        proc.returncode = 0
        proc.communicate = AsyncMock(return_value=(b"", b""))
        return proc

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_create_subprocess_exec)


@pytest.mark.asyncio
async def test_transcribe_success(tmp_path):
    audio = tmp_path / "test.wav"
    audio.write_text("fake audio")
    json_path = audio.with_suffix(".json")
    json_path.write_text(_make_whisper_json())

    segments = await transcribe(str(audio))
    assert len(segments) == 1
    assert segments[0].text == "Привет мир"
    assert len(segments[0].word_timestamps) == 2


@pytest.mark.asyncio
async def test_transcribe_file_not_found():
    with pytest.raises(ASRError, match="not found"):
        await transcribe("/nonexistent/audio.wav")


@pytest.mark.asyncio
async def test_transcribe_ffmpeg_fails(monkeypatch):
    async def failing_proc(*args, **kwargs):
        proc = MagicMock()
        proc.returncode = 1
        proc.communicate = AsyncMock(return_value=(b"", b"error occurred"))
        return proc

    monkeypatch.setattr(asyncio, "create_subprocess_exec", failing_proc)
    audio = "/tmp/__test_whisper_fail.wav"
    try:
        with open(audio, "w") as f:
            f.write("x")
        with pytest.raises(ASRError, match="whisper.cpp failed"):
            await transcribe(audio)
    finally:
        import os
        if os.path.exists(audio):
            os.unlink(audio)


@pytest.mark.asyncio
async def test_transcribe_no_output_json(tmp_path):
    audio = tmp_path / "test.wav"
    audio.write_text("fake")
    with pytest.raises(ASRError, match="output JSON not found"):
        await transcribe(str(audio))


@pytest.mark.asyncio
async def test_transcribe_empty_segments(tmp_path):
    audio = tmp_path / "test.wav"
    audio.write_text("fake")
    json_path = audio.with_suffix(".json")
    json_path.write_text(json.dumps({"segments": []}))
    segments = await transcribe(str(audio))
    assert segments == []
