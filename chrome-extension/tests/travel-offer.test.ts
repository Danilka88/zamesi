// [M-EXTENSION][TEST-TRAVEL-OFFER][START_BLOCK]
// Карточка тревел-оффера: вставка после meta-row, идемпотентность, демо-заглушки (NFR-7).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildTravelOfferCard,
  mountTravelOfferCard,
  unmountTravelOfferCard,
  buildTravelActions,
  travelCoverSrc,
  isDarkTheme,
  TRAVEL_DEPARTURE_CITY,
} from "../src/content/travelOffer/render";
import { mountTravelOffer, removeTravelOffer } from "../src/content/travelOffer/index";

function metaRowFixture(): HTMLElement {
  const section = document.createElement("section");
  section.setAttribute("aria-label", "информация о видео");
  document.body.append(section);
  return section;
}

describe("travel-offer card render", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.head.innerHTML = "";
  });
  afterEach(() => {
    removeTravelOffer();
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    delete (globalThis as { chrome?: unknown }).chrome;
  });

  it("buildTravelOfferCard: направление + 4 плитки в сетке 2×2", () => {
    const card = buildTravelOfferCard("Нячанг");
    expect(card.hasAttribute("data-rz-travel-offer")).toBe(true);
    expect(card.textContent).toContain("Нячанг");
    expect(card.textContent).toContain(TRAVEL_DEPARTURE_CITY);
    const actions = card.querySelectorAll<HTMLAnchorElement>("a[data-rz-travel-offer-action]");
    expect(actions.length).toBe(4);
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

  it("buildTravelActions: билеты из Краснодара в направление", () => {
    const actions = buildTravelActions("Нячанг");
    expect(actions[0].label).toBe(`Билеты ${TRAVEL_DEPARTURE_CITY} → Нячанг`);
    expect(actions[1].label).toBe("Туры в Нячанг");
    expect(actions.some((a) => a.label.includes("Отели"))).toBe(true);
    expect(actions.some((a) => a.label.includes("Экскурсии"))).toBe(true);
  });

  it("isDarkTheme: тёмная тема по data-theme", () => {
    document.documentElement.setAttribute("data-pen-theme", "dark");
    expect(isDarkTheme(window)).toBe(true);
    document.documentElement.setAttribute("data-pen-theme", "light");
    expect(isDarkTheme(window)).toBe(false);
  });

  it("travelCoverSrc: без обложки направления → null", () => {
    expect(travelCoverSrc("Нячанг")).toBeNull();
    expect(travelCoverSrc("неизвестное место")).toBeNull();
  });

  it("buildTravelOfferCard: без обложки — показана заглушка 🌍", () => {
    const card = buildTravelOfferCard("Нячанг");
    expect(card.querySelector("img[data-rz-cover]")).toBeNull();
    expect(card.textContent).toContain("🌍");
  });

  it("mountTravelOfferCard: вставляется сразу после якоря", () => {
    const section = metaRowFixture();
    const card = mountTravelOfferCard(section, "Нячанг");
    expect(card).not.toBeNull();
    expect(section.nextElementSibling).toBe(card);
    expect(document.body.querySelectorAll("[data-rz-travel-offer]").length).toBe(1);
  });

  it("mountTravelOfferCard идемпотентен — второй вызов не дублирует карточку", () => {
    const section = metaRowFixture();
    mountTravelOfferCard(section, "Нячанг");
    const again = mountTravelOfferCard(section, "Нячанг");
    expect(document.body.querySelectorAll("[data-rz-travel-offer]").length).toBe(1);
    expect(again).toBe(section.nextElementSibling);
  });

  it("unmountTravelOfferCard удаляет карточку после якоря", () => {
    const section = metaRowFixture();
    mountTravelOfferCard(section, "Нячанг");
    unmountTravelOfferCard(section);
    expect(document.body.querySelector("[data-rz-travel-offer]")).toBeNull();
    expect(section.nextElementSibling).toBeNull();
  });

  it("mountTravelOffer монтирует блок для тревел-паспорта", async () => {
    const section = metaRowFixture();
    const ok = await mountTravelOffer(
      { frontmatter: { domain_type: "travel_vlog" } } as never,
      "Вьетнам: сколько стоит жить в Нячанге? Честные цены 2026",
    );
    expect(ok).toBe(true);
    expect(document.body.querySelector("[data-rz-travel-offer]")?.textContent).toContain("Нячанг");
    expect(section.nextElementSibling?.hasAttribute("data-rz-travel-offer")).toBe(true);
  });

  it("mountTravelOffer не монтирует блок для не-тревел видео", async () => {
    metaRowFixture();
    const ok = await mountTravelOffer(
      { frontmatter: { domain_type: "cooking_dinner" } } as never,
      "Рецепт сырников",
    );
    expect(ok).toBe(false);
    expect(document.body.querySelector("[data-rz-travel-offer]")).toBeNull();
  });

  it("mountTravelOffer не монтирует блок без meta-row (таймаут)", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
    try {
      const p = mountTravelOffer(
        { frontmatter: { domain_type: "travel_vlog" } } as never,
        "Вьетнам: сколько стоит жить в Нячанге?",
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
// = [M-EXTENSION][TEST-TRAVEL-OFFER][END_BLOCK]
