from unittest.mock import MagicMock, patch

import pytest

from src.vision_scanner.rapid_ocr import process_frames


@pytest.fixture(autouse=True)
def _fake_ocr_engine():
    fake_engine = MagicMock()
    fake_engine.return_value = (
        [(MagicMock(), "текст на экране", 0.85)],
        None,
    )
    with patch("src.vision_scanner.rapid_ocr._get_engine", return_value=fake_engine):
        yield


def test_process_frames_success(tmp_path):
    frame_path = tmp_path / "frame_001.jpg"
    frame_path.write_text("fake jpg")
    items = [{"timestamp_sec": 5.0, "path": str(frame_path)}]
    results = process_frames(items)
    assert len(results) == 1
    assert results[0].text == "текст на экране"
    assert results[0].timestamp_sec == 5.0
    assert frame_path.exists()


def test_process_frames_empty_input():
    results = process_frames([])
    assert results == []


def test_process_frames_skips_missing_file(tmp_path):
    items = [{"timestamp_sec": 10.0, "path": str(tmp_path / "nonexistent.jpg")}]
    results = process_frames(items)
    assert results == []


def test_process_frames_low_confidence_is_filtered(tmp_path):
    fake_engine = MagicMock()
    fake_engine.return_value = (
        [(MagicMock(), "низкая уверенность", 0.3)],
        None,
    )
    frame = tmp_path / "frame_low.jpg"
    frame.write_text("fake")
    with patch("src.vision_scanner.rapid_ocr._get_engine", return_value=fake_engine):
        results = process_frames([{"timestamp_sec": 0.0, "path": str(frame)}])
    assert results == []


def test_process_frames_ocr_error_continues(tmp_path):
    fake_engine = MagicMock()
    fake_engine.side_effect = RuntimeError("OCR crashed")
    with patch("src.vision_scanner.rapid_ocr._get_engine", return_value=fake_engine):
        frame = tmp_path / "frame_err.jpg"
        frame.write_text("fake")
        results = process_frames([{"timestamp_sec": 0.0, "path": str(frame)}])
    assert results == []
