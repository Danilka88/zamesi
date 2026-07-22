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

    def _outermost_from(pos: int) -> str | None:
        ch = text[pos]
        if ch not in ("{", "["):
            return None
        close = "}" if ch == "{" else "]"
        depth = 0
        in_str = False
        for j in range(pos, len(text)):
            c = text[j]
            if c == '"' and (j == 0 or text[j-1] != '\\'):
                in_str = not in_str
            if in_str:
                continue
            if c == ch:
                depth += 1
            elif c == close:
                depth -= 1
                if depth == 0:
                    candidate = text[pos : j + 1]
                    json.loads(candidate)
                    return candidate
        return None

    i = 0
    while i < len(text):
        if text[i] in ("{", "["):
            result = _outermost_from(i)
            if result:
                return result
        i += 1

    raise ValueError(f"No JSON found in response: {text[:200]}")
# END_BLOCK: M-CORE/JSON/EXTRACT
