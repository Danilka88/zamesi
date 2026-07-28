import type { AudioData } from '../../types'
import ConfidenceGauge from '../Layout/ConfidenceGauge'
import InfoIcon from '../Layout/InfoIcon'

interface Props {
  audio: AudioData
}

export default function MusicPanel({ audio }: Props) {
  const { music_matches, celebrity } = audio
  const hasMusic = music_matches.length > 0
  const hasCelebrity = celebrity !== null

  if (!hasMusic && !hasCelebrity) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-400">
        🎵 Музыка и знаменитости не найдены
        <div className="text-xs mt-1">
          Система не обнаружила совпадений с базой треков или голосов знаменитостей
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="text-lg">🎵</span>
        <span>
          Найдено треков: {music_matches.length}
          {celebrity ? ` · Знаменитостей: 1` : ''}
        </span>
        <InfoIcon text="Система сравнила аудио-отпечаток видео с базой известных треков (как Shazam) и голосов знаменитостей" />
      </div>

      {hasMusic && (
        <div className="space-y-3">
          {music_matches.map((track, i) => (
            <div key={i} className="bg-white rounded-lg border border-amber-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎵</span>
                    <div>
                      <span className="font-semibold text-slate-900">{track.artist}</span>
                      <span className="text-slate-500 mx-1">—</span>
                      <span className="font-medium text-slate-700">{track.track_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    {track.genre && <span>Жанр: {track.genre}</span>}
                    {track.album && <span>Альбом: {track.album}</span>}
                    {track.year && <span>Год: {track.year}</span>}
                  </div>
                  {track.afisha_urls.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {track.afisha_urls.map((url, j) => (
                        <div key={j} className="flex items-center gap-1 text-xs text-indigo-600">
                          <span>🎫</span>
                          <a href={url} target="_blank" rel="noreferrer" className="hover:underline">{url}</a>
                        </div>
                      ))}
                    </div>
                  )}
                  {track.merch_urls.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {track.merch_urls.map((url, j) => (
                        <div key={j} className="flex items-center gap-1 text-xs text-pink-600">
                          <span>👕</span>
                          <a href={url} target="_blank" rel="noreferrer" className="hover:underline">{url}</a>
                        </div>
                      ))}
                    </div>
                  )}
                  {track.events.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {track.events.map((ev, j) => (
                        <div key={j} className="flex items-center gap-1 text-xs text-red-600">
                          <span>📅</span>
                          <span>{ev.date || ''} — {ev.title || ev.venue || ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-24 flex-shrink-0">
                  <ConfidenceGauge
                    value={Math.round(track.confidence * 100)}
                    label=""
                    size="sm"
                    tooltip="Точность совпадения. Чем выше, тем увереннее система."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasCelebrity && (
        <div className="bg-white rounded-lg border border-yellow-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <div>
                <span className="font-semibold text-slate-900">{celebrity!.name}</span>
                <span className="text-slate-500 mx-1">—</span>
                <span className="text-sm text-slate-600">{celebrity!.profession}</span>
              </div>
            </div>
            <div className="w-24 flex-shrink-0">
              <ConfidenceGauge
                value={Math.round(celebrity!.confidence * 100)}
                label=""
                size="sm"
                tooltip="Точность распознавания голоса. Чем выше, тем увереннее система."
              />
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Голос распознан по уникальным характеристикам (ECAPA voice embedding)
          </div>
        </div>
      )}
    </div>
  )
}
