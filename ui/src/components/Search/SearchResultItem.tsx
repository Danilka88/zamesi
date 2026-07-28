import { Link } from 'react-router-dom'
import type { SearchResult } from '../../types'
import MonetizationBadge from '../Monetization/MonetizationBadge'

interface Props {
  result: SearchResult
}

const GENRE_LABELS: Record<string, string> = {
  diy: 'DIY',
  tech_review: 'Обзор техники',
  how_to: 'Инструкция',
  podcast: 'Подкаст',
}

export default function SearchResultItem({ result }: Props) {
  const uniqueTypes = [...new Set(result.monetization_types)]

  return (
    <Link
      to={`/passport/${result.video_id}`}
      className="block bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-indigo-600">📹 {result.video_id}</span>
            <span>· Сцена {result.scene_index + 1}</span>
            <span>· {Math.floor(result.start_sec / 60)}:
              {Math.floor(result.start_sec % 60).toString().padStart(2, '0')}
              —
              {Math.floor(result.end_sec / 60)}:
              {Math.floor(result.end_sec % 60).toString().padStart(2, '0')}</span>
          </div>
          <p className="text-sm font-medium text-slate-800 mt-1 line-clamp-2">
            {result.summary}
          </p>
          {result.text && (
            <p className="text-xs text-slate-500 mt-1 italic line-clamp-1">
              "{result.text}"
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-slate-400">
              {result.speaker} · {GENRE_LABELS[result.genre] || result.genre}
            </span>
            <span className="text-xs text-indigo-500 font-mono">
              Совпадение: {result.score.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 max-w-[120px]">
          {uniqueTypes.map((t, i) => (
            <MonetizationBadge key={i} type={t} size="sm" />
          ))}
        </div>
      </div>
    </Link>
  )
}
