// [M-EXTENSION][TEST-COMMENTS-DETECT][START_BLOCK]
// Классификация комментариев по паспорту: product/monetizable/question/...
// Реальные комменты со страницы 2013f4… (Wylsacom, iPhone за 50 000 ₽).
import { describe, it, expect } from "vitest";
import { classifyComment, buildSceneIndex, fmtSceneTime } from "../src/content/comments/detect";
import { tokenize, stem, productStems } from "../src/content/comments/text";
import iphonePassport from "../src/data/passports/iphone_50k_wylsacom.json" with { type: "json" };
import type { Passport } from "../src/data/types";

const P = iphonePassport as unknown as Passport;

describe("comments detect: text utils", () => {
  it("токенизация с ё→е и стоп-словами", () => {
    expect(tokenize("Какой iPhone выбрать за 50 000 рублей?")).toContain("iphone");
    expect(tokenize("Какой iPhone выбрать за 50 000 рублей?")).toContain("рублей");
    expect(tokenize("и так и это")).toEqual([]);
  });
  it("стемминг сводит формы", () => {
    expect(stem("стекло")).toBe("стекл");
    expect(stem("стёкла")).toBe("стекл");
    expect(stem("стеклами")).toBe("стекл");
  });
  it("productStems даёт латинский вариант для имени модели", () => {
    expect(productStems("17е")).toEqual(["17е", "17e"]);
  });
});

describe("comments detect: buildSceneIndex", () => {
  it("индексирует сцены паспорта отсортированно по времени", () => {
    const idx = buildSceneIndex(P);
    expect(idx.length).toBe(P.timeline.length);
    for (let i = 1; i < idx.length; i++) {
      expect(idx[i].startSec).toBeGreaterThanOrEqual(idx[i - 1].startSec);
    }
    expect(idx[0].monetization.length).toBeGreaterThan(0);
  });
  it("fmtSceneTime форматирует mm:ss", () => {
    expect(fmtSceneTime(336)).toBe("05:36");
    expect(fmtSceneTime(65)).toBe("01:05");
  });
});

describe("comments detect: classifyComment (реальные комменты)", () => {
  it("«Где взять царское стекло на 16e?» → product + monetizable + question @336", () => {
    const ins = classifyComment("Где взять царское стекло на 16e?", P);
    expect(ins.tags).toContain("product");
    expect(ins.tags).toContain("monetizable");
    expect(ins.tags).toContain("question");
    expect(ins.scene?.startSec).toBe(336);
    expect(ins.monetizableScore).toBeGreaterThan(0.8);
  });

  it("«17e стоит брать или 16 лучше?» → product + monetizable + question", () => {
    const ins = classifyComment("17e стоит брать или 16 лучше?", P);
    expect(ins.tags).toContain("product");
    expect(ins.tags).toContain("monetizable");
    expect(ins.tags).toContain("question");
  });

  it("«Я себе взял 15 про…» → product (покупка + номер модели)", () => {
    const ins = classifyComment("Я себе взял 15 про и жене 14 про. Минус что обрезали приложениями.", P);
    expect(ins.tags).toContain("product");
    expect(ins.scene).not.toBeNull();
  });

  it("«Какой iPhone выбрать за 50 000 рублей?» → question + product", () => {
    const ins = classifyComment("Какой iPhone выбрать за 50 000 рублей?", P);
    expect(ins.tags).toContain("question");
    expect(ins.tags).toContain("product");
  });

  it("«Розыгрыш ещё актуален?» → monetizable (giveaway) + question", () => {
    const ins = classifyComment("Розыгрыш ещё актуален?", P);
    expect(ins.tags).toContain("monetizable");
    expect(ins.tags).toContain("question");
  });

  it("«Автор матерится, ублюдочное решение ахаха» → toxic", () => {
    const ins = classifyComment("Автор матерится, ублюдочное решение ахаха", P);
    expect(ins.tags).toContain("toxic");
    expect(ins.toxicityScore).toBeGreaterThan(0);
  });

  it("«Дурак, Айфоны России на хрен нужны, болван.» → toxic, не product", () => {
    const ins = classifyComment("Дурак, Айфоны России на хрен нужны, болван.", P);
    expect(ins.tags).toContain("toxic");
    expect(ins.tags).not.toContain("product");
  });

  it("«Это развод, на авито кидают на 26к» → scam", () => {
    const ins = classifyComment("Это развод, на авито кидают на 26к", P);
    expect(ins.tags).toContain("scam");
  });

  it("«Интересно как я живу со 128 Гб…» → product (128 ГБ → 16e)", () => {
    const ins = classifyComment(
      "Интересно как я живу со 128 Гб а ещё у меня там 80 с чем-то занята и нормально",
      P,
    );
    expect(ins.tags).toContain("product");
  });

  it("«ХАВЭЕЛ ЛУЧШЕ» → praise, не question и не product", () => {
    const ins = classifyComment("ХАВЭЕЛ ЛУЧШЕ", P);
    expect(ins.tags).not.toContain("question");
    expect(ins.tags).not.toContain("product");
    expect(ins.tags).toContain("praise");
  });

  it("«Отличное видео, спасибо!» → praise", () => {
    const ins = classifyComment("Отличное видео, спасибо!", P);
    expect(ins.tags).toContain("praise");
    expect(ins.tags).not.toContain("product");
  });

  it("«Зачем их бросать? Это же айфоны они рухнут с 1 санциметра» → question", () => {
    const ins = classifyComment("Зачем их бросать? Это же айфоны они рухнут с 1 санциметра", P);
    expect(ins.tags).toContain("question");
  });

  it("«ГО ПРОТЕСТ ОРЕМ ЕМУ» → offtopic (крик из 3 слов = toxic)", () => {
    const ins = classifyComment("ГО ПРОТЕСТ ОРЕМ ЕМУ", P);
    expect(ins.tags).toContain("toxic");
  });

  it("детерминизм: один и тот же текст и паспорт → одинаковый результат", () => {
    const a = classifyComment("Где взять царское стекло на 16e?", P);
    const b = classifyComment("Где взять царское стекло на 16e?", P);
    expect(a).toEqual(b);
  });
});
// = [M-EXTENSION][TEST-COMMENTS-DETECT][END_BLOCK]