import { useNavigate } from 'react-router-dom'
import UploadForm from '../components/Dashboard/UploadForm'
import JobCard from '../components/Dashboard/JobCard'
import { useApi } from '../hooks/useApi'
import { api } from '../api'
import type { JobSummary } from '../types'
import { useDemoMode } from '../context/DemoModeContext'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { isDemo, version } = useDemoMode()
  const { data: jobs, loading, reload } = useApi<JobSummary[]>(() => api.getJobs(), [version])

  const handleUploaded = (jobId: string) => {
    navigate(`/passport/${jobId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Панель управления</h1>
        <button
          onClick={reload}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-white border border-slate-300
            text-slate-700 hover:bg-slate-50 transition-colors"
        >
          🔄 Обновить
        </button>
      </div>

      <UploadForm onUploaded={handleUploaded} />

      {isDemo && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <strong>⚡ Демо-режим.</strong> Данные загружены из демо-сценариев. Настоящие результаты
          появятся при подключении к серверу анализа.
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">
          Видео {jobs ? `(${jobs.length})` : ''}
        </h2>
        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <div className="animate-spin text-3xl mb-2">⏳</div>
            <p>Загрузка...</p>
          </div>
        ) : jobs && jobs.length > 0 ? (
          <div className="space-y-2">
            {jobs.map(job => (
              <JobCard key={job.job_id} job={job} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <p className="text-4xl mb-2">📹</p>
            <p>Пока нет проанализированных видео</p>
            <p className="text-sm mt-1">Загрузите видео, чтобы начать</p>
          </div>
        )}
      </div>
    </div>
  )
}
