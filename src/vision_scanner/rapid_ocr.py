from pathlib import Path

from rapidocr_onnxruntime import RapidOCR

from src.config import config
from src.core.logging_config import get_logger
from src.core.schemas import OCRResult

_engine = None


def _get_engine() -> RapidOCR:
    global _engine
    if _engine is None:
        _engine = RapidOCR()
    return _engine


def process_frames(frame_paths: list[dict], log=None) -> list[OCRResult]:
    log = log or get_logger()
    engine = _get_engine()
    results = []

    for item in frame_paths:
        fpath = Path(item["path"])
        if not fpath.exists():
            log.warning("[M-VISION][OCR][FRAME_NOT_FOUND]", path=str(fpath))
            continue
        try:
            ocr_result, _ = engine(str(fpath))
            if ocr_result:
                for box, text, confidence in ocr_result:
                    if confidence >= config.ocr_confidence_threshold:
                        results.append(OCRResult(
                            timestamp_sec=item["timestamp_sec"],
                            text=str(text),
                            confidence=float(confidence),
                            bbox=[float(x) for x in box.flatten()] if hasattr(box, "flatten") else None,
                        ))
            if fpath.suffix == ".jpg":
                fpath.unlink(missing_ok=True)
        except Exception as e:
            log.warning("[M-VISION][OCR][ERROR]", path=str(fpath), error=str(e))

    log.info("[M-VISION][OCR][DONE]", frames_processed=len(frame_paths), texts_found=len(results))
    return results
