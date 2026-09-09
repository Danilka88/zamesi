import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  findVideoCards,
  findVideoListContainer,
  mountPromoButton,
  mountVideoListPromos,
  unmountVideoList,
} from "../src/studio/videoList";

const CARD_HTML = `
<div class="videosContainer__vl-videos-module__aYifyXkKtJEgWwIC">
  <div class="__studio_root_abf276_v1-39-0 __studio_column_abf276_v1-39-0 __studio_gap-6x_abf276_v1-39-0">
    <div class="container__cover-module__yYSGsbvzAHIZSn4l"><div class="cover__cover-module__IqOTCsVY7_ExrIL3 cover__vl-card-horizontal-module__SOrQvMbq_HITns0p"><img src="https://pic.rtbcdn.ru/video/2026-09-01/89/0e/890e15d142c610fedc58d7d02204ca10.jpg"></div></div>
    <div class="__studio_root_abf276_v1-39-0 __studio_row_abf276_v1-39-0 __studio_justify-space-between_abf276_v1-39-0 __studio_gap-4x_abf276_v1-39-0">
      <div class="__studio_root_abf276_v1-39-0 __studio_column_abf276_v1-39-0 __studio_gap-4x_abf276_v1-39-0">
        <a class="title__vl-card-horizontal-module__q8NbRItjR9ctTXFx" href="/video/abc123def4567890abcde/">ЭТО ИЗМЕНИТ ВСЁ! GTA 6</a>
        <div class="bottomInfo__vl-card-horizontal-module__UGPUJSf9NhE0ogkt"><p>4</p></div>
      </div>
      <div class="dropdownTrigger__vl-card-horizontal-module__cMOj1uFTkBs_Kaqh"><button data-testid="desktop-dropdown"></button></div>
    </div>
  </div>
  <div class="__studio_root_abf276_v1-39-0 __studio_column_abf276_v1-39-0 __studio_gap-6x_abf276_v1-39-0">
    <div class="container__cover-module__yYSGsbvzAHIZSn4l"><div class="cover__cover-module__IqOTCsVY7_ExrIL3 cover__vl-card-horizontal-module__SOrQvMbq_HITns0p"></div></div>
    <div class="__studio_root_abf276_v1-39-0 __studio_row_abf276_v1-39-0 __studio_justify-space-between_abf276_v1-39-0 __studio_gap-4x_abf276_v1-39-0">
      <div class="__studio_root_abf276_v1-39-0 __studio_column_abf276_v1-39-0 __studio_gap-4x_abf276_v1-39-0">
        <a class="title__vl-card-horizontal-module__q8NbRItjR9ctTXFx" href="https://rutube.ru/video/aceaa503bdb8c200278f94dd3deaf7f5/">GTA 6 — ШОК! 80 часов</a>
        <div class="bottomInfo__vl-card-horizontal-module__UGPUJSf9NhE0ogkt"><p>6</p></div>
      </div>
      <div class="dropdownTrigger__vl-card-horizontal-module__cMOj1uFTkBs_Kaqh"><button data-testid="desktop-dropdown"></button></div>
    </div>
  </div>
</div>
`;

describe("studio videoList", () => {
  beforeEach(() => {
    document.body.innerHTML = CARD_HTML;
  });
  afterEach(() => {
    unmountVideoList();
    document.body.innerHTML = "";
  });

  it("findVideoListContainer находит контейнер", () => {
    expect(findVideoListContainer()).not.toBeNull();
  });

  it("findVideoCards находит 2 карточки", () => {
    const cards = findVideoCards();
    expect(cards.length).toBe(2);
  });

  it("mountPromoButton инжектит заметную кнопку после bottomInfo", () => {
    const cards = findVideoCards();
    for (const c of cards) mountPromoButton(c);
    const btns = document.querySelectorAll('[data-rz-promo-btn]');
    // wrap + button на каждую карточку = 4, но минимум 2 кнопки
    expect(btns.length).toBeGreaterThanOrEqual(2);
    const firstBtn = document.querySelector('button[data-rz-promo-btn]') as HTMLButtonElement;
    expect(firstBtn.textContent).toContain("Продвижение");
    expect(firstBtn.textContent).toContain("Директ");
    expect(firstBtn.style.background).toContain("linear-gradient");
  });

  it("mountPromoButton идемпотентен (не дублирует)", () => {
    const cards = findVideoCards();
    mountPromoButton(cards[0]);
    mountPromoButton(cards[0]);
    const wrapCount = document.querySelectorAll('[data-rz-promo-card]').length;
    expect(wrapCount).toBe(1);
  });

  it("mountVideoListPromos монтирует на все карточки и помечает data-rz-video-id", () => {
    const n = mountVideoListPromos();
    expect(n).toBe(2);
    const cards = findVideoCards();
    expect(cards[0].getAttribute("data-rz-video-id")).toBeTruthy();
    expect(cards[1].getAttribute("data-rz-video-id")).toBe("aceaa503bdb8c200278f94dd3deaf7f5");
  });

  it("клик по кнопке открывает оверлей с promocampaign", async () => {
    const cards = findVideoCards();
    mountPromoButton(cards[0]);
    const btn = cards[0].querySelector('button[data-rz-promo-btn]') as HTMLButtonElement;
    btn.click();
    // оверлей должен появиться
    const overlay = document.querySelector('[data-rz-promo-overlay]');
    expect(overlay).not.toBeNull();
    expect(overlay!.textContent).toContain("Продвижение");
    expect(overlay!.textContent).toContain("Яндекс Директ");
    // закрытие по Esc
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.querySelector('[data-rz-promo-overlay]')).toBeNull();
  });
});
