import type { SceneAnalysisResult, TimelineSegment } from '../../types'
import { MONETIZATION_LABELS } from '../../i18n/labels'

interface Props {
  timeline: SceneAnalysisResult[]
  segments: TimelineSegment[]
  filterType?: string | null
}

function getAllPoints(timeline: SceneAnalysisResult[], segments: TimelineSegment[], filterType?: string | null) {
  const points: { time: number; type: string; sceneIdx: number; count: number }[] = []
  timeline.forEach((scene, idx) => {
    const seg = segments[idx]
    const time = seg ? (seg.start_sec + seg.end_sec) / 2 : idx * 5 + 2
    const types = new Map<string, number>()
    scene.monetization.forEach(m => types.set(m.type, (types.get(m.type) || 0) + 1))
    if (scene.clip_candidate) {
      const ct = 'clip_candidate'
      types.set(ct, (types.get(ct) || 0) + 1)
    }
    types.forEach((count, type) => {
      if (!filterType || filterType === 'all' || filterType === type) {
        points.push({ time, type, sceneIdx: idx, count })
      }
    })
  })
  return points
}

export default function MonetizationTimelineMap({ timeline, segments, filterType }: Props) {
  const totalDuration = segments.length > 0
    ? Math.max(...segments.map(s => s.end_sec))
    : timeline.length * 5

  const points = getAllPoints(timeline, segments, filterType)

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Карта монетизации</h3>
      <div className="relative h-24 bg-slate-50 rounded-lg overflow-hidden">
        {points.map((p, i) => {
          const left = (p.time / totalDuration) * 100
          const color = MONETIZATION_LABELS[p.type]?.color || '#94a3b8'
          return (
            <div
              key={i}
              className="absolute bottom-0 group"
              style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
            >
              <div
                className="w-2.5 rounded-full transition-all hover:scale-150 cursor-pointer"
                style={{
                  height: `${Math.max(10, p.count * 8)}px`,
                  backgroundColor: color,
                  opacity: 0.85,
                }}
                title={`${MONETIZATION_LABELS[p.type]?.label || p.type}: сцена ${p.sceneIdx + 1}`}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1
                opacity-0 group-hover:opacity-100 transition-opacity
                bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap z-10
                pointer-events-none">
                {MONETIZATION_LABELS[p.type]?.icon} {MONETIZATION_LABELS[p.type]?.short} · сц.{p.sceneIdx + 1}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
