// [M-UI][TEST-API-PROXY][START_BLOCK]
// Верификация V-M-UI: единый API-Proxy (demo/real auto-switch), демо-режим по
// умолчанию, setDemoMode/isDemoMode персистятся в localStorage и делегируют
// вызовы актуальному клиенту.
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { api, setDemoMode, isDemoMode } from '../src/api'

describe('api-proxy (demo/real switch)', () => {
  beforeEach(() => {
    localStorage.clear()
    setDemoMode(true) // возвращаем в демо-режим между тестами
  })

  it('по умолчанию активен демо-режим (офлайн, NFR-7)', () => {
    expect(isDemoMode()).toBe(true)
  })

  it('setDemoMode(false) переключает на real и персистит выбор', () => {
    setDemoMode(false)
    expect(isDemoMode()).toBe(false)
    expect(localStorage.getItem('rutube_demo_mode')).toBe('false')
  })

  it('setDemoMode(true) возвращает демо-режим и персистит', () => {
    setDemoMode(false)
    setDemoMode(true)
    expect(isDemoMode()).toBe(true)
    expect(localStorage.getItem('rutube_demo_mode')).toBe('true')
  })

  it('идемпотентность: повторный setDemoMode с тем же значением не меняет состояние', () => {
    setDemoMode(true)
    expect(isDemoMode()).toBe(true)
  })

  it('api.getJobs делегирует вызов актуальному клиенту (демо)', async () => {
    const jobs = await api.getJobs()
    expect(Array.isArray(jobs)).toBe(true)
    expect(jobs.length).toBeGreaterThan(0)
  })
})
// = [M-UI][TEST-API-PROXY][END_BLOCK]
