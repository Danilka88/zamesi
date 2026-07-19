import re

from src.core.logging_config import get_logger
from src.core.schemas import Passport, SceneAnalysisResult, TimelineSegment
from src.passport_builder.frontmatter_generator import build_frontmatter
from src.passport_builder.validator import validate

_NON_PRINTABLE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def _escape_yaml_value(s: str) -> str:
    return (
        s.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t")
    )


_MD_TEMPLATE = """---
{video_id}
domain_type: {domain_type}
brand_safety_score: {brand_safety_score}
target_audience: {target_audience}
seo_title: "{seo_title}"
seo_tags: {seo_tags}
trending_cluster: "{trending_cluster}"
auto_playlists: {auto_playlists}
ad_targeting_keywords: {ad_targeting_keywords}
---

# Таймлайн и монетизация

{timeline_md}
"""


def _scene_to_md(i: int, scene: SceneAnalysisResult, seg: TimelineSegment | None) -> str:
    lines = []
    start_str = f"{int(seg.start_sec // 60):02d}:{int(seg.start_sec % 60):02d}" if seg else f"scene_{i}"
    end_str = f"{int(seg.end_sec // 60):02d}:{int(seg.end_sec % 60):02d}" if seg else ""
    header = f"## [{start_str} - {end_str}] {scene.scene_summary}" if end_str else f"## {scene.scene_summary}"
    lines.append(header)

    if seg and seg.speaker:
        lines.append(f"* **Спикер:** {seg.speaker}")
    if seg:
        lines.append(f"* **ASR Context:** \"{seg.text[:200]}\"")

    for m in scene.monetization:
        if m.type == "ecom_item":
            lines.append(f"* **[ECOM_ITEM]** — Поисковый запрос: \"{m.search_query}\"")
            if m.confidence:
                lines.append(f"  * Уверенность: {m.confidence:.0%}")
        elif m.type == "ad_slot":
            lines.append(f"* **[AD_SLOT]** — Таргетинг: \"{m.search_query or ''}\"")
            if m.reason:
                lines.append(f"  * Контекст: {m.reason}")

    if scene.clip_candidate:
        def _ts(sec: float) -> str:
            return f"{int(sec) // 60:02d}:{int(sec) % 60:02d}"
        t1, t2 = scene.clip_candidate.time_range_start, scene.clip_candidate.time_range_end
        lines.append(f"* **[CLIP_CANDIDATE: {_ts(t1)} - {_ts(t2)}]**")
        lines.append(f"  * Хук: {scene.clip_candidate.hook}")
        lines.append(f"  * Виральный потенциал: {scene.clip_candidate.virality_potential}")

    if scene.fallback_used:
        lines.append(f"  * ⚠ Fallback: {scene.fallback_used}")

    lines.append("\n---\n")
    return "\n".join(lines)


# START_BLOCK: M-PASSPORT/BUILDER/BUILD_PASSPORT
async def build_passport(
    video_id: str,
    timeline_segments: list[TimelineSegment],
    scene_results: list[SceneAnalysisResult],
    log=None,
) -> Passport:
    log = log or get_logger()
    full_transcript = "\n".join(s.text for s in timeline_segments if s.text)

    frontmatter = await build_frontmatter(video_id, full_transcript, log=log)

    passport = Passport(
        frontmatter=frontmatter,
        timeline=scene_results,
        raw_timeline_segments=timeline_segments,
    )

    errors = validate(passport, log=log)
    if errors:
        log.warning("[M-PASSPORT][BUILDER][VALIDATION_ERRORS]", count=len(errors))

    return passport
# END_BLOCK: M-PASSPORT/BUILDER/BUILD_PASSPORT


# START_BLOCK: M-PASSPORT/BUILDER/PASSPORT_TO_MD
def passport_to_markdown(passport: Passport) -> str:
    timeline_md = "\n".join(
        _scene_to_md(i, scene, passport.raw_timeline_segments[i] if i < len(passport.raw_timeline_segments) else None)
        for i, scene in enumerate(passport.timeline)
    )

    return _MD_TEMPLATE.format(
        video_id=f"video_id: \"{passport.frontmatter.video_id}\"",
        domain_type=passport.frontmatter.domain_type,
        brand_safety_score=passport.frontmatter.brand_safety_score,
        target_audience=passport.frontmatter.target_audience,
        seo_title=_escape_yaml_value(passport.frontmatter.seo_title),
        seo_tags=passport.frontmatter.seo_tags,
        trending_cluster=passport.frontmatter.trending_cluster,
        auto_playlists=passport.frontmatter.auto_playlists,
        ad_targeting_keywords=passport.frontmatter.ad_targeting_keywords,
        timeline_md=timeline_md,
    )
# END_BLOCK: M-PASSPORT/BUILDER/PASSPORT_TO_MD
