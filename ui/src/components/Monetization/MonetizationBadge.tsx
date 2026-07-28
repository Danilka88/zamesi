import Tooltip from '../Layout/Tooltip'
import { MONETIZATION_LABELS } from '../../i18n/labels'

interface Props {
  type: string
  showLabel?: boolean
  size?: 'sm' | 'md'
  confidence?: number | null
}

export default function MonetizationBadge({ type, showLabel = false, size = 'sm', confidence }: Props) {
  const info = MONETIZATION_LABELS[type]
  if (!info) return null

  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'

  return (
    <Tooltip text={`${info.icon} ${info.label}: ${info.tooltip}${confidence != null ? `\nТочность: ${Math.round(confidence * 100)}%` : ''}`}>
      <span
        className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses}`}
        style={{ backgroundColor: info.color + '20', color: info.color }}
      >
        <span>{info.icon}</span>
        <span>{showLabel ? info.label : info.short}</span>
        {confidence != null && (
          <span className="opacity-70 text-[10px]">
            {Math.round(confidence * 100)}%
          </span>
        )}
      </span>
    </Tooltip>
  )
}
