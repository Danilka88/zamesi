// [M-UI][API-INTERFACE][START_BLOCK]
import type {
  JobSummary, Passport, JobMetrics, ModerationReport,
  AudioData, FlatMonetizationItem, Mix, SearchResult
} from '../types'

export interface IApiClient {
  getJobs(): Promise<JobSummary[]>
  getPassport(jobId: string): Promise<Passport>
  getMetrics(jobId: string): Promise<JobMetrics>
  getModeration(jobId: string): Promise<ModerationReport>
  getAudio(jobId: string): Promise<AudioData>
  getMonetization(jobId: string): Promise<FlatMonetizationItem[]>
  getMix(mixId: string): Promise<Mix>
  search(query: string, genre?: string): Promise<SearchResult[]>
  uploadVideo(file: File): Promise<{ job_id: string }>
  subscribe(path: string, cb: (data: unknown) => void): () => void
}
// = [M-UI][API-INTERFACE][END_BLOCK]
