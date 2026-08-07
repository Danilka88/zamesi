// [M-UI][API-PROXY][START_BLOCK]
import type { IApiClient } from './client'
import { RealApiClient } from './RealApiClient'
import { DemoApiClient } from './DemoApiClient'

declare const __VITE_DEMO__: boolean | undefined
declare const __VITE_API_URL__: string | undefined

const API_URL = typeof __VITE_API_URL__ !== 'undefined' ? __VITE_API_URL__ : 'http://localhost:8000'

function initialDemoMode(): boolean {
  const stored = localStorage.getItem('rutube_demo_mode')
  if (stored !== null) return stored === 'true'
  if (typeof __VITE_DEMO__ !== 'undefined' && __VITE_DEMO__) return true
  return true
}

let _currentClient: IApiClient = initialDemoMode()
  ? new DemoApiClient()
  : new RealApiClient(API_URL)

export const api: IApiClient = new Proxy({} as IApiClient, {
  get(_, prop) {
    const val = (_currentClient as unknown as Record<string | symbol, unknown>)[prop]
    return typeof val === 'function' ? val.bind(_currentClient) : val
  },
})

export function setDemoMode(enabled: boolean): void {
  const isDemo = _currentClient instanceof DemoApiClient
  if (enabled === isDemo) return
  localStorage.setItem('rutube_demo_mode', String(enabled))
  _currentClient = enabled
    ? new DemoApiClient()
    : new RealApiClient(API_URL)
  window.dispatchEvent(new Event('api-client-changed'))
}

export function isDemoMode(): boolean {
  return _currentClient instanceof DemoApiClient
}
// = [M-UI][API-PROXY][END_BLOCK]
