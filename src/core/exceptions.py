# START_BLOCK: M-CORE/EXCEPTIONS/ALL
class PipelineError(Exception):
    """Base exception for pipeline errors."""

class TimeoutError(PipelineError):
    """Operation exceeded its allocated timeout."""

class RetryExhaustedError(PipelineError):
    """All retry attempts failed."""

class CircuitBreakerOpenError(PipelineError):
    """Circuit breaker is open — skipping operation."""

class LLMResponseError(PipelineError):
    """LLM returned invalid or unparseable response."""

class JSONParseError(LLMResponseError):
    """LLM returned malformed JSON."""

class FallbackTriggered(PipelineError):
    """Fallback chain consumed — partial result returned."""

class AudioExtractionError(PipelineError):
    """Failed to extract audio from video."""

class ASRError(PipelineError):
    """Speech recognition failed."""

class DiarizationError(PipelineError):
    """Speaker diarization failed."""

class OCRError(PipelineError):
    """OCR processing failed."""

class ValidationError(PipelineError):
    """Output validation failed."""

class ConfigError(PipelineError):
    """Configuration loading failed."""
# END_BLOCK: M-CORE/EXCEPTIONS/ALL
