import json

from src.config import config
from src.core.exceptions import JSONParseError
from src.core.json_utils import extract_json
from src.core.logging_config import get_logger
from src.core.timeout_manager import timeout_manager


# START_BLOCK: M-MIXER/PLANNER/PLAN_STAGES
async def plan_stages(query: str, log=None) -> list[dict]:
    log = log or get_logger()
    system = "Ты — сценарист видеомонтажа. Разбей запрос пользователя на 3-5 последовательных этапов."
    instructions = (
        'Для каждого этапа дай "title" (2-4 слова) и "description" (1-2 предложения).\n'
        'Формат: [{"title":"...","description":"..."}]\n'
        f'Запрос: {query}'
    )
    prompt = f"{system}\n\n{instructions}"

    raw = await timeout_manager.call_ollama(
        prompt=prompt,
        timeout_name="llm_general_default",
        call_name="mix_plan_stages",
        model=config.mixer_llm_model,
        log=log,
    )
    try:
        stages = json.loads(raw)
    except (ValueError, json.JSONDecodeError):
        try:
            extracted = extract_json(raw)
            stages = json.loads(extracted)
        except (ValueError, JSONParseError) as e:
            log.warning("[M-MIXER][PLANNER][PARSE_ERROR]", error=str(e))
            raise

    if not isinstance(stages, list) or len(stages) < 2:
        raise ValueError(f"Expected at least 2 stages, got {len(stages)}")

    log.info("[M-MIXER][PLANNER][STAGES]", count=len(stages))
    return stages
# END_BLOCK: M-MIXER/PLANNER/PLAN_STAGES
