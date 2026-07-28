import Tooltip from './Tooltip'

export default function InfoIcon({ text }: { text: string }) {
  return (
    <Tooltip text={text}>
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full
        bg-slate-200 text-slate-500 text-xs font-bold ml-1 hover:bg-slate-300 transition-colors">
        ?
      </span>
    </Tooltip>
  )
}
