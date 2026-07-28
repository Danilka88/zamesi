import type { ModerationReport } from '../../types'
import ConfidenceGauge from '../Layout/ConfidenceGauge'
import { MODERATION_LABELS, VERDICT_ICONS, SEVERITY_LABELS } from '../../i18n/labels'
import InfoIcon from '../Layout/InfoIcon'

interface Props {
  moderation: ModerationReport
}

export default function ModerationPanel({ moderation }: Props) {
  const verdictInfo = MODERATION_LABELS[moderation.verdict]
  const hasFlags = moderation.flags.length > 0

  const verdictColor = {
    approved: 'bg-green-50 border-green-200',
    flagged: 'bg-yellow-50 border-yellow-200',
    rejected: 'bg-red-50 border-red-200',
  }[moderation.verdict]

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
      <div className={`flex items-center justify-between p-4 rounded-lg border ${verdictColor}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{VERDICT_ICONS[moderation.verdict]}</span>
          <div>
            <div className={`text-lg font-bold ${verdictInfo?.color || ''}`}>
              {verdictInfo?.label || moderation.verdict}
            </div>
            <div className="text-sm text-slate-500">
              Возрастной рейтинг: <strong>{moderation.age_rating}</strong>
            </div>
          </div>
        </div>
        <div className="w-32">
          <span className="text-xs text-slate-400 block mb-1">
            Безопасность для бренда <InfoIcon text="Насколько видео подходит для показа рекламы" />
          </span>
          <ConfidenceGauge
            value={moderation.brand_safety_score}
            label=""
            size="sm"
          />
        </div>
      </div>

      {moderation.categories_flagged.length > 0 && (
        <div>
          <span className="text-sm font-medium text-slate-700">Отмеченные категории</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {moderation.categories_flagged.map((cat, i) => (
              <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full border border-red-200">
                ⚠️ {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasFlags && (
        <div>
          <span className="text-sm font-medium text-slate-700 mb-2 block">
            Флаги ({moderation.flags.length})
          </span>
          <div className="space-y-2">
            {moderation.flags.map((flag, i) => {
              const sev = SEVERITY_LABELS[flag.severity] || SEVERITY_LABELS.low
              return (
                <div key={i} className="flex items-start gap-3 text-sm bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <span className="text-lg mt-0.5">🚩</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{flag.category}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${sev.color}`}>
                        {sev.label}
                      </span>
                    </div>
                    {flag.timestamp_sec != null && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        Время: {Math.floor(flag.timestamp_sec / 60)}:
                        {Math.floor(flag.timestamp_sec % 60).toString().padStart(2, '0')}
                      </div>
                    )}
                    {flag.evidence && (
                      <div className="text-xs text-slate-500 mt-1 italic bg-white rounded p-1.5 border border-slate-100">
                        "{flag.evidence}"
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {moderation.summary && (
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
          <span className="text-xs font-medium text-slate-500 block mb-1">Заключение</span>
          <p className="text-sm text-slate-700">{moderation.summary}</p>
        </div>
      )}
    </div>
  )
}
