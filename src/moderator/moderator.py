import json

from src.core.logging_config import get_logger
from src.core.metrics import json_errors_total
from src.core.schemas import CelebrityVoice, ModerationFlag, ModerationReport, MusicMatch
from src.core.timeout_manager import timeout_manager


# START_BLOCK: M-MODERATOR/ASSESS
async def assess_moderation(
    full_transcript: str,
    scene_summaries: str,
    genre: str = "unknown",
    ocr_text: str = "",
    music_matches: list[MusicMatch] | None = None,
    celebrity_voice: CelebrityVoice | None = None,
    log=None,
) -> ModerationReport:
    log = log or get_logger()
    from src.moderator.moderation_prompt import MODERATION_JUDGE_SYSTEM, MODERATION_JUDGE_USER

    music_context = _fmt_music(music_matches)
    celebrity_context = _fmt_celebrity(celebrity_voice)

    user_prompt = MODERATION_JUDGE_USER.format(
        genre=genre,
        full_transcript=full_transcript[:8000],
        scene_summaries=scene_summaries[:2000],
        music_context=music_context[:300],
        celebrity_context=celebrity_context[:300],
        ocr_text=ocr_text[:1000] or "(нет)",
    )
    full_prompt = f"{MODERATION_JUDGE_SYSTEM}\n\n{user_prompt}"

    log.info("[M-MODERATOR][ASSESS_START]")

    try:
        raw = await timeout_manager.call_ollama(
            prompt=full_prompt,
            timeout_name="llm_general_default",
            call_name="moderation_judge",
            log=log,
        )
        data = json.loads(raw)
        report = _parse_report(data)
        log.info("[M-MODERATOR][ASSESS_DONE]",
            verdict=report.verdict, age_rating=report.age_rating,
            flags=len(report.flags),
        )
        return report
    except Exception as e:
        log.warning("[M-MODERATOR][ASSESS_FAILED]", error=str(e))
        json_errors_total.inc()
        return ModerationReport(summary=f"Ошибка модерации: {e}")


def _fmt_music(matches: list[MusicMatch] | None) -> str:
    if not matches:
        return "(нет)"
    parts = [f"{m.artist} — {m.track_name} (genre: {m.genre})" for m in matches]
    return "; ".join(parts)


def _fmt_celebrity(voice: CelebrityVoice | None) -> str:
    if not voice:
        return "(нет)"
    return f"{voice.name} ({voice.profession})"


def _parse_report(data: dict) -> ModerationReport:
    flags_raw = data.get("flags") or []
    flags = []
    for f in flags_raw:
        try:
            sev = str(f.get("severity", "low"))
            if sev not in ("low", "medium", "high"):
                sev = "low"
            flags.append(ModerationFlag(
                category=str(f.get("category", "unknown")),
                severity=sev,  # type: ignore[arg-type]
                timestamp_sec=f.get("timestamp_sec"),
                evidence=str(f.get("evidence", "")) if f.get("evidence") else None,
            ))
        except Exception:
            continue

    ar = str(data.get("age_rating", "0+"))
    if ar not in ("0+", "6+", "12+", "16+", "18+"):
        ar = "0+"
    vd = str(data.get("verdict", "approved"))
    if vd not in ("approved", "flagged", "rejected"):
        vd = "approved"

    return ModerationReport(
        age_rating=ar,  # type: ignore[arg-type]
        verdict=vd,  # type: ignore[arg-type]
        categories_flagged=list(data.get("categories_flagged", [])),
        flags=flags,
        brand_safety_score=min(100, max(0, int(data.get("brand_safety_score", 100)))),
        summary=str(data.get("summary", "")),
    )
# END_BLOCK: M-MODERATOR/ASSESS
