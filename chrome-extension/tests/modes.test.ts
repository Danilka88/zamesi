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

describe("ModesController fullscreen modal", () => {
  function makeCtrl(mode: "viewer" | "analyst" | "simulation" | "author" = "author"): { host: ReturnType<typeof mountHost>; ctrl: ModesController } {
    const host = mountHost();
    const tech = PASSPORT_REGISTRY.find((e) => e.id === "tech_review")!.passport;
    const ctrl = new ModesController(host, makePlayer(), { passport: tech, metrics: computeMetrics(tech) }, mode);
    ctrl.render();
    return { host, ctrl };
  }

  it("has an expand button in the sidebar toolbar", () => {
    const { host, ctrl } = makeCtrl();
    const btn = host.panel.querySelector<HTMLElement>(".rz-expand");
    expect(btn).not.toBeNull();
    ctrl.destroy();
    unmountHost();
  });

  it("expand() opens a full-width modal with 4 tabs and current mode content", () => {
    const { host, ctrl } = makeCtrl("author");
    ctrl.expand();
    expect(ctrl.isExpanded).toBe(true);
    const overlay = host.root.querySelector<HTMLElement>(".rz-modal-overlay");
    expect(overlay).not.toBeNull();
    const win = host.root.querySelector<HTMLElement>(".rz-modal");
    expect(win).not.toBeNull();
    expect(win?.style.width).toContain("calc(100vw");
    // 4 вкладки всех режимов
    expect(overlay?.querySelectorAll(".rz-toggle.wide button").length).toBe(4);
    // контент текущего режима (Автор)
    expect(overlay?.textContent).toContain("Инструменты автора");
    expect(overlay?.textContent).toContain("A/B прогноз эффективности");
    // сайдбар приостановлен — контент очищен
    expect(host.panel.querySelector(".rz-author-body")).toBeNull();
    ctrl.destroy();
    unmountHost();
  });

  it("switching a modal tab re-renders that mode into the modal", () => {
    const { host, ctrl } = makeCtrl("author");
    ctrl.expand();
    const overlay = host.root.querySelector<HTMLElement>(".rz-modal-overlay")!;
    const tabs = overlay.querySelectorAll<HTMLButtonElement>(".rz-toggle.wide button");
    const analyst = [...tabs].find((b) => b.textContent?.includes("Аналитик"))!;
    analyst.click();
    expect(overlay.textContent).toContain("Монетизации");
    expect(overlay.textContent).not.toContain("Инструменты автора");
    ctrl.destroy();
    unmountHost();
  });

  it("setMode() while modal is open switches the modal tab, not the sidebar", () => {
    const { host, ctrl } = makeCtrl("author");
    ctrl.expand();
    ctrl.setMode("viewer");
    const overlay = host.root.querySelector<HTMLElement>(".rz-modal-overlay")!;
    expect(overlay.textContent).toContain("Зритель ·");
    expect(ctrl.current).toBe("author");
    ctrl.destroy();
    unmountHost();
  });

  it("close button removes the overlay and restores the sidebar", () => {
    const { host, ctrl } = makeCtrl("author");
    ctrl.expand();
    host.root.querySelector<HTMLElement>(".rz-modal-close")!.click();
    expect(ctrl.isExpanded).toBe(false);
    expect(host.root.querySelector(".rz-modal-overlay")).toBeNull();
    // сайдбар восстановлен
    expect(host.panel.querySelector(".rz-toggle")).not.toBeNull();
    expect(host.panel.querySelector(".rz-author-body")).not.toBeNull();
    ctrl.destroy();
    unmountHost();
  });

  it("Escape key closes the modal", () => {
    const { host, ctrl } = makeCtrl();
    ctrl.expand();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(host.root.querySelector(".rz-modal-overlay")).toBeNull();
    expect(ctrl.isExpanded).toBe(false);
    ctrl.destroy();
    unmountHost();
  });

  it("backdrop click closes the modal", () => {
    const { host, ctrl } = makeCtrl();
    ctrl.expand();
    const overlay = host.root.querySelector<HTMLElement>(".rz-modal-overlay")!;
    overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(host.root.querySelector(".rz-modal-overlay")).toBeNull();
    ctrl.destroy();
    unmountHost();
  });

  it("destroy() cleans up an open modal", () => {
    const { host, ctrl } = makeCtrl();
    ctrl.expand();
    ctrl.destroy();
    expect(host.root.querySelector(".rz-modal-overlay")).toBeNull();
    unmountHost();
  });
});
// = [M-EXTENSION][TEST-MODES][END_BLOCK]