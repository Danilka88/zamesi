import json
import re


# START_BLOCK: M-CORE/JSON/EXTRACT
def extract_json(text: str) -> str:
    text = text.strip()
    if text.startswith("`"):
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline + 1 :]
        text = re.sub(r"```\s*$", "", text).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        candidate = text[start : end + 1]
        json.loads(candidate)
        return candidate
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1:
        candidate = text[start : end + 1]
        json.loads(candidate)
        return candidate
    raise ValueError(f"No JSON found in response: {text[:200]}")
# END_BLOCK: M-CORE/JSON/EXTRACT
