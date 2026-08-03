import json

from src.core.exceptions import JSONParseError
from src.core.json_utils import extract_json
from src.core.logging_config import get_logger
from src.core.schemas import Mix, MixSceneRef, MixStage, Stage
from src.core.timeout_manager import timeout_manager
from src.search.searcher import search_scenes


# START_BLOCK: M-MIXER/COMPOSER/COMPOSE_MIX
async def compose_mix(
    query: str,
    stages: list[Stage],
    max_videos_per_stage: int = 3,
    log=None,
) -> Mix:
    log = log or get_logger()
    mix_stages: list[MixStage] = []
    total_duration = 0.0

    for stage in stages:
        scenes = await search_scenes(
            stage.description,
            top_k=max_videos_per_stage * 2,
            log=log,
        )
        if not scenes:
            mix_stages.append(MixStage(
                title=stage.title,
                description=stage.description,
                scenes=[],
            ))
            continue

        scene_text = "\n".join(
            f"- [{s.video_id}] {s.summary} ({s.start_sec:.0f}-{s.end_sec:.0f})"
            for s in scenes
        )
        system = "Ты — редактор видеомонтажа. Определи, какие сцены подходят к этапу."
        instructions = (
            f'Этап: "{stage.title}"\n'
            f"Сцены:\n{scene_text}\n"
            'Ответ JSON: {"matched_indices": [0, 2, 5]}'
        )
        prompt = f"{system}\n\n{instructions}"

        raw = await timeout_manager.call_llm(
            prompt=prompt,
            timeout_name="llm_general_default",
            call_name="mix_match_scenes",
            role="mixer_model",
            log=log,
        )
        try:
            match = json.loads(extract_json(raw))
        except (ValueError, JSONParseError):
            log.warning("[M-MIXER][COMPOSER][MATCH_PARSE_ERROR]")
            match = {"matched_indices": list(range(len(scenes)))}

        indices = match.get("matched_indices", [])[:max_videos_per_stage]
        refs = [
            MixSceneRef(
                video_id=scenes[i].video_id,
                scene_index=scenes[i].scene_index,
                start_sec=scenes[i].start_sec,
                end_sec=scenes[i].end_sec,
                summary=scenes[i].summary,
                speaker=scenes[i].speaker,
                text=scenes[i].text,
            )
            for i in indices if i < len(scenes)
        ]
        for r in refs:
            total_duration += r.end_sec - r.start_sec
        mix_stages.append(MixStage(
            title=stage.title,
            description=stage.description,
            scenes=refs,
        ))

    log.info("[M-MIXER][COMPOSER][DONE]", stages=len(mix_stages), total_duration=total_duration)
    return Mix(
        query=query,
        stages=mix_stages,
        total_duration_sec=total_duration,
    )
# END_BLOCK: M-MIXER/COMPOSER/COMPOSE_MIX
