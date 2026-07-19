
from src.config import config
from src.core.logging_config import get_logger
from src.core.schemas import SearchResult
from src.search.indexer import _embed_text, _get_client


# START_BLOCK: M-SEARCH/SEARCHER/SEARCH_SCENES
def search_scenes(query: str, top_k: int = 20, filter: dict | None = None, log=None) -> list[SearchResult]:
    log = log or get_logger()
    log.info("[M-SEARCH][SEARCHER][QUERY]", query=query, top_k=top_k)

    embedding = _embed_text(query)
    client = _get_client()
    collection = client.get_or_create_collection(name=config.search_collection)

    results = collection.query(
        query_embeddings=[embedding],
        n_results=top_k,
        where=filter,
    )

    items: list[SearchResult] = []
    if results["ids"] and results["ids"][0]:
        for i, doc_id in enumerate(results["ids"][0]):
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            distance = results["distances"][0][i] if results["distances"] else 0.0
            raw_types = meta.get("monetization_types", "")
            monetization_types = raw_types.split(",") if raw_types else []
            items.append(SearchResult(
                video_id=meta.get("video_id", ""),
                scene_index=int(meta.get("scene_index", 0)),
                start_sec=float(meta.get("start_sec", 0.0)),
                end_sec=float(meta.get("end_sec", 0.0)),
                summary=meta.get("summary", ""),
                speaker=meta.get("speaker", ""),
                text=results["documents"][0][i] if results["documents"] else "",
                genre=meta.get("genre", ""),
                monetization_types=monetization_types,
                score=float(distance),
            ))

    log.info("[M-SEARCH][SEARCHER][RESULTS]", count=len(items))
    return sorted(items, key=lambda x: x.score, reverse=False)
# END_BLOCK: M-SEARCH/SEARCHER/SEARCH_SCENES
