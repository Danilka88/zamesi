// [M-EXTENSION][TEST-COMMENTS-INDEX][START_BLOCK]
// Интеграционный тест оркестрации: mountComments на мок-странице RUTUBE
// (wrapper+list+li) — сводка монтируется, li обогащаются, фильтр работает.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountComments, removeComments } from "../src/content/comments/index";
import iphonePassport from "../src/data/passports/iphone_50k_wylsacom.json" with { type: "json" };
import type { Passport } from "../src/data/types";

const P = iphonePassport as unknown as Passport;
const VID = "2013f4eba6ade7b01582fb411f9e901a";

function seedPage(comments: string[]): void {
  document.body.innerHTML = `
    <section aria-label="комментарии" class="wdp-comments-module__wrapper">
      <div class="wdp-comments-module__comments-header-container">
        <h2 class="wdp-comments-module__title">${comments.length} комментариев</h2>
      </div>
      <div class="wdp-comments-module__input-container">
        <textarea class="wdp-comment-first-level-input-module__commentTextarea" placeholder="Ваш комментарий"></textarea>
      </div>
      <ul class="wdp-comments-module__list">
        ${comments
          .map(
            (c, i) => `
        <li role="region" class="wdp-comment-item-module__comment-item">
          <div class="wdp-comment-item-module__author-row">
            <div class="wdp-comment-author-module__author-name">
              <span class="wdp-comment-author-module__author-name-inner">Автор${i}</span>
            </div>
          </div>
          <div class="wdp-comment-item-module__description-container">
            <p class="wdp-comment-item-module__description">${c}</p>
          </div>
          <div class="wdp-comment-reactions-module__buttons-row">
            <span class="wdp-comment-reactions-module__counter">${i * 3}</span>
          </div>
        </li>`,
          )
          .join("")}
      </ul>
    </section>
  `;
}

function fakePlayer() {
  return {
    video: null,
    progressBar: null,
    timecode: null,
    getDuration: () => 0,
    getCurrentTime: () => 0,
    seekTo: vi.fn(),
  };
}

beforeEach(() => {
  removeComments();
  vi.restoreAllMocks();
});

describe("comments index: mountComments", () => {
  it("монтирует сводку и обогащает все комментарии", async () => {
    seedPage(["Где взять царское стекло на 16e?", "Отличное видео, спасибо!"]);
    const ok = await mountComments(P, "title", fakePlayer(), VID);
    expect(ok).toBe(true);

    const wrapper = document.querySelector(".wdp-comments-module__wrapper")!;
    // Сводка вставлена перед списком.
    expect(wrapper.querySelector('[data-rz-comments]')).not.toBeNull();
    // li обогащены.
    const items = wrapper.querySelectorAll<HTMLElement>("li[data-rz-comment-tags]");
    expect(items.length).toBe(2);
    expect(wrapper.textContent).toContain("Умные комментарии");
    expect(wrapper.textContent).toContain("💰");
  });

  it("пустой блок без li → сводка с нулями, KPI есть", async () => {
    document.body.innerHTML = `
      <section aria-label="комментарии" class="wdp-comments-module__wrapper">
        <ul class="wdp-comments-module__list"></ul>
      </section>`;
    const ok = await mountComments(P, "t", fakePlayer(), VID);
    expect(ok).toBe(true);
    const card = document.querySelector("[data-rz-comments]");
    expect(card).not.toBeNull();
    expect(card!.textContent).toContain("0");
  });

  it("фильтр «Лиды» прячет non-лид комментарий", async () => {
    seedPage(["Хочу царское стекло на 16e", "Отличное видео, спасибо!"]);
    await mountComments(P, "t", fakePlayer(), VID);
    const list = document.querySelector(".wdp-comments-module__list")!;
    const tabs = [...document.querySelectorAll<HTMLButtonElement>("button[role='tab']")];
    const leadTab = tabs.find((b) => b.textContent?.includes("Лиды"));
    expect(leadTab).toBeTruthy();
    leadTab!.click();
    const items = list.querySelectorAll<HTMLElement>("li[data-rz-comment-tags]");
    const visible = [...items].filter((li) => li.style.display !== "none");
    expect(visible.length).toBe(1);
    expect(visible[0].textContent).toContain("царское стекло");
  });

  it("removeComments снимает сводку и сбрасывает состояние", async () => {
    seedPage(["Где взять царское стекло на 16e?"]);
    await mountComments(P, "t", fakePlayer(), VID);
    removeComments();
    expect(document.querySelector("[data-rz-comments]")).toBeNull();
    // повторный монтаж работает (идемпотентно)
    const ok2 = await mountComments(P, "t", fakePlayer(), VID);
    expect(ok2).toBe(true);
  });
});
// = [M-EXTENSION][TEST-COMMENTS-INDEX][END_BLOCK]