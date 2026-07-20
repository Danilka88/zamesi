from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class VideoGenre(str, Enum):
    how_to = "how_to"
    review = "review"
    podcast = "podcast"
    lecture = "lecture"
    stream = "stream"
    tech_review = "tech_review"
    diy = "diy"
    true_crime = "true_crime"
    education = "education"
    unknown = "unknown"


class JobStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    done = "done"
    error = "error"


class WordTimestamp(BaseModel):
    word: str
    start_sec: float
    end_sec: float


class SpeakerSegment(BaseModel):
    speaker: str
    start_sec: float
    end_sec: float


class TimelineSegment(BaseModel):
    speaker: str
    start_sec: float
    end_sec: float
    text: str
    word_timestamps: list[WordTimestamp] = []


class OCRResult(BaseModel):
    timestamp_sec: float
    text: str
    confidence: float
    bbox: list[float] | None = None


class MonetizationItem(BaseModel):
    type: Literal["ad_slot", "ecom_item", "clip_candidate"]
    search_query: str | None = None
    reason: str | None = None
    confidence: float | None = None


class ClipCandidate(BaseModel):
    hook: str
    time_range_start: float
    time_range_end: float
    virality_potential: Literal["low", "medium", "high"] = "medium"


class SceneAnalysisResult(BaseModel):
    action_is_clear: bool
    requires_vision: bool
    scene_summary: str
    monetization: list[MonetizationItem] = []
    clip_candidate: ClipCandidate | None = None
    fallback_used: str | None = None
    processing_time_sec: float = 0.0

    @staticmethod
    def build_monetization(parsed: dict) -> list[MonetizationItem]:
        raw = parsed.get("monetization") or []
        return [MonetizationItem(**m) for m in raw]


class PassportFrontmatter(BaseModel):
    video_id: str
    domain_type: str
    brand_safety_score: int = Field(ge=0, le=100, default=100)
    target_audience: list[str] = []
    seo_title: str = ""
    seo_tags: list[str] = []
    trending_cluster: str = ""
    auto_playlists: list[dict] = []
    ad_targeting_keywords: list[str] = []


class Passport(BaseModel):
    frontmatter: PassportFrontmatter
    timeline: list[SceneAnalysisResult]
    raw_timeline_segments: list[TimelineSegment] = []


class JobMetrics(BaseModel):
    video_duration_sec: float = 0.0
    processing_time_sec: float = 0.0
    total_scenes: int = 0
    vlm_calls: int = 0
    vlm_percent: float = 0.0
    ad_slots: int = 0
    ecom_items: int = 0
    clip_candidates: int = 0
    json_errors: int = 0
    fallbacks_used: int = 0
    timeouts_occurred: int = 0


class JobResult(BaseModel):
    job_id: str
    status: JobStatus
    passport: Passport | None = None
    metrics: JobMetrics | None = None
    error: str | None = None
    updated_at: float = 0.0


class AnalyzeResponse(BaseModel):
    job_id: str
    status: JobStatus = JobStatus.pending


class AnalyzeStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    metrics: JobMetrics | None = None
    error: str | None = None


class AnalyzeResultResponse(BaseModel):
    job_id: str
    status: JobStatus
    passport: Passport | None = None
    metrics: JobMetrics | None = None
    error: str | None = None


class SearchResult(BaseModel):
    video_id: str
    scene_index: int
    start_sec: float
    end_sec: float
    summary: str
    speaker: str = ""
    text: str = ""
    genre: str = ""
    monetization_types: list[str] = []
    score: float = 0.0


class MixRequest(BaseModel):
    query: str = Field(min_length=3)
    max_videos_per_stage: int = Field(default=3, ge=1, le=10)


class Stage(BaseModel):
    title: str
    description: str


class MixSceneRef(BaseModel):
    video_id: str
    scene_index: int
    start_sec: float
    end_sec: float
    summary: str
    speaker: str = ""
    text: str = ""


class MixStage(BaseModel):
    title: str
    description: str
    scenes: list[MixSceneRef]


class Mix(BaseModel):
    mix_id: str = ""
    query: str = ""
    stages: list[MixStage] = []
    total_duration_sec: float = 0.0
