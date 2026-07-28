import type { JobMetrics } from '../../types'
import { fmtDuration } from '../../utils/time'
import { METRIC_TOOLTIPS } from '../../i18n/labels'
import InfoIcon from '../Layout/InfoIcon'

interface Props {
  metrics: JobMetrics
}

export default function MetricsTab({ metrics }: Props) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1">
          ⏱ Метрики обработки
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard icon="⏱" label="Длительность видео" value={fmtDuration(metrics.video_duration_sec)} tooltip={METRIC_TOOLTIPS.processing_time} />
          <MetricCard icon="⚡" label="Время обработки" value={fmtDuration(metrics.processing_time_sec)} tooltip={METRIC_TOOLTIPS.processing_time} />
          <MetricCard icon="🎬" label="Всего сцен" value={`${metrics.total_scenes}`} />
          <MetricCard icon="🤖" label="Визуальный анализ" value={`${metrics.vlm_calls} (${metrics.vlm_percent}%)`} tooltip={METRIC_TOOLTIPS.vlm_percent} />
          <MetricCard icon="⚡" label="Запасные варианты" value={`${metrics.fallbacks_used}`} tooltip={METRIC_TOOLTIPS.fallback} />
          <MetricCard icon="🔍" label="Совпадений по аудио" value={`${metrics.fingerprint_matches}`} tooltip={METRIC_TOOLTIPS.fingerprint} />
          <MetricCard icon="❌" label="Ошибок JSON" value={`${metrics.json_errors}`} />
          <MetricCard icon="⏰" label="Таймаутов" value={`${metrics.timeouts_occurred}`} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1">
          💰 Монетизация
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard icon="📢" label="Рекламных пауз" value={`${metrics.ad_slots}`} color="text-blue-600" />
          <MetricCard icon="🛒" label="Товаров" value={`${metrics.ecom_items}`} color="text-emerald-600" />
          <MetricCard icon="✂️" label="Кандидатов в клипы" value={`${metrics.clip_candidates}`} color="text-purple-600" />
          <MetricCard icon="🎵" label="Музыкальных треков" value={`${metrics.music_tracks}`} color="text-amber-600" />
          <MetricCard icon="🎫" label="Билетов" value={`${metrics.event_tickets}`} color="text-red-600" />
          <MetricCard icon="⭐" label="Знаменитостей" value={`${metrics.celebrity_hits}`} color="text-yellow-600" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1">
          🛡 Модерация
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <MetricCard
            icon="🛡"
            label="Вердикт"
            value={metrics.moderation_verdict === 'approved' ? 'Одобрено'
              : metrics.moderation_verdict === 'flagged' ? 'Требует проверки'
              : metrics.moderation_verdict === 'rejected' ? 'Запрещено' : '—'}
          />
          <MetricCard icon="🚩" label="Флагов" value={`${metrics.moderation_flags_count}`} />
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon, label, value, tooltip, color,
}: {
  icon: string; label: string; value: string; tooltip?: string; color?: string
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
        <span>{icon}</span>
        <span>{label}</span>
        {tooltip && <InfoIcon text={tooltip} />}
      </div>
      <div className={`text-lg font-bold ${color || 'text-slate-800'}`}>
        {value}
      </div>
    </div>
  )
}
