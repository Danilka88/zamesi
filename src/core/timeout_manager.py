import asyncio
import re
import time
from enum import Enum

from src.config import config
from src.core.exceptions import (
    CircuitBreakerOpenError,
    FallbackTriggered,
    JSONParseError,
    LLMResponseError,
    PipelineError,
    RetryExhaustedError,
    TimeoutError,
)
from src.core.logging_config import get_logger
from src.core.metrics import fallbacks_total, timeouts_total


def _extract_json(text: str) -> str:
    text = text.strip()
    # Remove markdown code fence (```json ... ```)
    if text.startswith("```"):
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline + 1 :]
        text = re.sub(r"```\s*$", "", text).strip()
    return text


class CircuitState(str, Enum):
    closed = "closed"
    open = "open"
    half_open = "half_open"


class CircuitBreaker:
    def __init__(self, name: str):
        self.name = name
        self.state = CircuitState.closed
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.threshold = config.circuit_breaker_threshold
        self.recovery_sec = config.circuit_breaker_recovery_sec

    def call(self, func, *args, **kwargs):
        if self.state == CircuitState.open:
            if time.monotonic() - self.last_failure_time >= self.recovery_sec:
                self.state = CircuitState.half_open
            else:
                raise CircuitBreakerOpenError(f"Circuit breaker '{self.name}' is open")
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except PipelineError:
            self._on_failure()
            raise

    async def acall(self, func, *args, **kwargs):
        if self.state == CircuitState.open:
            if time.monotonic() - self.last_failure_time >= self.recovery_sec:
                self.state = CircuitState.half_open
            else:
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
            get_logger().warning("circuit_breaker_opened", name=self.name, failures=self.failure_count)


class TimeoutManager:
    def __init__(self):
        self._circuit_breakers: dict[str, CircuitBreaker] = {}

    def _cb(self, name: str) -> CircuitBreaker:
        if name not in self._circuit_breakers:
            self._circuit_breakers[name] = CircuitBreaker(name)
        return self._circuit_breakers[name]

    def get_timeout(self, timeout_name: str) -> int:
        return config.timeout(timeout_name)

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
                log.info("llm_call_success", call=call_name, attempt=attempt)
                return result
            except (TimeoutError, JSONParseError, LLMResponseError) as e:
                last_error = e
                log.warning("llm_call_retry", call=call_name, attempt=attempt, error=str(e))
                if attempt < max_attempts:
                    await self._backoff(attempt)
                else:
                    log.warning("llm_call_retry_exhausted", call=call_name)

        remaining_fallbacks = [s for s in fallback_chain if s not in ("retry_same",)]
        for fb_strategy in remaining_fallbacks:
            try:
                result = await self._execute_fallback(fb_strategy, call_name, timeout_name, func, log, **kwargs)
                log.warning("fallback_used", call=call_name, strategy=fb_strategy)
                return result
            except FallbackTriggered:
                continue

        raise RetryExhaustedError(f"All retries and fallbacks failed for '{call_name}': {last_error}") from last_error

    async def _run_with_timeout(self, func, timeout: int, attempt: int, log, **kwargs) -> str:
        try:
            result = await asyncio.wait_for(func(**kwargs), timeout=timeout)
            return result
        except asyncio.TimeoutError:
            log.warning("timeout_occurred", timeout=timeout, attempt=attempt)
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
            if "prompt" in kwargs and len(kwargs["prompt"]) > 500:
                kwargs["prompt"] = kwargs["prompt"][:500] + "\n[truncated]"
                return await self.call_with_retry(
                    call_name + "_shortened", timeout_name, func, timeout_sec=10, log=log, **kwargs,
                )
        elif strategy == "skip_vision":
            if "image_base64" in kwargs:
                kwargs.pop("image_base64")
                return await self.call_with_retry(call_name + "_novision", timeout_name, func, log=log, **kwargs)
        raise FallbackTriggered(f"fallback '{strategy}' not applicable")

    async def call_ollama(
        self,
        prompt: str,
        image_base64: str | None = None,
        timeout_name: str = "llm_general_default",
        call_name: str | None = None,
        model: str | None = None,
        max_tokens: int | None = None,
        log=None,
    ) -> str:
        call_name = call_name or timeout_name
        return await self.call_with_retry(
            call_name=call_name,
            timeout_name=timeout_name,
            func=self._ollama_infer,
            prompt=prompt,
            image_base64=image_base64,
            model=model,
            max_tokens=max_tokens,
            log=log,
        )

    async def _ollama_infer(
        self, prompt: str, image_base64: str | None = None,
        model: str | None = None, max_tokens: int | None = None,
    ) -> str:
        import httpx

        model = model or (config.ollama_vision_model if image_base64 else config.ollama_text_model)
        timeout_name = "qwen_pass2_vision" if image_base64 else "qwen_pass1_text"
        timeout_sec = int(self.get_timeout(timeout_name))
        num_predict = max_tokens or config.ollama_max_tokens
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": config.ollama_temperature,
                "num_predict": num_predict,
            },
        }
        if image_base64:
            payload["images"] = [image_base64]

        async with httpx.AsyncClient(timeout=timeout_sec + 5) as client:
            response = await client.post(f"{config.ollama_endpoint}/api/generate", json=payload)
            response.raise_for_status()
            data = response.json()
            raw = data.get("response", "")
            return _extract_json(raw)


timeout_manager = TimeoutManager()
