// [M-EXTENSION][TEST-AUTHOR-TOOLS-GENERATE][START_BLOCK]
// Генерация A/B-вариантов: курируемые библиотеки по паспорту, fallback из полей,
// детерминизм, дедупликация родного заголовка.
import { describe, it, expect } from "vitest";
import { PASSPORT_REGISTRY } from "../src/data/registry";
import type { Passport } from "../src/data/types";
import {
  buildTitleVariants,
  buildDescriptionVariants,
  resolvePassportKey,
  projectVariantMetrics,
  fmtViews,
} from "../src/content/authorTools/generate";

/** Извлечь паспорт по id записи реестра. */
function passportOf(id: string): Passport {
  const entry = PASSPORT_REGISTRY.find((e) => e.id === id);
  expect(entry).toBeDefined();
  return entry!.passport;
}

describe("author-tools generate: resolvePassportKey", () => {
  it("резолвит по boundVideoId", () => {
    const p = passportOf("iphone_50k_wylsacom");
    expect(resolvePassportKey("Rv_iphone_50k_wylsacom_001", p)).toBe("iphone_50k_wylsacom");
  });

  it("резолвит по frontmatter.video_id (no boundVideoId)", () => {
    const p = passportOf("cooking_dinner");
    expect(resolvePassportKey("some-unknown-url", p)).toBe("cooking_dinner");
  });

  it("резолвит по domain_type как последний fallback", () => {
    const p = passportOf("diy_frame");
    expect(resolvePassportKey("unknown", p)).toBe("diy_frame");
  });

  it("возвращает null для пустого/неизвестного паспорта без домена", () => {
    const empty = { frontmatter: { video_id: "x", domain_type: "zzz", target_audience: [], seo_tags: [], seo_title: "", ad_targeting_keywords: [] } };
    expect(resolvePassportKey("unknown", empty as unknown as Passport)).toBeNull();
  });
});

describe("author-tools generate: buildTitleVariants", () => {
  it("native заголовок всегда первый, AI-варианты из курируемой библиотеки", () => {
    const p = passportOf("tech_review");
    const variants = buildTitleVariants(p, "ТОП-5 лучших наушников 2026", "Rv_tech_review_001");
    expect(variants.length).toBe(4); // 1 native + 3 curated
    expect(variants[0].source).toBe("native");
    expect(variants[0].text).toBe("ТОП-5 лучших наушников 2026");
    expect(variants.slice(1).every((v) => v.source === "ai")).toBe(true);
    expect(variants[1].text).toContain("Sony");
  });

  it("AI-варианты не дублируют native даже при совпадении текста", () => {
    const p = passportOf("cooking_dinner");
    const native = "Паста с томатным соусом за 15 минут: простой рецепт на ужин";
    const variants = buildTitleVariants(p, native, "cooking_dinner");
    const texts = variants.map((v) => v.text.trim().toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
    expect(variants[0].source).toBe("native");
  });

  it("fallback для неизвестного паспорта строится из полей (seo_title/tags)", () => {
    const unknown: Passport = {
      frontmatter: {
        video_id: "zzz_001",
        domain_type: "how_to",
        seo_title: "Как чинить велосипед дома за 10 минут",
        seo_tags: ["велосипед", "ремонт", "своими руками"],
        ad_targeting_keywords: ["веломастерская"],
        target_audience: ["велосипедисты"],
      },
      timeline: [],
      raw_timeline_segments: [],
      audio_matches: [],
    } as unknown as Passport;
    const variants = buildTitleVariants(unknown, "Название страницы", "zzz_001");
    expect(variants.length).toBeGreaterThanOrEqual(2);
    expect(variants.some((v) => v.text.includes("велосипед"))).toBe(true);
  });
});

describe("author-tools generate: buildDescriptionVariants", () => {
  it("возвращает 2 варианта с фичами и длиной", () => {
    const p = passportOf("movie_review");
    const descs = buildDescriptionVariants(p, "Rv_movie_review_001");
    expect(descs.length).toBe(2);
    for (const d of descs) {
      expect(d.text.length).toBeGreaterThan(0);
      expect(d.chars).toBe(d.text.length);
      expect(d.features.length).toBeGreaterThan(0);
      expect(d.text).toContain("Эхо Будущего");
    }
    expect(descs[0].text.length).toBeGreaterThan(descs[1].text.length); // вариант 1 длиннее
  });
});

describe("author-tools generate: детерминизм (NFR-7)", () => {
  it("одинаковый вход → одинаковый выход", () => {
    const p = passportOf("vietnam_nha_trang");
    const a = buildTitleVariants(p, "Title", "Rv_vietnam_nha_trang_001");
    const b = buildTitleVariants(p, "Title", "Rv_vietnam_nha_trang_001");
    expect(a.map((v) => v.text)).toEqual(b.map((v) => v.text));
    expect(buildDescriptionVariants(p, "Rv_vietnam_nha_trang_001")).toEqual(
      buildDescriptionVariants(p, "Rv_vietnam_nha_trang_001"),
    );
  });
});

describe("author-tools generate: projectVariantMetrics", () => {
  it("детерминирован и стабилен для одного варианта", () => {
    const a = projectVariantMetrics("Rv_tech_review_001", "Заголовок A");
    const b = projectVariantMetrics("Rv_tech_review_001", "Заголовок A");
    expect(a).toEqual(b);
  });

  it("разные варианты получают разные метрики (сид зависит от текста)", () => {
    const a = projectVariantMetrics("Rv_tech_review_001", "Заголовок A");
    const b = projectVariantMetrics("Rv_tech_review_001", "Совсем другой заголовок B");
    expect(a.ctr).not.toBe(b.ctr);
    expect(a.engagement).not.toBe(b.engagement);
  });

  it("значения в допустимых границах", () => {
    for (const t of ["T1", "T2", "T3"]) {
      const m = projectVariantMetrics("vid", t);
      expect(m.ctr).toBeGreaterThanOrEqual(2.5);
      expect(m.ctr).toBeLessThanOrEqual(7.0);
      expect(m.views).toBeGreaterThan(0);
      expect(m.engagement).toBeGreaterThanOrEqual(40);
      expect(m.engagement).toBeLessThanOrEqual(95);
    }
  });

  it("fmtViews компактный", () => {
    expect(fmtViews(840)).toBe("840");
    expect(fmtViews(18400)).toBe("18.4K");
    expect(fmtViews(3000)).toBe("3K");
  });
});
