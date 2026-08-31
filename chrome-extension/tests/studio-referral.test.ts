// [M-EXTENSION][TEST-STUDIO-REFERRAL][START_BLOCK]
// Реферальный блок монетизации: 3 магазина, детерминизм (NFR-7), источники
// товаров (паспорт + fallback keywords), KPI/тоталы, CSV и блок описания.
import { describe, it, expect } from "vitest";
import { PASSPORT_REGISTRY } from "../src/data/registry";
import type { Passport } from "../src/data/types";
import {
  buildReferralBundle,
  mockReferralUrl,
  forecastForOffer,
  SHOPS,
  SHOP_ORDER,
  RZ_CLID,
  RZ_PLACE_ID,
} from "../src/studio/referral";
import { buildReferralCsv, buildReferralDescriptionBlock } from "../src/studio/render/referral";

function passportOf(id: string): Passport {
  const entry = PASSPORT_REGISTRY.find((e) => e.id === id);
  expect(entry).toBeDefined();
  return entry!.passport;
}

/** Минимальный паспорт без ecom-меток и без keywords — для fallback-проверок. */
function minimalPassport(overrides?: Partial<Passport["frontmatter"]>): Passport {
  return {
    frontmatter: {
      video_id: "x",
      domain_type: "how_to",
      seo_title: "",
      seo_tags: [],
      ad_targeting_keywords: [],
      target_audience: [],
      moderation: null,
      brand_safety_score: 50,
      trending_cluster: "none",
      auto_playlists: [],
      ...overrides,
    },
    timeline: [],
    raw_timeline_segments: [],
    audio_matches: [],
    celebrity_voice: null,
  } as unknown as Passport;
}

describe("referral: магазины и мета", () => {
  it("все 3 магазина описаны с иконками и диапазоном комиссий", () => {
    expect(SHOP_ORDER).toEqual(["yandex_market", "aliexpress", "admitad"]);
    for (const shop of SHOP_ORDER) {
      expect(SHOPS[shop].label.length).toBeGreaterThan(0);
      expect(SHOPS[shop].commissionMin).toBeGreaterThan(0);
      expect(SHOPS[shop].commissionMax).toBeGreaterThan(SHOPS[shop].commissionMin);
    }
  });
});

describe("referral: mockReferralUrl", () => {
  it("формирует URL по формату реальных API из ТЗ", () => {
    const l = mockReferralUrl("yandex_market", "iPhone 16e", "Rv_x_001", 0, 0.9);
    expect(l.url).toContain("market.yandex.ru/search");
    expect(l.url).toContain(`clid=${RZ_CLID}`);
    expect(l.url).toContain(`place_id=${RZ_PLACE_ID}`);
    expect(l.url).toContain("vid=Rv_x_001_p0");
    expect(l.shortUrl).toMatch(/^https:\/\/ya\.cc\/rz-/);

    const ali = mockReferralUrl("aliexpress", "наушники", "Rv_x_001", 0, 0.9);
    expect(ali.url).toContain("aliexpress.ru/wholesale");
    expect(ali.url).toContain("aff_trace_key=Rv_x_001_p0");
    expect(ali.shortUrl).toMatch(/^https:\/\/s\.click\.aliexpress\.com\/rz-/);

    const adm = mockReferralUrl("admitad", "чехол", "Rv_x_001", 0, 0.9);
    expect(adm.url).toContain("ad.admitad.com/g/");
    expect(adm.url).toContain("subid=Rv_x_001_p0");
    expect(adm.shortUrl).toMatch(/^https:\/\/ad\.admitad\.com\/r\/rz-/);
  });

  it("комиссия внутри диапазона магазина, статус ready", () => {
    for (const shop of SHOP_ORDER) {
      const l = mockReferralUrl(shop, "товар", "Rv_x", 1, 0.5);
      expect(l.status).toBe("ready");
      expect(l.commissionPct).toBeGreaterThanOrEqual(SHOPS[shop].commissionMin);
      expect(l.commissionPct).toBeLessThanOrEqual(SHOPS[shop].commissionMax);
    }
  });

  it("детерминизм (NFR-7): те же входы → те же ссылки и комиссии", () => {
    const a = mockReferralUrl("admitad", "iPhone 16e", "Rv_x_001", 0, 0.9);
    const b = mockReferralUrl("admitad", "iPhone 16e", "Rv_x_001", 0, 0.9);
    expect(a).toEqual(b);
  });
});

describe("referral: forecastForOffer", () => {
  it("CTR в границах 2.5..7%, конверсия 0.8..3.2%, revenue >= 0", () => {
    for (let i = 0; i < 20; i++) {
      const f = forecastForOffer(`товар-${i}`, "Rv_x", 5, 0.8);
      expect(f.ctr).toBeGreaterThanOrEqual(2.5);
      expect(f.ctr).toBeLessThanOrEqual(7.0);
      expect(f.conv).toBeGreaterThanOrEqual(0.8);
      expect(f.conv).toBeLessThanOrEqual(3.2);
      expect(f.revenue).toBeGreaterThanOrEqual(0);
      expect(f.views).toBeGreaterThanOrEqual(1);
    }
  });

  it("выше confidence → больше охват (views растёт по доверию)", () => {
    const low = forecastForOffer("x", "Rv", 5, 0.1);
    const high = forecastForOffer("x", "Rv", 5, 1);
    expect(high.views).toBeGreaterThan(low.views);
  });
});

describe("referral: buildReferralBundle", () => {
  it("из паспорта с ecom-метками собирает <=6 офферов по 3 ссылки", () => {
    const b = buildReferralBundle(passportOf("iphone_50k_wylsacom"), "Rv_iphone_001");
    expect(b.offers.length).toBeGreaterThan(0);
    expect(b.offers.length).toBeLessThanOrEqual(6);
    for (const o of b.offers) {
      expect(o.links.length).toBe(3);
      expect(o.best.shop).toBeDefined();
      expect(o.product.query.length).toBeGreaterThan(0);
    }
    expect(b.currency).toBe("₽");
  });

  it("тоталы: links = n*3, revenue > 0, perShop покрывает все магазины", () => {
    const b = buildReferralBundle(passportOf("iphone_50k_wylsacom"), "Rv_iphone_001");
    expect(b.totals.links).toBe(b.offers.length * 3);
    expect(b.totals.revenue).toBeGreaterThan(0);
    for (const shop of SHOP_ORDER) {
      expect(b.totals.perShop[shop]).toBeDefined();
      expect(b.totals.perShop[shop].count).toBe(b.offers.length);
    }
  });

  it("fallback на ad_targeting_keywords для паспорта без ecom-меток", () => {
    const p = minimalPassport({ ad_targeting_keywords: ["стекло 3D", "чехол", "кабель"] });
    const b = buildReferralBundle(p, "Rv_fb");
    expect(b.offers.length).toBe(3);
  });

  it("детерминизм (NFR-7): два вызова дают одинаковый bundle", () => {
    const a = buildReferralBundle(passportOf("tech_review"), "Rv_t_001");
    const c = buildReferralBundle(passportOf("tech_review"), "Rv_t_001");
    expect(a).toEqual(c);
  });
});

describe("referral: CSV и блок описания", () => {
  it("CSV имеет заголовок и строку на каждую ссылку", () => {
    const b = buildReferralBundle(passportOf("tech_review"), "Rv_t_002");
    const csv = buildReferralCsv(b);
    expect(csv.startsWith('"product";"type";"confidence"')).toBe(true);
    expect(csv.split("\n").length).toBe(b.totals.links + 1);
  });

  it("блок описания содержит товары, короткие ссылки и прогноз", () => {
    const b = buildReferralBundle(passportOf("vietnam_nha_trang"), "Rv_vn_1");
    const text = buildReferralDescriptionBlock(b);
    expect(text).toContain("🛒 Товары из видео:");
    expect(text).toContain("https://");
    expect(text).toContain("Прогноз монетизации:");
  });
});
// = [M-EXTENSION][TEST-STUDIO-REFERRAL][END_BLOCK]