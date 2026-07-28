import { useMemo } from 'react'
import type { FlatMonetizationItem } from '../../types'
import MonetizationBadge from './MonetizationBadge'
import { fmtTime } from '../../utils/time'

interface Props {
  items: FlatMonetizationItem[]
  filterType?: string | null
  sortBy?: 'time' | 'type' | 'confidence'
}

export default function MonetizationTable({ items, filterType, sortBy = 'time' }: Props) {
  const sorted = useMemo(() => {
    let filtered = filterType && filterType !== 'all'
      ? items.filter(i => i.type === filterType)
      : items

    return [...filtered].sort((a, b) => {
      if (sortBy === 'time') return a.timestamp_sec - b.timestamp_sec
      if (sortBy === 'confidence') return (b.confidence || 0) - (a.confidence || 0)
      return a.type.localeCompare(b.type)
    })
  }, [items, filterType, sortBy])

  if (sorted.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-slate-400">
        Нет точек монетизации
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-2 text-slate-500 font-medium">Время</th>
            <th className="text-left py-2 px-2 text-slate-500 font-medium">Тип</th>
            <th className="text-left py-2 px-2 text-slate-500 font-medium">Запрос / Описание</th>
            <th className="text-right py-2 px-2 text-slate-500 font-medium">Точность</th>
            <th className="text-right py-2 px-2 text-slate-500 font-medium">Сцена</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, i) => (
            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2 px-2 text-slate-600 font-mono">
                {fmtTime(item.timestamp_sec)}
              </td>
              <td className="py-2 px-2">
                <MonetizationBadge type={item.type} size="sm" />
              </td>
              <td className="py-2 px-2 text-slate-700 max-w-[200px] truncate">
                {item.search_query || item.reason || '—'}
              </td>
              <td className="py-2 px-2 text-right">
                {item.confidence != null ? (
                  <span className={`font-mono font-medium
                    ${item.confidence >= 0.8 ? 'text-green-600' :
                      item.confidence >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {Math.round(item.confidence * 100)}%
                  </span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
              <td className="py-2 px-2 text-right text-slate-400">
                {item.scene_index + 1}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
