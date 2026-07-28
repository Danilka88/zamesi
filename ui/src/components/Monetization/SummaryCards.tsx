import { MONETIZATION_LABELS, METRIC_TOOLTIPS } from '../../i18n/labels'
import InfoIcon from '../Layout/InfoIcon'

interface MonetizationCounts {
  ad_slot: number
  ecom_item: number
  clip_candidate: number
  music_track: number
  artist_merch: number
  event_ticket: number
  celebrity_appearance: number
}

interface Props {
  counts: Partial<MonetizationCounts>
  total: number
  activeType?: string | null
  onTypeClick?: (type: string | null) => void
}

export default function SummaryCards({ counts, total, activeType, onTypeClick }: Props) {
  const entries = Object.entries(MONETIZATION_LABELS)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Сводка монетизации</h3>
        <span className="text-xs text-slate-400">
          Всего точек: {total} <InfoIcon text={METRIC_TOOLTIPS.total_monetization_points} />
        </span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {entries.map(([type, info]) => {
          const count = counts[type as keyof MonetizationCounts] || 0
          const isActive = activeType === type
          const pct = total > 0 ? (count / total) * 100 : 0

          return (
            <button
              key={type}
              onClick={() => onTypeClick?.(isActive ? null : type)}
              className={`relative bg-white rounded-lg border p-2 text-center transition-all cursor-pointer
                ${isActive
                  ? 'border-slate-400 ring-2 ring-slate-300 shadow-md scale-105'
                  : 'border-slate-200 hover:shadow-sm hover:border-slate-300'
                }
                ${count === 0 ? 'opacity-50' : ''}`}
            >
              <div className="text-lg">{info.icon}</div>
              <div className="text-lg font-bold text-slate-800" style={{ color: info.color }}>
                {count}
              </div>
              <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                {info.short}
              </div>
              {count > 0 && (
                <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: info.color }}
                  />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
