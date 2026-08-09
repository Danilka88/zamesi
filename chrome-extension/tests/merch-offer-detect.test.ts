// [M-EXTENSION][TEST-MERCH-OFFER-DETECT][START_BLOCK]
// Детект мерч-контекста: сбор товаров из паспорта, иконки, бренд, fallback домен.
import { describe, it, expect } from "vitest";
import {
  collectMerchProducts,
  productIconFor,
  merchBrandFor,
  merchBrandForDomain,
  detectMerchContext,
  type MerchContextInput,
  type MerchProduct,
} from "../src/content/merchOffer/detect";
import type { Passport } from "../src/data/types";

function productPassport(overrides: Partial<Passport> = {}): Passport {
  const base: Passport = {
    frontmatter: {
      video_id: "p1",
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
        scene_summary: "обзор гаджета",
        monetization: [
          { type: "ecom_item", search_query: "iPhone 16e купить", reason: null, confidence: 0.97 },
          { type: "ecom_item", search_query: "iPhone 16e купить", reason: null, confidence: 0.8 },
          { type: "artist_merch", search_query: "царское стекло Wylsacom 3D", reason: null, confidence: 0.98 },
          { type: "clip_candidate", search_query: "первый взгляд", reason: null, confidence: 0.9 },
          { type: "ad_slot", search_query: null, reason: null, confidence: 0.7 },
        ],
        clip_candidate: null,
        fallback_used: null,
        processing_time_sec: 0.1,
      },
    ],
    raw_timeline_segments: [],
    audio_matches: [],
    celebrity_voice: { name: "Wylsacom (Валентин Петухов)", profession: "техноблогер", confidence: 0.96 },
  };
  return { ...base, ...overrides };
}

const baseInput: MerchContextInput = {
  title: "Какой iPhone выбрать за 50 000 рублей",
  hashtags: [],
  domainType: "tech_review",
  products: [],
  brandName: null,
};

describe("merch detect: collectMerchProducts", () => {
  it("собирает только ecom_item и artist_merch, дедуплицирует и сортирует по confidence", () => {
    const products = collectMerchProducts(productPassport(), 6);
    expect(products.length).toBe(2);
    expect(products[0].label).toBe("царское стекло Wylsacom 3D");
    expect(products[0].type).toBe("artist_merch");
    expect(products[0].icon).toBe("🛡️");
    expect(products[1].label).toBe("iPhone 16e");
    expect(products[1].icon).toBe("📱");
    expect(products.some((p) => p.query === "iPhone 16e купить")).toBe(true);
  });

  it("лимит сверху ограничивает число товаров", () => {
    const many = productPassport();
    many.timeline[0].monetization = [
      { type: "ecom_item", search_query: "товар A", reason: null, confidence: 0.9 },
      { type: "ecom_item", search_query: "товар B", reason: null, confidence: 0.8 },
      { type: "ecom_item", search_query: "товар C", reason: null, confidence: 0.7 },
    ];
    expect(collectMerchProducts(many, 2).length).toBe(2);
  });

  it("пустой результат, когда в паспорте нет ecom/merch меток", () => {
    const empty = productPassport();
    empty.timeline[0].monetization = [];
    expect(collectMerchProducts(empty)).toEqual([]);
  });
});

describe("merch detect: productIconFor", () => {
  it("подбирает иконку по ключевым словам", () => {
    expect(productIconFor("iPhone 16e")).toBe("📱");
    expect(productIconFor("Защитное стекло")).toBe("🛡️");
    expect(productIconFor("Беспроводные наушники AirPods")).toBe("🎧");
    expect(productIconFor("Футболка с логотипом")).toBe("👕");
  });
  it("дефолтная иконка для неизвестного товара", () => {
    expect(productIconFor("Очень странный товарный запрос")).toBe("🛍️");
  });
});

describe("merch detect: merchBrandFor", () => {
  it("берёт имя из celebrity_voice, отрезая скобки", () => {
    expect(merchBrandFor(productPassport())).toBe("Wylsacom");
  });
  it("без celebrity_voice — фолбэк по домену", () => {
    const p = productPassport();
    p.celebrity_voice = null;
    expect(merchBrandFor(p)).toBe("Обзор техники");
  });
  it("merchBrandForDomain для неизвестного домена — null", () => {
    expect(merchBrandForDomain("unknown")).toBeNull();
    expect(merchBrandForDomain("cooking_dinner")).toBe("Кулинария");
  });
});

describe("merch detect: detectMerchContext", () => {
  it("passport: товары из паспорта дают isMerch=true и источник passport", () => {
    const products: MerchProduct[] = [
      { label: "iPhone 16e", icon: "📱", query: "iPhone 16e купить", type: "ecom_item", confidence: 0.97 },
    ];
    const ctx = detectMerchContext({ ...baseInput, products, brandName: "Wylsacom" });
    expect(ctx.isMerch).toBe(true);
    expect(ctx.source).toBe("passport");
    expect(ctx.brandName).toBe("Wylsacom");
    expect(ctx.products).toBe(products);
  });

  it("page: домен из MERCH_FALLBACK_DOMAINS без товаров — isMerch=true источника page", () => {
    const ctx = detectMerchContext({ ...baseInput, domainType: "how_to", products: [] });
    expect(ctx.isMerch).toBe(true);
    expect(ctx.source).toBe("page");
    expect(ctx.brandName).toBe("Гайд");
  });

  it("page: хэштег #мерч без домена — isMerch=true источника page", () => {
    const ctx = detectMerchContext({ ...baseInput, domainType: null, hashtags: ["мерч"], products: [] });
    expect(ctx.isMerch).toBe(true);
  });

  it("не-мерч: паспорт без товаров и без фолбэк-сигналов", () => {
    const ctx = detectMerchContext({
      ...baseInput,
      domainType: "movie_review",
      products: [],
      hashtags: [],
    });
    expect(ctx.isMerch).toBe(false);
    expect(ctx.source).toBeNull();
  });
});
// = [M-EXTENSION][TEST-MERCH-OFFER-DETECT][END_BLOCK]