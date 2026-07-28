import type { IApiClient } from './client'
import type {
  JobSummary, Passport, JobMetrics, ModerationReport,
  AudioData, FlatMonetizationItem, Mix, SearchResult
} from '../types'

export class RealApiClient implements IApiClient {
  constructor(private baseURL: string) {}

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseURL}${path}`)
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
    return res.json()
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseURL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  }

  async getJobs(): Promise<JobSummary[]> {
    return this.get('/api/v1/jobs')
  }

  async getPassport(jobId: string): Promise<Passport> {
    return this.get(`/api/v1/jobs/${jobId}/passport`)
  }

  async getMetrics(jobId: string): Promise<JobMetrics> {
    return this.get(`/api/v1/jobs/${jobId}/metrics`)
  }

  async getModeration(jobId: string): Promise<ModerationReport> {
    return this.get(`/api/v1/jobs/${jobId}/moderation`)
  }

  async getAudio(jobId: string): Promise<AudioData> {
    return this.get(`/api/v1/jobs/${jobId}/audio`)
  }

  async getMonetization(jobId: string): Promise<FlatMonetizationItem[]> {
    return this.get(`/api/v1/jobs/${jobId}/monetization`)
  }

  async getMix(mixId: string): Promise<Mix> {
    return this.get(`/api/v1/mix/${mixId}`)
  }

  async search(query: string, genre?: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({ q: query })
    if (genre) params.set('genre', genre)
    return this.get(`/api/v1/search?${params}`)
  }

  async uploadVideo(file: File): Promise<{ job_id: string }> {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${this.baseURL}/api/v1/analyze`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) throw new Error(`Upload error: ${res.status}`)
    return res.json()
  }

  subscribe(path: string, cb: (data: unknown) => void): () => void {
    const es = new EventSource(`${this.baseURL}${path}`)
    es.onmessage = (e) => {
      try { cb(JSON.parse(e.data)) } catch { /* ignore */ }
    }
    return () => es.close()
  }
}
