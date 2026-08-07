// [M-EXTENSION][TEST-SCENE-OVERLAY][START_BLOCK]
// currentScene: fallback на пустом timeline (регрессия после guard).
import { describe, it, expect } from "vitest";
import { currentScene } from "../src/content/render/sceneOverlay";
import { PASSPORT_REGISTRY } from "../src/data/registry";
import type { Passport } from "../src/data/types";

const EMPTY_PASSPORT: Passport = {
  frontmatter: {
    video_id: "empty",
    domain_type: "empty",
    brand_safety_score: 0,
    target_audience: [],
    seo_title: "",
    seo_tags: [],
    trending_cluster: "",
    auto_playlists: [],
    ad_targeting_keywords: [],
    moderation: null,
  },
  timeline: [],
  raw_timeline_segments: [],
  audio_matches: [],
  celebrity_voice: null,
};

describe("currentScene", () => {
  it("returns a safe fallback for an empty timeline (no crash)", () => {
    const cur = currentScene(EMPTY_PASSPORT, 42);
    expect(cur.scene).toBeDefined();
    expect(cur.scene.scene_summary).toBe("");
    expect(cur.scene.monetization).toEqual([]);
    expect(cur.startSec).toBe(0);
    expect(cur.index).toBe(0);
  });

  it("selects the latest scene whose startSec <= t", () => {
    const tech = PASSPORT_REGISTRY.find((e) => e.id === "tech_review")!.passport;
    const cur = currentScene(tech, 1e9);
    expect(cur.index).toBe(tech.timeline.length - 1);
    const first = currentScene(tech, 0);
    expect(first.index).toBe(0);
  });
});
// = [M-EXTENSION][TEST-SCENE-OVERLAY][END_BLOCK]