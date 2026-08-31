// [M-EXTENSION][TEST-STUDIO-PROMOTION][START_BLOCK]
// Продвижение видео: 3 площадки, лимиты заголовков, детерминизм (NFR-7),
// рекомендация бюджета, прогноз и UTM, сборка бандла + CSV/JSON.
import { describe, it, expect } from "vitest";
import { PASSPORT_REGISTRY } from "../src/data/registry";
import type { Passport } from "../src/data/types";
import {
  buildPromotionBundle,
  forecastForPlatform,
  buildUTM,
  recommendedBudget,
  PLATFORMS,
  PLATFORM_ORDER,
} from "../src/studio/promotion";
import { buildPromotionCsv, buildPromotionJson } from "../src/studio/render/promotion";

function passportOf(id: string): Passport {
  const entry = PASSPORT_REGISTRY.find((e) => e.id === id);
  expect(entry).toBeDefined();
  return entry!.passport;
}

describe("promotion: платформы и лимиты", () => {
  it("3 площадки с лимитами заголовков и текста", () => {
    expect(PLATFORM_ORDER).toEqual(["yandex_direct", "vk_ads", "mytarget"]);
    expect(PLATFORMS.yandex_direct.titleMax).toBe(33);
    expect(PLATFORMS.vk_ads.titleMax).toBe(40);
    expect(PLATFORMS.mytarget.titleMax).toBe(35);
    for (const p of PLATFORM_ORDER) {
      expect(PLATFORMS[p].apiName.length).toBeGreaterThan(0);
      expect(PLATFORMS[p].textMax).toBeGreaterThan(PLATFORMS[p].titleMax);
    }
  });
});

describe("promotion: forecastForPlatform", () => {
  it("CTR 2-8%, клики не больше охвата, CPA >= 0", () => {
    for (let i = 0; i < 20; i++) {
      const f = forecastForPlatform("yandex_direct", "Rv_x", 1000);
      expect(f.ctr).toBeGreaterThanOrEqual(2);
      expect(f.ctr).toBeLessThanOrEqual(8);
      expect(f.clicks).toBeLessThanOrEqual(f.reach);
      expect(f.cost).toBe(1000);
      expect(f.cpa).toBeGreaterThanOrEqual(0);
    }
  });

  it("больше бюджет → больше охват", () => {
    const low = forecastForPlatform("vk_ads", "Rv_x", 500);
    const high = forecastForPlatform("vk_ads", "Rv_x", 5000);
    expect(high.reach).toBeGreaterThan(low.reach);
  });

  it("детерминизм (NFR-7): тот же вход → тот же прогноз", () => {
    expect(forecastForPlatform("mytarget", "Rv_x", 2000)).toEqual(
      forecastForPlatform("mytarget", "Rv_x", 2000),
    );
  });
});

describe("promotion: buildUTM", () => {
  it("формирует UTM с площадкой и вариантом", () => {
    const u = buildUTM("abc123", "yandex_direct", "ad-yandex_direct-1");
    expect(u).toContain("utm_source=yandex");
    expect(u).toContain("utm_campaign=rz_abc123");
    expect(u).toContain("utm_content=ad-yandex_direct-1");
  });
});

describe("promotion: recommendedBudget", () => {
  it("клипается в 500-7000 и недельный = daily*7", () => {
    const r = recommendedBudget(passportOf("iphone_50k_wylsacom"));
    expect(r.daily).toBeGreaterThanOrEqual(500);
    expect(r.daily).toBeLessThanOrEqual(7000);
    expect(r.total).toBe(r.daily * 7);
    expect(r.reason.length).toBeGreaterThan(0);
  });

  it("детерминизм: рекомендуемый бюджет стабилен", () => {
    const a = recommendedBudget(passportOf("tech_review"));
    const b = recommendedBudget(passportOf("tech_review"));
    expect(a).toEqual(b);
  });
});

describe("promotion: buildPromotionBundle", () => {
  it("собирает по 3 кампании с 2+ вариантами и таргетингом", () => {
    const b = buildPromotionBundle(passportOf("tech_review"), "Rv_t_1", "https://rutube.ru/video/Rv_t_1");
    expect(b.campaigns.length).toBe(3);
    for (const c of b.campaigns) {
      expect(c.variants.length).toBeGreaterThanOrEqual(2);
      expect(c.targeting.age.length).toBeGreaterThan(0);
      expect(c.targeting.interests.length).toBeGreaterThan(0);
      expect(c.status).toBe("ready");
      expect(c.creative.durationSec).toBeGreaterThan(0);
    }
    expect(b.totals.dailyBudget).toBe(b.campaigns.reduce((a, c) => a + c.activeBudget, 0));
    expect(b.totals.weekly).toBeGreaterThan(0);
  });

  it("заголовки не превышают лимиты площадок", () => {
    const b = buildPromotionBundle(passportOf("iphone_50k_wylsacom"), "Rv_i_1", "https://rutube.ru/video/Rv_i_1");
    for (const c of b.campaigns) {
      const max = PLATFORMS[c.platform].titleMax;
      for (const v of c.variants) {
        expect(v.title.length).toBeLessThanOrEqual(max);
      }
    }
  });

  it("детерминизм (NFR-7): два бандла одинаковы", () => {
    const a = buildPromotionBundle(passportOf("vietnam_nha_trang"), "Rv_v_1", "https://rutube.ru/video/Rv_v_1");
    const b = buildPromotionBundle(passportOf("vietnam_nha_trang"), "Rv_v_1", "https://rutube.ru/video/Rv_v_1");
    expect(a).toEqual(b);
  });
});

describe("promotion: CSV/JSON экспорт", () => {
  it("CSV имеет заголовок и строку на каждый вариант", () => {
    const b = buildPromotionBundle(passportOf("tech_review"), "Rv_t_2", "u");
    const csv = buildPromotionCsv(b);
    const variants = b.campaigns.reduce((a, c) => a + c.variants.length, 0);
    expect(csv.startsWith('"platform";"variant"')).toBe(true);
    expect(csv.split("\n").length).toBe(variants + 1);
  });

  it("JSON содержит платформы, api, бюджет и adGroups с UTM", () => {
    const b = buildPromotionBundle(passportOf("iphone_50k_wylsacom"), "Rv_i_2", "u");
    const j = JSON.parse(buildPromotionJson(b)) as Array<{ platform: string; api: string; adGroups: Array<{ utm: string }> }>;
    expect(j.length).toBe(3);
    expect(j[0].adGroups[0].utm).toContain("utm_campaign=rz_Rv_i_2");
  });
});
// = [M-EXTENSION][TEST-STUDIO-PROMOTION][END_BLOCK]