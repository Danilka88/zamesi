import { useMemo, useState } from 'react'
import type { FlatMonetizationItem, PassportFrontmatter, SceneAnalysisResult, TimelineSegment } from '../../types'
import SummaryCards from './SummaryCards'
import MonetizationTable from './MonetizationTable'
import MonetizationTimelineMap from './MonetizationTimelineMap'
import EcomHeatmap from './EcomHeatmap'
import AdSlotAnalytics from './AdSlotAnalytics'
import ClipCandidateList from './ClipCandidateList'

interface Props {
  items: FlatMonetizationItem[]
  frontmatter: PassportFrontmatter
  timeline: SceneAnalysisResult[]
  segments: TimelineSegment[]
}

export default function MonetizationDashboard({ items, frontmatter, timeline, segments }: Props) {
  const [filterType, setFilterType] = useState<string | null>(null)

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    items.forEach(i => { c[i.type] = (c[i.type] || 0) + 1 })
    return c
  }, [items])

  const clipCandidates = useMemo(
    () => timeline.filter(s => s.clip_candidate).map(s => s.clip_candidate!),
    [timeline]
  )

  return (
    <div className="space-y-4">
      <SummaryCards
        counts={counts}
        total={items.length}
        activeType={filterType}
        onTypeClick={setFilterType}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonetizationTimelineMap
          timeline={timeline}
          segments={segments}
          filterType={filterType}
        />

        {clipCandidates.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              ✂️ Кандидаты в клипы ({clipCandidates.length})
            </h3>
            <ClipCandidateList candidates={clipCandidates} />
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          Все точки монетизации
        </h3>
        <div className="bg-white rounded-lg border border-slate-200">
          <MonetizationTable items={items} filterType={filterType} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EcomHeatmap items={items} />
        <AdSlotAnalytics items={items} frontmatter={frontmatter} />
      </div>
    </div>
  )
}
