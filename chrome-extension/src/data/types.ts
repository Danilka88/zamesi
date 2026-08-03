// [M-EXTENSION][TYPES][START_BLOCK]
// TS-контракты, зеркало src/core/schemas.py и ui/src/types/index.ts (M-EXTENSION uses-types M-CORE).
export interface JobSummary {
  job_id: string;
  video_id: string;
  status: "pending" | "processing" | "done" | "error";
  created_at: string;
  updated_at: string;
  error?: string;
}

export interface JobMetrics {
  video_duration_sec: number;
  processing_time_sec: number;
  total_scenes: number;
  vlm_calls: number;
  vlm_percent: number;
  ad_slots: number;
  ecom_items: number;
  clip_candidates: number;
  music_tracks: number;
  event_tickets: number;
  celebrity_hits: number;
  fingerprint_matches: number;
  json_errors: number;
  fallbacks_used: number;
  timeouts_occurred: number;
  moderation_verdict: string;
  moderation_flags_count: number;
}

export type MonetizationType =
  | "ad_slot"
  | "ecom_item"
  | "clip_candidate"
  | "music_track"
  | "artist_merch"
  | "event_ticket"
  | "celebrity_appearance";

export interface MonetizationItem {
  type: MonetizationType;
  search_query: string | null;
  reason: string | null;
  confidence: number | null;
}

export interface ClipCandidate {
  hook: string;
  time_range_start: number;
  time_range_end: number;
  virality_potential: "low" | "medium" | "high";
}

export interface SceneAnalysisResult {
  action_is_clear: boolean;
  requires_vision: boolean;
  scene_summary: string;
  /** Позиция сцены на шкале видео (сек). Опционально — если не задано, UI распределяет равномерно. */
  start_sec?: number;
  end_sec?: number;
  monetization: MonetizationItem[];
  clip_candidate: ClipCandidate | null;
  fallback_used: string | null;
  processing_time_sec: number;
}

export interface WordTimestamp {
  word: string;
  start_sec: number;
  end_sec: number;
}

export interface TimelineSegment {
  speaker: string;
  start_sec: number;
  end_sec: number;
  text: string;
  word_timestamps: WordTimestamp[];
}

export interface ModerationFlag {
  category: string;
  severity: "low" | "medium" | "high";
  timestamp_sec: number | null;
  evidence: string | null;
}

export interface ModerationReport {
  age_rating: "0+" | "6+" | "12+" | "16+" | "18+";
  verdict: "approved" | "flagged" | "rejected";
  categories_flagged: string[];
  flags: ModerationFlag[];
  brand_safety_score: number;
  summary: string;
}

export interface PassportFrontmatter {
  video_id: string;
  domain_type: string;
  brand_safety_score: number;
  target_audience: string[];
  seo_title: string;
  seo_tags: string[];
  trending_cluster: string;
  auto_playlists: { id: string; order_index: number; reason: string }[];
  ad_targeting_keywords: string[];
  moderation: ModerationReport | null;
}

export interface MusicMatch {
  track_name: string;
  artist: string;
  confidence: number;
  genre: string;
  album: string;
  year: number | null;
}

export interface TrackMetadata extends MusicMatch {
  afisha_urls: string[];
  merch_urls: string[];
  events: { title?: string; date?: string; venue?: string; url?: string }[];
}

export interface CelebrityVoice {
  name: string;
  profession: string;
  confidence: number;
}

export interface Passport {
  frontmatter: PassportFrontmatter;
  timeline: SceneAnalysisResult[];
  raw_timeline_segments: TimelineSegment[];
  audio_matches: MusicMatch[];
  celebrity_voice: CelebrityVoice | null;
}

export type ViewerMode = "viewer" | "analyst" | "simulation";
// = [M-EXTENSION][TYPES][END_BLOCK]