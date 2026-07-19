import pytest

from src.core.exceptions import (
    CircuitBreakerOpenError,
    RetryExhaustedError,
    TimeoutError,
)
from src.core.timeout_manager import CircuitBreaker, CircuitState, TimeoutManager


@pytest.mark.asyncio
async def test_call_with_retry_timeout_triggers_fallback():
    tm = TimeoutManager()

    async def slow_func(**kwargs):
        import asyncio
        await asyncio.sleep(100)
        return "never"

    with pytest.raises(RetryExhaustedError):
        await tm.call_with_retry(
            call_name="test_timeout",
            timeout_name="qwen_pass1_text",
            func=slow_func,
            timeout_sec=0.1,
            max_attempts=1,
        )


@pytest.mark.asyncio
async def test_call_with_retry_success_on_second_attempt(capture_logs):
    tm = TimeoutManager()
    call_count = 0

    async def flaky_func(**kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise TimeoutError("first attempt failed")
        return "success"

    result = await tm.call_with_retry(
        call_name="test_flaky",
        timeout_name="qwen_pass1_text",
        func=flaky_func,
        timeout_sec=10,
        max_attempts=2,
    )
    assert result == "success"
    assert call_count == 2

    markers = [e.get("event", "") for e in capture_logs.entries]
    assert any("[M-CORE][TIMEOUT][RETRY]" in m for m in markers)
    assert any("[M-CORE][TIMEOUT][LLM_SUCCESS]" in m for m in markers)


def test_circuit_breaker_opens_after_threshold(capture_logs):
    cb = CircuitBreaker("test")
    cb.threshold = 3

    def failing():
        raise TimeoutError("fail")

    for _ in range(3):
        try:
            cb.call(failing)
        except TimeoutError:
            pass

    assert cb.state == CircuitState.open

    with pytest.raises(CircuitBreakerOpenError):
        cb.call(failing)

    markers = [e.get("event", "") for e in capture_logs.entries]
    assert any("[M-CORE][CB][OPENED]" in m for m in markers)


def test_circuit_breaker_recovers():
    cb = CircuitBreaker("test")
    cb.threshold = 2
    cb.recovery_sec = 0

    def failing():
        raise TimeoutError("fail")

    for _ in range(2):
        try:
            cb.call(failing)
        except TimeoutError:
            pass

    assert cb.state == CircuitState.open

    cb.last_failure_time = 0

    def succeeding():
        return "ok"

    result = cb.call(succeeding)
    assert result == "ok"
    assert cb.state == CircuitState.closed
