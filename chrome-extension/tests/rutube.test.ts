// [M-EXTENSION][TEST-RUTUBE][START_BLOCK]
// waitFor: единый poller (resolve при появлении, null по таймауту, immediate).
import { describe, it, expect, vi, afterEach } from "vitest";
import { waitFor, waitForSidebar, waitForMetaRow } from "../src/content/rutube";

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  document.head.innerHTML = "";
});

describe("waitFor", () => {
  it("resolves immediately when probe already returns a value", async () => {
    await expect(waitFor(() => "x", 1000)).resolves.toBe("x");
  });

  it("resolves null immediately when probe returns null and timeout is 0", async () => {
    await expect(waitFor(() => null, 0)).resolves.toBeNull();
  });

  it("polls until probe returns a value", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "performance"] });
    let value: string | null = null;
    const p = waitFor(() => value, 1000, 50);
    setTimeout(() => {
      value = "found";
    }, 150);
    const timer = setInterval(() => {
      if (value) clearInterval(timer);
    }, 10);
    await vi.advanceTimersByTimeAsync(300);
    clearInterval(timer);
    await expect(p).resolves.toBe("found");
  });

  it("returns null after timeout when probe never matches", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
    const p = waitFor(() => null, 100, 50);
    await vi.advanceTimersByTimeAsync(200);
    await expect(p).resolves.toBeNull();
  });
});

describe("waitForSidebar / waitForMetaRow", () => {
  it("waitForSidebar resolves when sidebar appears", async () => {
    const sidebar = document.createElement("aside");
    sidebar.className = "side-container-module__side";
    document.body.append(sidebar);
    await expect(waitForSidebar(1000)).resolves.toBe(sidebar);
  });

  it("waitForMetaRow resolves when meta-row appears", async () => {
    const row = document.createElement("section");
    row.setAttribute("aria-label", "информация о видео");
    document.body.append(row);
    await expect(waitForMetaRow(1000)).resolves.toBe(row);
  });
});
// = [M-EXTENSION][TEST-RUTUBE][END_BLOCK]