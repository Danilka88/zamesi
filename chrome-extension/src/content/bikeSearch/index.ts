// [M-EXTENSION][BIKE-SEARCH][INDEX][START_BLOCK]
// Оркестрация блока «Замеси: Велосипеды» на поисковой странице RUTUBE.
// Ждёт появления блока фильтров поиска (React SPA монтирует его клиентски),
// детектит «вело-запрос» по URL/хедеру и вставляет карточку после поля поиска.
// SPA может перерисовать контейнер — наблюдаем и перевставляем.
import { waitFor } from "../rutube";
import {
  extractQueryFromHeader,
  extractQueryFromUrl,
  isBikeQuery,
  BIKE_SEARCH_ENTRIES,
  BIKE_JOURNEY_STAGES,
  collectBikeProducts,
} from "./detect";
import {
  mountBikeSearchCard,
  unmountBikeSearchCard,
  mountBikeJourneyCard,
  unmountBikeJourneyCard,
  BIKE_SEARCH_ATTR,
  BIKE_JOURNEY_ATTR,
} from "./render";

/** Селектор якоря — блок фильтров поиска (после поля поиска). */
const SEARCH_CONTENT_SELECTORS = [
  ".search-filters-module__searchFilters",
  '.search-module__searchWrapper',
  'main .search-page__container',
];

function findSearchAnchor(): HTMLElement | null {
  for (const sel of SEARCH_CONTENT_SELECTORS) {
    try {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) return el;
    } catch {
      /* невалидный селектор — пропускаем */
    }
  }
  return null;
}

function isSearchPage(url: string): boolean {
  return /rutube\.ru\/search\/?/.test(url);
}

/** Прочитать query из URL или хедера, если это страница поиска. */
export function currentQuery(): string {
  const fromUrl = extractQueryFromUrl(location.href);
  if (fromUrl) return fromUrl;
  return extractQueryFromHeader();
}

let observer: MutationObserver | null = null;
let mountedAnchor: HTMLElement | null = null;

function restoreCard(): void {
  if (!mountedAnchor || !mountedAnchor.isConnected) return;
  const listCard = mountedAnchor.nextElementSibling;
  if (!listCard || !listCard.hasAttribute(BIKE_SEARCH_ATTR)) {
    if (!isSearchPage(location.href) || !isBikeQuery(currentQuery())) return;
    const card = mountBikeSearchCard(mountedAnchor, BIKE_SEARCH_ENTRIES, collectBikeProducts());
    if (card) mountBikeJourneyCard(card, BIKE_JOURNEY_STAGES);
    return;
  }
  // Плейлист на месте — восстановим степпер, если его вычистил React.
  const list = listCard as HTMLElement;
  if (!list.nextElementSibling?.hasAttribute(BIKE_JOURNEY_ATTR)) {
    mountBikeJourneyCard(list, BIKE_JOURNEY_STAGES);
  }
}

/**
 * Смонтировать блок «Велосипеды» на странице поиска, если запрос «про велосипеды».
 * Идемпотентно; наблюдает за перерисовкой контейнера (React RPA).
 */
export async function mountBikeSearch(timeoutMs = 8000): Promise<boolean> {
  if (!isSearchPage(location.href) || !isBikeQuery(currentQuery())) return false;

  const anchor = await waitFor(() => findSearchAnchor(), timeoutMs);
  if (!anchor) return false;

  unmountBikeSearchCard(anchor);
  mountedAnchor = anchor;
  const listCard = mountBikeSearchCard(anchor, BIKE_SEARCH_ENTRIES, collectBikeProducts());
  if (listCard) mountBikeJourneyCard(listCard, BIKE_JOURNEY_STAGES);

  observer?.disconnect();
  observer = new MutationObserver(() => restoreCard());
  observer.observe(anchor.parentElement ?? document.body, { childList: true, subtree: true });

  return true;
}

export function removeBikeSearch(): void {
  observer?.disconnect();
  observer = null;
  if (mountedAnchor) {
    const listCard = mountedAnchor.nextElementSibling;
    if (listCard && listCard.hasAttribute(BIKE_SEARCH_ATTR)) {
      unmountBikeJourneyCard(listCard as HTMLElement);
    }
    unmountBikeSearchCard(mountedAnchor);
    mountedAnchor = null;
  }
}
// = [M-EXTENSION][BIKE-SEARCH][INDEX][END_BLOCK]