// [M-EXTENSION][TEST-DATA][START_BLOCK]
// A-C003-06: DemoDataProvider работает; RealDataProvider — заглушка без сбоев.
// Плюс computeMetrics даёт корректные агрегаты (A-C003-05).
import { describe, it, expect } from "vitest";
import { DemoDataProvider, computeMetrics } from "../src/content/data/demo";
import { RealDataProvider } from "../src/content/data/real-stub";
import { PASSPORT_REGISTRY } from "../src/data/registry";

const REAL_ID = "2013f4eba6ade7b01582fb411f9e901a";

describe("DemoDataProvider", () => {
  it("loads bound tech_review for real video_id", async () => {
    const provider = new DemoDataProvider();
    const res = await provider.load(REAL_ID);
    expect(res.ok).toBe(true);
    expect(res.passport?.frontmatter.domain_type).toBe("tech_review");
    expect(res.metrics).not.toBeNull();
  });

  it("is available (demo mode)", () => {
    expect(new DemoDataProvider().isAvailable()).toBe(true);
  });
});

describe("RealDataProvider (stub)", () => {
  it("returns not_implemented without crashing", async () => {
    const provider = new RealDataProvider();
    const res = await provider.load(REAL_ID);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("not_implemented");
    expect(res.passport).toBeNull();
  });

  it("reports unavailable", () => {
    expect(new RealDataProvider().isAvailable()).toBe(false);
  });
});

describe("computeMetrics", () => {
  it("aggregates monetization types from timeline", () => {
    const metrics = computeMetrics(PASSPORT_REGISTRY[0].passport);
    expect(metrics.total_scenes).toBe(PASSPORT_REGISTRY[0].passport.timeline.length);
    expect(metrics.ecom_items).toBeGreaterThan(0);
    expect(metrics.music_tracks).toBe(2);
    expect(typeof metrics.vlm_percent).toBe("number");
  });
});
// = [M-EXTENSION][TEST-DATA][END_BLOCK]