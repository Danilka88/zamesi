from typing import Any

import chromadb
import httpx

from src.config import config

_client: Any = None
_http: httpx.AsyncClient | None = None


def get_chroma_client() -> Any:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=config.search_chroma_path)
    return _client


def get_async_http() -> httpx.AsyncClient:
    global _http
    if _http is None:
        _http = httpx.AsyncClient(timeout=30.0)
    return _http


async def embed_text(text: str) -> list[float]:
    http = get_async_http()
    resp = await http.post(
        f"{config.ollama_endpoint}/api/embed",
        json={"model": config.search_embedding_model, "input": text},
    )
    resp.raise_for_status()
    return resp.json()["embeddings"][0]
