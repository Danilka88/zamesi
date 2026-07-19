from pathlib import Path

import pytest

from src.config import config

config.load()

FIXTURES_DIR = Path(__file__).parent / "fixtures"
VIDEOS_DIR = FIXTURES_DIR / "videos"


@pytest.fixture
def sample_video_howto() -> str | None:
    """Return path to a short how-to video (3-10 min). Place manually in tests/fixtures/videos/"""
    files = list(VIDEOS_DIR.glob("*howto*.mp4")) + list(VIDEOS_DIR.glob("*.mp4"))
    if files:
        return str(files[0])
    return None


@pytest.fixture
def sample_transcript_text() -> str:
    return "Сейчас я беру рожковый ключ на 13 и откручиваю верхнюю гайку крепления генератора"


@pytest.fixture
def sample_ambiguous_text() -> str:
    return "А теперь смотрите, вставляем эту штуку вот сюда и нажимаем до щелчка"


@pytest.fixture
def sample_podcast_text() -> str:
    return "Добро пожаловать в наш подкаст. Сегодня мы обсудим последние новости технологий."


@pytest.fixture
def mock_ollama_response(monkeypatch):
    async def mock_call(*args, **kwargs):
        return '{"action_is_clear": true, "requires_vision": false, "scene_summary": "test", "monetization": []}'

    import src.semantic_analyzer.qwen_client as qc
    monkeypatch.setattr(qc, "_extract_json", lambda x: x)
    monkeypatch.setattr(qc.timeout_manager, "call_ollama", mock_call)
