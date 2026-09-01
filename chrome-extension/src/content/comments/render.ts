// [M-EXTENSION][COMMENTS][RENDER][START_BLOCK]
// UI-слой «умных комментариев»: карточка-сводка (KPI + donut + фильтры),
// бейджи на каждом комментарии, товарная мини-карта для лидов, кнопка
// «ИИ-ответ». Без Shadow DOM (как оффер-блоки), inline-стили + data-атрибуты
// для идемпотентности и фильтрации (NFR-6/7).
import type { Passport } from "../../data/types";
import type { PlayerHandle } from "../rutube";
import { fmtTime } from "../render/layout";
import { isDarkTheme } from "../merchOffer/render";
import { leadProductFor, type CommentInsight, type CommentTag } from "./detect";

export const COMMENTS_ATTR = "data-rz-comments";
export const COMMENT_ENHANCED_ATTR = "data-rz-comment-tags";

export interface CommentsStats {
  total: number;
  product: number;
  monetizable: number;
  question: number;
  praise: number;
  toxic: number;
  scam: number;
  interesting: number;
  offtopic: number;
}

interface Palette {
  cardBg: string;
  cardBorder: string;
  title: string;
  sub: string;
  badgeBg: string;
  toxicBg: string;
  toxicBorder: string;
  leadBg: string;
}

const DARK: Palette = {
  cardBg: "rgba(23,29,44,0.94)",
  cardBorder: "#384058",
  title: "#e8eaf0",
  sub: "#9aa1b5",
  badgeBg: "#232838",
  toxicBg: "#241b1d",
  toxicBorder: "#f59e0b",
  leadBg: "#121d1b",
};

const LIGHT: Palette = {
  cardBg: "#ffffff",
  cardBorder: "#e0e4ea",
  title: "#1c232b",
  sub: "#5a6877",
  badgeBg: "#eef1f5",
  toxicBg: "#fff8f6",
  toxicBorder: "#e15554",
  leadBg: "#f2fbf7",
} as Palette;

function palette(): Palette {
  return isDarkTheme() ? DARK : LIGHT;
}

/** Маркеры тегов (иконка + цвет + label) для бейджей и donut. */
export const TAG_META: Record<CommentTag, { icon: string; color: string; label: string }> = {
  product: { icon: "🛒", color: "#38bdf8", label: "Товарные" },
  monetizable: { icon: "💰", color: "#22c55e", label: "Лиды" },
  question: { icon: "❓", color: "#8b5cf6", label: "Вопросы" },
  praise: { icon: "🔥", color: "#f59e0b", label: "Похвала" },
  toxic: { icon: "🚨", color: "#ef4444", label: "Токсичные" },
  scam: { icon: "⚠️", color: "#e15443", label: "Скам" },
  interesting: { icon: "⭐", color: "#fbbf24", label: "Интересные" },
  offtopic: { icon: "💬", color: "#667085", label: "Оффтоп" },
};

/** Категории, показываемые как осмысленные (без Оффтоп) — для donut. */
const MEANINGFUL_TAGS: CommentTag[] = ["monetizable", "product", "question", "toxic", "scam", "praise", "interesting"];

/** Подсчёт статистики по набору инсайтов. */
export function computeStats(insights: CommentInsight[]): CommentsStats {
  const s: CommentsStats = {
    total: insights.length,
    product: 0, monetizable: 0, question: 0, praise: 0,
    toxic: 0, scam: 0, interesting: 0, offtopic: 0,
  };
  for (const ins of insights) {
    if (ins.tags.includes("product")) s.product += 1;
    if (ins.tags.includes("monetizable")) s.monetizable += 1;
    if (ins.tags.includes("question")) s.question += 1;
    if (ins.tags.includes("praise")) s.praise += 1;
    if (ins.tags.includes("toxic")) s.toxic += 1;
    if (ins.tags.includes("scam")) s.scam += 1;
    if (ins.tags.includes("interesting")) s.interesting += 1;
    if (ins.tags.includes("offtopic")) s.offtopic += 1;
  }
  return s;
}

function el(tag: string, text: string, style: string): HTMLElement {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (style) node.style.cssText = style;
  return node;
}

/** Donut на conic-gradient (как в analystMode). */
function donut(percent: number, sub: string, color: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;flex:0 0 auto;";
  const d = document.createElement("div");
  const pct = Math.max(0, Math.min(100, percent));
  d.style.cssText =
    `width:70px;height:70px;border-radius:50%;` +
    `background:conic-gradient(${color} ${pct}%, #2c3342 ${pct}% 100%);` +
    "display:flex;align-items:center;justify-content:center;";
  const hole = document.createElement("div");
  hole.style.cssText =
    "width:56px;height:56px;border-radius:50%;background:#10131c;" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;";
  hole.append(el("div", `${Math.round(pct)}%`, "font-weight:800;font-size:15px;color:#fff;"));
  d.append(hole);
  wrap.append(d);
  wrap.append(el("div", sub, "font-size:10px;color:#9aa1b5;text-align:center;"));
  return wrap;
}

/** Сводная карточка: KPI + donut + табы-фильтры. */
export function buildSummaryCard(
  stats: CommentsStats,
  activeTag: CommentTag | "all",
  onFilter: (t: CommentTag | "all") => void,
  onCopy: (() => void) | null,
): HTMLElement {
  const p = palette();
  const card = document.createElement("div");
  card.setAttribute(COMMENTS_ATTR, "");
  card.style.cssText = [
    "box-sizing:border-box",
    "margin:0 0 14px",
    "padding:12px 14px",
    `border:1px solid ${p.cardBorder}`,
    "border-radius:14px",
    `background:${p.cardBg}`,
    `color:${p.title}`,
    "font-family:-apple-system,'Segoe UI',Roboto,sans-serif",
    "font-size:13px",
    "line-height:1.45",
    "box-shadow:0 8px 26px rgba(0,0,0,.22)",
  ].join(";");

  // Шапка.
  const head = document.createElement("div");
  head.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:10px;";
  head.append(el("span", "🧠", "font-size:16px;"));
  const titleBox = document.createElement("div");
  titleBox.style.cssText = "flex:1;min-width:0;";
  titleBox.append(el("div", "Умные комментарии", "font-weight:800;font-size:14px;"));
  titleBox.append(el(
    "div",
    `ИИ-анализ ${stats.total} комментариев по паспорту видео · демо, без сети`,
    `font-size:10px;color:${p.sub};`,
  ));
  head.append(titleBox);
  if (onCopy) {
    const copy = el("button", "⧉ Сводка", "");
    (copy as HTMLButtonElement).type = "button";
    copy.style.cssText =
      `background:#232838;color:#e8eaf0;border:1px solid #384058;border-radius:8px;padding:5px 9px;cursor:pointer;font-size:11px;`;
    copy.addEventListener("click", () => onCopy());
    head.append(copy);
  }
  card.append(head);

  // Ряд: KPI-чипы + donut.
  const row = document.createElement("div");
  row.style.cssText = "display:flex;align-items:center;gap:12px;flex-wrap:wrap;";
  const chips = document.createElement("div");
  chips.style.cssText = "flex:1;min-width:180px;display:flex;flex-direction:column;gap:5px;";
  const mkKpi = (icon: string, num: number, label: string, color: string): HTMLElement => {
    const c = el("div", "", "display:flex;align-items:center;gap:8px;");
    c.append(el("span", icon, "font-size:13px;"));
    c.append(el("span", String(num), `font-weight:800;color:${color};min-width:22px;text-align:right;`));
    c.append(el("span", label, `font-size:11px;color:${p.sub};`));
    return c;
  };
  const leadPct = stats.total ? Math.round((stats.monetizable / stats.total) * 100) : 0;
  chips.append(mkKpi("💰", stats.monetizable, `лидов · ${leadPct}%`, "#22c55e"));
  chips.append(mkKpi("🛒", stats.product, "товарных", "#38bdf8"));
  chips.append(mkKpi("❓", stats.question, "вопросов", "#8b5cf6"));
  chips.append(mkKpi("🚨", stats.toxic + stats.scam, "токсичных/скам", "#ef4444"));
  row.append(chips);

  // donut: топ осмысленной категории.
  const counts = MEANINGFUL_TAGS
    .map((t) => ({ t, n: stats[t] }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const topCat = counts[0];
  const topPct = stats.total && topCat ? (topCat.n / stats.total) * 100 : 0;
  const topColor = topCat ? TAG_META[topCat.t].color : "#667085";
  row.append(donut(
    topPct,
    topCat ? `${TAG_META[topCat.t].icon} ${TAG_META[topCat.t].label} ${topCat.n}` : "нет данных",
    topColor,
  ));
  card.append(row);

  // Табы-фильтры.
  const tabs = document.createElement("div");
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Фильтр комментариев");
  tabs.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;";
  const tabDefs: Array<{ id: CommentTag | "all"; icon: string; label: string; n: number }> = [
    { id: "all", icon: "📋", label: "Все", n: stats.total },
    { id: "monetizable", icon: "💰", label: "Лиды", n: stats.monetizable },
    { id: "question", icon: "❓", label: "Вопросы", n: stats.question },
    { id: "interesting", icon: "⭐", label: "Интересные", n: stats.interesting },
    { id: "toxic", icon: "🚨", label: "Токсичные", n: stats.toxic },
    { id: "scam", icon: "⚠️", label: "Скам", n: stats.scam },
  ];
  for (const t of tabDefs) {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(t.id === activeTag));
    b.textContent = `${t.icon} ${t.label}·${t.n}`;
    b.style.cssText = [
      "border:1px solid #33363f",
      "border-radius:999px",
      "padding:4px 10px",
      "font-size:11px",
      "cursor:pointer",
      t.id === activeTag ? "background:#fb5f93;color:#fff;border-color:#fb5f93;" : "background:#2c3342;color:#e8eaf0;",
    ].join(";");
    b.addEventListener("click", () => onFilter(t.id));
    tabs.append(b);
  }
  card.append(tabs);
  return card;
}

/** Извлечь текст комментария из li (описание). */
export function parseCommentText(li: HTMLElement): string {
  const desc = li.querySelector<HTMLElement>(
    ".wdp-comment-item-module__description, [class*='description']",
  );
  const text = (desc?.textContent ?? li.textContent ?? "").replace(/\s+/g, " ").trim();
  return text;
}

/** Имя автора из li (для @упоминания). */
export function parseAuthor(li: HTMLElement): string {
  const a = li.querySelector<HTMLElement>(
    ".wdp-comment-author-module__author-name-inner, .wdp-comment-author-module__author-name",
  );
  return a?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

/** Счётчик лайков из reaction-строки (для interesting). */
export function parseLikeCount(li: HTMLElement): number {
  const first = li.querySelector(".wdp-comment-reactions-module__counter")?.textContent?.trim() ?? "";
  const n = Number.parseInt(first, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Найти текстарею ввода нового комментария (top-level). */
export function findCommentInput(): HTMLTextAreaElement | null {
  const sels = [
    ".wdp-comment-first-level-input-module__commentTextarea",
    'textarea[placeholder*="Ваш комментарий"]',
    'div[class*="comment-first-level"] textarea',
  ];
  for (const sel of sels) {
    try {
      const ta = document.querySelector<HTMLTextAreaElement>(sel);
      if (ta) return ta;
    } catch {
      /* невалидный селектор */
    }
  }
  return null;
}

/** Применить фильтр к списку: прячем li без нужного тега. */
export function applyFilter(list: HTMLElement, activeTag: CommentTag | "all"): void {
  for (const li of list.querySelectorAll<HTMLElement>("li[data-rz-comment-tags]")) {
    const tags = (li.dataset.rzCommentTags ?? "").split(",");
    const match = activeTag === "all" || tags.includes(activeTag);
    li.style.display = match ? "" : "none";
  }
}

/** Бейдж-чип (pill). */
export function badge(
  icon: string,
  text: string,
  color: string,
  tooltip?: string,
  onClick?: () => void,
): HTMLElement {
  const b = el("span", "", "");
  b.style.cssText = [
    "display:inline-flex;align-items:center;gap:4px",
    "font-size:10px;font-weight:700",
    "border-radius:999px",
    "padding:2px 8px",
    `color:${color}`,
    "border:1px solid currentColor",
    onClick ? "cursor:pointer;transition:filter .12s;" : "cursor:default;",
  ].join(";");
  if (tooltip) b.title = tooltip;
  b.append(el("span", icon, ""), el("span", text, ""));
  if (onClick) {
    b.addEventListener("mouseenter", () => { b.style.filter = "brightness(1.25)"; });
    b.addEventListener("mouseleave", () => { b.style.filter = ""; });
    b.addEventListener("click", onClick);
  }
  return b;
}

/** Мини-карта товара для лида. */
function leadCard(label: string, icon: string, conf: number, time: string, onSeek: () => void): HTMLElement {
  const p = palette();
  const c = document.createElement("div");
  c.style.cssText = [
    "margin:8px 0 2px",
    "padding:8px 10px",
    "border-radius:10px",
    `background:${p.leadBg}`,
    "border:1px solid rgba(34,197,94,.32)",
    "display:flex;align-items:center;gap:9px",
  ].join(";");
  c.append(el("span", icon, "font-size:18px;"));
  const box = el("div", "", "flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;");
  box.append(el("div", label, "font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"));
  box.append(el("div", `потенциал лида ${Math.round(conf * 100)}% · в видео @${time}`, `font-size:10px;color:${p.sub};`));
  c.append(box);
  const go = badge("▶", "Смотреть", "#22c55e", "Открыть сцену видео", onSeek);
  c.append(go);
  return c;
}

export interface ReplyActions {
  /** Открыть поповер с готовыми ответами (монтируется в index.ts). */
  onReply(li: HTMLElement, insight: CommentInsight): void;
}

/** Бейджи + «ИИ-ответ» + товарная карта — встраиваются в li. Идемпотентно. */
export function enhanceCommentItem(
  li: HTMLElement,
  insight: CommentInsight,
  passport: Passport,
  player: PlayerHandle | null,
  actions: ReplyActions,
): void {
  if (li.hasAttribute(COMMENT_ENHANCED_ATTR)) return;
  li.setAttribute(COMMENT_ENHANCED_ATTR, insight.tags.join(","));
  const p = palette();

  // Токсичные/скам: особая подсветка рамкой (не скрываем, а выделяем).
  const toxic = insight.tags.includes("toxic") || insight.tags.includes("scam");
  if (toxic) {
    li.style.borderLeft = `3px solid ${p.toxicBorder}`;
    li.style.background = p.toxicBg;
  }

  // Ряд бейджей после author-row.
  const badgesRow = el("div", "", "display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:3px 0 4px;");
  for (const tag of insight.tags) {
    if (tag === "offtopic") continue;
    const meta = TAG_META[tag];
    const label = tag === "monetizable" ? `${meta.label} ${Math.round(insight.monetizableScore * 100)}%` : meta.label;
    badgesRow.append(badge(meta.icon, label, meta.color, insight.explain));
  }
  if (insight.scene) {
    const t = fmtTime(insight.scene.startSec);
    const seek = (): void => player?.seekTo(insight.scene!.startSec);
    badgesRow.append(badge("⏱", t, "#38bdf8", "Перемотать видео к этому моменту", seek));
  }
  badgesRow.append(badge("✨", "ИИ-ответ", "#fb5f93", "Сгенерировать ответ (демо, без сети)", () => actions.onReply(li, insight)));

  const anchor = li.querySelector<HTMLElement>(".wdp-comment-item-module__author-row") ?? li;
  anchor.insertAdjacentElement("afterend", badgesRow);

  // Товарная мини-карта для лида.
  if (insight.tags.includes("monetizable") && insight.scene) {
    const prod = leadProductFor(passport, insight);
    if (prod) {
      const card = leadCard(
        prod.label,
        prod.icon,
        prod.confidence,
        fmtTime(insight.scene.startSec),
        () => player?.seekTo(insight.scene!.startSec),
      );
      const descWrap = li.querySelector<HTMLElement>(".wdp-comment-item-module__description-container");
      (descWrap ? descWrap : badgesRow).insertAdjacentElement("beforebegin", card as HTMLElement);
    }
  }
}
// = [M-EXTENSION][COMMENTS][RENDER][END_BLOCK]