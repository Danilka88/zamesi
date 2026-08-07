// [M-UI][API-DEMO][START_BLOCK]
import type { IApiClient } from './client'
import type {
  JobSummary, Passport, JobMetrics, ModerationReport,
  AudioData, FlatMonetizationItem, Mix, SearchResult
} from '../types'

import { demoJobs } from '../demo/jobs'
import { demoPassports } from '../demo/index'
import { demoMixes } from '../demo/mixes/mixes'
import { demoSearchResults } from '../demo/search/results'

type AnyPassport = Record<string, any>

export class DemoApiClient implements IApiClient {
  private delay = 150

  private wait<T>(val: T): Promise<T> {
    return new Promise(r => setTimeout(() => r(val), this.delay))
  }

  private p(jobId: string): AnyPassport {
    const p = demoPassports[jobId] as AnyPassport
    if (!p) throw new Error(`Passport ${jobId} not found`)
    return p
  }

  async getJobs(): Promise<JobSummary[]> {
    return this.wait(demoJobs)
  }

  async getPassport(jobId: string): Promise<Passport> {
    return this.wait(this.p(jobId) as Passport)
  }

  async getMetrics(jobId: string): Promise<JobMetrics> {
    const p = this.p(jobId)
    return this.wait({
      video_duration_sec: p.raw_timeline_segments?.reduce(
        (s: number, seg: any) => s + (seg.end_sec - seg.start_sec), 0) || 0,
      processing_time_sec: 852,
      total_scenes: p.timeline?.length || 0,
      vlm_calls: Math.floor((p.timeline?.length || 0) * 0.15),
      vlm_percent: 14.3,
      ad_slots: p.timeline?.filter((s: any) =>
        s.monetization?.some((m: any) => m.type === 'ad_slot')).length || 0,
      ecom_items: p.timeline?.reduce(
        (n: number, s: any) => n + (s.monetization?.filter((m: any) => m.type === 'ecom_item').length || 0), 0) || 0,
      clip_candidates: p.timeline?.filter((s: any) => s.clip_candidate).length || 0,
      music_tracks: p.timeline?.reduce(
        (n: number, s: any) => n + (s.monetization?.filter((m: any) => m.type === 'music_track').length || 0), 0) || 0,
      event_tickets: p.timeline?.reduce(
        (n: number, s: any) => n + (s.monetization?.filter((m: any) => m.type === 'event_ticket').length || 0), 0) || 0,
      celebrity_hits: p.timeline?.reduce(
        (n: number, s: any) => n + (s.monetization?.filter((m: any) => m.type === 'celebrity_appearance').length || 0), 0) || 0,
      fingerprint_matches: (p.audio_matches?.length || 0) + (p.celebrity_voice ? 1 : 0),
      json_errors: 0,
      fallbacks_used: p.timeline?.filter((s: any) => s.fallback_used).length || 0,
      timeouts_occurred: 0,
      moderation_verdict: p.frontmatter?.moderation?.verdict || 'approved',
      moderation_flags_count: p.frontmatter?.moderation?.flags?.length || 0,
    })
  }

  async getModeration(jobId: string): Promise<ModerationReport> {
    const p = this.p(jobId)
    return this.wait(p.frontmatter.moderation || {
      age_rating: '0+', verdict: 'approved', categories_flagged: [],
      flags: [], brand_safety_score: 100, summary: '',
    })
  }

  async getAudio(jobId: string): Promise<AudioData> {
    const p = this.p(jobId)
    return this.wait({
      music_matches: (p.audio_matches || []).map((m: any) => ({
        ...m, afisha_urls: m.afisha_urls || [], merch_urls: m.merch_urls || [], events: m.events || [],
      })),
      celebrity: p.celebrity_voice || null,
    })
  }

  async getMonetization(jobId: string): Promise<FlatMonetizationItem[]> {
    const p = this.p(jobId)
    const items: FlatMonetizationItem[] = []
    ;(p.timeline || []).forEach((scene: any, idx: number) => {
      ;(scene.monetization || []).forEach((m: any) => {
        items.push({
          scene_index: idx,
          type: m.type,
          search_query: m.search_query || null,
          confidence: m.confidence ?? null,
          reason: m.reason || null,
          timestamp_sec: p.raw_timeline_segments?.[idx]?.start_sec || idx * 5,
        })
      })
    })
    return this.wait(items)
  }

  async getMix(mixId: string): Promise<Mix> {
    const m = (demoMixes as Record<string, Mix>)[mixId]
    if (!m) throw new Error(`Mix ${mixId} not found`)
    return this.wait(m)
  }

  async search(query: string, _genre?: string): Promise<SearchResult[]> {
    const q = query.toLowerCase()
    const results = demoSearchResults.filter(r =>
      r.summary.toLowerCase().includes(q) ||
      r.text.toLowerCase().includes(q) ||
      r.video_id.toLowerCase().includes(q)
    )
    return this.wait(results.slice(0, 20))
  }

  async uploadVideo(_file: File): Promise<{ job_id: string }> {
    await new Promise(r => setTimeout(r, 2000))
    return this.wait({ job_id: 'demo_' + Math.random().toString(36).slice(2, 6) })
  }

  subscribe(_path: string, _cb: (data: unknown) => void): () => void {
    return () => {}
  }
}
// = [M-UI][API-DEMO][END_BLOCK]
