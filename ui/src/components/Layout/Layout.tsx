import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from '../../i18n/labels'
import { useDemoMode } from '../../context/DemoModeContext'

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { isDemo, toggle } = useDemoMode()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2 font-semibold text-lg text-slate-900">
              🔬 Анализатор видео RUTUBE
            </Link>
            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                    ${isActive(item.path)
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  {item.icon} {item.label}
                </Link>
              ))}
              <button
                onClick={toggle}
                className={`ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border
                  ${isDemo
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                title={isDemo ? 'Переключиться на реальный сервер' : 'Переключиться в демо-режим'}
              >
                <span className={`w-2 h-2 rounded-full ${isDemo ? 'bg-amber-500' : 'bg-slate-300'}`} />
                {isDemo ? '⚡ Демо' : '🔌 Сервер'}
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}
