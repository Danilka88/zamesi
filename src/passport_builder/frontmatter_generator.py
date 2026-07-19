import json

from src.core.logging_config import get_logger
from src.core.schemas import PassportFrontmatter
from src.semantic_analyzer.qwen_client import generate_frontmatter


async def build_frontmatter(video_id: str, full_transcript: str, log=None) -> PassportFrontmatter:
    log = log or get_logger()
    try:
        raw_json = await generate_frontmatter(full_transcript, log=log)
        data = json.loads(raw_json)
        return PassportFrontmatter(
            video_id=video_id,
            domain_type=data.get("domain_type", "unknown"),
            brand_safety_score=min(100, max(0, data.get("brand_safety_score", 100))),
            target_audience=data.get("target_audience", []),
            seo_title=data.get("seo_title", "")[:200],
            seo_tags=data.get("seo_tags", [])[:10],
            trending_cluster=data.get("trending_cluster", ""),
            auto_playlists=data.get("auto_playlists", []),
            ad_targeting_keywords=data.get("ad_targeting_keywords", []),
        )
    except Exception as e:
        log.warning("frontmatter_fallback", error=str(e))
        return PassportFrontmatter(
            video_id=video_id,
            domain_type="unknown",
            seo_title=full_transcript[:100],
        )
