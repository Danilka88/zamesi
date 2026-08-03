import json
import time

from src.core.logging_config import get_logger
from src.core.schemas import CelebrityVoice, ClipCandidate, MusicMatch, SceneAnalysisResult, TimelineSegment
from src.semantic_analyzer.llm_client import analyze_text_segment, analyze_vision_segment
from src.vision_scanner.ocr_buffer import OCRBuffer


# START_BLOCK: M-SEMANTIC/SCENE/ANALYZE_SCENES
def _fmt_music(matches: list[MusicMatch] | None) -> str:
    if not matches:
        return "(нет)"
    parts = [f"{m.artist} — {m.track_name} (conf: {m.confidence})" for m in matches]
    return "; ".join(parts)


def _fmt_celebrity(voice: CelebrityVoice | None) -> str:
    if not voice:
        return "(нет)"
    return f"{voice.name} ({voice.profession}, conf: {voice.confidence})"


async def analyze_scenes(
    timeline: list[TimelineSegment],
    genre: str,
    vision_blocked: bool,
    ocr_buffer: OCRBuffer,
    iframe_map: dict[float, str],
    music_matches: list[MusicMatch] | None = None,
    celebrity_voice: CelebrityVoice | None = None,
    log=None,
) -> tuple[list[SceneAnalysisResult], int]:
    log = log or get_logger()
    results = []
    vlm_calls = 0
    music_matches = music_matches or []

    for seg in timeline:
        start_time = time.monotonic()
        mid_ts = (seg.start_sec + seg.end_sec) / 2
        ocr_text = ocr_buffer.check(mid_ts) or ""

        try:
            raw_json = await analyze_text_segment(
                genre=genre,
                asr_text=seg.text,
                ocr_text=ocr_text,
                music_context=_fmt_music(music_matches),
                celebrity_context=_fmt_celebrity(celebrity_voice),
                log=log,
            )
            parsed = json.loads(raw_json)

            if parsed.get("requires_vision") and not vision_blocked:
                ocr_at_moment = ocr_buffer.check(mid_ts)
                if not ocr_at_moment:
                    frame_path = iframe_map.get(mid_ts)
                    if frame_path:
                        vision_desc = await analyze_vision_segment(
                            asr_text=seg.text,
                            image_path=frame_path,
                            log=log,
                        )
                        if vision_desc:
                            parsed["scene_summary"] += f" [Видео: {vision_desc[:200]}]"
                        vlm_calls += 1

            result = SceneAnalysisResult(
                action_is_clear=parsed.get("action_is_clear", True),
                requires_vision=parsed.get("requires_vision", False),
                scene_summary=parsed.get("scene_summary", seg.text[:120]),
                monetization=SceneAnalysisResult.build_monetization(parsed),
                clip_candidate=ClipCandidate(**parsed["clip_candidate"]) if parsed.get("clip_candidate") else None,
                processing_time_sec=time.monotonic() - start_time,
            )

        except Exception as e:
            log.warning("[M-SEMANTIC][SCENE][ANALYSIS_FAILED]", error=str(e), asr_preview=seg.text[:80])
            result = SceneAnalysisResult(
                action_is_clear=True,
                requires_vision=False,
                scene_summary=seg.text[:120],
                monetization=[],
                clip_candidate=None,
                fallback_used="llm_failed",
                processing_time_sec=time.monotonic() - start_time,
            )

        results.append(result)

    vlm_pct = round(vlm_calls / len(results) * 100, 1) if results else 0
    log.info("[M-SEMANTIC][SCENE][ALL_DONE]", total=len(results), vlm_calls=vlm_calls, vlm_percent=vlm_pct)
    return results, vlm_calls
# END_BLOCK: M-SEMANTIC/SCENE/ANALYZE_SCENES
