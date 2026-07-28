import type { PassportFrontmatter } from '../../types'
import ConfidenceGauge from '../Layout/ConfidenceGauge'
import { MODERATION_LABELS, VERDICT_ICONS, METRIC_TOOLTIPS } from '../../i18n/labels'
import InfoIcon from '../Layout/InfoIcon'

interface Props {
  frontmatter: PassportFrontmatter
}

const GENRE_LABELS: Record<string, string> = {
  diy: 'DIY и рукоделие',
  tech_review: 'Обзор техники',
  how_to: 'Инструкция',
  podcast: 'Подкаст',
  review: 'Обзор',
  lecture: 'Лекция',
  education: 'Образование',
  true_crime: 'Криминал',
  stream: 'Стрим',
  unknown: 'Другое',
}

export default function FrontmatterPanel({ frontmatter }: Props) {
  const mod = frontmatter.moderation
  const verdictInfo = mod ? MODERATION_LABELS[mod.verdict] : null

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{GENRE_LABELS[frontmatter.domain_type] || frontmatter.domain_type}</span>
            <span className="text-xs text-slate-400">ID: {frontmatter.video_id}</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mt-1">{frontmatter.seo_title}</h2>
        </div>
        {mod && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
            ${mod.verdict === 'approved' ? 'bg-green-50 text-green-700' :
              mod.verdict === 'flagged' ? 'bg-yellow-50 text-yellow-700' :
              'bg-red-50 text-red-700'}`}>
            <span>{VERDICT_ICONS[mod.verdict]}</span>
            <span>{verdictInfo?.label}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <div className="flex items-center text-sm text-slate-500 mb-1">
              Безопасность для бренда <InfoIcon text={METRIC_TOOLTIPS.brand_safety} />
            </div>
            <ConfidenceGauge
              value={frontmatter.brand_safety_score}
              label=""
              size="md"
            />
          </div>
          {mod && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Возрастной рейтинг:</span>
              <span className="font-semibold text-slate-800">{mod.age_rating}</span>
              {mod.categories_flagged.length > 0 && (
                <span className="text-xs text-yellow-600">
                  ⚠️ {mod.categories_flagged.join(', ')}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div>
            <span className="text-sm text-slate-500">Целевая аудитория</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {frontmatter.target_audience.map((a, i) => (
                <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full">
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {frontmatter.seo_tags.length > 0 && (
        <div>
          <span className="text-sm text-slate-500">Теги</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {frontmatter.seo_tags.map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {frontmatter.trending_cluster && (
        <div className="text-sm">
          <span className="text-slate-500">Трендовый кластер:</span>{' '}
          <span className="font-medium text-slate-700">{frontmatter.trending_cluster}</span>
        </div>
      )}

      {frontmatter.ad_targeting_keywords.length > 0 && (
        <div>
          <span className="text-sm text-slate-500">Ключевые слова для рекламы</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {frontmatter.ad_targeting_keywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                📢 {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {frontmatter.auto_playlists.length > 0 && (
        <div>
          <span className="text-sm text-slate-500">Рекомендуемые плейлисты</span>
          <div className="space-y-1 mt-1">
            {frontmatter.auto_playlists.map((pl, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 rounded p-2">
                <span className="text-indigo-500">📋</span>
                <div>
                  <span className="font-medium">{pl.id}</span>
                  <span className="text-slate-400"> — {pl.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
