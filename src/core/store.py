import time
from typing import Generic, TypeVar

T = TypeVar("T")


# START_BLOCK: M-CORE/STORE/CLASS
class MemoryStore(Generic[T]):
    def __init__(self, ttl_sec: int = 3600):
        self._data: dict[str, T] = {}
        self._timestamps: dict[str, float] = {}
        self._ttl_sec = ttl_sec

    def set(self, key: str, value: T) -> None:
        self._data[key] = value
        self._timestamps[key] = time.time()

    def get(self, key: str) -> T | None:
        return self._data.get(key)

    def remove(self, key: str) -> None:
        self._data.pop(key, None)
        self._timestamps.pop(key, None)

    def cleanup(self) -> int:
        now = time.time()
        expired = [k for k, ts in self._timestamps.items() if now - ts > self._ttl_sec]
        for k in expired:
            self.remove(k)
        return len(expired)

    def __getitem__(self, key: str) -> T:
        val = self._data.get(key)
        if val is None:
            raise KeyError(key)
        return val

    def __setitem__(self, key: str, value: T) -> None:
        self.set(key, value)
# END_BLOCK: M-CORE/STORE/CLASS
