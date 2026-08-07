from src.core.schemas import VideoGenre
from src.vision_scanner.domain_router import is_vision_blocked
from src.vision_scanner.genre_classifier import _keyword_fallback


def test_keyword_fallback_podcast():
    genre = _keyword_fallback("сегодня в гостях у нас интересный гость")
    assert genre == VideoGenre.podcast


def test_keyword_fallback_howto():
    genre = _keyword_fallback("сейчас я покажу как заменить колодки")
    assert genre == VideoGenre.how_to


def test_keyword_fallback_unknown():
    genre = _keyword_fallback("абсолютно случайный текст без ключей")
    assert genre == VideoGenre.unknown


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
