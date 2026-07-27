from typing import Any

import chromadb

from src.config import config
from src.core.llm_router import llm_router

_client: Any = None


# START_BLOCK: M-CORE/EMBEDDING/CLIENTS
def get_chroma_client() -> Any:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=config.search_chroma_path)
    return _client
# END_BLOCK: M-CORE/EMBEDDING/CLIENTS


# START_BLOCK: M-CORE/EMBEDDING/EMBED_TEXT
async def embed_text(text: str) -> list[float]:
    return await llm_router.embed(text, role="embedding_model")
# END_BLOCK: M-CORE/EMBEDDING/EMBED_TEXT
