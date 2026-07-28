import Tooltip from './Tooltip'

interface Props {
  value: number
  max?: number
  label?: string
  tooltip?: string
  size?: 'sm' | 'md' | 'lg'
  color?: 'green' | 'yellow' | 'red' | 'blue'
}

const COLOR_MAP = {
  green: { bg: 'bg-green-500', text: 'text-green-700' },
  yellow: { bg: 'bg-yellow-500', text: 'text-yellow-700' },
  red: { bg: 'bg-red-500', text: 'text-red-700' },
  blue: { bg: 'bg-blue-500', text: 'text-blue-700' },
}

function getColor(value: number, max: number): keyof typeof COLOR_MAP {
  const pct = value / max
  if (pct >= 0.8) return 'green'
  if (pct >= 0.5) return 'yellow'
  return 'red'
}

export default function ConfidenceGauge({
  value, max = 100, label, tooltip, size = 'md', color: forceColor,
}: Props) {
  const pct = Math.round((value / max) * 100)
  const color = forceColor || getColor(value, max)
  const c = COLOR_MAP[color]

  const sizeClasses = {
    sm: { bar: 'h-1.5', text: 'text-xs' },
    md: { bar: 'h-2', text: 'text-sm' },
    lg: { bar: 'h-3', text: 'text-base' },
  }[size]

  const bar = (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-slate-200 rounded-full overflow-hidden ${sizeClasses.bar}`}>
        <div
          className={`${c.bg} rounded-full transition-all duration-500 ${sizeClasses.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`font-semibold whitespace-nowrap ${c.text} ${sizeClasses.text}`}>
        {value}/{max}
      </span>
    </div>
  )

  if (!label && !tooltip) return bar

  return (
    <div>
      {(label || tooltip) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
          {tooltip && <span className="text-[10px] text-slate-400 cursor-help">ⓘ</span>}
        </div>
      )}
      {tooltip ? (
        <Tooltip text={tooltip}>
          <div className="cursor-help">{bar}</div>
        </Tooltip>
      ) : bar}
    </div>
  )
}
