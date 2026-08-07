// [M-EXTENSION][TEST-AUTHOR-TOOLS-RENDER][START_BLOCK]
// Рендер панели автора: заголовки A/B, описания, графики, копирование, cleanup.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mountAuthorTools } from "../src/content/authorTools";
import { PASSPORT_REGISTRY } from "../src/data/registry";
import type { Passport } from "../src/data/types";

let cleanup: (() => void) | undefined;

function techPassport(): Passport {
  return PASSPORT_REGISTRY.find((e) => e.id === "tech_review")!.passport;
}

describe("author-tools render", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    cleanup = undefined;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup?.();
    document.body.innerHTML = "";
  });

  it("рендерит все блоки: заголовок A/B, описания, A/B прогноз, графики, note", () => {
    const host = document.createElement("div");
    document.body.append(host);
    cleanup = mountAuthorTools(host, {
      passport: techPassport(),
      title: "ТОП-5 лучших наушников 2026",
      videoId: "Rv_tech_review_001",
    });
    expect(host.textContent).toContain("Инструменты автора");
    expect(host.textContent).toContain("Заголовок A/B");
    expect(host.textContent).toContain("ТОП-5 лучших наушников 2026"); // native
    expect(host.textContent).toContain("Описание");
    expect(host.textContent).toContain("A/B прогноз эффективности");
    expect(host.textContent).toContain("Заголовки · CTR");
    expect(host.textContent).toContain("Графики (демо)");
    expect(host.querySelectorAll('input[type="radio"][name="rz-ab-title"]').length).toBe(4); // 1+3
    expect(host.querySelectorAll("svg").length).toBeGreaterThanOrEqual(2);
    expect(host.textContent).toContain("NFR-7");
  });

  it("на каждой карточке варианта есть метрики; помечен лидер прогноза", () => {
    const host = document.createElement("div");
    document.body.append(host);
    cleanup = mountAuthorTools(host, {
      passport: techPassport(),
      title: "Native Title",
      videoId: "Rv_tech_review_001",
    });
    expect(host.textContent).toContain("CTR ~");
    expect(host.textContent).toContain("вовлеч.");
    expect(host.textContent).toContain("🏆 лидер прогноза");
    const bars = host.querySelectorAll(".rz-cmp-track");
    expect(bars.length).toBeGreaterThanOrEqual(4); // 4 заголовка (CTR-бары) + описания
  });

  it("native заголовок выбран по умолчанию; выбор переключается", () => {
    const host = document.createElement("div");
    document.body.append(host);
    cleanup = mountAuthorTools(host, {
      passport: techPassport(),
      title: "Native Title",
      videoId: "Rv_tech_review_001",
    });
    const radios = host.querySelectorAll<HTMLInputElement>('input[type="radio"][name="rz-ab-title"]');
    expect(radios[0].checked).toBe(true);
    const aiCard = host.querySelectorAll<HTMLElement>(".rz-ab-card")[1];
    aiCard.click();
    const after = host.querySelectorAll<HTMLInputElement>('input[type="radio"][name="rz-ab-title"]');
    expect(after[0].checked).toBe(false);
    expect(after[1].checked).toBe(true);
  });

  it("кнопка копирования пишет текст в clipboard и показывает toast", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    cleanup = mountAuthorTools(host, {
      passport: techPassport(),
      title: "Native Title",
      videoId: "Rv_tech_review_001",
    });
    const copyBtn = host.querySelectorAll("button[title='Скопировать']")[0] as HTMLButtonElement;
    copyBtn.click();
    await Promise.resolve();
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    const toast = [...document.body.querySelectorAll("div")].find((d) => d.textContent === "Скопировано ✓");
    expect(toast).toBeDefined();
  });

  it("cleanup удаляет toast из body", () => {
    const host = document.createElement("div");
    document.body.append(host);
    cleanup = mountAuthorTools(host, {
      passport: techPassport(),
      title: "T",
      videoId: "Rv_tech_review_001",
    });
    expect(document.body.querySelector(".rz-toast")).not.toBeNull();
    cleanup();
    expect(document.body.querySelector(".rz-toast")).toBeNull();
    cleanup = undefined;
  });
});
