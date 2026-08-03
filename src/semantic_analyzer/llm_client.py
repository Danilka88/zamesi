import base64
import os

from src.core.config import config
from src.core.exceptions import JSONParseError
from src.core.json_utils import extract_json
from src.core.logging_config import get_logger
from src.core.metrics import json_errors_total
from src.core.timeout_manager import timeout_manager


# START_BLOCK: M-SEMANTIC/QWEN/ANALYZE_TEXT
async def analyze_text_segment(
    genre: str,
    asr_text: str,
    ocr_text: str,
    music_context: str = "(нет)",
    celebrity_context: str = "(нет)",
    log=None,
) -> str:
    log = log or get_logger()
    from src.semantic_analyzer.prompt_templates import PASS1_TEXT_SYSTEM, PASS1_TEXT_USER

    user_prompt = PASS1_TEXT_USER.format(
        genre=genre,
        asr_text=asr_text[:1500],
        ocr_text=ocr_text[:500] or "(нет текста на экране)",
        music_context=music_context[:300],
        celebrity_context=celebrity_context[:300],
    )
    full_prompt = f"{PASS1_TEXT_SYSTEM}\n\n{user_prompt}"

    raw = await timeout_manager.call_llm(
        prompt=full_prompt,
        timeout_name="qwen_pass1_text",
        call_name="pass1_text",
        role="text_model",
        log=log,
    )
    return _extract_json_checked(raw)
# END_BLOCK: M-SEMANTIC/QWEN/ANALYZE_TEXT


# START_BLOCK: M-SEMANTIC/QWEN/ANALYZE_VISION
async def analyze_vision_segment(asr_text: str, image_path: str, log=None) -> str:
    log = log or get_logger()
    from src.semantic_analyzer.prompt_templates import PASS2_VISION_SYSTEM, PASS2_VISION_USER

    max_bytes = config.vision_max_image_bytes
    try:
        size = os.path.getsize(image_path)
    except OSError:
        log.warning("[M-SEMANTIC][QWEN][VISION_FILE_MISSING]", path=image_path)
        return ""

    if size > max_bytes:
        log.warning("[M-SEMANTIC][QWEN][VISION_SKIP_LARGE]", path=image_path, size_bytes=size, max_bytes=max_bytes)
        return ""

    with open(image_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode("utf-8")

    full_prompt = f"{PASS2_VISION_SYSTEM}\n\n{PASS2_VISION_USER}\n\nКонтекст ASR: {asr_text[:500]}"

    raw = await timeout_manager.call_llm(
        prompt=full_prompt,
        image_base64=image_b64,
        timeout_name="qwen_pass2_vision",
        call_name="pass2_vision",
        role="vision_model",
        max_tokens=config.vision_max_tokens,
        log=log,
    )
    return raw
# END_BLOCK: M-SEMANTIC/QWEN/ANALYZE_VISION


async def generate_frontmatter(full_transcript: str, log=None) -> str:
    log = log or get_logger()
    from src.semantic_analyzer.prompt_templates import FRONTMATTER_SYSTEM, FRONTMATTER_USER

    user_prompt = FRONTMATTER_USER.format(full_transcript=full_transcript[:8000])
    full_prompt = f"{FRONTMATTER_SYSTEM}\n\n{user_prompt}"

    raw = await timeout_manager.call_llm(
        prompt=full_prompt,
        timeout_name="qwen_frontmatter",
        call_name="frontmatter",
        role="text_model",
        log=log,
    )
    return _extract_json_checked(raw)


def _extract_json_checked(raw: str) -> str:
    try:
        return extract_json(raw)
    except ValueError as e:
        json_errors_total.inc()
        raise JSONParseError(str(e)) from e
