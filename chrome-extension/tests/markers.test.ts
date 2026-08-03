// [M-EXTENSION][TEST-MARKERS][START_BLOCK]
// A-C003-02: клик по маркеру → seek (currentTime + play) в Shadow DOM-панели.
import { describe, it, expect, vi } from "vitest";
import { renderMarkers } from "../src/content/render/markers";
import { PASSPORT_REGISTRY } from "../src/data/registry";
import type { PlayerHandle } from "../src/content/rutube";

function makePlayer(): PlayerHandle {
  return {
    video: null,
    progressBar: null,
    timecode: null,
    getDuration: () => 300,
    getCurrentTime: () => 0,
    seekTo: vi.fn(),
  };
}

describe("renderMarkers", () => {
  it("renders one chip per monetization point and seeks on click", () => {
    const container = document.createElement("div");
    const player = makePlayer();
    const tech = PASSPORT_REGISTRY.find((e) => e.id === "tech_review")!.passport;
    renderMarkers(container, player, tech);

    const chips = container.querySelectorAll(".rz-chip");
    expect(chips.length).toBeGreaterThan(0);

    const firstTarget = collectFirstStart(tech);
    (chips[0] as HTMLElement).click();
    expect(player.seekTo).toHaveBeenCalledWith(firstTarget);
  });
});

import { collectMarkers } from "../src/content/render/markers";
import type { Passport } from "../src/data/types";
function collectFirstStart(p: Passport): number {
  return collectMarkers(p)[0].startSec;
}
// = [M-EXTENSION][TEST-MARKERS][END_BLOCK]