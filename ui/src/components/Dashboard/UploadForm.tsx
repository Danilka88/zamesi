import { useState, useRef } from 'react'
import { api } from '../../api'

export default function UploadForm({ onUploaded }: { onUploaded: (jobId: string) => void }) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('video/')) return
    setUploading(true)
    try {
      const { job_id } = await api.uploadVideo(file)
      onUploaded(job_id)
    } catch (e) {
      alert('Ошибка загрузки: ' + (e instanceof Error ? e.message : 'неизвестная ошибка'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
        ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-slate-400 bg-white'}
        ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {uploading ? (
        <div className="space-y-2">
          <div className="animate-spin text-3xl">⏳</div>
          <p className="text-slate-500 font-medium">Загрузка видео...</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-4xl">📁</div>
          <p className="text-slate-700 font-medium">
            Перетащите видео сюда или нажмите для загрузки
          </p>
          <p className="text-slate-400 text-sm">
            Поддерживаются MP4, AVI, MOV и другие форматы
          </p>
        </div>
      )}
    </div>
  )
}
