// [M-EXTENSION][STUDIO][VIDEOLIST][START_BLOCK]
// Список видео Studio (studio.rutube.ru/videos): инжектит заметную кнопку
// «🚀 Продвижение» на каждую карточку видео. Клик → оверлей с готовыми
// креативами Яндекс Директ / VK / MyTarget (Variant A).
// Спа-устойчиво: MutationObserver восстанавливает кнопки после пагинации/фильтров.
import { resolveBindingDetailed } from "../content/data/bindings";
import { getDefaultPassport } from "../data/registry";
import type { Passport } from "../data/types";
import { buildPromotionBundle } from "./promotion";
import { openVideoListPromoOverlay } from "./render/videoListOverlay";

export const VIDEO_LIST_CONTAINER_SELECTOR = '[class*="videosContainer__vl-videos-module"]';
export const VIDEO_CARD_SELECTOR = '[class*="vl-card-horizontal-module"]';
const TITLE_SELECTOR = 'a[class*="title__vl-card-horizontal-module"]';
const BOTTOM_INFO_SELECTOR = '[class*="bottomInfo__vl-card-horizontal-module"]';
const BTN_MARK = "data-rz-promo-btn";
const CARD_MARK = "data-rz-promo-card";

const VIDEO_ID_RE = /\/video\/(?:private\/)?([a-f0-9]{6,})\/?/i;

function extractVideoIdFromCard(card: HTMLElement): string | null {
  const tryHref = (el: HTMLAnchorElement | null): string | null => {
    if (!el) return null;
    const raw = el.getAttribute("href") ?? el.href ?? "";
    if (!raw) return null;
    const m = raw.match(VIDEO_ID_RE);
    return m ? m[1] : null;
  };
  // 1. ссылка заголовка
  const link = card.querySelector<HTMLAnchorElement>(`a[href*="/video/"]`);
  const fromLink = tryHref(link);
  if (fromLink) return fromLink;
  // 2. любой href внутри карточки
  const anyLink = card.querySelector<HTMLAnchorElement>('[href*="/video/"]');
  const fromAny = tryHref(anyLink);
  if (fromAny) return fromAny;
  // 3. data-атрибуты (если появятся)
  const dataId = card.getAttribute("data-video-id") ?? card.getAttribute("data-id");
  if (dataId && /^[a-f0-9]{6,}$/i.test(dataId.trim())) return dataId.trim();
  return null;
}

function extractTitleFromCard(card: HTMLElement): string {
  const titleEl = card.querySelector<HTMLElement>(TITLE_SELECTOR);
  if (titleEl?.textContent) return titleEl.textContent.trim();
  // fallback — любой заголовок внутри карточки
  const fallback = card.querySelector<HTMLElement>('a[class*="title"]');
  if (fallback?.textContent) return fallback.textContent.trim();
  return card.textContent?.trim().slice(0, 120) ?? "";
}

function resolvePassportForCard(videoId: string | null, title: string): { passport: Passport; method: string } {
  const vid = videoId ?? "";
  const binding = resolveBindingDetailed(vid, title);
  if (binding.entry) return { passport: binding.entry.passport, method: binding.method };
  return { passport: getDefaultPassport(), method: "none" };
}

function createPromoButton(videoId: string, title: string, card: HTMLElement): HTMLElement {
  const wrap = document.createElement("div");
  wrap.setAttribute(BTN_MARK, "1");
  wrap.setAttribute("data-video-id", videoId);
  wrap.style.cssText = "margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", "Продвижение видео");
  btn.setAttribute(BTN_MARK, "1");
  btn.dataset.videoId = videoId;
  btn.style.cssText =
    "display:inline-flex;align-items:center;gap:6px;" +
    "background:linear-gradient(135deg,#E32636,#a855f7);color:#fff;border:0;" +
    "border-radius:999px;padding:7px 14px;cursor:pointer;font-weight:800;font-size:12.5px;" +
    "box-shadow:0 4px 14px rgba(227,38,54,.35);letter-spacing:.1px;" +
    "transition:transform .1s,box-shadow .15s,filter .15s;";

  const icon = document.createElement("span");
  icon.textContent = "▶️";
  icon.style.cssText = "font-size:13px;";
  const label = document.createElement("span");
  label.textContent = "Продвижение";
  const platforms = document.createElement("span");
  platforms.textContent = "· RUTUBE · Директ · VK · MyTarget";
  platforms.style.cssText = "font-weight:600;opacity:.9;font-size:10.5px;letter-spacing:.2px;";

  btn.append(icon, label, platforms);

  btn.addEventListener("mouseenter", () => {
    btn.style.filter = "brightness(1.08)";
    btn.style.boxShadow = "0 6px 18px rgba(227,38,54,.45)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.filter = "";
    btn.style.boxShadow = "0 4px 14px rgba(227,38,54,.35)";
  });
  btn.addEventListener("mousedown", () => {
    btn.style.transform = "scale(.97)";
  });
  btn.addEventListener("mouseup", () => {
    btn.style.transform = "";
  });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { passport } = resolvePassportForCard(videoId, title);
    const videoUrl = videoId ? `https://rutube.ru/video/${videoId}` : `https://rutube.ru/video/${videoId}`;
    const bundle = buildPromotionBundle(passport, videoId || passport.frontmatter.video_id, videoUrl);
    openVideoListPromoOverlay(bundle, videoId || passport.frontmatter.video_id);
    // метка для E2E
    try {
      card.setAttribute("data-rz-promo-opened", "1");
    } catch {}
  });

  wrap.append(btn);
  return wrap;
}

export function mountPromoButton(card: HTMLElement): boolean {
  if (card.hasAttribute(CARD_MARK)) return true;
  if (card.querySelector(`[${BTN_MARK}]`)) {
    card.setAttribute(CARD_MARK, "1");
    return true;
  }
  const videoId = extractVideoIdFromCard(card);
  const title = extractTitleFromCard(card);
  // Даже без videoId показываем кнопку (демо-паспорт) — id будет дефолтный
  const effectiveId = videoId ?? getDefaultPassport().frontmatter.video_id ?? "demo";

  const btnWrap = createPromoButton(effectiveId, title, card);

  // Точка вставки: после bottomInfo внутри левой колонки
  const bottomInfo = card.querySelector<HTMLElement>(BOTTOM_INFO_SELECTOR);
  if (bottomInfo) {
    bottomInfo.insertAdjacentElement("afterend", btnWrap);
    card.setAttribute(CARD_MARK, "1");
    card.setAttribute("data-rz-video-id", effectiveId);
    return true;
  }
  // fallback: в левую колонку
  const leftCol = card.querySelector<HTMLElement>('div[class*="__studio_column"][class*="__studio_gap-4x"]');
  if (leftCol) {
    leftCol.append(btnWrap);
    card.setAttribute(CARD_MARK, "1");
    card.setAttribute("data-rz-video-id", effectiveId);
    return true;
  }
  // последний fallback: в саму карточку
  card.append(btnWrap);
  card.setAttribute(CARD_MARK, "1");
  card.setAttribute("data-rz-video-id", effectiveId);
  return true;
}

export function findVideoListContainer(): HTMLElement | null {
  return document.querySelector<HTMLElement>(VIDEO_LIST_CONTAINER_SELECTOR);
}

export function findVideoCards(container?: HTMLElement | null): HTMLElement[] {
  const root = container ?? findVideoListContainer() ?? document.body;
  // Основной: каждый gap-6x блок с заголовком — это карточка видео (outer wrapper)
  const byGap = Array.from(root.querySelectorAll<HTMLElement>('[class*="__studio_gap-6x"]')).filter((el) =>
    el.querySelector(TITLE_SELECTOR),
  );
  if (byGap.length) return byGap;
  // Fallback: по vl-card классу — поднимаемся к ближайшему колонке
  const byModule = Array.from(root.querySelectorAll<HTMLElement>(VIDEO_CARD_SELECTOR));
  if (byModule.length) {
    return byModule
      .map((el) => el.closest<HTMLElement>('[class*="__studio_gap-6x"]') ?? el)
      .filter((el, i, arr) => arr.indexOf(el) === i);
  }
  return [];
}

export function mountVideoListPromos(): number {
  const container = findVideoListContainer();
  if (!container) return 0;
  const cards = findVideoCards(container);
  let mounted = 0;
  for (const card of cards) {
    if (mountPromoButton(card)) mounted += 1;
  }
  return mounted;
}

let listObserver: MutationObserver | null = null;
let pollTimer: number | null = null;

export function observeVideoList(): void {
  // первичный монтаж
  mountVideoListPromos();

  const container = findVideoListContainer();
  const target = container ?? document.body;

  if (listObserver) listObserver.disconnect();
  listObserver = new MutationObserver(() => {
    mountVideoListPromos();
  });
  listObserver.observe(target, { childList: true, subtree: true });

  // страховка поллингом (SPA может заменить контейнер целиком)
  if (pollTimer !== null) window.clearInterval(pollTimer);
  pollTimer = window.setInterval(() => {
    mountVideoListPromos();
  }, 1500) as unknown as number;
}

export function unmountVideoList(): void {
  listObserver?.disconnect();
  listObserver = null;
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
  for (const el of document.querySelectorAll<HTMLElement>(`[${BTN_MARK}]`)) {
    el.remove();
  }
  for (const card of document.querySelectorAll<HTMLElement>(`[${CARD_MARK}]`)) {
    card.removeAttribute(CARD_MARK);
  }
}

// = [M-EXTENSION][STUDIO][VIDEOLIST][END_BLOCK]
