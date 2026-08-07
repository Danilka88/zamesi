// [M-EXTENSION][TEST-GAME-OFFER][START_BLOCK]
// Карточка оффера: вставка после meta-row, идемпотентность, демо-заглушки (NFR-7).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildGameOfferCard,
  mountGameOfferCard,
  unmountGameOfferCard,
  GAME_OFFER_ACTIONS,
  gameCoverSrc,
  isDarkTheme,
} from "../src/content/gameOffer/render";
import { mountGameOffer, removeGameOffer } from "../src/content/gameOffer/index";

function metaRowFixture(): HTMLElement {
  const section = document.createElement("section");
  section.setAttribute("aria-label", "информация о видео");
  document.body.append(section);
  return section;
}

describe("game-offer card render", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.head.innerHTML = "";
  });
  afterEach(() => {
    removeGameOffer();
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    delete (globalThis as { chrome?: unknown }).chrome;
  });

  it("buildGameOfferCard: заголовок с именем игры + 4 плитки в сетке 2×2", () => {
    const card = buildGameOfferCard("Atomic Heart");
    expect(card.hasAttribute("data-rz-game-offer")).toBe(true);
    expect(card.textContent).toContain("Atomic Heart");
    const actions = card.querySelectorAll<HTMLAnchorElement>("a[data-rz-game-offer-action]");
    expect(actions.length).toBe(GAME_OFFER_ACTIONS.length);
    expect(GAME_OFFER_ACTIONS.length).toBe(4);
    for (const a of actions) {
      expect(a.getAttribute("href")).toBe("#");
      expect(a.target).toBe("_blank");
      expect(a.rel).toContain("noopener");
      expect(a.style.background).toContain("gradient");
    }
    const grid = card.querySelector("div[style*='grid-template-columns']");
    expect(grid?.getAttribute("style")).toContain("repeat(2,1fr)");
    expect(card.textContent).not.toMatch(/демо/i);
  });

  it("isDarkTheme: тёмная тема по data-theme", () => {
    document.documentElement.setAttribute("data-pen-theme", "dark");
    expect(isDarkTheme(window)).toBe(true);
    document.documentElement.setAttribute("data-pen-theme", "light");
    expect(isDarkTheme(window)).toBe(false);
  });

  it("gameCoverSrc: обложка Atomic Heart — внешний URL как есть", () => {
    expect(gameCoverSrc("Atomic Heart")).toContain("avatars.mds.yandex.net");
    expect(gameCoverSrc("aggressive seriousness")).toBeNull();
  });

  it("buildGameOfferCard: показывает обложку игры в шапке (внешний URL)", () => {
    const card = buildGameOfferCard("Atomic Heart");
    const img = card.querySelector<HTMLImageElement>("img[data-rz-cover]");
    expect(img).not.toBeNull();
    expect(img?.src).toContain("avatars.mds.yandex.net");
    expect(card.textContent).toContain("Atomic Heart");
  });

  it("buildGameOfferCard: без обложки — показана заглушка 🎮", () => {
    const card = buildGameOfferCard("Странная Игра X");
    expect(card.querySelector("img[data-rz-cover]")).toBeNull();
    expect(card.textContent).toContain("🎮");
  });

  it("mountGameOfferCard: вставляется сразу после якоря", () => {
    const section = metaRowFixture();
    const card = mountGameOfferCard(section, "Atomic Heart");
    expect(card).not.toBeNull();
    expect(section.nextElementSibling).toBe(card);
    expect(document.body.querySelectorAll("[data-rz-game-offer]").length).toBe(1);
  });

  it("mountGameOfferCard идемпотентен — второй вызов не дублирует карточку", () => {
    const section = metaRowFixture();
    mountGameOfferCard(section, "Atomic Heart");
    const again = mountGameOfferCard(section, "Atomic Heart");
    expect(document.body.querySelectorAll("[data-rz-game-offer]").length).toBe(1);
    expect(again).toBe(section.nextElementSibling);
  });

  it("unmountGameOfferCard удаляет карточку после якоря", () => {
    const section = metaRowFixture();
    mountGameOfferCard(section, "Atomic Heart");
    unmountGameOfferCard(section);
    expect(document.body.querySelector("[data-rz-game-offer]")).toBeNull();
    expect(section.nextElementSibling).toBeNull();
  });

  it("mountGameOffer монтирует блок для игрового паспорта", async () => {
    const section = metaRowFixture();
    document.head.innerHTML =
      '<meta property="ya:ovs:category" content="Видеоигры">';
    const ok = await mountGameOffer(
      { frontmatter: { domain_type: "game_review" } } as never,
      "Обзор Atomic Heart",
    );
    expect(ok).toBe(true);
    expect(document.body.querySelector("[data-rz-game-offer]")?.textContent).toContain("Atomic Heart");
    expect(section.nextElementSibling?.hasAttribute("data-rz-game-offer")).toBe(true);
  });

  it("mountGameOffer не монтирует блок для не-игрового видео", async () => {
    metaRowFixture();
    const ok = await mountGameOffer(
      { frontmatter: { domain_type: "cooking_dinner" } } as never,
      "Рецепт сырников",
    );
    expect(ok).toBe(false);
    expect(document.body.querySelector("[data-rz-game-offer]")).toBeNull();
  });

  it("mountGameOffer не монтирует блок без meta-row (таймаут)", async () => {
    // Якорь отсутствует — по таймауту функция возвращает false.
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
    try {
      const p = mountGameOffer(
        { frontmatter: { domain_type: "game_review" } } as never,
        "Обзор Atomic Heart",
        100,
      );
      await vi.advanceTimersByTimeAsync(1000);
      const ok = await p;
      expect(ok).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
// = [M-EXTENSION][TEST-GAME-OFFER][END_BLOCK]