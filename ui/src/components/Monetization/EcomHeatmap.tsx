import type { FlatMonetizationItem } from '../../types'

interface Props {
  items: FlatMonetizationItem[]
}

export default function EcomHeatmap({ items }: Props) {
  const ecomItems = items
    .filter(i => i.type === 'ecom_item')
    .reduce<Map<string, { query: string; count: number; confidence: number }>>((acc, item) => {
      const key = item.search_query || 'unknown'
      if (acc.has(key)) {
        const existing = acc.get(key)!
        existing.count++
        existing.confidence = Math.max(existing.confidence, item.confidence || 0)
      } else {
        acc.set(key, { query: key, count: 1, confidence: item.confidence || 0 })
      }
      return acc
    }, new Map())

  const itemsList = Array.from(ecomItems.values()).sort((a, b) => b.count - a.count)

  if (itemsList.length === 0) return null

  const maxCount = Math.max(...itemsList.map(i => i.count))

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🛒</span>
        <h3 className="text-sm font-semibold text-slate-700">Товары к покупке</h3>
        <span className="text-xs text-slate-400">({itemsList.length})</span>
      </div>
      <div className="space-y-2">
        {itemsList.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-slate-600 w-1/3 truncate font-medium">
              {item.query}
            </span>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 w-12 text-right font-mono">
              {item.confidence > 0 ? `${Math.round(item.confidence * 100)}%` : ''}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-slate-400 text-center">
        Ширина полосы показывает частоту упоминания
      </div>
    </div>
  )
}
