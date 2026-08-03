// [M-EXTENSION][TEST-REGISTRY][START_BLOCK]
// A-C003-03: 4 демо-паспорта валидны под TS-схему Passport.
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
  it("contains exactly the 4 demo passports", () => {
    expect(PASSPORT_REGISTRY.map((e) => e.id)).toEqual([
      "tech_review",
      "diy_frame",
      "movie_review",
      "cooking_dinner",
    ]);
  });

  it.each(PASSPORT_REGISTRY)("validates $id passport under Passport schema", (entry) => {
    const issues = validatePassport(entry.passport);
    expect(issues).toEqual([]);
  });

  it("binds tech_review to the real RUTUBE video_id", () => {
    const tech = PASSPORT_REGISTRY.find((e) => e.id === "tech_review");
    expect(tech?.boundVideoId).toBe("2013f4eba6ade7b01582fb411f9e901a");
    expect(tech?.passport.frontmatter.domain_type).toBe("tech_review");
  });
});
// = [M-EXTENSION][TEST-REGISTRY][END_BLOCK]