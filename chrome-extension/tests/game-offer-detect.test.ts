// [M-EXTENSION][TEST-GAME-DETECT][START_BLOCK]
// Детект игровых видео по сигналам страницы + извлечение названия игры.
import { describe, it, expect } from "vitest";
import {
  detectGameContext,
  extractGameName,
  isGameCategory,
  hasGameHashtags,
} from "../src/content/gameOffer/detect";

describe("game-offer detect", () => {
  it("isGameCategory: 'Видеоигры' → true, null → false", () => {
    expect(isGameCategory("Видеоигры")).toBe(true);
    expect(isGameCategory("Игры")).toBe(true);
    expect(isGameCategory(null)).toBe(false);
    expect(isGameCategory("Кулинария")).toBe(false);
  });

  it("hasGameHashtags: игровые хэштеги → true", () => {
    expect(hasGameHashtags(["шутер", "обзор"])).toBe(true);
    expect(hasGameHashtags(["рецепт", "ужин"])).toBe(false);
    expect(hasGameHashtags([])).toBe(false);
  });

  it("extractGameName срезает приставки", () => {
    expect(extractGameName("Обзор Atomic Heart")).toBe("Atomic Heart");
    expect(extractGameName("Прохождение Elden Ring")).toBe("Elden Ring");
    expect(extractGameName("Геймплей Cyberpunk 2077")).toBe("Cyberpunk 2077");
  });

  it("extractGameName срезает хвосты 'смотреть видео'", () => {
    expect(extractGameName("Обзор Atomic Heart — смотреть видео онлайн")).toBe("Atomic Heart");
  });

  it("extractGameName без приставки возвращает весь заголовок", () => {
    expect(extractGameName("Atomic Heart")).toBe("Atomic Heart");
    expect(extractGameName("  ")).toBeNull();
  });

  it("detect by passport domain_type (game_review)", () => {
    const ctx = detectGameContext({
      title: "Обзор Atomic Heart",
      metaCategory: null,
      hashtags: [],
      domainType: "game_review",
    });
    expect(ctx.isGame).toBe(true);
    expect(ctx.gameName).toBe("Atomic Heart");
    expect(ctx.source).toBe("passport");
  });

  it("detect by page category (Видеоигры)", () => {
    const ctx = detectGameContext({
      title: "Топ лучших ПК игр 2026",
      metaCategory: "Видеоигры",
      hashtags: [],
      domainType: null,
    });
    expect(ctx.isGame).toBe(true);
    expect(ctx.gameName).toBe("Топ лучших ПК игр 2026");
    expect(ctx.source).toBe("page");
  });

  it("detect by hashtags only when no passport/category", () => {
    const ctx = detectGameContext({
      title: "Смотрим нашумевший шутер",
      metaCategory: null,
      hashtags: ["шутеры"],
      domainType: null,
    });
    expect(ctx.isGame).toBe(true);
    expect(ctx.gameName).toBe("Смотрим нашумевший шутер");
  });

  it("non-game video → isGame=false", () => {
    const ctx = detectGameContext({
      title: "Рецепт сырников за 20 минут",
      metaCategory: "Рецепты",
      hashtags: ["кухня"],
      domainType: "cooking_dinner",
    });
    expect(ctx.isGame).toBe(false);
    expect(ctx.gameName).toBeNull();
    expect(ctx.source).toBeNull();
  });
});
// = [M-EXTENSION][TEST-GAME-OFFER][END_BLOCK]