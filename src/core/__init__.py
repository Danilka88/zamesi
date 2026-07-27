# MODULE_MAP: src/core/
# MODULE_CONTRACT: M-CORE
# PURPOSE: Pydantic-модели, конфигурация, исключения, TimeoutManager — общие для всех модулей
# SCOPE: Schemas (JobStatus, SceneAnalysisResult, Passport, MonetizationItem…), Config, TimeoutManager
# DEPENDS: (none)
# LINKS: .grace/graph/index.xml | .grace/context/requirements.xml | .grace/verification/index.xml
# START_BLOCK: M-CORE/INIT
from src.core.circuit_breaker import CircuitBreaker
from src.core.config import config
from src.core.exceptions import (
    ASRError,
    AudioExtractionError,
    CircuitBreakerOpenError,
    ConfigError,
    DiarizationError,
    FallbackTriggered,
    JSONParseError,
    LLMResponseError,
    OCRError,
    PipelineError,
    RetryExhaustedError,
    TimeoutError,
    ValidationError,
)
from src.core.json_utils import extract_json
from src.core.logging_config import get_logger, setup_logging
from src.core.metrics import fallbacks_total, json_errors_total, timeouts_total
from src.core.schemas import (
    AnalyzeResponse,
    AnalyzeResultResponse,
    AnalyzeStatusResponse,
    CelebrityVoice,
    ClipCandidate,
    JobMetrics,
    JobResult,
    JobStatus,
    Mix,
    MixRequest,
    MixSceneRef,
    MixStage,
    ModerationFlag,
    ModerationReport,
    MonetizationItem,
    MusicMatch,
    OCRResult,
    Passport,
    PassportFrontmatter,
    SceneAnalysisResult,
    SearchResult,
    SpeakerSegment,
    Stage,
    TimelineSegment,
    TrackMetadata,
    VideoGenre,
    WordTimestamp,
)
from src.core.store import MemoryStore
from src.core.time_utils import fmt_sec

__all__ = [
    "CircuitBreaker", "config",
    "ASRError", "AudioExtractionError", "CircuitBreakerOpenError", "ConfigError",
    "DiarizationError", "FallbackTriggered", "JSONParseError", "LLMResponseError",
    "OCRError", "PipelineError", "RetryExhaustedError", "TimeoutError", "ValidationError",
    "extract_json", "get_logger", "setup_logging",
    "fallbacks_total", "json_errors_total", "timeouts_total",
    "AnalyzeResponse", "AnalyzeResultResponse", "AnalyzeStatusResponse",
    "CelebrityVoice", "ClipCandidate", "JobMetrics", "JobResult", "JobStatus",
    "Mix", "MixRequest", "MixSceneRef", "MixStage", "ModerationFlag",
    "ModerationReport", "MonetizationItem", "MusicMatch", "OCRResult",
    "Passport", "PassportFrontmatter", "SceneAnalysisResult", "SearchResult",
    "SpeakerSegment", "Stage", "TimelineSegment", "TrackMetadata",
    "VideoGenre", "WordTimestamp",
    "MemoryStore", "fmt_sec",
]
# END_BLOCK: M-CORE/INIT
