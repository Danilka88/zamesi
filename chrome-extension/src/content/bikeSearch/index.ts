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
  collectBikeProducts,
} from "./detect";
import { mountBikeSearchCard, unmountBikeSearchCard } from "./render";

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
  if (mountedAnchor.nextElementSibling?.hasAttribute("data-rz-bike-search")) return;
  if (isSearchPage(location.href) && isBikeQuery(currentQuery())) {
    mountBikeSearchCard(mountedAnchor, BIKE_SEARCH_ENTRIES, collectBikeProducts());
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
  mountBikeSearchCard(anchor, BIKE_SEARCH_ENTRIES, collectBikeProducts());

  observer?.disconnect();
  observer = new MutationObserver(() => restoreCard());
  observer.observe(anchor.parentElement ?? document.body, { childList: true, subtree: true });

  return true;
}

export function removeBikeSearch(): void {
  observer?.disconnect();
  observer = null;
  if (mountedAnchor) {
    unmountBikeSearchCard(mountedAnchor);
    mountedAnchor = null;
  }
}
// = [M-EXTENSION][BIKE-SEARCH][INDEX][END_BLOCK]