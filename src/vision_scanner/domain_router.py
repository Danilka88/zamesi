from src.core.config import config
from src.core.logging_config import get_logger
from src.core.schemas import VideoGenre
from src.core.timeout_manager import timeout_manager


# START_BLOCK: M-VISION/ROUTER/CLASSIFIER
def _build_classifier_prompt() -> str:
    genre_lines = "\n".join(
        f'  "{g["id"]}" — {g["description"]}'
        for g in config.genres
    )
    return (
        "Классифицируй текст видео в один из ID ниже.\n"
        f"{genre_lines}\n\n"
        'Ответь строго одним ID в формате JSON: {"genre": "<ID>"}\n'
        "Никаких пояснений."
    )


def _keyword_fallback(full_asr_text: str) -> VideoGenre:
    text = full_asr_text.lower()
    for g in config.genres:
        for kw in g.get("fallback_keywords", []):
            if kw in text:
                return VideoGenre(g["id"])
    return VideoGenre.unknown


async def classify(full_asr_text: str, log=None) -> VideoGenre:
    log = log or get_logger()
    try:
        prompt = _build_classifier_prompt()
        user_text = f"\n\nТекст видео:\n{full_asr_text[:3000]}"
        raw = await timeout_manager.call_llm(
            prompt=prompt + user_text,
            timeout_name="domain_router",
            call_name="genre_classifier",
            role="classifier_model",
            max_tokens=config.classifier_max_tokens,
            log=log,
        )
        import json
        parsed = json.loads(raw)
        genre_str = parsed.get("genre", "unknown")
        return VideoGenre(genre_str)
    except Exception as e:
        log.warning("[M-VISION][CLASSIFIER][FALLBACK]", error=str(e))
        return _keyword_fallback(full_asr_text)
# END_BLOCK: M-VISION/ROUTER/CLASSIFIER


# START_BLOCK: M-VISION/ROUTER/DETECT_GENRE
async def detect_genre(full_asr_text: str, log=None) -> VideoGenre:
    log = log or get_logger()
    genre = await classify(full_asr_text, log=log)
    log.info("[M-VISION][ROUTER][GENRE_DETECTED]", genre=genre.value)
    return genre
# END_BLOCK: M-VISION/ROUTER/DETECT_GENRE


# START_BLOCK: M-VISION/ROUTER/IS_VISION_BLOCKED
def is_vision_blocked(genre: VideoGenre) -> bool:
    for g in config.genres:
        if g["id"] == genre.value:
            return g.get("vision_blocked", False)
    return False
# END_BLOCK: M-VISION/ROUTER/IS_VISION_BLOCKED
