from src.config import config
from src.core.schemas import OCRResult


# START_BLOCK: M-VISION/OCR/BUFFER
class OCRBuffer:
    def __init__(self) -> None:
        self._window_sec = config.ocr_buffer_window_sec
        self._results: list[OCRResult] = []
        self._min_ts: float | None = None

    def feed(self, results: list[OCRResult]) -> None:
        self._results.extend(results)
        if self._results:
            if self._min_ts is None:
                self._min_ts = min(r.timestamp_sec for r in self._results)
            else:
                new_min = min(r.timestamp_sec for r in results) if results else self._min_ts
                self._min_ts = min(self._min_ts, new_min)
            cutoff = self._min_ts - self._window_sec * 2
            self._results = [r for r in self._results if r.timestamp_sec >= cutoff]
            if self._results:
                self._min_ts = self._results[0].timestamp_sec
            else:
                self._min_ts = None

    def check(self, timestamp_sec: float) -> str | None:
        combined = []
        for r in self._results:
            if abs(r.timestamp_sec - timestamp_sec) <= self._window_sec:
                combined.append(r.text)
        return " | ".join(combined) if combined else None

    def clear(self) -> None:
        self._results.clear()
# END_BLOCK: M-VISION/OCR/BUFFER
