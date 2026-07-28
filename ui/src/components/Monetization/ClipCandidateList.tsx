import type { ClipCandidate } from '../../types'
import { fmtTime } from '../../utils/time'

interface Props {
  candidates: ClipCandidate[]
}

const viralityLabels: Record<string, { label: string; color: string }> = {
  low: { label: 'Низкий', color: 'text-slate-500 bg-slate-100' },
  medium: { label: 'Средний', color: 'text-amber-600 bg-amber-50' },
  high: { label: 'Высокий', color: 'text-green-600 bg-green-50' },
}

export default function ClipCandidateList({ candidates }: Props) {
  if (!candidates || candidates.length === 0) return null

  return (
    <div className="space-y-2">
      {candidates.map((clip, i) => {
        const vl = viralityLabels[clip.virality_potential] || viralityLabels.medium
        return (
          <div key={i} className="flex items-start gap-2 text-xs bg-purple-50 rounded p-2 border border-purple-100">
            <span className="text-lg">✂️</span>
            <div className="flex-1">
              <div className="font-medium text-slate-700">{clip.hook}</div>
              <div className="text-slate-400 mt-0.5">
                {fmtTime(clip.time_range_start)} — {fmtTime(clip.time_range_end)}
              </div>
            </div>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${vl.color}`}>
              {vl.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
