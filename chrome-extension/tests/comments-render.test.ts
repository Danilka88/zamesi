// [M-EXTENSION][TEST-COMMENTS-RENDER][START_BLOCK]
// DOM-слой умных комментариев: сводка, бейджи, фильтры, парсинг, лид-карта.
// happy-dom имитирует li со структурой RUTUBE (Woodpecker classes).
import { describe, it, expect, vi } from "vitest";
import {
  buildSummaryCard,
  computeStats,
  enhanceCommentItem,
  applyFilter,
  parseCommentText,
  parseAuthor,
  parseLikeCount,
  findCommentInput,
  COMMENTS_ATTR,
  COMMENT_ENHANCED_ATTR,
  TAG_META,
} from "../src/content/comments/render";
import { classifyComment } from "../src/content/comments/detect";
import type { CommentInsight } from "../src/content/comments/detect";
import iphonePassport from "../src/data/passports/iphone_50k_wylsacom.json" with { type: "json" };
import type { Passport } from "../src/data/types";

const P = iphonePassport as unknown as Passport;

function commentLi(text: string, author = "Nurlan", likes = "0"): HTMLElement {
  const li = document.createElement("li");
  li.className = "wdp-comment-item-module__comment-item";
  li.innerHTML = `
    <div class="wdp-comment-item-module__author-row">
      <div class="wdp-comment-author-module__author-name">
        <span class="wdp-comment-author-module__author-name-inner">${author}</span>
      </div>
      <span class="wdp-comment-author-module__publish-date">5 дней назад</span>
    </div>
    <div class="wdp-comment-item-module__description-container">
      <div class="wdp-comment-item-module__description">${text}</div>
    </div>
    <div class="wdp-comment-reactions-module__buttons-row">
      <span class="wdp-comment-reactions-module__counter">${likes}</span>
    </div>
  `;
  return li;
}

function fakePlayer() {
  return {
    video: null,
    progressBar: null,
    timecode: null,
    getDuration: () => 0,
    getCurrentTime: () => 0,
    seekTo: vi.fn(),
  };
}

function insight(comment: string): CommentInsight {
  return classifyComment(comment, P);
}

describe("comments render: parse", () => {
  it("parseCommentText/parseAuthor/parseLikeCount", () => {
    const li = commentLi("Где взять царское стекло на 16e?", "Wylsacom", "12");
    expect(parseCommentText(li)).toBe("Где взять царское стекло на 16e?");
    expect(parseAuthor(li)).toBe("Wylsacom");
    expect(parseLikeCount(li)).toBe(12);
  });
  it("parseLikeCount без лайков = 0", () => {
    expect(parseLikeCount(commentLi("привет"))).toBe(0);
  });
  it("findCommentInput находит textarea", () => {
    const ta = document.createElement("textarea");
    ta.className = "wdp-comment-first-level-input-module__commentTextarea";
    document.body.append(ta);
    expect(findCommentInput()).toBe(ta);
    ta.remove();
    expect(findCommentInput()).toBeNull();
  });
});

describe("comments render: computeStats", () => {
  it("считает категории по тегам", () => {
    const ins = [insight("Где взять царское стекло на 16e?"), insight("Отличное видео, спасибо!")];
    const s = computeStats(ins);
    expect(s.total).toBe(2);
    expect(s.monetizable).toBeGreaterThan(0);
    expect(s.product).toBeGreaterThan(0);
    expect(s.praise).toBeGreaterThan(0);
  });
});

describe("comments render: buildSummaryCard", () => {
  it("рендерит KPI и табы, клик таба вызывает onFilter", () => {
    const stats = computeStats([insight("Где взять царское стекло на 16e?")]);
    const onFilter = vi.fn();
    const card = buildSummaryCard(stats, "all", onFilter, null);
    expect(card.hasAttribute(COMMENTS_ATTR)).toBe(true);
    expect(card.textContent).toContain("Умные комментарии");
    expect(card.querySelectorAll('button[role="tab"]').length).toBeGreaterThanOrEqual(4);
    const tab = card.querySelector<HTMLButtonElement>('button[role="tab"]');
    tab?.click();
    expect(onFilter).toHaveBeenCalled();
  });

  it("табы имеют валидный inline-стиль (шрифт и фон видны)", () => {
    const stats = computeStats([insight("Где взять царское стекло на 16e?")]);
    const card = buildSummaryCard(stats, "all", () => undefined, null);
    const tabs = card.querySelectorAll<HTMLButtonElement>('button[role="tab"]');
    expect(tabs.length).toBeGreaterThan(0);
    for (const t of tabs) {
      // cssText должен содержать ';' между декларациями — иначе браузер
      // не парсит шрифт/фон/отступы (регрессия на .join("")).
      expect(t.style.fontSize).toBe("11px");
      expect(t.style.borderRadius).toBe("999px");
      expect(t.style.padding).toBeTruthy();
      expect(t.style.backgroundColor).toBeTruthy();
    }
  });
});

describe("comments render: enhanceCommentItem", () => {
  it("добавляет теги, тайм-пилл и кнопку ИИ-ответ", () => {
    const li = commentLi("Где взять царское стекло на 16e?", "Nurlan", "1");
    const ins = insight("Где взять царское стекло на 16e?");
    const player = fakePlayer();
    enhanceCommentItem(li, ins, P, player, { onReply: vi.fn() });
    expect(li.hasAttribute(COMMENT_ENHANCED_ATTR)).toBe(true);
    const tags = (li.getAttribute(COMMENT_ENHANCED_ATTR) ?? "").split(",");
    expect(tags).toContain("monetizable");
    expect(tags).toContain("product");
    expect(li.textContent).toContain("💰");
    expect(li.textContent).toContain("ИИ-ответ");
    expect(li.textContent).toContain("⏱");
  });

  it("монетизируемый лид → товарная карта (царское стекло)", () => {
    const li = commentLi("Где взять царское стекло на 16e?");
    const ins = insight("Где взять царское стекло на 16e?");
    const player = fakePlayer();
    enhanceCommentItem(li, ins, P, player, { onReply: vi.fn() });
    expect(li.textContent).toContain("потенциал лида");
    expect(li.textContent).toMatch(/🛡️|Стекло|стекл/);
  });

  it("токсичный → подсветка рамкой и бейдж", () => {
    const li = commentLi("Автор матерится, ублюдочное решение ахаха", "Сус");
    const ins = insight("Автор матерится, ублюдочное решение ахаха");
    const player = fakePlayer();
    enhanceCommentItem(li, ins, P, player, { onReply: vi.fn() });
    expect(ins.tags).toContain("toxic");
    expect(li.style.borderLeft).toContain("3px solid");
    expect(li.textContent).toContain(TAG_META.toxic.icon);
  });

  it("идемпотентность: повторный вызов не дублирует бейджи", () => {
    const li = commentLi("Хочу царское стекло на 16e");
    const ins = insight("Хочу царское стекло на 16e");
    const player = fakePlayer();
    enhanceCommentItem(li, ins, P, player, { onReply: vi.fn() });
    const badgesBefore = li.querySelectorAll("[style*='border-radius:999px']").length;
    enhanceCommentItem(li, ins, P, player, { onReply: vi.fn() });
    const badgesAfter = li.querySelectorAll("[style*='border-radius:999px']").length;
    expect(badgesAfter).toBe(badgesBefore);
  });

  it("клик тайм-пилла перематывает видео", () => {
    const li = commentLi("Где взять царское стекло на 16e?");
    const ins = insight("Где взять царское стекло на 16e?");
    const player = fakePlayer();
    enhanceCommentItem(li, ins, P, player, { onReply: vi.fn() });
    const pill = [...li.querySelectorAll("span")].find((s) => s.textContent?.includes("05:36"));
    expect(pill).toBeTruthy();
    pill?.click();
    expect(player.seekTo).toHaveBeenCalled();
  });
});

describe("comments render: applyFilter", () => {
  it("прячет li без активного тега и возвращает по 'all'", () => {
    const list = document.createElement("ul");
    const productLi = commentLi("Хочу царское стекло на 16e");
    const praiseLi = commentLi("Отличное видео, спасибо!");
    list.append(productLi, praiseLi);
    enhanceCommentItem(productLi, insight("Хочу царское стекло на 16e"), P, fakePlayer(), { onReply: vi.fn() });
    enhanceCommentItem(praiseLi, insight("Отличное видео, спасибо!"), P, fakePlayer(), { onReply: vi.fn() });

    applyFilter(list, "product");
    expect(productLi.style.display).toBe("");
    expect(praiseLi.style.display).toBe("none");

    applyFilter(list, "all");
    expect(praiseLi.style.display).toBe("");
  });
});