// [M-EXTENSION][TEST-REGISTRY][START_BLOCK]
// A-C003-03: 7 демо-паспортов валидны под TS-схему Passport.
import { describe, it, expect } from "vitest";
import { PASSPORT_REGISTRY } from "../src/data/registry";
import type { Passport } from "../src/data/types";

function check(cond: boolean, msg: string, issues: string[]): void {
  if (!cond) issues.push(msg);
}

function validatePassport(p: unknown): string[] {
  const issues: string[] = [];
  const pp = p as Passport;
  check(typeof pp?.frontmatter?.video_id === "string", "frontmatter.video_id must be string", issues);
  check(typeof pp?.frontmatter?.domain_type === "string", "frontmatter.domain_type must be string", issues);
  check(Array.isArray(pp?.timeline), "timeline must be array", issues);
  check(Array.isArray(pp?.raw_timeline_segments), "raw_timeline_segments must be array", issues);
  check(Array.isArray(pp?.audio_matches), "audio_matches must be array", issues);
  for (const [i, scene] of (pp?.timeline ?? []).entries()) {
    check(typeof scene.scene_summary === "string", `timeline[${i}].scene_summary string`, issues);
    check(Array.isArray(scene.monetization), `timeline[${i}].monetization array`, issues);
    check(typeof scene.processing_time_sec === "number", `timeline[${i}].processing_time_sec number`, issues);
  }
  return issues;
}

describe("PASSPORT_REGISTRY", () => {
  it("contains exactly the 10 demo passports", () => {
    expect(PASSPORT_REGISTRY.map((e) => e.id)).toEqual([
      "tech_review",
      "iphone_50k_wylsacom",
      "diy_frame",
      "movie_review",
      "cooking_dinner",
      "atomic_heart_review",
      "vietnam_nha_trang",
      "bike_dont_buy",
      "bike_top_april",
      "bike_mtb_80k",
    ]);
  });

  it.each(PASSPORT_REGISTRY)("validates $id passport under Passport schema", (entry) => {
    const issues = validatePassport(entry.passport);
    expect(issues).toEqual([]);
  });

  it("binds iphone_50k_wylsacom to the real RUTUBE video_id (Wylsacom iPhone)", () => {
    const iphone = PASSPORT_REGISTRY.find((e) => e.id === "iphone_50k_wylsacom");
    expect(iphone?.boundVideoId).toBe("2013f4eba6ade7b01582fb411f9e901a");
    expect(iphone?.passport.frontmatter.domain_type).toBe("tech_review");
  });

  it("tech_review не привязан к конкретному видео (автоподбор по заголовку)", () => {
    const tech = PASSPORT_REGISTRY.find((e) => e.id === "tech_review");
    expect(tech?.boundVideoId).toBeUndefined();
  });

  it("binds the three bike passports to real RUTUBE video_id", () => {
    const byId: Record<string, string> = {
      bike_dont_buy: "1925a43e9479e500654b611eb8009072",
      bike_top_april: "555c960ce50ecde6170c6560e3ac8888",
      bike_mtb_80k: "7acf946b872b1f304345c7ca8b249f21",
    };
    for (const [id, vid] of Object.entries(byId)) {
      const entry = PASSPORT_REGISTRY.find((e) => e.id === id);
      expect(entry?.boundVideoId).toBe(vid);
    }
  });

  it("bike passports define ecom monetization for search-offer", () => {
    const ids = ["bike_dont_buy", "bike_top_april", "bike_mtb_80k"];
    for (const id of ids) {
      const pp = PASSPORT_REGISTRY.find((e) => e.id === id)?.passport;
      const ecoms = (pp?.timeline ?? []).flatMap((s) =>
        s.monetization.filter((m) => m.type === "ecom_item")
      );
      expect(ecoms.length).toBeGreaterThan(0);
    }
  });
});
// = [M-EXTENSION][TEST-REGISTRY][END_BLOCK]