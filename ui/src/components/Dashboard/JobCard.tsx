import { Link } from 'react-router-dom'
import type { JobSummary } from '../../types'
import StatusBadge from '../Layout/StatusBadge'

interface Props {
  job: JobSummary
  onSelect?: (jobId: string) => void
}

export default function JobCard({ job, onSelect }: Props) {
  const domainLabel: Record<string, string> = {
    diy: 'DIY',
    tech_review: 'Обзор техники',
    how_to: 'Инструкция',
    podcast: 'Подкаст',
    review: 'Обзор',
    education: 'Образование',
    entertainment: 'Развлечения',
    travel: 'Путешествия',
  }

  const genre = job.video_id.includes('diy') ? 'diy'
    : job.video_id.includes('tech') ? 'tech_review'
    : job.video_id.includes('cooking') ? 'how_to'
    : job.video_id.includes('interview') ? 'podcast'
    : job.video_id.includes('podcast') ? 'podcast'
    : job.video_id.includes('vietnam') || job.video_id.includes('travel') || job.video_id.includes('vlog') ? 'travel'
    : 'unknown'

  const iconMap: Record<string, string> = {
    diy: '🛠️', tech_review: '🎧', how_to: '🍳',
    podcast: '🎙️', unknown: '📹', entertainment: '🌍', travel: '🌍',
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{iconMap[genre] || '📹'}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900">
                {domainLabel[genre] || job.video_id}
              </span>
              <StatusBadge status={job.status} />
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              ID: {job.job_id} · {new Date(job.created_at).toLocaleString('ru-RU')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {job.status === 'done' && (
            <>
              <Link
                to={`/passport/${job.job_id}`}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                onClick={() => onSelect?.(job.job_id)}
              >
                👁 Паспорт
              </Link>
              <Link
                to={`/passport/${job.job_id}/monetization`}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                💰 Монетизация
              </Link>
              <Link
                to={`/passport/${job.job_id}/audio`}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                🎵 Аудио
              </Link>
            </>
          )}
          {job.status === 'error' && (
            <span className="text-xs text-red-500" title={job.error}>
              ⚠️ Ошибка
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
