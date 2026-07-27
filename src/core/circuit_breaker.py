import time
from enum import Enum

from src.core.config import config
from src.core.exceptions import CircuitBreakerOpenError, PipelineError
from src.core.logging_config import get_logger


# START_BLOCK: M-CORE/CIRCUIT_BREAKER/STATE
class CircuitState(str, Enum):
    closed = "closed"
    open = "open"
    half_open = "half_open"
# END_BLOCK: M-CORE/CIRCUIT_BREAKER/STATE


# START_BLOCK: M-CORE/CIRCUIT_BREAKER/CLASS
class CircuitBreaker:
    def __init__(self, name: str):
        self.name = name
        self.state = CircuitState.closed
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.threshold = config.circuit_breaker_threshold
        self.recovery_sec = config.circuit_breaker_recovery_sec
        self.half_open_max = config.circuit_breaker_half_open_max
        self._half_open_requests = 0

    def _allow_request(self) -> bool:
        if self.state == CircuitState.closed:
            return True
        if self.state == CircuitState.open:
            if time.monotonic() - self.last_failure_time >= self.recovery_sec:
                self.state = CircuitState.half_open
                self._half_open_requests = 0
                return True
            return False
        if self.state == CircuitState.half_open:
            if self._half_open_requests < self.half_open_max:
                self._half_open_requests += 1
                return True
            return False
        return False

    def call(self, func, *args, **kwargs):
        if not self._allow_request():
            raise CircuitBreakerOpenError(f"Circuit breaker '{self.name}' is open")
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except PipelineError:
            self._on_failure()
            raise

    async def acall(self, func, *args, **kwargs):
        if not self._allow_request():
            raise CircuitBreakerOpenError(f"Circuit breaker '{self.name}' is open")
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except PipelineError:
            self._on_failure()
            raise

    def _on_success(self):
        if self.state == CircuitState.half_open:
            self.state = CircuitState.closed
        self.failure_count = 0

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.monotonic()
        if self.failure_count >= self.threshold:
            self.state = CircuitState.open
            get_logger().warning("[M-CORE][CB][OPENED]", name=self.name, failures=self.failure_count)
# END_BLOCK: M-CORE/CIRCUIT_BREAKER/CLASS
