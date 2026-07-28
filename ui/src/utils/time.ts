export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `0:${s.toString().padStart(2, '0')}`
}

export function fmtDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)} сек`
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return s > 0 ? `${m} мин ${s} сек` : `${m} мин`
}

export function fmtDurationShort(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  if (m === 0) return `${s} сек`
  return s > 0 ? `${m} мин ${s} сек` : `${m} мин`
}
