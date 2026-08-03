# MODULE_MAP: src/core/
# MODULE_CONTRACT: M-CORE
# PURPOSE: Мульти-провайдер LLM с fallback chain: primary → fallback → fallback …
# SCOPE: LLMRouter, ROLES, infer, embed. Provider selection, per-provider circuit breaker, latency tracking.
# DEPENDS: M-CORE (config, exceptions, json_utils, circuit_breaker)
# LINKS: .grace/graph/index.xml | .grace/verification/index.xml
import time

import httpx

from src.core.circuit_breaker import CircuitBreaker
from src.core.config import config
from src.core.exceptions import ConfigError
from src.core.json_utils import extract_json
from src.core.logging_config import get_logger

# START_BLOCK: M-CORE/LLM_ROUTER/ROLES
ROLES = (
    "text_model",
    "vision_model",
    "classifier_model",
    "mixer_model",
    "moderation_model",
    "embedding_model",
)
# END_BLOCK: M-CORE/LLM_ROUTER/ROLES


# START_BLOCK: M-CORE/LLM_ROUTER/CLASS
class LLMRouter:
    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None
        self._provider_cbs: dict[str, CircuitBreaker] = {}
        self._latency: dict[str, float] = {}

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=120.0)
        return self._client

    def _provider_entries(self, role: str) -> list[dict]:
        routing = config.routing
        raw = routing.get(role, [])
        if isinstance(raw, dict):
            raw = [raw]
        if not raw:
            raise ConfigError(f"No providers configured for role '{role}'")
        return raw

    def provider_for(self, role: str) -> dict:
        entries = self._provider_entries(role)
        pname = entries[0]["provider"]
        if pname not in config.providers:
            raise ConfigError(f"Provider '{pname}' for role '{role}' not configured in models.providers")
        return config.providers[pname]

    def model_for(self, role: str) -> str:
        entries = self._provider_entries(role)
        return entries[0].get("model", "")

    def _provider_cb(self, name: str) -> CircuitBreaker:
        if name not in self._provider_cbs:
            self._provider_cbs[name] = CircuitBreaker(name)
        return self._provider_cbs[name]

    def _update_latency(self, provider: str, elapsed: float) -> None:
        alpha = 0.3
        prev = self._latency.get(provider, elapsed)
        self._latency[provider] = alpha * elapsed + (1 - alpha) * prev

    # START_BLOCK: M-CORE/LLM_ROUTER/INFER
    async def infer(
        self,
        prompt: str,
        role: str,
        image_base64: str | None = None,
        max_tokens: int | None = None,
    ) -> str:
        entries = self._provider_entries(role)
        log = get_logger()
        last_error: Exception | None = None

        for entry in entries:
            pname = entry["provider"]
            if pname not in config.providers:
                log.warning("[M-CORE][LLM][PROVIDER_SKIP]", provider=pname, reason="not_configured")
                last_error = ConfigError(f"Provider '{pname}' not configured in models.providers")
                continue
            provider_cfg = config.providers[pname]

            provider_type = provider_cfg.get("type", "ollama")
            if provider_type not in ("ollama", "openai"):
                log.warning(
                    "[M-CORE][LLM][PROVIDER_SKIP]",
                    provider=pname, type=provider_type, reason="unsupported_type",
                )
                last_error = ConfigError(f"Unknown provider type '{provider_type}' for '{pname}'")
                continue

            cb = self._provider_cb(pname)
            try:
                start = time.monotonic()
                result = await cb.acall(
                    self._infer_one, provider_cfg, entry["model"],
                    prompt, image_base64, max_tokens,
                )
                elapsed = time.monotonic() - start
                self._update_latency(pname, elapsed)
                log.info("[M-CORE][LLM][SUCCESS]", provider=pname, role=role, latency=f"{elapsed:.1f}s")
                return result
            except Exception as e:
                last_error = e
                log.warning("[M-CORE][LLM][FALLBACK]", provider=pname, role=role, error=str(e)[:100])

        raise ConfigError(f"All providers failed for role '{role}': {last_error}" if last_error
                          else f"All providers failed for role '{role}'")
    # END_BLOCK: M-CORE/LLM_ROUTER/INFER

    # START_BLOCK: M-CORE/LLM_ROUTER/EMBED
    async def embed(self, text: str, role: str = "embedding_model") -> list[float]:
        entries = self._provider_entries(role)
        log = get_logger()
        last_error: Exception | None = None

        for entry in entries:
            pname = entry["provider"]
            if pname not in config.providers:
                last_error = ConfigError(f"Provider '{pname}' not configured in models.providers")
                continue
            provider_cfg = config.providers[pname]

            provider_type = provider_cfg.get("type", "ollama")
            if provider_type not in ("ollama", "openai"):
                last_error = ConfigError(f"Unknown provider type '{provider_type}' for '{pname}'")
                continue

            cb = self._provider_cb(pname)
            try:
                start = time.monotonic()
                result = await cb.acall(
                    self._embed_one, provider_cfg, entry["model"], text,
                )
                elapsed = time.monotonic() - start
                self._update_latency(pname, elapsed)
                return result
            except Exception as e:
                last_error = e
                log.warning("[M-CORE][LLM][EMBED_FALLBACK]", provider=pname, error=str(e)[:100])

        raise ConfigError(f"All providers failed for embed role '{role}': {last_error}" if last_error
                          else f"All providers failed for embed role '{role}'")
    # END_BLOCK: M-CORE/LLM_ROUTER/EMBED

    async def _infer_one(
        self,
        provider_cfg: dict,
        model: str,
        prompt: str,
        image_base64: str | None = None,
        max_tokens: int | None = None,
    ) -> str:
        ptype = provider_cfg.get("type", "ollama")
        endpoint = provider_cfg.get("endpoint", "http://localhost:11434")
        api_key = provider_cfg.get("api_key", "")
        if ptype == "ollama":
            return await self._ollama_infer(endpoint, model, prompt, image_base64, max_tokens)
        return await self._openai_infer(endpoint, api_key, model, prompt, image_base64, max_tokens)

    async def _embed_one(self, provider_cfg: dict, model: str, text: str) -> list[float]:
        ptype = provider_cfg.get("type", "ollama")
        endpoint = provider_cfg.get("endpoint", "http://localhost:11434")
        api_key = provider_cfg.get("api_key", "")
        if ptype == "ollama":
            return await self._ollama_embed(endpoint, model, text)
        return await self._openai_embed(endpoint, api_key, model, text)

    async def _ollama_infer(
        self,
        endpoint: str,
        model: str,
        prompt: str,
        image_base64: str | None = None,
        max_tokens: int | None = None,
    ) -> str:
        payload: dict = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": config.ollama_temperature,
                "num_predict": max_tokens or config.ollama_max_tokens,
            },
        }
        if image_base64:
            payload["images"] = [image_base64]
        resp = await self.client.post(f"{endpoint}/api/generate", json=payload)
        resp.raise_for_status()
        data = resp.json()
        raw = data.get("response", "")
        return extract_json(raw)

    async def _openai_infer(
        self,
        endpoint: str,
        api_key: str,
        model: str,
        prompt: str,
        image_base64: str | None = None,
        max_tokens: int | None = None,
    ) -> str:
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        messages: list[dict] = []
        if image_base64:
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                ],
            })
        else:
            messages.append({"role": "user", "content": prompt})
        payload = {
            "model": model,
            "messages": messages,
            "temperature": config.ollama_temperature,
            "max_tokens": max_tokens or config.ollama_max_tokens,
        }
        resp = await self.client.post(f"{endpoint}/v1/chat/completions", json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]

    async def _ollama_embed(self, endpoint: str, model: str, text: str) -> list[float]:
        resp = await self.client.post(
            f"{endpoint}/api/embed",
            json={"model": model, "input": text},
        )
        resp.raise_for_status()
        return resp.json()["embeddings"][0]

    async def _openai_embed(self, endpoint: str, api_key: str, model: str, text: str) -> list[float]:
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        payload = {"model": model, "input": text}
        resp = await self.client.post(f"{endpoint}/v1/embeddings", json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return data["data"][0]["embedding"]


llm_router = LLMRouter()
# END_BLOCK: M-CORE/LLM_ROUTER/CLASS
