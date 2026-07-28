import { useState } from 'react'
import type { Mix } from '../../types'
import MonetizationBadge from '../Monetization/MonetizationBadge'
import { fmtDurationShort as fmtTime } from '../../utils/time'

interface Props {
  mix: Mix
}

export default function MixViewer({ mix }: Props) {
  const [expandedStage, setExpandedStage] = useState<number | null>(0)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">🎬 {mix.query}</h2>
            <div className="text-sm text-slate-500 mt-1">
              {mix.stages.length} этапов · {mix.stages.reduce((s, st) => s + st.scenes.length, 0)} сцен ·
              {fmtTime(mix.total_duration_sec)}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {mix.stages.map((stage, si) => {
          const isExpanded = expandedStage === si

          return (
            <div key={si} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setExpandedStage(isExpanded ? null : si)}
                className="w-full text-left p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                    {si + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{stage.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {stage.scenes.length} сцен
                    </div>
                  </div>
                </div>
                <span className="text-slate-300">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 px-4 py-3 space-y-3">
                  <p className="text-sm text-slate-600 bg-slate-50 rounded p-2">
                    {stage.description}
                  </p>

                  {stage.scenes.length === 0 ? (
                    <div className="text-center py-4 text-sm text-slate-400">
                      Нет подходящих сцен для этого этапа
                    </div>
                  ) : (
                    stage.scenes.map((scene, sci) => (
                      <div key={sci} className="flex items-start gap-3 text-sm bg-slate-50 rounded p-3 border border-slate-100">
                        <span className="text-slate-400 font-mono text-xs mt-0.5">
                          {sci + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-indigo-600 font-medium">📹 {scene.video_id}</span>
                            <span className="text-xs text-slate-400">
                              {Math.floor(scene.start_sec / 60)}:
                              {Math.floor(scene.start_sec % 60).toString().padStart(2, '0')}
                              —
                              {Math.floor(scene.end_sec / 60)}:
                              {Math.floor(scene.end_sec % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                          <p className="text-slate-700 mt-1">{scene.summary}</p>
                          {scene.text && (
                            <p className="text-xs text-slate-400 italic mt-1">
                              "{scene.text.slice(0, 150)}"
                            </p>
                          )}
                          {scene.speaker && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              Спикер: {scene.speaker}
                            </div>
                          )}
                          {scene.monetization_types && scene.monetization_types.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {scene.monetization_types.map((t, j) => (
                                <MonetizationBadge key={j} type={t} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
