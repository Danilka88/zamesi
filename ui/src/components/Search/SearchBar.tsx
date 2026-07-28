interface Props {
  value: string
  onChange: (val: string) => void
  onSearch: () => void
  loading?: boolean
}

const GENRE_OPTIONS = [
  { value: '', label: 'Все жанры' },
  { value: 'diy', label: 'DIY' },
  { value: 'tech_review', label: 'Обзор техники' },
  { value: 'how_to', label: 'Инструкция' },
  { value: 'podcast', label: 'Подкаст' },
  { value: 'education', label: 'Образование' },
  { value: 'review', label: 'Обзор' },
]

export default function SearchBar({ value, onChange, onSearch, loading }: Props) {
  return (
    <form
      onSubmit={e => { e.preventDefault(); onSearch() }}
      className="flex items-center gap-2"
    >
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          🔍
        </span>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Поиск по сценам..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm
            focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
            placeholder:text-slate-400"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg
          hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Поиск...' : 'Найти'}
      </button>
    </form>
  )
}
