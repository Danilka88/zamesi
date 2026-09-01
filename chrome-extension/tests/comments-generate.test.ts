// [M-EXTENSION][TEST-COMMENTS-GENERATE][START_BLOCK]
// Генерация быстрых ответов: детерминизм, таймкоды, виды откликов.
import { describe, it, expect } from "vitest";
import { classifyComment } from "../src/content/comments/detect";
import { buildReplyVariants } from "../src/content/comments/generate";
import iphonePassport from "../src/data/passports/iphone_50k_wylsacom.json" with { type: "json" };
import type { Passport } from "../src/data/types";

const P = iphonePassport as unknown as Passport;
const VID = "2013f4eba6ade7b01582fb411f9e901a";

function replies(comment: string) {
  const ins = classifyComment(comment, P, { videoId: VID });
  return { ins, variants: buildReplyVariants(comment, ins, P, VID) };
}

describe("comments generate: детерминизм", () => {
  it("одинаковый videoId+текст → одинаковые варианты", () => {
    const a = replies("Где взять царское стекло на 16e?").variants;
    const b = replies("Где взять царское стекло на 16e?").variants;
    expect(a).toEqual(b);
  });

  it("разные тексты → разные варианты", () => {
    const a = replies("Где взять царское стекло на 16e?").variants.map((v) => v.id);
    const b = replies("17e стоит брать или 16 лучше?").variants.map((v) => v.id);
    expect(a).not.toEqual(b);
  });

  it("даёт 3 уникальных варианта с текстом", () => {
    const { variants } = replies("Где взять царское стекло на 16e?");
    expect(variants.length).toBe(3);
    const texts = variants.map((v) => v.text);
    expect(new Set(texts).size).toBe(3);
    expect(variants.every((v) => v.text.length > 10)).toBe(true);
  });
});

describe("comments generate: привязка к сцене", () => {
  it("product-комментарий → таймкод сцены", () => {
    const { variants } = replies("Где взять царское стекло на 16e?");
    expect(variants[0].sceneTime).toBe("05:36");
    expect(variants.some((v) => v.text.includes("05:36"))).toBe(true);
  });

  it("вопрос про модели → таймкод есть", () => {
    const { variants } = replies("17e стоит брать или 16 лучше?");
    expect(variants[0].sceneTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it("оффтоп без сцены → нет таймкода", () => {
    const { variants } = replies("Разное обсуждение погоды и цен на нефть!");
    // нет сцены → sceneTime null
    expect(variants.every((v) => v.sceneTime === null)).toBe(true);
  });
});

describe("comments generate: тип отклика", () => {
  it("question → answer", () => {
    expect(replies("17e стоит брать или 16 лучше?").variants[0].kind).toBe("answer");
  });
  it("toxic → softio", () => {
    expect(replies("Автор матерится, ублюдочное решение ахаха").variants[0].kind).toBe("softio");
  });
  it("praise → thank", () => {
    expect(replies("Отличное видео, спасибо!").variants[0].kind).toBe("thank");
  });
  it("scam → warn", () => {
    expect(replies("Это развод, на авито кидают на 26к").variants[0].kind).toBe("warn");
  });
  it("product → fact", () => {
    expect(replies("Хочу царское стекло на 16e").variants[0].kind).toBe("fact");
  });
});
// = [M-EXTENSION][TEST-COMMENTS-GENERATE][END_BLOCK]