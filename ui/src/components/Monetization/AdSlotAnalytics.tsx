import type { FlatMonetizationItem, PassportFrontmatter } from '../../types'
import ConfidenceGauge from '../Layout/ConfidenceGauge'

interface Props {
  items: FlatMonetizationItem[]
  frontmatter: PassportFrontmatter
}

export default function AdSlotAnalytics({ items, frontmatter }: Props) {
  const adSlots = items.filter(i => i.type === 'ad_slot')
  const categories = frontmatter.ad_targeting_keywords

  if (adSlots.length === 0) return null

  const estimatedRevenue = adSlots.length * 120

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📢</span>
        <h3 className="text-sm font-semibold text-slate-700">Рекламные возможности</h3>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{adSlots.length}</div>
          <div className="text-xs text-slate-500">Рекламных пауз</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {estimatedRevenue}₽
          </div>
          <div className="text-xs text-slate-500">Прогноз CPM / 1k просмотров</div>
        </div>
        <div className="text-center">
          <ConfidenceGauge
            value={frontmatter.brand_safety_score}
            label=""
            size="sm"
          />
          <div className="text-xs text-slate-500 mt-1">Безопасность для бренда</div>
        </div>
      </div>

      {categories.length > 0 && (
        <div>
          <span className="text-xs font-medium text-slate-500">Категории для рекламы</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {categories.map((cat, i) => (
              <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
