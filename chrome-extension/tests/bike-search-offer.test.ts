// [M-EXTENSION][TEST-BIKE-SEARCH-OFFER][START_BLOCK]
// Блок «Замеси: Велосипеды»: вставка после блока фильтров поиска,
// идемпотентность, наличие видео-ссылок и товарной секции (NFR-7).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildBikeSearchCard,
  mountBikeSearchCard,
  unmountBikeSearchCard,
  videoUrl,
  domainLabel,
  isDarkTheme,
  screenshotSrc,
  BIKE_SEARCH_ATTR,
} from "../src/content/bikeSearch/render";
import { BIKE_SEARCH_ENTRIES, collectBikeProducts } from "../src/content/bikeSearch/detect";
import { mountBikeSearch, removeBikeSearch } from "../src/content/bikeSearch/index";

function searchAnchorFixture(): HTMLElement {
  const div = document.createElement("div");
  div.className = "search-filters-module__searchFilters";
  document.body.append(div);
  return div;
}

describe("bike-search offer render", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.head.innerHTML = "";
  });
  afterEach(() => {
    removeBikeSearch();
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    delete (globalThis as { chrome?: unknown }).chrome;
  });

  it("buildBikeSearchCard: 3 видео-строки + секция товаров + заголовок RUTUBE Замеси", () => {
    const products = collectBikeProducts();
    const card = buildBikeSearchCard(BIKE_SEARCH_ENTRIES, products);
    expect(card.hasAttribute(BIKE_SEARCH_ATTR)).toBe(true);
    expect(card.textContent).toContain("RUTUBE Замеси");
    expect(card.textContent).toContain("Велосипеды");
    const rows = card.querySelectorAll("a[data-rz-bike-search-video]");
    expect(rows.length).toBe(3);
    expect(products.length).toBeGreaterThan(0);
    expect(card.textContent).toContain("Товары из подборки");
    expect(card.textContent).not.toMatch(/демо/i);
  });

  it("видео-строки ведут на rutube video и открываются в новой вкладке", () => {
    const card = buildBikeSearchCard(BIKE_SEARCH_ENTRIES, collectBikeProducts());
    const rows = [...card.querySelectorAll<HTMLAnchorElement>("a[data-rz-bike-search-video]")];
    for (const [i, row] of rows.entries()) {
      expect(row.getAttribute("href")).toBe(videoUrl(BIKE_SEARCH_ENTRIES[i].boundVideoId));
      expect(row.target).toBe("_blank");
      expect(row.rel).toContain("noopener");
    }
  });

  it("domainLabel: how_to → Гайд, review → Обзор, fallback типа как есть", () => {
    expect(domainLabel("how_to")).toBe("Гайд");
    expect(domainLabel("review")).toBe("Обзор");
    expect(domainLabel("travel_vlog")).toBe("travel_vlog");
  });

  it("isDarkTheme: тёмная/светлая по data-theme", () => {
    document.documentElement.setAttribute("data-pen-theme", "dark");
    expect(isDarkTheme(window)).toBe(true);
    document.documentElement.setAttribute("data-pen-theme", "light");
    expect(isDarkTheme(window)).toBe(false);
  });

  it("screenshotSrc без chrome.runtime возвращает относительный b bike/{name}", () => {
    expect(screenshotSrc("bike_dont_buy.png")).toMatch(/bike\/bike_dont_buy\.png$/);
  });

  it("screenshotSrc c chrome.runtime.getURL отдаёт полный URL", () => {
    (globalThis as { chrome?: unknown }).chrome = {
      runtime: { getURL: (p: string) => `chrome-extension://id/${p}` },
    };
    expect(screenshotSrc("bike_dont_buy.png")).toBe("chrome-extension://id/bike/bike_dont_buy.png");
  });

  it("mountBikeSearchCard: вставляется после якоря и идемпотентен", () => {
    const anchor = searchAnchorFixture();
    const first = mountBikeSearchCard(anchor, BIKE_SEARCH_ENTRIES, collectBikeProducts());
    expect(anchor.nextElementSibling).toBe(first);
    const second = mountBikeSearchCard(anchor, BIKE_SEARCH_ENTRIES, collectBikeProducts());
    expect(anchor.nextElementSibling).toBe(second);
    expect(document.body.querySelectorAll(`[${BIKE_SEARCH_ATTR}]`).length).toBe(1);
  });

  it("unmountBikeSearchCard удаляет карточку", () => {
    const anchor = searchAnchorFixture();
    mountBikeSearchCard(anchor, BIKE_SEARCH_ENTRIES, collectBikeProducts());
    unmountBikeSearchCard(anchor);
    expect(document.body.querySelector(`[${BIKE_SEARCH_ATTR}]`)).toBeNull();
  });

  it("mountBikeSearch не монтируется на не-вело странице поиска", async () => {
    vi.stubGlobal("location", { href: "https://rutube.ru/search/?query=%D0%BD%D0%B0%D1%83%D1%88%D0%BD%D0%B8%D0%BA%D0%B8" });
    try {
      const ok = await mountBikeSearch(1000);
      expect(ok).toBe(false);
      expect(document.body.querySelector(`[${BIKE_SEARCH_ATTR}]`)).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
// = [M-EXTENSION][TEST-BIKE-SEARCH-OFFER][END_BLOCK]