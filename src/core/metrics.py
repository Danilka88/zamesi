from prometheus_client import Counter

json_errors_total = Counter(
    "pipeline_json_errors_total",
    "JSON parse errors from LLM",
)

timeouts_total = Counter(
    "pipeline_timeouts_total",
    "Total timeout occurrences",
    ["operation"],
)

fallbacks_total = Counter(
    "pipeline_fallbacks_total",
    "Total fallback activations",
    ["strategy"],
)
