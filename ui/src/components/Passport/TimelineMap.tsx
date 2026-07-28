import { useMemo, useRef } from 'react'
import type { SceneAnalysisResult, TimelineSegment } from '../../types'
import { MONETIZATION_LABELS } from '../../i18n/labels'
import { fmtTime } from '../../utils/time'

interface Props {
  timeline: SceneAnalysisResult[]
  segments: TimelineSegment[]
  activeScene?: number | null
  onSceneClick?: (index: number) => void
}

export default function TimelineMap({ timeline, segments, activeScene, onSceneClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  const totalDuration = useMemo(() => {
    if (segments.length === 0) return Math.max(timeline.length * 5, 30)
    return Math.max(...segments.map(s => s.end_sec), 30)
  }, [segments, timeline])

  const timestampMarks = useMemo(() => {
    const marks: number[] = []
    const step = totalDuration <= 60 ? 5 : totalDuration <= 300 ? 30 : 60
    for (let t = 0; t <= totalDuration; t += step) {
      marks.push(t)
    }
    if (marks[marks.length - 1] < totalDuration) marks.push(totalDuration)
    return marks
  }, [totalDuration])

  const getSceneStart = (idx: number): number => {
    if (segments[idx]) return segments[idx].start_sec
    const prevEnd = idx > 0 ? getSceneEnd(idx - 1) : 0
    return prevEnd + 0.5
  }

  const getSceneEnd = (idx: number): number => {
    if (segments[idx]) return segments[idx].end_sec
    return getSceneStart(idx) + 3
  }

  const typeColors: Record<string, string> = {}
  Object.entries(MONETIZATION_LABELS).forEach(([key, val]) => {
    typeColors[key] = val.color
  })

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-700">Интерактивная шкала времени</span>
        <span className="text-xs text-slate-400">
          {fmtTime(0)} — {fmtTime(totalDuration)}
        </span>
      </div>

      <div className="relative" ref={containerRef}>
        <div className="flex justify-between text-[10px] text-slate-400 mb-1 px-0.5">
          {timestampMarks.map((t, i) => (
            <span key={i} style={{ left: `${(t / totalDuration) * 100}%` }} className="absolute -translate-x-1/2">
              {fmtTime(t)}
            </span>
          ))}
        </div>

        <div className="relative h-16 bg-slate-50 rounded-lg mt-4 overflow-hidden">
          {timeline.map((scene, idx) => {
            const start = getSceneStart(idx)
            const end = getSceneEnd(idx)
            const left = (start / totalDuration) * 100
            const width = Math.max(((end - start) / totalDuration) * 100, 2)
            const isActive = activeScene === idx

            const types = new Set(scene.monetization.map(m => m.type))
            if (scene.clip_candidate) types.add('clip_candidate')

            return (
              <div
                key={idx}
                className={`absolute top-0 h-full rounded cursor-pointer transition-all
                  ${isActive ? 'ring-2 ring-indigo-400 z-10' : 'hover:opacity-80'}`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  background: isActive
                    ? 'linear-gradient(180deg, #6366f1 0%, #818cf8 100%)'
                    : 'linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%)',
                  minWidth: '8px',
                }}
                onClick={() => onSceneClick?.(idx)}
                title={`Сцена ${idx + 1}: ${scene.scene_summary}`}
              >
                <div className="flex items-center justify-center gap-0.5 h-full px-0.5">
                  {Array.from(types).slice(0, 4).map(t => (
                    <span
                      key={t}
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: typeColors[t] || '#94a3b8' }}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3 justify-center">
        {Object.entries(MONETIZATION_LABELS).map(([key, val]) => (
          <span key={key} className="inline-flex items-center gap-1 text-[10px] text-slate-500">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: val.color }} />
            <span>{val.short}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
