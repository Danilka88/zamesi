from src.config import config
from src.core.logging_config import get_logger
from src.core.schemas import VideoGenre
from src.vision_scanner.genre_classifier import classify


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
