from pathlib import Path
from typing import Any

import chromadb  # type: ignore[valid-type]
import httpx
import yaml

from src.config import config
from src.core.logging_config import get_logger
from src.core.schemas import Passport, TimelineSegment

_client: Any = None


def _get_client() -> Any:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=config.search_chroma_path)
    return _client


def _embed_text(text: str) -> list[float]:
    resp = httpx.post(
        f"{config.ollama_endpoint}/api/embed",
        json={"model": config.search_embedding_model, "input": text},
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json()["embeddings"][0]


# START_BLOCK: M-SEARCH/INDEXER/INDEX_PASSPORT
def index_passport(passport: Passport, log=None) -> int:
    log = log or get_logger()
    client = _get_client()
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

        embedding = _embed_text(chunk_text)
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
def reindex_all(log=None) -> int:
    log = log or get_logger()
    output_dir = Path(config._get("passport", "output_dir", default="./output"))
    if not output_dir.exists():
        log.warning("[M-SEARCH][INDEXER][REINDEX_START]", path=str(output_dir), exists=False)
        return 0

    total = 0
    md_files = list(output_dir.glob("*.md"))
    log.info("[M-SEARCH][INDEXER][REINDEX_START]", files=len(md_files))
    for md_path in md_files:
        raw = md_path.read_text(encoding="utf-8")
        parts = raw.split("---", 2)
        if len(parts) < 3:
            log.warning("[M-SEARCH][INDEXER][SKIP]", path=str(md_path))
            continue
        frontmatter_raw = parts[1].strip()
        fm_data = yaml.safe_load(frontmatter_raw)
        from src.core.schemas import PassportFrontmatter, SceneAnalysisResult
        frontmatter = PassportFrontmatter(**fm_data)
        timeline_data = yaml.safe_load(parts[2]) or []
        timeline = [SceneAnalysisResult(**s) for s in timeline_data]
        passport = Passport(frontmatter=frontmatter, timeline=timeline)
        indexed = index_passport(passport, log=log)
        total += indexed
    log.info("[M-SEARCH][INDEXER][REINDEX_DONE]", total=total)
    return total
# END_BLOCK: M-SEARCH/INDEXER/REINDEX
