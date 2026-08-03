// [M-EXTENSION][TEST-BINDING][START_BLOCK]
// A-C003-04: привязка (ручной + авто по video_id/ключевым словам).
import { describe, it, expect } from "vitest";
import { resolveBinding, resolveBindingDetailed, matchByVideoId, matchByTitle } from "../src/content/data/bindings";

const REAL_ID = "2013f4eba6ade7b01582fb411f9e901a";
const REAL_TITLE = "Какой iPhone выбрать за 50 000 рублей?";

describe("bindings", () => {
  it("matches tech_review by real video_id", () => {
    expect(matchByVideoId(REAL_ID)?.id).toBe("tech_review");
  });

  it("autoselects tech_review for the real iPhone title", () => {
    const resolved = matchByTitle(REAL_TITLE);
    expect(resolved?.id).toBe("tech_review");
    expect(resolved?.keywords.some((k) => REAL_TITLE.toLowerCase().includes(k))).toBe(true);
  });

  it("resolveBinding prefers video_id binding", () => {
    const viaId = resolveBinding(REAL_ID, "Совсем другой заголовок без совпадений");
    expect(viaId?.id).toBe("tech_review");
  });

  it("resolveBindingDetailed reports method", () => {
    expect(resolveBindingDetailed(REAL_ID, REAL_TITLE).method).toBe("auto");
    expect(resolveBindingDetailed("", "просто кулинарный рецепт ужина").entry?.id).toBe("cooking_dinner");
    expect(resolveBindingDetailed("", "").method).toBe("none");
  });

  it("returns undefined on no match", () => {
    expect(matchByTitle("абсолютно нерелевантный текст без триггеров")).toBeUndefined();
  });
});
// = [M-EXTENSION][TEST-BINDING][END_BLOCK]