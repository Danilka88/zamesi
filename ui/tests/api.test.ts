// [M-UI][TEST-API][START_BLOCK]
// Верификация V-M-UI: DemoApiClient (офлайн, NFR-7) возвращает данные всех
// разделов UI (jobs/passport/search/mix/metrics/audio/monetization) и бросает
// понятные ошибки на неизвестных id.
import { describe, it, expect } from 'vitest'
import { DemoApiClient } from '../src/api/DemoApiClient'

const demo = new DemoApiClient()

describe('DemoApiClient (офлайн-клиент)', () => {
  it('getJobs возвращает список видео с обязательными полями', async () => {
    const jobs = await demo.getJobs()
    expect(jobs.length).toBeGreaterThan(0)
    expect(jobs[0]).toMatchObject({ job_id: expect.any(String), video_id: expect.any(String), status: expect.any(String) })
  })

  it('getPassport возвращает паспорт с timeline для известного id', async () => {
    const p = await demo.getPassport('tech_review')
    expect(Array.isArray(p.timeline)).toBe(true)
    expect(p.timeline.length).toBeGreaterThan(0)
    expect(p.frontmatter).toBeDefined()
  })

  it('getPassport бросает ошибку для неизвестного id', async () => {
    await expect(demo.getPassport('nope')).rejects.toThrow(/not found/i)
  })

  it('getMix возвращает микс и бросает для неизвестного id', async () => {
    const mix = await demo.getMix('mix_headphones')
    expect(mix.mix_id).toBe('mix_headphones')
    await expect(demo.getMix('nope')).rejects.toThrow(/not found/i)
  })

  it('search фильтрует по запросу без учёта регистра', async () => {
    const hits = await demo.search('картон')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].video_id).toBe('diy_frame')
    const none = await demo.search('несуществующеесловоxyz')
    expect(none.length).toBe(0)
  })

  it('getMonetization возвращает плоские точки монетизации с типом и временем', async () => {
    const items = await demo.getMonetization('tech_review')
    expect(items.length).toBeGreaterThan(0)
    expect(items[0]).toMatchObject({ scene_index: expect.any(Number), type: expect.any(String) })
    expect(items.every(i => typeof i.timestamp_sec === 'number')).toBe(true)
  })

  it('getMetrics агрегирует из паспорта (total_scenes, counts)', async () => {
    const p = await demo.getPassport('tech_review')
    const m = await demo.getMetrics('tech_review')
    expect(m.total_scenes).toBe(p.timeline.length)
    expect(m.processing_time_sec).toBeGreaterThan(0)
    expect(m.vlm_calls).toBeGreaterThanOrEqual(0)
  })

  it('getAudio возвращает music_matches и celebrity', async () => {
    const a = await demo.getAudio('tech_review')
    expect(Array.isArray(a.music_matches)).toBe(true)
    expect('celebrity' in a).toBe(true)
  })

  it('getModeration возвращает отчёт с вердиктом', async () => {
    const mod = await demo.getModeration('tech_review')
    expect(mod.verdict).toBeDefined()
    expect(mod.brand_safety_score).toBeGreaterThanOrEqual(0)
  })
})
// = [M-UI][TEST-API][END_BLOCK]
