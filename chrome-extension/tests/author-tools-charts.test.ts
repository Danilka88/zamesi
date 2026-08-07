// [M-EXTENSION][TEST-AUTHOR-TOOLS-CHARTS][START_BLOCK]
// Демо-графики: детерминизм, границы значений, корректная SVG-разметка.
import { describe, it, expect } from "vitest";
import type { Passport } from "../src/data/types";
import {
  hashSeed,
  retentionSeries,
  monetizationStack,
  hourlyBars,
  sparklineSvg,
  barChartSvg,
} from "../src/content/authorTools/charts";

function fixture(): Passport {
  return {
    frontmatter: { video_id: "demo_001", domain_type: "how_to" },
    timeline: [
      { scene_summary: "a", monetization: [{ type: "ad_slot" }, { type: "ecom_item" }] },
      { scene_summary: "b", monetization: [{ type: "ad_slot" }] },
      { scene_summary: "c", monetization: [{ type: "clip_candidate" }, { type: "ad_slot" }] },
    ],
    raw_timeline_segments: [
      { start_sec: 0, end_sec: 20 },
      { start_sec: 20, end_sec: 50 },
      { start_sec: 50, end_sec: 60 },
    ],
    audio_matches: [],
  } as unknown as Passport;
}

describe("author-tools charts: детерминизм", () => {
  it("hashSeed детерминирован", () => {
    expect(hashSeed("abc")).toBe(hashSeed("abc"));
    expect(hashSeed("abc")).not.toBe(hashSeed("abd"));
  });

  it("retentionSeries и hourlyBars детерминированы для одного seed", () => {
    const p = fixture();
    expect(retentionSeries(p, 7)).toEqual(retentionSeries(p, 7));
    expect(hourlyBars(p, 13)).toEqual(hourlyBars(p, 13));
    expect(retentionSeries(p, 7)).not.toEqual(retentionSeries(p, 8));
  });
});

describe("author-tools charts: границы значений", () => {
  it("retentionSeries: 12 точек, значения 0..100, убывающая в среднем", () => {
    const p = fixture();
    const s = retentionSeries(p);
    expect(s.length).toBe(12);
    for (const pt of s) expect(pt.value).toBeGreaterThanOrEqual(0);
    for (const pt of s) expect(pt.value).toBeLessThanOrEqual(100);
    expect(s[0].value).toBeGreaterThan(s[s.length - 1].value);
  });

  it("monetizationStack: сумма 100, отсортирован по убыванию", () => {
    const stack = monetizationStack(fixture());
    expect(stack.reduce((a, m) => a + m.value, 0)).toBe(100);
    for (let i = 1; i < stack.length; i++) expect(stack[i - 1].value).toBeGreaterThanOrEqual(stack[i].value);
  });

  it("hourlyBars: 24 бака, вечерний пик (19–23ч)", () => {
    const bars = hourlyBars(fixture());
    expect(bars.length).toBe(24);
    const peak = bars.reduce((a, b) => (b.value > a.value ? b : a), bars[0]);
    expect(Number(peak.label)).toBeGreaterThanOrEqual(19);
    expect(Number(peak.label)).toBeLessThanOrEqual(23);
  });
});

describe("author-tools charts: SVG", () => {
  it("sparklineSvg содержит svg и path", () => {
    const svg = sparklineSvg([100, 80, 60, 40], { w: 320, h: 56 });
    expect(svg).toContain("<svg");
    expect(svg).toContain("<path");
    expect(svg).toContain("viewBox");
  });

  it("sparklineSvg пуст для пустых данных", () => {
    expect(sparklineSvg([], { w: 320, h: 56 })).toBe("");
  });

  it("barChartSvg содержит rect на каждый бар", () => {
    const bars = hourlyBars(fixture());
    const svg = barChartSvg(bars, { w: 320, h: 76 });
    expect(svg).toContain("<svg");
    expect((svg.match(/<rect/g) ?? []).length).toBe(bars.length);
  });
});
