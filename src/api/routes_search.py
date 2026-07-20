# START_BLOCK: M-SEARCH/ROUTES/SEARCH
from fastapi import APIRouter, Query

from src.core.logging_config import get_logger
from src.core.schemas import SearchResult
from src.search.indexer import reindex_all
from src.search.searcher import search_scenes

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/")
async def search(q: str = Query(...), top_k: int = 20, genre: str | None = None) -> list[SearchResult]:
    log = get_logger()
    log.info("[M-SEARCH][ROUTES][SEARCH_QUERY]", query=q)
    filter_dict = {"genre": genre} if genre else None
    results = await search_scenes(q, top_k=top_k, filter=filter_dict, log=log)
    return results
# END_BLOCK: M-SEARCH/ROUTES/SEARCH


# START_BLOCK: M-SEARCH/ROUTES/REINDEX
@router.post("/reindex")
async def reindex() -> dict:
    log = get_logger()
    total = await reindex_all(log=log)
    return {"status": "ok", "indexed": total}
# END_BLOCK: M-SEARCH/ROUTES/REINDEX
