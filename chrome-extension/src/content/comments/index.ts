// [M-EXTENSION][COMMENTS][INDEX][START_BLOCK]
// Оркестрация «умных комментариев»: ждёт появления блока (React SPA монтирует
// клиентски), классифицирует каждый комментарий по паспорту, монтирует сводку
// и бейджи, открывает поповер «ИИ-ответ» с копированием/вставкой. Наблюдает за
// перерисовками (Показать ещё / сортировка) и пере-обогащает новые li.
// Паттерн — зеркало merchOffer.index (waitFor + MutationObserver restore).
import type { Passport } from "../../data/types";
import type { PlayerHandle } from "../rutube";
import { waitFor, COMMENTS_LIST_SELECTOR, COMMENTS_WRAPPER_SELECTOR } from "../rutube";
import { classifyComment, type CommentInsight, type CommentTag } from "./detect";
import { buildReplyVariants } from "./generate";
import {
  buildSummaryCard,
  computeStats,
  enhanceCommentItem,
  parseAuthor,
  parseCommentText,
  parseLikeCount,
  applyFilter,
  findCommentInput,
  COMMENT_ENHANCED_ATTR,
  type CommentsStats,
} from "./render";
import { setNativeValue } from "../../studio/autofill";

function el(tag: string, text: string, style: string): HTMLElement {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (style) node.style.cssText = style;
  return node;
}

let listRef: HTMLElement | null = null;
let wrapperRef: HTMLElement | null = null;
let mounted = false;
let activeTag: CommentTag | "all" = "all";
let passports: Passport | null = null;
let playerRef: PlayerHandle | null = null;
let videoIdRef = "";
let summaryCard: HTMLElement | null = null;
let insightsCache = new Map<HTMLElement, CommentInsight>();

let observerList: MutationObserver | null = null;
let observerWrapper: MutationObserver | null = null;
let popoverRoot: HTMLElement | null = null;
let popoverEsc: ((e: KeyboardEvent) => void) | null = null;

/** Найти список комментариев (ul): из блока по селектору или из первого li. */
function findList(root: HTMLElement): HTMLElement | null {
  const list = root.querySelector<HTMLElement>(COMMENTS_LIST_SELECTOR);
  if (list) return list;
  if (root.matches(COMMENTS_LIST_SELECTOR)) return root;
  const ul = root.querySelector<HTMLElement>("[class*='comments'] ul");
  if (ul) return ul;
  return null;
}

/** Классифицировать li (кэшируется по DOM-ноде). */
function insightFor(li: HTMLElement): CommentInsight {
  const cached = insightsCache.get(li);
  if (cached) return cached;
  const ins = classifyComment(parseCommentText(li), passports!, {
    likeCount: parseLikeCount(li),
    videoId: videoIdRef,
  });
  insightsCache.set(li, ins);
  return ins;
}

/** Обогатить все unenhanc'нутые комментарии списка. */
function enhanceAll(list: HTMLElement): void {
  const items = list.querySelectorAll<HTMLElement>("li[class*='comment-item'], li[role='region']");
  for (const li of items) {
    if (li.hasAttribute(COMMENT_ENHANCED_ATTR)) continue;
    const ins = insightFor(li);
    enhanceCommentItem(li, ins, passports!, playerRef, {
      onReply: (l, i) => openReplyPopover(l, i),
    });
  }
  applyFilter(list, activeTag);
}

/** Статистика по всем комментариям списка. */
function collectStats(list: HTMLElement): CommentsStats {
  const insights: CommentInsight[] = [];
  for (const li of list.querySelectorAll<HTMLElement>("li[class*='comment-item'], li[role='region']")) {
    insights.push(insightFor(li));
  }
  return computeStats(insights);
}

/** Обработчик фильтра (сохраняет тег и перерисовывает сводку). */
function onFilter(tag: CommentTag | "all"): void {
  activeTag = tag;
  if (listRef) {
    applyFilter(listRef, tag);
    rerenderSummary();
  }
}

/** Перерисовать сводную карточку с актуальной статистикой. */
function rerenderSummary(): void {
  if (!wrapperRef || !listRef) return;
  const stats = collectStats(listRef);
  summaryCard?.remove();
  const card = buildSummaryCard(stats, activeTag, onFilter, () => copySummary(stats));
  wrapperRef.insertBefore(card, listRef);
  summaryCard = card;
}

/** Сводка в CSV (буфер обмена). */
function copySummary(stats: CommentsStats): void {
  const lines = [
    "Категория;Кол-во",
    `Всего;${stats.total}`,
    `Лиды;${stats.monetizable}`,
    `Товарные;${stats.product}`,
    `Вопросы;${stats.question}`,
    `Интересные;${stats.interesting}`,
    `Токсичные;${stats.toxic}`,
    `Скам;${stats.scam}`,
  ];
  void navigator.clipboard?.writeText(lines.join("\n")).then(() => toast("Сводка скопирована ✓")).catch(() => undefined);
}

let toastEl: HTMLElement | null = null;
let toastTimer = 0;
function toast(msg: string): void {
  if (!toastEl || !toastEl.isConnected) {
    toastEl = el(
      "div",
      "",
      "position:fixed;bottom:18px;left:50%;transform:translateX(-50%);" +
        "background:#0e0f16;color:#e7e9f0;border:1px solid #fb5f93;border-radius:999px;" +
        "padding:6px 14px;font-size:12px;opacity:0;transition:opacity .25s;z-index:2147483647;pointer-events:none;",
    );
    document.body.append(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.style.opacity = "1";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    if (toastEl) toastEl.style.opacity = "0";
  }, 1400);
}

/** Закрыть поповер (снять Escape-хук). */
function closePopover(): void {
  if (popoverEsc) window.removeEventListener("keydown", popoverEsc);
  popoverEsc = null;
  popoverRoot?.remove();
  popoverRoot = null;
}

function parseSceneSeconds(time: string): number {
  const [m, s] = time.split(":").map(Number);
  return (Number.isFinite(m) ? m : 0) * 60 + (Number.isFinite(s) ? s : 0);
}

/** React-safe вставка ответа в textarea нового комментария. */
function insertReply(text: string, author: string): void {
  const ta = findCommentInput();
  if (!ta) {
    toast("Поле комментария не найдено — скопируйте текст");
    return;
  }
  const mention = author ? `@${author}, ` : "";
  const value = ta.value.trim() ? `${ta.value.trim()}\n\n` : "";
  setNativeValue(ta, `${value}${mention}${text}`);
  ta.focus();
  ta.scrollIntoView({ block: "center", behavior: "smooth" });
  toast("Вставлено в поле ответа ✓");
}

/** Поповер «ИИ-ответ»: варианты + Копировать/Вставить/Смотреть. */
function openReplyPopover(li: HTMLElement, insight: CommentInsight): void {
  closePopover();
  const author = parseAuthor(li);
  const variants = buildReplyVariants(parseCommentText(li), insight, passports!, videoIdRef);

  const overlay = document.createElement("div");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "ИИ-ответ");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:2147483646;background:rgba(8,10,16,.55);" +
    "display:flex;align-items:flex-end;justify-content:center;padding:16px;";

  const box = el("div", "", "");
  box.style.cssText =
    "width:100%;max-width:520px;max-height:72vh;overflow:auto;background:#10131c;color:#e8eaf0;" +
    "border:1px solid #384058;border-radius:14px;padding:14px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;" +
    "font-size:13px;line-height:1.5;";

  const head = el("div", "", "display:flex;align-items:center;gap:8px;margin-bottom:8px;");
  head.append(el("span", "✨ ИИ-ответ", "font-weight:800;color:#fb5f93;flex:1;font-size:14px;"));
  const closeBtn = el("button", "✕ Закрыть", "");
  closeBtn.style.cssText =
    "background:#232838;color:#cfd4e3;border:1px solid #384058;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:11px;";
  closeBtn.addEventListener("click", closePopover);
  head.append(closeBtn);
  box.append(head);

  box.append(el(
    "div",
    `На основе паспорта видео${author ? ` · @${author}` : ""}${insight.scene ? ` · сцена @${insight.scene.startSec}` : ""}`,
    "font-size:11px;color:#9aa1b5;margin-bottom:10px;",
  ));

  const mkBtn = (label: string, style: string, fn: () => void): HTMLButtonElement => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText = style;
    b.addEventListener("click", fn);
    return b;
  };
  const baseBtn =
    "background:#232838;color:#e8eaf0;border:1px solid #384058;border-radius:8px;padding:4px 9px;cursor:pointer;font-size:11px;";
  const primaryBtn =
    "background:#fb5f93;color:#fff;border:0;border-radius:8px;padding:4px 9px;cursor:pointer;font-size:11px;font-weight:700;";

  for (const v of variants) {
    const card = el("div", "", "");
    card.style.cssText =
      "border:1px solid #33363f;border-radius:10px;background:#1b2030;padding:9px 10px;margin-bottom:8px;";
    card.append(el("div", v.text, "font-size:12.5px;color:#e7e9f0;white-space:pre-wrap;"));
    const actions = el("div", "", "display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;");
    actions.append(
      mkBtn("⧉ Копировать", baseBtn, () => {
        void navigator.clipboard?.writeText(v.text).then(() => toast("Скопировано ✓")).catch(() => undefined);
      }),
      mkBtn("↳ Вставить в ответ", primaryBtn, () => insertReply(v.text, author)),
    );
    if (v.sceneTime) {
      actions.append(mkBtn(`▶ @${v.sceneTime}`, baseBtn, () => {
        closePopover();
        playerRef?.seekTo(parseSceneSeconds(v.sceneTime!));
      }));
    }
    card.append(actions);
    box.append(card);
  }

  box.append(el(
    "div",
    "ИИ-подсказка (демо): формулировки детерминированы из паспорта, без сети. Проверьте факты перед публикацией.",
    "font-size:10px;color:#667085;margin-top:6px;",
  ));

  overlay.append(box);
  document.body.append(overlay);
  popoverRoot = overlay;
  popoverEsc = (e: KeyboardEvent): void => {
    if (e.key === "Escape") closePopover();
  };
  window.addEventListener("keydown", popoverEsc);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePopover();
  });
}

/** Подключить наблюдатели (список → новые li, wrapper → восстановление сводки). */
function bindObservers(): void {
  observerWrapper?.disconnect();
  observerList?.disconnect();
  if (!wrapperRef || !listRef) return;
  observerWrapper = new MutationObserver(() => {
    if (!wrapperRef?.isConnected) return;
    const next = findList(wrapperRef);
    if (!next) return;
    if (next !== listRef) {
      listRef = next;
      enhanceAll(next);
    }
    rerenderSummary();
  });
  observerWrapper.observe(wrapperRef, { childList: true, subtree: false });
  observerList = new MutationObserver(() => {
    if (listRef) {
      enhanceAll(listRef);
      rerenderSummary();
    }
  });
  observerList.observe(listRef, { childList: true, subtree: false });
}

/**
 * Монтировать «умные комментарии» на странице видео. Идемпотентно.
 * Возвращает true, если блок найден и обработан.
 */
export async function mountComments(
  passport: Passport,
  title: string,
  player: PlayerHandle | null,
  videoId: string,
  timeoutMs = 10000,
): Promise<boolean> {
  if (mounted) return true;
  void title;
  const block = await waitFor(
    () =>
      document.querySelector<HTMLElement>(COMMENTS_WRAPPER_SELECTOR) ??
      document.querySelector<HTMLElement>(COMMENTS_LIST_SELECTOR),
    timeoutMs,
  );
  if (!block) return false;

  wrapperRef = block.matches(COMMENTS_WRAPPER_SELECTOR)
    ? block
    : block.closest<HTMLElement>(COMMENTS_WRAPPER_SELECTOR) ?? block.parentElement;
  const list = findList(block);
  if (!list) return false;

  listRef = list;
  passports = passport;
  playerRef = player;
  videoIdRef = videoId;
  listRef.setAttribute("data-rz-comments-feature", "1");

  enhanceAll(listRef);
  rerenderSummary();
  bindObservers();
  mounted = true;
  return true;
}

/** Размонтировать (наблюдатели, карточки, поповер). */
export function removeComments(): void {
  observerWrapper?.disconnect();
  observerList?.disconnect();
  observerWrapper = null;
  observerList = null;
  closePopover();
  summaryCard?.remove();
  summaryCard = null;
  insightsCache.clear();
  mounted = false;
  listRef = null;
  wrapperRef = null;
  passports = null;
  playerRef = null;
  videoIdRef = "";
}
// = [M-EXTENSION][COMMENTS][INDEX][END_BLOCK]