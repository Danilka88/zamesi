import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { setDemoMode, isDemoMode } from '../api'

interface DemoModeState {
  isDemo: boolean
  version: number
  toggle: () => void
}

const DemoModeContext = createContext<DemoModeState>({
  isDemo: false,
  version: 0,
  toggle: () => {},
})

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState(isDemoMode)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const handler = () => setIsDemo(isDemoMode())
    window.addEventListener('api-client-changed', handler)
    return () => window.removeEventListener('api-client-changed', handler)
  }, [])

  const toggle = useCallback(() => {
    const next = !isDemo
    setDemoMode(next)
    setVersion(v => v + 1)
  }, [isDemo])

  return (
    <DemoModeContext.Provider value={{ isDemo, version, toggle }}>
      {children}
    </DemoModeContext.Provider>
  )
}

export function useDemoMode(): DemoModeState {
  return useContext(DemoModeContext)
}
