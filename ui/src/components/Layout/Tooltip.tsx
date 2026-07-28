import { ReactNode, useState } from 'react'

interface TooltipProps {
  text: string
  children: ReactNode
}

export default function Tooltip({ text, children }: TooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <span className="relative inline-flex">
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </span>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5
          bg-slate-800 text-white text-xs rounded-lg shadow-lg whitespace-normal
          tooltip-content z-50 pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2
            border-4 border-transparent border-t-slate-800" />
        </span>
      )}
    </span>
  )
}
