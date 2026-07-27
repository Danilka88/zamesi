from prometheus_client import Counter, Gauge, Histogram

# START_BLOCK: M-API/METRICS/ALL
processing_duration_seconds = Histogram(
    "pipeline_processing_duration_seconds",
    "Time to process a single video",
    buckets=(10, 30, 60, 120, 300, 600),
)

vlm_calls_total = Counter(
    "pipeline_vlm_calls_total",
    "Total VLM (vision) calls",
)

scenes_total = Counter(
    "pipeline_scenes_total",
    "Total analyzed scenes",
)

jobs_active = Gauge(
    "pipeline_jobs_active",
    "Currently processing jobs",
)

jobs_total = Counter(
    "pipeline_jobs_total",
    "Total jobs submitted",
    ["status"],
)
# END_BLOCK: M-API/METRICS/ALL
