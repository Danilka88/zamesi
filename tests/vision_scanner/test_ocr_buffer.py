from src.core.schemas import OCRResult
from src.vision_scanner.ocr_buffer import OCRBuffer


def test_ocr_buffer_check_within_window():
    buf = OCRBuffer()
    buf.feed([
        OCRResult(timestamp_sec=10.0, text="Makita DDF485", confidence=0.95),
    ])
    result = buf.check(12.0)
    assert result is not None
    assert "Makita" in result


def test_ocr_buffer_outside_window():
    buf = OCRBuffer()
    buf.feed([
        OCRResult(timestamp_sec=0.0, text="old text", confidence=0.9),
    ])
    result = buf.check(10.0)
    assert result is None or result == ""


def test_ocr_buffer_combines_multiple():
    buf = OCRBuffer()
    buf.feed([
        OCRResult(timestamp_sec=8.0, text="Bosch", confidence=0.9),
        OCRResult(timestamp_sec=12.0, text="Professional", confidence=0.85),
    ])
    result = buf.check(10.0)
    assert result is not None
    assert "Bosch" in result
    assert "Professional" in result
