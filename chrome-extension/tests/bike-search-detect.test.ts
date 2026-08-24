// [M-EXTENSION][TEST-BIKE-SEARCH-DETECT][START_BLOCK]
// Детект вело-запроса, извлечение query и сбор товаров подборки.
import { describe, it, expect } from "vitest";
import {
  isBikeQuery,
  extractQueryFromUrl,
  BIKE_SEARCH_ENTRIES,
  collectBikeProducts,
} from "../src/content/bikeSearch/detect";

describe("bike-search detect", () => {
  it("BIKE_SEARCH_ENTRIES: ровно 3 видео из подборки", () => {
    expect(BIKE_SEARCH_ENTRIES.length).toBe(3);
    for (const e of BIKE_SEARCH_ENTRIES) {
      expect(e.boundVideoId).toMatch(/^[a-f0-9]+$/);
      expect(e.screenshot).toMatch(/\.png$/);
    }
  });

  it("isBikeQuery распознаёт вело-запросы (в т.ч. русские)", () => {
    expect(isBikeQuery("Велосипеды")).toBe(true);
    expect(isBikeQuery("велосипед горный")).toBe(true);
    expect(isBikeQuery("купить велик")).toBe(true);
    expect(isBikeQuery("горный велосипед 80000")).toBe(true);
    expect(isBikeQuery("mtb xc 29")).toBe(true);
    expect(isBikeQuery("bike")).toBe(true);
  });

  it("isBikeQuery не срабатывает на не-вело запросы и пустоту", () => {
    expect(isBikeQuery("")).toBe(false);
    expect(isBikeQuery("наушники")).toBe(false);
    expect(isBikeQuery("iphone")).toBe(false);
    expect(isBikeQuery("рецепт ужина")).toBe(false);
  });

  it("extractQueryFromUrl вытаскивает query (кодированный + прямой)", () => {
    expect(extractQueryFromUrl("https://rutube.ru/search/?query=Велосипеды")).toBe("Велосипеды");
    expect(extractQueryFromUrl("https://rutube.ru/search/?query=%D0%92%D0%B5%D0%BB%D0%BE")).toBe("Вело");
    expect(extractQueryFromUrl("https://rutube.ru/search/")).toBe("");
    expect(extractQueryFromUrl("https://rutube.ru/video/abc/")).toBe("");
  });

  it("collectBikeProducts собирает ecom-товары из всех паспортов (без реестра — пусто)", () => {
    const products = collectBikeProducts();
    expect(Array.isArray(products)).toBe(true);
    for (const p of products) {
      expect(typeof p.query).toBe("string");
      expect(p.query.length).toBeGreaterThan(0);
      expect(p.icon).toBeTruthy();
    }
  });
});
// = [M-EXTENSION][TEST-BIKE-SEARCH-DETECT][END_BLOCK]