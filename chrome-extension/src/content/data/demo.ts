// [M-EXTENSION][DEMO][START_BLOCK]
// DemoDataProvider — локальные демо-данные (NFR-7: ноль внешних запросов).
import type { JobMetrics, ModerationReport, Passport, MonetizationType } from "../../data/types";
import { getDefaultPassport } from "../../data/registry";
import { matchByVideoId } from "./bindings";
import type { DataProvider, DataProviderResult, DataSource } from "./provider";

export function computeMetrics(passport: Passport): JobMetrics {
  const counters: Record<MonetizationType, number> = {
    ad_slot: 0,
    ecom_item: 0,
    clip_candidate: 0,
    music_track: 0,
    artist_merch: 0,
    event_ticket: 0,
    celebrity_appearance: 0,
  };
  let vlmCalls = 0;
  for (const scene of passport.timeline) {
    if (scene.requires_vision) vlmCalls += 1;
    for (const m of scene.monetization) counters[m.type] += 1;
  }
  const totalScenes = passport.timeline.length;
  const vlmPercent = totalScenes ? Math.round((vlmCalls / totalScenes) * 100) : 0;
  const durRaw = passport.raw_timeline_segments;
  const duration = durRaw.length ? Math.max(...durRaw.map((s) => s.end_sec)) : 60;
  const moderation = passport.frontmatter.moderation;
  return {
    video_duration_sec: duration,
    processing_time_sec: passport.timeline.reduce((a, s) => a + s.processing_time_sec, 0),
    total_scenes: totalScenes,
    vlm_calls: vlmCalls,
    vlm_percent: vlmPercent,
    ad_slots: counters.ad_slot,
    ecom_items: counters.ecom_item,
    clip_candidates: counters.clip_candidate,
    music_tracks: counters.music_track,
    event_tickets: counters.event_ticket,
    celebrity_hits: passport.celebrity_voice ? 1 : 0,
    fingerprint_matches: passport.audio_matches.length,
    json_errors: 0,
    fallbacks_used: passport.timeline.filter((s) => s.fallback_used).length,
    timeouts_occurred: 0,
    moderation_verdict: moderation?.verdict ?? "approved",
    moderation_flags_count: moderation?.flags.length ?? 0,
  };
}

export const demoSource: DataSource = { mode: "demo", label: "Демо-данные (локально)" };

export class DemoDataProvider implements DataProvider {
  readonly source: DataSource = demoSource;

  isAvailable(): boolean {
    return true;
  }

  async load(videoId: string): Promise<DataProviderResult> {
    const byRealId = matchByVideoId(videoId);
    if (byRealId) {
      return this.#snapshot(byRealId.passport);
    }
    // fallback: не знаем video_id — возвращаем дефолтный демо-паспорт
    const def = getDefaultPassport();
    return def ? this.#snapshot(def) : { ok: false, reason: "no_demo_data", passport: null, metrics: null, moderation: null };
  }

  #snapshot(passport: Passport): DataProviderResult {
    const moderation: ModerationReport | null = passport.frontmatter.moderation;
    return {
      ok: true,
      passport,
      metrics: computeMetrics(passport),
      moderation,
    };
  }
}
// = [M-EXTENSION][DEMO][END_BLOCK]