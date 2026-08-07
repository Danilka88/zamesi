// [M-EXTENSION][TEST-TRAVEL-DETECT][START_BLOCK]
// Детект тревел-видео по сигналам страницы + извлечение направления из заголовка.
import { describe, it, expect } from "vitest";
import {
  detectTravelContext,
  extractTravelDestination,
  isTravelCategory,
  hasTravelHashtags,
} from "../src/content/travelOffer/detect";

describe("travel-offer detect", () => {
  it("isTravelCategory: 'Путешествия' → true, null → false", () => {
    expect(isTravelCategory("Путешествия")).toBe(true);
    expect(isTravelCategory("Туризм")).toBe(true);
    expect(isTravelCategory(null)).toBe(false);
    expect(isTravelCategory("Кулинария")).toBe(false);
  });

  it("hasTravelHashtags: тревел-хэштеги → true", () => {
    expect(hasTravelHashtags(["вьетнам", "отпуск"])).toBe(true);
    expect(hasTravelHashtags(["рецепт", "ужин"])).toBe(false);
    expect(hasTravelHashtags([])).toBe(false);
  });

  it("extractTravelDestination по паттерну «в <город>»", () => {
    expect(
      extractTravelDestination("Вьетнам: сколько стоит жить в Нячанге? Честные цены 2026"),
    ).toBe("Нячанг");
    expect(extractTravelDestination("Переезд в Таиланд: сколько взять с собой")).toBe("Таиланд");
  });

  it("extractTravelDestination по словарю известных направлений", () => {
    expect(extractTravelDestination("Зимовка во Вьетнаме — полный гайд")).toBe("Вьетнам");
    expect(extractTravelDestination("Отдых на Бали: мой опыт")).toBe("Бали");
  });

  it("extractTravelDestination без направления → null", () => {
    expect(extractTravelDestination("Как выбрать наушники за 5000 рублей")).toBeNull();
    expect(extractTravelDestination("  ")).toBeNull();
  });

  it("detect by passport domain_type (travel_vlog)", () => {
    const ctx = detectTravelContext({
      title: "Вьетнам: сколько стоит жить в Нячанге? Честные цены 2026",
      metaCategory: null,
      hashtags: [],
      domainType: "travel_vlog",
    });
    expect(ctx.isTravel).toBe(true);
    expect(ctx.destination).toBe("Нячанг");
    expect(ctx.source).toBe("passport");
  });

  it("detect by page category (Путешествия)", () => {
    const ctx = detectTravelContext({
      title: "Отдых в Турции — всё включено",
      metaCategory: "Путешествия",
      hashtags: [],
      domainType: null,
    });
    expect(ctx.isTravel).toBe(true);
    expect(ctx.destination).toBe("Турция");
    expect(ctx.source).toBe("page");
  });

  it("detect by hashtags only when no passport/category", () => {
    const ctx = detectTravelContext({
      title: "Мы улетели на зимовку во Вьетнам",
      metaCategory: null,
      hashtags: ["отпуск"],
      domainType: null,
    });
    expect(ctx.isTravel).toBe(true);
    expect(ctx.destination).toBe("Вьетнам");
    expect(ctx.source).toBe("page");
  });

  it("non-travel video → isTravel=false", () => {
    const ctx = detectTravelContext({
      title: "Рецепт сырников за 20 минут",
      metaCategory: "Рецепты",
      hashtags: ["кухня"],
      domainType: "cooking_dinner",
    });
    expect(ctx.isTravel).toBe(false);
    expect(ctx.destination).toBeNull();
    expect(ctx.source).toBeNull();
  });
});
// = [M-EXTENSION][TEST-TRAVEL-OFFER][END_BLOCK]
