# MODULE_MAP: src/core/
# MODULE_CONTRACT: M-CORE
# PURPOSE: Мульти-провайдер LLM (Ollama/OpenAI) с routing по ролям: text, vision, classifier, mixer, moderation, embedding
# SCOPE: LLMRouter, ROLES, infer, embed. Provider selection, OpenAI/Ollama API calls.
# DEPENDS: M-CORE (config, exceptions, json_utils)
# LINKS: .grace/graph/index.xml | .grace/verification/index.xml
import httpx

from src.core.config import config
from src.core.exceptions import ConfigError
from src.core.json_utils import extract_json

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

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=120.0)
        return self._client

    def provider_for(self, role: str) -> dict:
        providers = config.providers
        routing = config.routing
        entry = routing.get(role, {})
        pname = entry.get("provider", "ollama")
        if pname not in providers:
            raise ConfigError(f"Provider '{pname}' for role '{role}' not configured in models.providers")
        return providers[pname]

    def model_for(self, role: str) -> str:
        routing = config.routing
        entry = routing.get(role, {})
        return entry.get("model", "")

    async def infer(
        self,
        prompt: str,
        role: str,
        image_base64: str | None = None,
        max_tokens: int | None = None,
    ) -> str:
        provider = self.provider_for(role)
        model = self.model_for(role)
        ptype = provider.get("type", "ollama")
        endpoint = provider.get("endpoint", "http://localhost:11434")
        api_key = provider.get("api_key", "")

        if ptype == "ollama":
            return await self._ollama_infer(endpoint, model, prompt, image_base64, max_tokens)
        if ptype == "openai":
            return await self._openai_infer(endpoint, api_key, model, prompt, image_base64, max_tokens)
        raise ConfigError(f"Unknown provider type '{ptype}' for role '{role}'")

    async def embed(self, text: str, role: str = "embedding_model") -> list[float]:
        provider = self.provider_for(role)
        model = self.model_for(role)
        ptype = provider.get("type", "ollama")
        endpoint = provider.get("endpoint", "http://localhost:11434")
        api_key = provider.get("api_key", "")

        if ptype == "ollama":
            return await self._ollama_embed(endpoint, model, text)
        if ptype == "openai":
            return await self._openai_embed(endpoint, api_key, model, text)
        raise ConfigError(f"Unknown provider type '{ptype}' for embed role '{role}'")

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
