from pathlib import Path

from src.core.config import config
from src.core.logging_config import get_logger
from src.core.schemas import (
    CelebrityVoice,
    MusicMatch,
    Passport,
    SceneAnalysisResult,
    TimelineSegment,
)
from src.core.time_utils import fmt_sec
from src.moderator.moderator import assess_moderation
from src.passport_builder.frontmatter_generator import build_frontmatter
from src.passport_builder.validator import validate


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
moderation:
  age_rating: "{moderation_age_rating}"
  verdict: {moderation_verdict}
  categories_flagged: {moderation_categories}
  flags: {moderation_flags_count}
  summary: "{moderation_summary}"
---

# Таймлайн и монетизация

{timeline_md}

# Музыка

{music_md}

# Знаменитость

{celebrity_md}
"""


def _scene_to_md(i: int, scene: SceneAnalysisResult, seg: TimelineSegment | None) -> str:
    lines = []
    start_sec = scene.start_sec if scene.start_sec is not None else (seg.start_sec if seg else None)
    end_sec = scene.end_sec if scene.end_sec is not None else (seg.end_sec if seg else None)
    start_str = f"{int(start_sec // 60):02d}:{int(start_sec % 60):02d}" if start_sec is not None else f"scene_{i}"
    end_str = f"{int(end_sec // 60):02d}:{int(end_sec % 60):02d}" if end_sec is not None else ""
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
        elif m.type == "music_track":
            lines.append(f"* **[MUSIC_TRACK]** — {m.search_query or ''}")
            if m.reason:
                lines.append(f"  * Контекст: {m.reason}")
        elif m.type == "artist_merch":
            lines.append(f"* **[ARTIST_MERCH]** — {m.search_query or ''}")
            if m.reason:
                lines.append(f"  * Контекст: {m.reason}")
        elif m.type == "event_ticket":
            lines.append(f"* **[EVENT_TICKET]** — {m.search_query or ''}")
            if m.reason:
                lines.append(f"  * Контекст: {m.reason}")
        elif m.type == "celebrity_appearance":
            lines.append(f"* **[CELEBRITY_APPEARANCE]** — {m.search_query or ''}")
            if m.reason:
                lines.append(f"  * Контекст: {m.reason}")

    if scene.clip_candidate:
        t1, t2 = scene.clip_candidate.time_range_start, scene.clip_candidate.time_range_end
        lines.append(f"* **[CLIP_CANDIDATE: {fmt_sec(t1)} - {fmt_sec(t2)}]**")
        lines.append(f"  * Хук: {scene.clip_candidate.hook}")
        lines.append(f"  * Виральный потенциал: {scene.clip_candidate.virality_potential}")

    if scene.fallback_used:
        lines.append(f"  * [FALLBACK]: {scene.fallback_used}")

    lines.append("\n---\n")
    return "\n".join(lines)


# START_BLOCK: M-PASSPORT/BUILDER/BUILD_PASSPORT
async def build_passport(
    video_id: str,
    timeline_segments: list[TimelineSegment],
    scene_results: list[SceneAnalysisResult],
    log=None,
    music_matches: list[MusicMatch] | None = None,
    celebrity_voice: CelebrityVoice | None = None,
    genre: str = "unknown",
    ocr_text: str = "",
) -> Passport:
    log = log or get_logger()
    full_transcript = "\n".join(s.text for s in timeline_segments if s.text)

    frontmatter = await build_frontmatter(video_id, full_transcript, genre=genre, log=log)

    for i, scene in enumerate(scene_results):
        if i < len(timeline_segments):
            seg = timeline_segments[i]
            if scene.start_sec is None:
                scene.start_sec = seg.start_sec
            if scene.end_sec is None:
                scene.end_sec = seg.end_sec

    scene_summaries = "\n".join(
        f"[{i}] {s.scene_summary}" for i, s in enumerate(scene_results)
    )
    moderation = await assess_moderation(
        full_transcript=full_transcript,
        scene_summaries=scene_summaries,
        genre=genre,
        ocr_text=ocr_text,
        music_matches=music_matches,
        celebrity_voice=celebrity_voice,
        log=log,
    )
    frontmatter.moderation = moderation
    frontmatter.brand_safety_score = moderation.brand_safety_score

    passport = Passport(
        frontmatter=frontmatter,
        timeline=scene_results,
        raw_timeline_segments=timeline_segments,
        audio_matches=music_matches or [],
        celebrity_voice=celebrity_voice,
    )

    errors = validate(passport, log=log)
    if errors:
        log.warning("[M-PASSPORT][BUILDER][VALIDATION_ERRORS]", count=len(errors))

    try:
        from src.search.indexer import index_passport
        indexed = await index_passport(passport, log=log)
        log.info("[M-PASSPORT][BUILDER][INDEXED]", scenes=indexed)
    except ImportError as e:
        log.warning("[M-PASSPORT][BUILDER][INDEX_UNAVAILABLE]", error=str(e))
    except Exception as e:
        log.warning("[M-PASSPORT][BUILDER][INDEX_FAILED]", error=str(e))

    return passport
# END_BLOCK: M-PASSPORT/BUILDER/BUILD_PASSPORT


# START_BLOCK: M-PASSPORT/BUILDER/PASSPORT_TO_MD
def _music_to_md(matches: list[MusicMatch]) -> str:
    if not matches:
        return "_Треки не найдены_"
    lines = []
    for m in matches:
        meta = " · ".join(
            x for x in [m.genre or "", m.album or "", str(m.year) if m.year else ""] if x
        )
        line = f"* **{m.artist} — {m.track_name}** (уверенность: {m.confidence:.0%})"
        if meta:
            line += f" — {meta}"
        lines.append(line)
    return "\n".join(lines)


def _celebrity_to_md(voice: CelebrityVoice | None) -> str:
    if not voice:
        return "_Знаменитость не распознана_"
    line = f"* **{voice.name}**"
    if voice.profession:
        line += f" — {voice.profession}"
    line += f" (уверенность: {voice.confidence:.0%})"
    return line


def passport_to_markdown(passport: Passport) -> str:
    timeline_md = "\n".join(
        _scene_to_md(i, scene, passport.raw_timeline_segments[i] if i < len(passport.raw_timeline_segments) else None)
        for i, scene in enumerate(passport.timeline)
    )

    mod = passport.frontmatter.moderation
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
        moderation_age_rating=mod.age_rating if mod else "0+",
        moderation_verdict=mod.verdict if mod else "approved",
        moderation_categories=mod.categories_flagged if mod else [],
        moderation_flags_count=len(mod.flags) if mod else 0,
        moderation_summary=_escape_yaml_value(mod.summary) if mod else "",
        timeline_md=timeline_md,
        music_md=_music_to_md(passport.audio_matches),
        celebrity_md=_celebrity_to_md(passport.celebrity_voice),
    )
# END_BLOCK: M-PASSPORT/BUILDER/PASSPORT_TO_MD


# START_BLOCK: M-PASSPORT/BUILDER/SAVE_PASSPORT
def save_passport_to_disk(passport: Passport, log=None) -> None:
    log = log or get_logger()
    output_dir = Path(config.passport_output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    video_id = passport.frontmatter.video_id
    json_path = output_dir / f"{video_id}.json"
    json_path.write_text(passport.model_dump_json(indent=2), encoding="utf-8")
    md_path = output_dir / f"{video_id}.md"
    md_path.write_text(passport_to_markdown(passport), encoding="utf-8")
    log.info("[M-PASSPORT][BUILDER][SAVED]", video_id=video_id, json=str(json_path), md=str(md_path))
# END_BLOCK: M-PASSPORT/BUILDER/SAVE_PASSPORT
