import asyncio

from src.core.circuit_breaker import CircuitBreaker
from src.core.config import config
from src.core.exceptions import (
    FallbackTriggered,
    JSONParseError,
    LLMResponseError,
    RetryExhaustedError,
    TimeoutError,
)
from src.core.llm_router import llm_router
from src.core.logging_config import get_logger
from src.core.metrics import fallbacks_total, timeouts_total


class TimeoutManager:
    def __init__(self):
        self._circuit_breakers: dict[str, CircuitBreaker] = {}

    def _cb(self, name: str) -> CircuitBreaker:
        if name not in self._circuit_breakers:
            self._circuit_breakers[name] = CircuitBreaker(name)
        return self._circuit_breakers[name]

    def get_timeout(self, timeout_name: str) -> int:
        return config.timeout(timeout_name)

    # START_BLOCK: M-CORE/TIMEOUT/CALL_WITH_RETRY
    async def call_with_retry(
        self,
        call_name: str,
        timeout_name: str,
        func,
        timeout_sec: int | None = None,
        max_attempts: int | None = None,
        log=None,
        **kwargs,
    ) -> str:
        log = log or get_logger()
        timeout = timeout_sec or self.get_timeout(timeout_name)
        max_attempts = max_attempts or config.retry_max_attempts
        fallback_chain = config.fallback_chain
        last_error: Exception | None = None

        cb = self._cb(call_name)

        for attempt in range(1, max_attempts + 1):
            try:
                result = await cb.acall(self._run_with_timeout, func, timeout, attempt, log, **kwargs)
                log.info("[M-CORE][TIMEOUT][LLM_SUCCESS]", call=call_name, attempt=attempt)
                return result
            except (TimeoutError, JSONParseError, LLMResponseError) as e:
                last_error = e
                log.warning("[M-CORE][TIMEOUT][RETRY]", call=call_name, attempt=attempt, error=str(e))
                if attempt < max_attempts:
                    await self._backoff(attempt)
                else:
                    log.warning("[M-CORE][TIMEOUT][RETRY_EXHAUSTED]", call=call_name)

        remaining_fallbacks = [s for s in fallback_chain if s not in ("retry_same",)]
        for fb_strategy in remaining_fallbacks:
            try:
                result = await self._execute_fallback(fb_strategy, call_name, timeout_name, func, log, **kwargs)
                log.warning("[M-CORE][TIMEOUT][FALLBACK]", call=call_name, strategy=fb_strategy)
                return result
            except FallbackTriggered:
                continue

        raise RetryExhaustedError(f"All retries and fallbacks failed for '{call_name}': {last_error}") from last_error
    # END_BLOCK: M-CORE/TIMEOUT/CALL_WITH_RETRY

    async def _run_with_timeout(self, func, timeout: int, attempt: int, log, **kwargs) -> str:
        try:
            result = await asyncio.wait_for(func(**kwargs), timeout=timeout)
            return result
        except asyncio.TimeoutError:
            log.warning("[M-CORE][TIMEOUT][OCCURRED]", timeout=timeout, attempt=attempt)
            timeouts_total.labels(operation="llm_call").inc()
            raise TimeoutError(f"Timed out after {timeout}s (attempt {attempt})") from None

    async def _backoff(self, attempt: int) -> None:
        delay = min(
            config.retry_base_delay * (config.retry_backoff_factor ** (attempt - 1)),
            config.retry_max_delay,
        )
        await asyncio.sleep(delay)

    async def _execute_fallback(
        self,
        strategy: str,
        call_name: str,
        timeout_name: str,
        func,
        log,
        **kwargs,
    ) -> str:
        fallbacks_total.labels(strategy=strategy).inc()
        if strategy == "shorten_prompt":
            prompt = kwargs.get("prompt", "")
            if len(prompt) > 500 and "_shortened" not in call_name:
                kwargs["prompt"] = prompt[:500] + "\n[truncated]"
                return await self.call_with_retry(
                    call_name + "_shortened", timeout_name, func, timeout_sec=30, log=log, **kwargs,
                )
        elif strategy == "skip_vision":
            if "image_base64" in kwargs:
                kwargs.pop("image_base64")
                return await self.call_with_retry(call_name + "_novision", timeout_name, func, log=log, **kwargs)
        raise FallbackTriggered(f"fallback '{strategy}' not applicable")

    async def call_llm(
        self,
        prompt: str,
        image_base64: str | None = None,
        timeout_name: str = "llm_general_default",
        call_name: str | None = None,
        model: str | None = None,
        max_tokens: int | None = None,
        role: str | None = None,
        log=None,
    ) -> str:
        call_name = call_name or timeout_name
        if role is None:
            role = "vision_model" if image_base64 else "text_model"
        return await self.call_with_retry(
            call_name=call_name,
            timeout_name=timeout_name,
            func=self._llm_infer,
            prompt=prompt,
            image_base64=image_base64,
            role=role,
            max_tokens=max_tokens,
            log=log,
        )

    # START_BLOCK: M-CORE/TIMEOUT/LLM_INFER
    async def _llm_infer(
        self, prompt: str, image_base64: str | None = None,
        role: str = "text_model", max_tokens: int | None = None,
    ) -> str:
        return await llm_router.infer(
            prompt=prompt, role=role,
            image_base64=image_base64, max_tokens=max_tokens,
        )
    # END_BLOCK: M-CORE/TIMEOUT/LLM_INFER


timeout_manager = TimeoutManager()
