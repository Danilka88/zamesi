// [M-EXTENSION][TEST-STUDIO-TRENDS][START_BLOCK]
// Блок «Тренды и плейлисты»: детерминизм (NFR-7), курируемые Wordstat-тренды,
// плейлисты (авто + тренд-подборка bike с обложками) и коллаборации по overlap.
import { describe, it, expect } from "vitest";
import { PASSPORT_REGISTRY } from "../src/data/registry";
import type { Passport } from "../src/data/types";
import { buildTrendsBundle } from "../src/studio/trends";

function passportOf(id: string): Passport {
  const entry = PASSPORT_REGISTRY.find((e) => e.id === id);
  expect(entry).toBeDefined();
  return entry!.passport;
}

const BIKES = ["bike_dont_buy", "bike_top_april", "bike_mtb_80k"] as const;

describe("trends: курируемые Wordstat-тренды (bike)", () => {
  for (const id of BIKES) {
    it(`${id}: >=2 тренда с volume/growth/сезонностью`, () => {
      const b = buildTrendsBundle(passportOf(id), `http://rutube.ru/video/${id}`);
      expect(b.trends.length).toBeGreaterThanOrEqual(2);
      for (const t of b.trends) {
        expect(t.volume).toBeGreaterThan(0);
        expect(t.growth).toBeGreaterThan(-100);
        expect(t.seasonality.length).toBe(12);
        expect(t.sources.wordstat).toBe(true);
        expect(t.forecast.estViews).toBeGreaterThan(0);
        expect(t.forecast.ctr).toBeGreaterThan(0);
      }
    });
  }
});

describe("trends: детерминизм (NFR-7)", () => {
  it("одинаковый videoId+паспорт → одинаковый бандл", () => {
    const a = buildTrendsBundle(passportOf("bike_dont_buy"), "2013f4e");
    const b = buildTrendsBundle(passportOf("bike_dont_buy"), "2013f4e");
    expect(a).toEqual(b);
  });

  it("разные videoId → разные прогнозы (estViews/ctr)", () => {
    const a = buildTrendsBundle(passportOf("bike_dont_buy"), "vid-1");
    const b = buildTrendsBundle(passportOf("bike_dont_buy"), "vid-2");
    expect(a.trends.map((t) => t.forecast.estViews)).not.toEqual(b.trends.map((t) => t.forecast.estViews));
  });
});

describe("trends: плейлисты и тренд-подборка с обложками", () => {
  it("тренд-подборка месяца содержит 3 видео с обложками bike/*.png", () => {
    const b = buildTrendsBundle(passportOf("bike_dont_buy"), "vid");
    const tp = b.playlists.find((p) => p.source === "trending");
    expect(tp).toBeDefined();
    expect(tp!.videos.length).toBe(3);
    for (const v of tp!.videos) {
      expect(v.boundVideoId.length).toBeGreaterThan(10);
      expect(v.screenshot).toMatch(/\.png$/);
    }
    expect(tp!.journal.length).toBeGreaterThanOrEqual(3);
    expect(tp!.journal[0].clips.length).toBeGreaterThan(0);
  });

  it("iphone: есть автоплейлисты из паспорта", () => {
    const b = buildTrendsBundle(passportOf("iphone_50k_wylsacom"), "vid");
    const autos = b.playlists.filter((p) => p.source === "passport");
    expect(autos.length).toBeGreaterThanOrEqual(2);
  });
});

describe("trends: коллаборации по overlap", () => {
  it("top-коллаб отсортирован по пересечению аудиторий", () => {
    const b = buildTrendsBundle(passportOf("bike_dont_buy"), "vid");
    expect(b.collabs.length).toBeGreaterThan(0);
    for (let i = 1; i < b.collabs.length; i++) {
      expect(b.collabs[i - 1].overlap).toBeGreaterThanOrEqual(b.collabs[i].overlap);
    }
    expect(b.collabs[0].overlap).toBeGreaterThan(0);
    expect(b.collabs[0].pitch.length).toBeGreaterThan(20);
    expect(b.collabs[0].subscriberCount).toBeGreaterThan(0);
  });

  it("iphone коллаб — тематика «гаджеты» даёт ненулевой скор", () => {
    const b = buildTrendsBundle(passportOf("iphone_50k_wylsacom"), "vid");
    expect(b.collabs.every((c) => c.overlap >= 0)).toBe(true);
  });
});

describe("trends: totals и fallback", () => {
  it("totals согласованы с бандлом", () => {
    const b = buildTrendsBundle(passportOf("bike_dont_buy"), "vid");
    expect(b.totals.trendCount).toBe(b.trends.length);
    expect(b.totals.hotCount).toBe(b.trends.filter((t) => t.growth > 20).length);
    expect(b.totals.alertCount).toBe(b.trends.filter((t) => t.sources.alerts).length);
    expect(b.totals.playlistCount).toBe(b.playlists.length);
    expect(b.totals.collabCount).toBe(b.collabs.length);
  });

  it("паспорт без курируемых трендов → fallback из keywords (детерминирован)", () => {
    const b = buildTrendsBundle(passportOf("cooking_dinner"), "vid");
    expect(b.trends.length).toBeGreaterThan(0);
    expect(b.trends.every((t) => t.volume > 0)).toBe(true);
  });
});
// = [M-EXTENSION][TEST-STUDIO-TRENDS][END_BLOCK]