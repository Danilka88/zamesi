# MODULE_MAP: src/search/
# MODULE_CONTRACT: M-SEARCH
# PURPOSE: Embedding-индексация сцен в ChromaDB и семантический поиск
# SCOPE: index_passport, search_scenes, reindex_all. ChromaDB, qwen3-embedding via Ollama.
# DEPENDS: M-CORE
# LINKS: .grace/graph/index.xml | .grace/context/requirements.xml | .grace/verification/index.xml
# START_BLOCK: M-SEARCH/INIT
from src.search.indexer import index_passport, reindex_all
from src.search.searcher import search_scenes

__all__ = ["index_passport", "search_scenes", "reindex_all"]
# END_BLOCK: M-SEARCH/INIT
