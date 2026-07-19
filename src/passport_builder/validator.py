import re

from src.core.exceptions import ValidationError as PipelineValidationError
from src.core.logging_config import get_logger
from src.core.schemas import Passport


# START_BLOCK: M-PASSPORT/VALIDATOR/VALIDATE
def validate(passport: Passport, log=None, strict: bool = False) -> list[str]:
    log = log or get_logger()
    errors = []

    if not passport.frontmatter.video_id:
        errors.append("Missing video_id in frontmatter")

    prev_end = -1
    for i, scene in enumerate(passport.timeline):
        ts_match = re.search(r"(\d+:\d+)", scene.scene_summary)
        if ts_match:
            parts = ts_match.group(1).split(":")
            sec = int(parts[0]) * 60 + int(parts[1])
            if sec < prev_end:
                errors.append(f"Scene {i}: timestamp overlap or out of order ({sec} < {prev_end})")
            prev_end = sec

        for m in scene.monetization:
            if m.type == "ecom_item" and not m.search_query:
                errors.append(f"Scene {i}: ECOM_ITEM without search_query")

    if errors:
        log.warning("[M-PASSPORT][VALIDATOR][ERRORS]", count=len(errors), errors=errors)
        if strict:
            raise PipelineValidationError("; ".join(errors))
    else:
        log.info("[M-PASSPORT][VALIDATOR][PASSED]")
    return errors
# END_BLOCK: M-PASSPORT/VALIDATOR/VALIDATE
