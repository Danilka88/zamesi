import { useState } from 'react'
import type { SceneAnalysisResult, TimelineSegment } from '../../types'
import MonetizationBadge from '../Monetization/MonetizationBadge'
import ClipCandidateList from '../Monetization/ClipCandidateList'
import { fmtTime } from '../../utils/time'

interface Props {
  scene: SceneAnalysisResult
  segment?: TimelineSegment
  index: number
}

export default function SceneCard({ scene, segment, index }: Props) {
  const [expanded, setExpanded] = useState(false)

  const hasClip = scene.clip_candidate !== null
  const hasFallback = scene.fallback_used !== null

  return (
    <div className={`bg-white rounded-lg border transition-all
      ${hasClip ? 'border-purple-200 ring-1 ring-purple-100' :
        hasFallback ? 'border-amber-200' : 'border-slate-200'}
      ${expanded ? 'shadow-md' : 'hover:shadow-sm'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>Сцена {index + 1}</span>
              {segment && (
                <span>
                  [{fmtTime(segment.start_sec)} — {fmtTime(segment.end_sec)}]
                </span>
              )}
              {scene.processing_time_sec > 0 && (
                <span className="text-slate-300">
                  · {scene.processing_time_sec.toFixed(0)}с
                </span>
              )}
              {hasFallback && (
                <span className="text-amber-500 font-medium">· ⚡ Запасной вариант</span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-800 line-clamp-2">
              {scene.scene_summary}
            </p>
          </div>
          <span className="text-slate-300 text-sm mt-1">{expanded ? '▲' : '▼'}</span>
        </div>

        {scene.monetization.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {scene.monetization.map((m, i) => (
              <MonetizationBadge
                key={i}
                type={m.type}
                confidence={m.confidence}
              />
            ))}
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          {segment && (
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <span className="font-medium">{segment.speaker}</span>
                <span>· {fmtTime(segment.start_sec)} — {fmtTime(segment.end_sec)}</span>
              </div>
              <p className="text-xs text-slate-600 bg-slate-50 rounded p-2 italic">
                "{segment.text}"
              </p>
            </div>
          )}

          {scene.monetization.length > 0 && (
            <div>
              <span className="text-xs font-medium text-slate-500 mb-1 block">
                Детали монетизации:
              </span>
              <div className="space-y-1">
                {scene.monetization.map((m, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <MonetizationBadge type={m.type} size="sm" />
                    {m.search_query && (
                      <span className="font-medium">{m.search_query}</span>
                    )}
                    {m.reason && (
                      <span className="text-slate-400">— {m.reason}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasClip && scene.clip_candidate && (
            <div>
              <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                <span>✂️</span>
                <span className="font-medium">Кандидат в клипы</span>
              </div>
              <ClipCandidateList candidates={[scene.clip_candidate]} />
            </div>
          )}

          {hasFallback && (
            <div className="text-xs text-amber-600 bg-amber-50 rounded p-2">
              ⚡ Запасной вариант: {scene.fallback_used}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
