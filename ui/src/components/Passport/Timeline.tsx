import { useMemo } from 'react'
import type { SceneAnalysisResult, TimelineSegment } from '../../types'
import SceneCard from './SceneCard'

interface Props {
  timeline: SceneAnalysisResult[]
  segments: TimelineSegment[]
  filterType?: string | null
  activeScene?: number | null
  onSceneClick?: (index: number) => void
}

export default function Timeline({ timeline, segments, filterType, activeScene, onSceneClick }: Props) {
  const filtered = useMemo(() => {
    if (!filterType || filterType === 'all') return timeline
    return timeline.filter(s =>
      s.monetization.some(m => m.type === filterType) ||
      (filterType === 'clip_candidate' && s.clip_candidate)
    )
  }, [timeline, filterType])

  return (
    <div className="space-y-2">
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          Нет сцен с выбранным типом монетизации
        </div>
      ) : (
        filtered.map((scene, i) => {
          const realIndex = timeline.indexOf(scene)
          return (
            <div
              key={realIndex}
              id={`scene-${realIndex}`}
              onClick={() => onSceneClick?.(realIndex)}
            >
              <SceneCard
                scene={scene}
                segment={segments[realIndex]}
                index={realIndex}
              />
            </div>
          )
        })
      )}
    </div>
  )
}
