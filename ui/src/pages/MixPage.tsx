import { useParams, Link } from 'react-router-dom'
import type { Mix } from '../types'
import { useApi } from '../hooks/useApi'
import { api } from '../api'
import MixViewer from '../components/Mix/MixViewer'

export default function MixPage() {
  const { mixId } = useParams<{ mixId: string }>()
  const { data: mix, loading, error } = useApi<Mix>(
    () => api.getMix(mixId!),
    [mixId]
  )

  if (loading) {
    return (
      <div className="text-center py-16 text-slate-400">
        <div className="animate-spin text-4xl mb-3">⏳</div>
        <p>Загрузка замеса...</p>
      </div>
    )
  }

  if (error || !mix) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">❌</p>
        <p className="text-slate-600 font-medium">Не удалось загрузить замес</p>
        <Link to="/" className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
          ← Вернуться
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 inline-block">
        ← Панель управления
      </Link>
      <MixViewer mix={mix} />
    </div>
  )
}
