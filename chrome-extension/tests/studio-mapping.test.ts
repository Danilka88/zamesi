// [M-EXTENSION][TEST-STUDIO-MAPPING][START_BLOCK]
// Паспорт → предложения полей: категория, плейлисты, таймкоды, время публикации,
// модерация, тайм-коды в описании. Чистые функции, детерминизм (NFR-7).
import { describe, it, expect } from "vitest";
import { PASSPORT_REGISTRY } from "../src/data/registry";
import type { Passport } from "../src/data/types";
import {
  buildStudioSuggestions,
  suggestedCategory,
  suggestedPlaylists,
  chapterLines,
  publishRecommendation,
  adultSuggestion,
  commentsSuggestion,
  disclaimerHint,
  fmtClock,
} from "../src/studio/mapping";

function passportOf(id: string): Passport {
  const entry = PASSPORT_REGISTRY.find((e) => e.id === id);
  expect(entry).toBeDefined();
  return entry!.passport;
}

/** Минимальный паспорт для unit-тестов (поля frontmatter вне проверки). */
function minimalPassport(overrides?: Partial<Passport["frontmatter"]>): Passport {
  return {
    frontmatter: {
      video_id: "x", domain_type: "how_to", seo_title: "", seo_tags: [],
      ad_targeting_keywords: [], target_audience: [], moderation: null,
      brand_safety_score: 50, trending_cluster: "none", auto_playlists: [],
      ...overrides,
    },
    timeline: [],
    raw_timeline_segments: [],
    audio_matches: [],
  } as unknown as Passport;
}

describe("studio mapping: fmtClock", () => {
  it("форматирует mm:ss и h:mm:ss", () => {
    expect(fmtClock(0)).toBe("00:00");
    expect(fmtClock(65)).toBe("01:05");
    expect(fmtClock(3723)).toBe("1:02:03");
  });
});

describe("studio mapping: категория", () => {
  it("travel_vlog → Путешествия", () => {
    const c = suggestedCategory(passportOf("vietnam_nha_trang"));
    expect(c?.label).toBe("Путешествия");
  });
  it("game_review → Видеоигры", () => {
    expect(suggestedCategory(passportOf("atomic_heart_review"))?.label).toBe("Видеоигры");
  });
  it("неизвестный домен → null", () => {
    const p = minimalPassport({ domain_type: "mystery" });
    expect(suggestedCategory(p)).toBeNull();
  });
});

describe("studio mapping: плейлисты", () => {
  it("из auto_playlists с человекочитаемым именем и причиной", () => {
    const ps = suggestedPlaylists(passportOf("vietnam_nha_trang"));
    expect(ps.length).toBeGreaterThanOrEqual(1);
    expect(ps[0].id).toBe("life_in_vietnam_2026");
    expect(ps[0].name).toBe("life in vietnam 2026");
    expect(ps[0].reason.length).toBeGreaterThan(0);
  });
});

describe("studio mapping: таймкоды", () => {
  it("из raw_timeline_segments с mm:ss и текстом", () => {
    const p = minimalPassport();
    p.raw_timeline_segments = [
      { speaker: "A", start_sec: 0, end_sec: 5, text: "Интро", word_timestamps: [] },
      { speaker: "A", start_sec: 130, end_sec: 145, text: "Разбор цен", word_timestamps: [] },
    ];
    const ch = chapterLines(p);
    expect(ch[0]).toBe("00:00 Интро");
    expect(ch[1]).toBe("02:10 Разбор цен");
  });

  it("тайм-коды попадают в первый вариант описания", () => {
    const s = buildStudioSuggestions(passportOf("vietnam_nha_trang"), "Вьетнам", "Rv_vietnam_nha_trang_001");
    expect(s.chapters.length).toBeGreaterThan(0);
    expect(s.descriptions[0].text).toContain("Тайм-коды:");
    expect(s.descriptions[0].text).toContain("00:00");
  });
});

describe("studio mapping: время публикации и модерация", () => {
  it("approved → now", () => {
    expect(publishRecommendation(passportOf("vietnam_nha_trang"))).toBe("now");
  });

  it("rejected → delayed, комментарии выключены", () => {
    const p = minimalPassport({
      moderation: {
        age_rating: "18+", verdict: "rejected", categories_flagged: ["adult_content"],
        flags: [], brand_safety_score: 20, summary: "спорный контент",
      },
    });
    expect(publishRecommendation(p)).toBe("delayed");
    expect(adultSuggestion(p)).toBe(true);
    expect(commentsSuggestion(p)).toBe(false);
    expect(disclaimerHint(p)).toContain("adult_content");
  });

  it("нет moderation → нет хинта дисклеймеров, 18+ false", () => {
    const p = minimalPassport();
    expect(adultSuggestion(p)).toBe(false);
    expect(disclaimerHint(p)).toBeNull();
  });
});

describe("studio mapping: сборка полного набора", () => {
  it("все ключевые секции присутствуют", () => {
    const s = buildStudioSuggestions(passportOf("tech_review"), "Обзор наушников", "Rv_tech_review_001");
    expect(s.title.length).toBeGreaterThanOrEqual(3);
    expect(s.descriptions.length).toBeGreaterThanOrEqual(2);
    expect(s.category?.label).toBe("Наука и техника");
    expect(s.binding).toBe("tech_review");
  });

  it("детерминизм (NFR-7)", () => {
    const a = buildStudioSuggestions(passportOf("movie_review"), "Фильм", "Rv_movie_review_001");
    const b = buildStudioSuggestions(passportOf("movie_review"), "Фильм", "Rv_movie_review_001");
    expect(a).toEqual(b);
  });
});
// = [M-EXTENSION][TEST-STUDIO-MAPPING][END_BLOCK]