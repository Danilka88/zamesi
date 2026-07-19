import asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.audio_engine.pyav_reader import extract_audio, extract_iframes
from src.core.exceptions import AudioExtractionError


@pytest.fixture(autouse=True)
def _fake_ffmpeg(monkeypatch):
    async def fake_create_subprocess_exec(*args, **kwargs):
        proc = MagicMock()
        proc.returncode = 0
        proc.communicate = AsyncMock(return_value=(b"", b""))
        return proc

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_create_subprocess_exec)


@pytest.mark.asyncio
async def test_extract_audio_success(tmp_path):
    video = tmp_path / "test.mp4"
    video.write_text("fake video")
    result = await extract_audio(str(video), log=None)
    assert result.endswith(".wav")


@pytest.mark.asyncio
async def test_extract_audio_cache_hit(tmp_path):
    audio_dir = tmp_path / "audio"
    audio_dir.mkdir()
    video = tmp_path / "test.mp4"
    video.write_text("fake")
    cached = audio_dir / "test.wav"
    cached.write_text("cached")

    with patch("src.audio_engine.pyav_reader.config") as cfg:
        cfg.audio_temp_dir = str(audio_dir)
        result = await extract_audio(str(video), log=None)
    assert result == str(cached)


@pytest.mark.asyncio
async def test_extract_audio_file_not_found():
    with pytest.raises(AudioExtractionError, match="not found"):
        await extract_audio("/nonexistent/video.mp4")


@pytest.mark.asyncio
async def test_extract_audio_ffmpeg_fails(monkeypatch):
    async def failing_ffmpeg(*args, **kwargs):
        proc = MagicMock()
        proc.returncode = 1
        proc.communicate = AsyncMock(return_value=(b"", b"ffmpeg error"))
        return proc

    monkeypatch.setattr(asyncio, "create_subprocess_exec", failing_ffmpeg)
    video = "/tmp/__test_fail.mp4"
    try:
        with open(video, "w") as f:
            f.write("x")
        with pytest.raises(AudioExtractionError, match="ffmpeg failed"):
            await extract_audio(video)
    finally:
        if os.path.exists(video):
            os.unlink(video)


@pytest.mark.asyncio
async def test_extract_iframes_success(tmp_path, monkeypatch):
    video = tmp_path / "test.mp4"
    video.write_text("fake")

    real_getsize = os.path.getsize

    def fake_getsize(p):
        return 12345 if str(p).endswith(".jpg") else real_getsize(p)

    monkeypatch.setattr(os.path, "getsize", fake_getsize)

    frames = await extract_iframes(str(video), [5.0, 10.0], log=None)
    assert len(frames) == 2
    for f in frames:
        assert "timestamp_sec" in f
        assert "path" in f


@pytest.mark.asyncio
async def test_extract_iframes_empty_timestamps(tmp_path):
    video = tmp_path / "test.mp4"
    video.write_text("fake")
    frames = await extract_iframes(str(video), [], log=None)
    assert frames == []


@pytest.mark.asyncio
async def test_extract_iframes_ffmpeg_fails_continues(monkeypatch):
    async def failing_ffmpeg(*args, **kwargs):
        proc = MagicMock()
        proc.returncode = 1
        proc.communicate = AsyncMock(return_value=(b"", b"error"))
        return proc

    monkeypatch.setattr(asyncio, "create_subprocess_exec", failing_ffmpeg)
    video = "/tmp/__test_iframes_fail.mp4"
    try:
        with open(video, "w") as f:
            f.write("x")
        frames = await extract_iframes(str(video), [5.0], log=None)
        assert frames == []
    finally:
        if os.path.exists(video):
            os.unlink(video)
