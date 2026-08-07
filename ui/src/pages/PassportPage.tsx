// [M-UI][PAGE-PASSPORT][START_BLOCK]
import { useParams, useNavigate, Link } from 'react-router-dom'
import type { Passport, FlatMonetizationItem, AudioData, JobMetrics } from '../types'
import { useApi } from '../hooks/useApi'
import { api } from '../api'

import FrontmatterPanel from '../components/Passport/FrontmatterPanel'
import Timeline from '../components/Passport/Timeline'
import TimelineMap from '../components/Passport/TimelineMap'
import MonetizationDashboard from '../components/Monetization/MonetizationDashboard'
import MusicPanel from '../components/Audio/MusicPanel'
import ModerationPanel from '../components/Moderation/ModerationPanel'
import MetricsTab from '../components/Metrics/MetricsTab'

const TABS = [
  { id: 'timeline', label: '📋 Таймлайн', description: 'Сцены и монетизация' },
  { id: 'monetization', label: '💰 Монетизация', description: 'Все точки монетизации' },
  { id: 'audio', label: '🎵 Аудио', description: 'Музыка и знаменитости' },
  { id: 'moderation', label: '🛡 Модерация', description: 'Проверка контента' },
  { id: 'metrics', label: '📊 Метрики', description: 'Данные обработки' },
]

export default function PassportPage() {
  const { jobId, tab } = useParams()
  const navigate = useNavigate()
  const currentTab = tab || 'timeline'

  const { data: passport, loading, error } = useApi<Passport>(
    () => api.getPassport(jobId!),
    [jobId]
  )

  const { data: monetizationItems } = useApi<FlatMonetizationItem[]>(
    () => api.getMonetization(jobId!).catch(() => []),
    [jobId]
  )

  const { data: audioData } = useApi<AudioData | null>(
    () => api.getAudio(jobId!).catch(() => null),
    [jobId]
  )

  const { data: metrics } = useApi<JobMetrics | null>(
    () => api.getMetrics(jobId!).catch(() => null),
    [jobId]
  )

  const moderationReport = passport?.frontmatter.moderation || null

  if (loading) {
    return (
      <div className="text-center py-16 text-slate-400">
        <div className="animate-spin text-4xl mb-3">⏳</div>
        <p className="font-medium">Загрузка паспорта видео...</p>
      </div>
    )
  }

  if (error || !passport) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">❌</p>
        <p className="text-slate-600 font-medium">Не удалось загрузить паспорт</p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
        <Link to="/" className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
          ← Вернуться
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-800 mb-1 inline-block">
            ← Панель управления
          </Link>
          <h1 className="text-xl font-bold text-slate-900">
            Паспорт видео: {passport.frontmatter.video_id}
          </h1>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-1 bg-white rounded-lg border border-slate-200 p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => navigate(`/passport/${jobId}/${t.id}`)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap
              ${currentTab === t.id
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            title={t.description}
          >
            {t.label}
          </button>
        ))}
      </div>

      {currentTab === 'timeline' && (
        <div className="space-y-4">
          <FrontmatterPanel frontmatter={passport.frontmatter} />
          <TimelineMap
            timeline={passport.timeline}
            segments={passport.raw_timeline_segments}
          />
          <Timeline
            timeline={passport.timeline}
            segments={passport.raw_timeline_segments}
          />
        </div>
      )}

      {currentTab === 'monetization' && (
        <MonetizationDashboard
          items={monetizationItems || []}
          frontmatter={passport.frontmatter}
          timeline={passport.timeline}
          segments={passport.raw_timeline_segments}
        />
      )}

      {currentTab === 'audio' && (
        <MusicPanel
          audio={audioData || { music_matches: passport.audio_matches?.map(m => ({
            ...m, afisha_urls: [], merch_urls: [], events: [],
          })) || [], celebrity: passport.celebrity_voice }}
        />
      )}

      {currentTab === 'moderation' && (
        moderationReport ? (
          <ModerationPanel moderation={moderationReport} />
        ) : (
          <div className="text-center py-12 text-slate-400">Нет данных модерации</div>
        )
      )}

      {currentTab === 'metrics' && metrics && (
        <MetricsTab metrics={metrics} />
      )}
    </div>
  )
}
// = [M-UI][PAGE-PASSPORT][END_BLOCK]
