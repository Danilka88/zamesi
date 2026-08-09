// [M-EXTENSION][TEST-MERCH-OFFER][START_BLOCK]
// Карточка мерч-оффера: вставка после meta-row, идемпотентность, демо-заглушки (NFR-7).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildMerchOfferCard,
  buildProductTile,
  buildStoreChip,
  mountMerchOfferCard,
  unmountMerchOfferCard,
  merchStoresFor,
  isDarkTheme,
  MERCH_STORE_BY_BRAND,
} from "../src/content/merchOffer/render";
import { mountMerchOffer, removeMerchOffer } from "../src/content/merchOffer/index";
import type { MerchProduct } from "../src/content/merchOffer/detect";
import type { Passport } from "../src/data/types";

const SAMPLE_PRODUCTS: MerchProduct[] = [
  { label: "iPhone 16e", icon: "📱", query: "iPhone 16e купить", type: "ecom_item", confidence: 0.97 },
  { label: "iPhone 16", icon: "📱", query: "iPhone 16 купить", type: "ecom_item", confidence: 0.96 },
  { label: "Царское стекло Wylsacom", icon: "🛡️", query: "царское стекло Wylsacom 3D", type: "artist_merch", confidence: 0.98 },
];

function metaRowFixture(): HTMLElement {
  const section = document.createElement("section");
  section.setAttribute("aria-label", "информация о видео");
  document.body.append(section);
  return section;
}

function productPassport(): Passport {
  return {
    frontmatter: {
      video_id: "p2",
      domain_type: "tech_review",
      brand_safety_score: 90,
      target_audience: [],
      seo_title: "",
      seo_tags: [],
      trending_cluster: "",
      auto_playlists: [],
      ad_targeting_keywords: [],
      moderation: null,
    },
    timeline: [
      {
        action_is_clear: true,
        requires_vision: false,
        scene_summary: "обзор",
        monetization: [
          { type: "ecom_item", search_query: "iPhone 16e купить", reason: null, confidence: 0.97 },
        ],
        clip_candidate: null,
        fallback_used: null,
        processing_time_sec: 0.1,
      },
    ],
    raw_timeline_segments: [],
    audio_matches: [],
    celebrity_voice: { name: "Wylsacom", profession: "техноблогер", confidence: 0.96 },
  };
}

describe("merch-offer card render", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.head.innerHTML = "";
  });
  afterEach(() => {
    removeMerchOffer();
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    delete (globalThis as { chrome?: unknown }).chrome;
  });

  it("buildMerchOfferCard: бренд + плитки товаров + чипы магазинов", () => {
    const card = buildMerchOfferCard("Wylsacom", SAMPLE_PRODUCTS);
    expect(card.hasAttribute("data-rz-merch-offer")).toBe(true);
    expect(card.textContent).toContain("МЕРЧ");
    expect(card.textContent).toContain("Wylsacom");
    const products = card.querySelectorAll<HTMLAnchorElement>("a[data-rz-merch-product]");
    expect(products.length).toBe(3);
    const stores = card.querySelectorAll<HTMLAnchorElement>("a[data-rz-merch-store]");
    expect(stores.length).toBe(MERCH_STORE_BY_BRAND.wylsacom.length);
    expect(card.textContent).not.toMatch(/демо/i);
  });

  it("плитки/чипы: href=#, target=_blank, rel=noopener", () => {
    const card = buildMerchOfferCard("Wylsacom", SAMPLE_PRODUCTS);
    for (const a of card.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      expect(a.getAttribute("href")).toBe("#");
      expect(a.target).toBe("_blank");
      expect(a.rel).toContain("noopener");
    }
  });

  it("компактная сетка товаров — до 2 в ряд", () => {
    const card = buildMerchOfferCard("Wylsacom", SAMPLE_PRODUCTS);
    const grid = card.querySelector("div[style*='grid-template-columns']");
    expect(grid?.getAttribute("style")).toContain("repeat(2,1fr)");
  });

  it("artist_merch-плитка помечена тегом «мерч канала»", () => {
    const dark = { cardBg: "", cardBorder: "", title: "#000", sub: "#666", sectionBg: "", tileBg: "" };
    const merch = SAMPLE_PRODUCTS[2];
    const tile = buildProductTile(merch, dark as never);
    expect(tile.textContent).toContain("мерч канала");
    expect(tile.dataset.rzMerchProduct).toBe(merch.label);
  });

  it("buildStoreChip: чип с иконкой и лейблом", () => {
    const chip = buildStoreChip({ label: "OZON", hint: "площадка ozon.ru", href: "#", icon: "🚚" });
    expect(chip.textContent).toContain("OZON");
    expect(chip.textContent).toContain("🚚");
    expect(chip.dataset.rzMerchStore).toBe("OZON");
  });

  it("merchStoresFor: карта бренда, при отсутствии — дефолтные магазины", () => {
    expect(merchStoresFor("Wylsacom").some((s) => s.label === "Царские стёкла")).toBe(true);
    expect(merchStoresFor(null).some((s) => s.label === "Wildberries")).toBe(true);
  });

  it("isDarkTheme: тёмная тема по data-theme", () => {
    document.documentElement.setAttribute("data-pen-theme", "dark");
    expect(isDarkTheme(window)).toBe(true);
    document.documentElement.setAttribute("data-pen-theme", "light");
    expect(isDarkTheme(window)).toBe(false);
  });

  it("mountMerchOfferCard: вставляется сразу после якоря, идемпотентен", () => {
    const section = metaRowFixture();
    mountMerchOfferCard(section, "Wylsacom", SAMPLE_PRODUCTS);
    const again = mountMerchOfferCard(section, "Wylsacom", SAMPLE_PRODUCTS);
    expect(document.body.querySelectorAll("[data-rz-merch-offer]").length).toBe(1);
    expect(again).toBe(section.nextElementSibling);
  });

  it("unmountMerchOfferCard удаляет карточку после якоря", () => {
    const section = metaRowFixture();
    mountMerchOfferCard(section, "Wylsacom", SAMPLE_PRODUCTS);
    unmountMerchOfferCard(section);
    expect(document.body.querySelector("[data-rz-merch-offer]")).toBeNull();
    expect(section.nextElementSibling).toBeNull();
  });

  it("mountMerchOffer монтирует блок для паспорта с товарами", async () => {
    const section = metaRowFixture();
    const ok = await mountMerchOffer(productPassport(), "Какой iPhone выбрать за 50 000 рублей");
    expect(ok).toBe(true);
    const card = section.nextElementSibling as HTMLElement;
    expect(card.hasAttribute("data-rz-merch-offer")).toBe(true);
    expect(card.textContent).toContain("Wylsacom");
    expect(card.textContent).toContain("iPhone 16e");
  });

  it("mountMerchOffer не монтирует блок для видео без товаров", async () => {
    metaRowFixture();
    const flat: Passport = {
      ...productPassport(),
      frontmatter: { ...productPassport().frontmatter, domain_type: "movie_review" },
      timeline: [{ ...productPassport().timeline[0], monetization: [] }],
      celebrity_voice: null,
    };
    const ok = await mountMerchOffer(flat, "Обзор фильма");
    expect(ok).toBe(false);
    expect(document.body.querySelector("[data-rz-merch-offer]")).toBeNull();
  });

  it("mountMerchOffer не монтирует блок без meta-row (таймаут)", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
    try {
      const p = mountMerchOffer(productPassport(), "Какой iPhone выбрать", 100);
      await vi.advanceTimersByTimeAsync(1000);
      const ok = await p;
      expect(ok).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
// = [M-EXTENSION][TEST-MERCH-OFFER][END_BLOCK]