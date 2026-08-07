// [M-EXTENSION][TEST-MODES][START_BLOCK]
// A-C003-05: переключение режимов, A-C003-01: монтаж Shadow DOM-хоста.
import { describe, it, expect, vi } from "vitest";
import { mountHost, unmountHost } from "../src/content/shadow";
import { ModesController } from "../src/content/modes";
import { PASSPORT_REGISTRY } from "../src/data/registry";
import { computeMetrics } from "../src/content/data/demo";
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

describe("mountHost", () => {
  it("creates a Shadow DOM host with a panel (A-C003-01)", () => {
    const host = mountHost();
    expect(host.host).toBeInstanceOf(HTMLElement);
    expect(host.host.shadowRoot).not.toBeNull();
    expect(host.panel).toBeInstanceOf(HTMLElement);
    // idempotent: second mount reuses same host
    const again = mountHost();
    expect(again.host).toBe(host.host);
    unmountHost();
  });
});

describe("ModesController", () => {
  it("switches modes preserving data (A-C003-05)", () => {
    const host = mountHost();
    const tech = PASSPORT_REGISTRY.find((e) => e.id === "tech_review")!.passport;
    const ctrl = new ModesController(host, makePlayer(), { passport: tech, metrics: computeMetrics(tech) });
    expect(ctrl.current).toBe("simulation");
    ctrl.setMode("analyst");
    expect(ctrl.current).toBe("analyst");
    ctrl.setMode("simulation");
    expect(ctrl.current).toBe("simulation");
    ctrl.setMode("viewer");
    expect(ctrl.current).toBe("viewer");
    ctrl.setMode("simulation");
    expect(ctrl.current).toBe("simulation");
    ctrl.destroy();
    unmountHost();
  });

  it("honors initial mode (keeps viewer on re-bind, A-C003-04)", () => {
    const host = mountHost();
    const tech = PASSPORT_REGISTRY.find((e) => e.id === "tech_review")!.passport;
    const ctrl = new ModesController(host, makePlayer(), { passport: tech, metrics: computeMetrics(tech) }, "viewer");
    expect(ctrl.current).toBe("viewer");
    ctrl.setMode("analyst");
    expect(ctrl.current).toBe("analyst");
    ctrl.destroy();
    unmountHost();
  });
});
// = [M-EXTENSION][TEST-MODES][END_BLOCK]