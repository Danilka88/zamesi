import { STATUS_LABELS } from '../../i18n/labels'

export default function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.pending
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${s.color}`}>
      <span>{s.icon}</span>
      <span>{s.label}</span>
    </span>
  )
}
