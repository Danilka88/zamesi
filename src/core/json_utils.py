import json
import re


def extract_json(text: str) -> str:
    text = text.strip()
    if text.startswith("`"):
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline + 1 :]
        text = re.sub(r"```\s*$", "", text).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON found in response: {text[:200]}")
    candidate = text[start : end + 1]
    json.loads(candidate)
    return candidate
