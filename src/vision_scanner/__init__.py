# MODULE_MAP: src/vision_scanner/
# MODULE_CONTRACT: M-VISION
# PURPOSE: OCR (RapidOCR v4), GenreClassifier (qwen3.5:0.8b), DomainRouter (жанровая блокировка VLM), I-frame extraction
# SCOPE: detect_genre, is_vision_blocked, classify, process_frames, OCRBuffer. OCRResult, VideoGenre.
# DEPENDS: M-CORE
# LINKS: .grace/graph/index.xml | .grace/context/requirements.xml | .grace/verification/index.xml
# START_BLOCK: M-VISION/INIT
from src.vision_scanner.domain_router import detect_genre, is_vision_blocked
from src.vision_scanner.genre_classifier import classify
from src.vision_scanner.ocr_buffer import OCRBuffer
from src.vision_scanner.rapid_ocr import process_frames

__all__ = [
    "detect_genre", "is_vision_blocked", "classify",
    "OCRBuffer", "process_frames",
]
# END_BLOCK: M-VISION/INIT
