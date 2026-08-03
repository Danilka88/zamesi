// [M-EXTENSION][TEST-LAYOUT][START_BLOCK]
// sceneStarts/collectMarkers/fmtTime (A-C003-02, позиционирование маркеров).
import { describe, it, expect } from "vitest";
import { sceneStarts, fmtTime, fmtDur } from "../src/content/render/layout";
import { collectMarkers } from "../src/content/render/markers";
import { PASSPORT_REGISTRY } from "../src/data/registry";

describe("layout", () => {
  it("derives monotonic timeline starts when ASR segments align", () => {
    const tech = PASSPORT_REGISTRY.find((e) => e.id === "tech_review")!.passport;
    const starts = sceneStarts(tech);
    expect(starts.length).toBeGreaterThan(0);
    for (let i = 1; i < starts.length; i += 1) {
      expect(starts[i].startSec).toBeGreaterThanOrEqual(starts[i - 1].startSec);
    }
  });

  it("formats time as mm:ss", () => {
    expect(fmtTime(5)).toBe("00:05");
    expect(fmtTime(85)).toBe("01:25");
    expect(fmtDur(2000)).toBe("33:20");
  });
});

describe("collectMarkers", () => {
  it("flattens monetization points into sorted markers", () => {
    const tech = PASSPORT_REGISTRY.find((e) => e.id === "tech_review")!.passport;
    const markers = collectMarkers(tech);
    expect(markers.length).toBeGreaterThan(0);
    expect(markers[0].startSec).toBeLessThanOrEqual(markers[markers.length - 1].startSec);
    expect(markers[0].type).toBeTruthy();
    expect(markers[0].color).toMatch(/^#/);
  });
});
// = [M-EXTENSION][TEST-LAYOUT][END_BLOCK]