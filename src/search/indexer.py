from pathlib import Path

from src.core.config import config
from src.core.embedding import embed_text, get_chroma_client
from src.core.logging_config import get_logger
from src.core.schemas import Passport, TimelineSegment


# START_BLOCK: M-SEARCH/INDEXER/INDEX_PASSPORT
async def index_passport(passport: Passport, log=None) -> int:
    log = log or get_logger()
    client = get_chroma_client()
    collection = client.get_or_create_collection(
        name=config.search_collection,
        metadata={"hnsw:space": "cosine"},
    )
    for i, scene in enumerate(passport.timeline):
        seg: TimelineSegment | None = (
            passport.raw_timeline_segments[i]
            if i < len(passport.raw_timeline_segments)
            else None
        )
        chunk_parts: list[str] = []
        if seg and seg.speaker:
            chunk_parts.append(f"{seg.speaker}: {seg.text}")
        chunk_parts.append(f"Summary: {scene.scene_summary}")
        monet_types = [m.type for m in scene.monetization]
        if monet_types:
            chunk_parts.append(f"Monetization: {','.join(monet_types)}")
        chunk_text = "\n".join(chunk_parts)

        embedding = await embed_text(chunk_text)
        video_id = passport.frontmatter.video_id
        collection.add(
            embeddings=[embedding],
            metadatas=[{
                "video_id": video_id,
                "scene_index": i,
                "start_sec": seg.start_sec if seg else 0.0,
                "end_sec": seg.end_sec if seg else 0.0,
                "genre": passport.frontmatter.domain_type,
                "speaker": seg.speaker if seg else "",
                "monetization_types": ",".join(monet_types),
                "has_clip": scene.clip_candidate is not None,
                "summary": scene.scene_summary,
            }],
            ids=[f"{video_id}_scene_{i}"],
            documents=[chunk_text],
        )
        log.info("[M-SEARCH][INDEXER][SCENE_INDEXED]",
                 video_id=video_id, scene=i)
    log.info("[M-SEARCH][INDEXER][DONE]", scenes=len(passport.timeline))
    return len(passport.timeline)
# END_BLOCK: M-SEARCH/INDEXER/INDEX_PASSPORT


# START_BLOCK: M-SEARCH/INDEXER/REINDEX
async def reindex_all(log=None) -> int:
    log = log or get_logger()
    output_dir = Path(config.passport_output_dir)
    if not output_dir.exists():
        log.warning("[M-SEARCH][INDEXER][REINDEX_START]", path=str(output_dir), exists=False)
        return 0

    total = 0
    json_files = list(output_dir.glob("*.json"))
    log.info("[M-SEARCH][INDEXER][REINDEX_START]", files=len(json_files))
    for json_path in json_files:
        raw = json_path.read_text(encoding="utf-8")
        passport = Passport.model_validate_json(raw)
        indexed = await index_passport(passport, log=log)
        total += indexed
    log.info("[M-SEARCH][INDEXER][REINDEX_DONE]", total=total)
    return total
# END_BLOCK: M-SEARCH/INDEXER/REINDEX
