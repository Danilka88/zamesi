from src.config import config
from src.core.schemas import OCRResult


class OCRBuffer:
    def __init__(self):
        self._window_sec = config.ocr_buffer_window_sec
        self._results: list[OCRResult] = []

    def feed(self, results: list[OCRResult]) -> None:
        self._results.extend(results)
        if self._results:
            min_ts = min(r.timestamp_sec for r in self._results)
            cutoff = min_ts - self._window_sec * 2
            self._results = [r for r in self._results if r.timestamp_sec >= cutoff]

    def check(self, timestamp_sec: float) -> str | None:
        combined = []
        for r in self._results:
            if abs(r.timestamp_sec - timestamp_sec) <= self._window_sec:
                combined.append(r.text)
        return " | ".join(combined) if combined else None

    def clear(self) -> None:
        self._results.clear()
