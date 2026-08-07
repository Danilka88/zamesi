import pytest

from src.core.schemas import VideoGenre
from src.vision_scanner.domain_router import _keyword_fallback, classify, is_vision_blocked


def test_keyword_fallback_podcast():
    genre = _keyword_fallback("сегодня в гостях у нас интересный гость")
    assert genre == VideoGenre.podcast


def test_keyword_fallback_howto():
    genre = _keyword_fallback("сейчас я покажу как заменить колодки")
    assert genre == VideoGenre.how_to


def test_keyword_fallback_unknown():
    genre = _keyword_fallback("абсолютно случайный текст без ключей")
    assert genre == VideoGenre.unknown


def test_keyword_fallback_empty():
    genre = _keyword_fallback("")
    assert genre == VideoGenre.unknown


def test_keyword_fallback_prefers_first_match():
    genre = _keyword_fallback("как сделать подкаст")
    assert genre == VideoGenre.podcast


def test_keyword_fallback_game_review():
    genre = _keyword_fallback("геймплей Atomic Heart на максималках")
    assert genre == VideoGenre.game_review


def test_keyword_fallback_travel_vlog():
    genre = _keyword_fallback("отпуск во Вьетнаме, зимовка")
    assert genre == VideoGenre.travel_vlog


def test_keyword_fallback_entertainment():
    genre = _keyword_fallback("обсуждение нового сериала на выходных")
    assert genre == VideoGenre.entertainment


def test_keyword_fallback_diy_crafts():
    genre = _keyword_fallback("мастер-класс по изготовлению рамки")
    assert genre == VideoGenre.diy_crafts


def test_is_vision_blocked_podcast():
    assert is_vision_blocked(VideoGenre.podcast) is True


def test_is_vision_blocked_howto():
    assert is_vision_blocked(VideoGenre.how_to) is False


def test_is_vision_blocked_unknown():
    assert is_vision_blocked(VideoGenre.unknown) is False


def test_is_vision_blocked_game_review():
    assert is_vision_blocked(VideoGenre.game_review) is False


def test_is_vision_blocked_travel_vlog():
    assert is_vision_blocked(VideoGenre.travel_vlog) is False


def test_is_vision_blocked_entertainment():
    assert is_vision_blocked(VideoGenre.entertainment) is False


def test_is_vision_blocked_diy_crafts():
    assert is_vision_blocked(VideoGenre.diy_crafts) is False


@pytest.mark.asyncio
async def test_classify_success(monkeypatch):
    async def fake_ollama(**kwargs):
        return '{"genre": "how_to"}'

    monkeypatch.setattr("src.vision_scanner.domain_router.timeout_manager.call_llm", fake_ollama)
    genre = await classify("Как установить розетку")
    assert genre == VideoGenre.how_to


@pytest.mark.asyncio
async def test_classify_llm_failure_falls_back_to_keywords(monkeypatch):
    async def failing_ollama(**kwargs):
        msg = "Ollama unavailable"
        raise ConnectionError(msg)

    monkeypatch.setattr("src.vision_scanner.domain_router.timeout_manager.call_llm", failing_ollama)
    genre = await classify("Добро пожаловать в подкаст")
    assert genre == VideoGenre.podcast


@pytest.mark.asyncio
async def test_classify_llm_failure_no_keywords_fallback(monkeypatch):
    async def failing_ollama(**kwargs):
        raise ConnectionError("down")

    monkeypatch.setattr("src.vision_scanner.domain_router.timeout_manager.call_llm", failing_ollama)
    genre = await classify("неподходящий текст без ключевых слов")
    assert genre == VideoGenre.unknown


@pytest.mark.asyncio
async def test_classify_invalid_json_from_llm(monkeypatch):
    async def bad_json(**kwargs):
        return "not json"

    monkeypatch.setattr("src.vision_scanner.domain_router.timeout_manager.call_llm", bad_json)
    genre = await classify("совершенно непонятный текст без ключевых слов")
    assert genre == VideoGenre.unknown
