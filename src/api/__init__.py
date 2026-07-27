# MODULE_MAP: src/api/
# MODULE_CONTRACT: M-API
# PURPOSE: FastAPI endpoints, job queue, оркестрация пайплайна, Prometheus-метрики
# SCOPE: POST /analyze, GET /analyze/{job_id}|/status|/markdown, GET /health, GET /metrics. JobResult, JobStatus.
# DEPENDS: M-CORE, M-AUDIO, M-VISION, M-SEMANTIC, M-PASSPORT, M-MIXER, M-SEARCH
# LINKS: .grace/graph/index.xml | .grace/context/requirements.xml | .grace/verification/index.xml
# START_BLOCK: M-API/INIT
from src.api.metrics import jobs_active, jobs_total, processing_duration_seconds, scenes_total, vlm_calls_total
from src.api.pipeline import run_pipeline

__all__ = [
    "jobs_active", "jobs_total", "processing_duration_seconds",
    "scenes_total", "vlm_calls_total", "run_pipeline",
]
# END_BLOCK: M-API/INIT
