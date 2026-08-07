// [M-UI][PAGE-SEARCH][START_BLOCK]
import { useState } from 'react'
import type { SearchResult } from '../types'
import { useApi } from '../hooks/useApi'
import { api } from '../api'
import SearchBar from '../components/Search/SearchBar'
import SearchResultItem from '../components/Search/SearchResultItem'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearched(true)
    try {
      const data = await api.search(query)
      setResults(data)
    } catch (e) {
      console.error(e)
      setResults([])
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">🔍 Поиск сцен</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ищите по содержанию всех проанализированных видео
        </p>
      </div>

      <SearchBar
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
      />

      {searched && (
        <div>
          <p className="text-sm text-slate-500 mb-3">
            {results.length > 0
              ? `Найдено сцен: ${results.length}`
              : 'Ничего не найдено'}
          </p>
          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((r, i) => (
                <SearchResultItem key={i} result={r} />
              ))}
            </div>
          )}
        </div>
      )}

      {!searched && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">🔍</p>
          <p>Введите запрос для поиска по сценам</p>
          <p className="text-sm mt-1">Например: "как выбрать наушники" или "рецепт пасты"</p>
        </div>
      )}
    </div>
  )
}
// = [M-UI][PAGE-SEARCH][END_BLOCK]
