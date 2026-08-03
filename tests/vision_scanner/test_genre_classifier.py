
import pytest

from src.core.schemas import VideoGenre
from src.vision_scanner.genre_classifier import _keyword_fallback, classify


def test_keyword_fallback_podcast():
    genre = _keyword_fallback("Добро пожаловать в наш подкаст про технологии")
    assert genre == VideoGenre.podcast


def test_keyword_fallback_howto():
    genre = _keyword_fallback("В этом видео я покажу как установить розетку")
    assert genre == VideoGenre.how_to


def test_keyword_fallback_unknown():
    genre = _keyword_fallback("Что-то непонятное без ключевых слов")
    assert genre == VideoGenre.unknown


def test_keyword_fallback_empty():
    genre = _keyword_fallback("")
    assert genre == VideoGenre.unknown


def test_keyword_fallback_prefers_first_match():
    genre = _keyword_fallback("как сделать подкаст")
    assert genre == VideoGenre.podcast


@pytest.mark.asyncio
async def test_classify_success(monkeypatch):
    async def fake_ollama(**kwargs):
        return '{"genre": "how_to"}'

    monkeypatch.setattr("src.vision_scanner.genre_classifier.timeout_manager.call_llm", fake_ollama)
    genre = await classify("Как установить розетку")
    assert genre == VideoGenre.how_to


@pytest.mark.asyncio
async def test_classify_llm_failure_falls_back_to_keywords(monkeypatch):
    async def failing_ollama(**kwargs):
        msg = "Ollama unavailable"
        raise ConnectionError(msg)

    monkeypatch.setattr("src.vision_scanner.genre_classifier.timeout_manager.call_llm", failing_ollama)
    genre = await classify("Добро пожаловать в подкаст")
    assert genre == VideoGenre.podcast


@pytest.mark.asyncio
async def test_classify_llm_failure_no_keywords_fallback(monkeypatch):
    async def failing_ollama(**kwargs):
        raise ConnectionError("down")

    monkeypatch.setattr("src.vision_scanner.genre_classifier.timeout_manager.call_llm", failing_ollama)
    genre = await classify("неподходящий текст без ключевых слов")
    assert genre == VideoGenre.unknown


@pytest.mark.asyncio
async def test_classify_invalid_json_from_llm(monkeypatch):
    async def bad_json(**kwargs):
        return "not json"

    monkeypatch.setattr("src.vision_scanner.genre_classifier.timeout_manager.call_llm", bad_json)
    genre = await classify("совершенно непонятный текст без ключевых слов")
    assert genre == VideoGenre.unknown
