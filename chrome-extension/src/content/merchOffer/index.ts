// [M-EXTENSION][MERCH-OFFER][INDEX][START_BLOCK]
// Оркестрация оффер-блока товаров: ждёт появления meta-row (React SPA монтирует
// его клиентски), детектит «видео с товарами» по паспорту (ecom_item/artist_merch)
// и странице, вставляет карточку «товары + мерч + магазины» после
// section[aria-label="информация о видео"]. SPA может перерисовать контейнер и
// вычистить карточку — наблюдаем и перевставляем (паттерн shadow.ts / travelOffer).
import { waitForMetaRow } from "../rutube";
import {
  collectMerchProducts,
  detectMerchContext,
  merchBrandFor,
  type MerchContext,
  type MerchProduct,
} from "./detect";
import { mountMerchOfferCard, unmountMerchOfferCard } from "./render";
import type { Passport } from "../../data/types";

export interface MerchOfferPageSignals {
  /** Хэштеги из описания видео (без '#', в нижнем регистре). */
  hashtags: string[];
}

export function readPageSignals(): MerchOfferPageSignals {
  const desc = document.querySelector<HTMLElement>('section[aria-label="описание видео"]');
  const tags: string[] = [];
  if (desc) {
    for (const el of desc.querySelectorAll("a, span, p, div")) {
      const text = el.textContent ?? "";
      const m = text.match(/#([\p{L}\p{N}_-]+)/gu);
      if (m) {
        for (const raw of m) tags.push(raw.replace(/^#/, "").toLowerCase());
      }
    }
  }
  return { hashtags: [...new Set(tags)] };
}

let observer: MutationObserver | null = null;
let mountedAnchor: HTMLElement | null = null;
let mountedSnapshot: { brandName: string | null; products: MerchProduct[] } | null = null;

/**
 * Определить, показывать ли мерч-блок, по паспорту и сигналам страницы.
 * @param passport привязанный паспорт (может быть дефолтным — тогда используем страницу).
 * @param title заголовок видео.
 * @param signals сигналы страницы (по умолчанию — из текущего DOM).
 */
export function evaluateMerchOffer(
  passport: Passport,
  title: string,
  signals: MerchOfferPageSignals = readPageSignals(),
): MerchContext {
  const products = collectMerchProducts(passport);
  return detectMerchContext({
    title,
    hashtags: signals.hashtags,
    domainType: passport.frontmatter.domain_type ?? null,
    products,
    brandName: merchBrandFor(passport),
  });
}

function restoreCard(): void {
  if (!mountedAnchor || !mountedAnchor.isConnected) return;
  const next = mountedAnchor.nextElementSibling;
  if (!next || !next.hasAttribute("data-rz-merch-offer")) {
    if (mountedSnapshot) {
      mountMerchOfferCard(mountedAnchor, mountedSnapshot.brandName, mountedSnapshot.products);
    }
  }
}

/**
 * Смонтировать оффер-блок после meta-row, если в видео есть товары.
 * Идемпотентно; наблюдает за перерисовкой контейнера (React SPA).
 */
export async function mountMerchOffer(
  passport: Passport,
  title: string,
  timeoutMs = 8000,
): Promise<boolean> {
  const ctx = evaluateMerchOffer(passport, title);
  if (!ctx.isMerch) return false;

  const anchor = await waitForMetaRow(timeoutMs);
  if (!anchor) return false;

  unmountMerchOfferCard(anchor);
  mountedAnchor = anchor;
  mountedSnapshot = { brandName: ctx.brandName, products: ctx.products };

  mountMerchOfferCard(anchor, ctx.brandName, ctx.products);

  observer?.disconnect();
  observer = new MutationObserver(() => restoreCard());
  observer.observe(anchor.parentElement ?? document.body, { childList: true, subtree: true });

  return true;
}

export function removeMerchOffer(): void {
  observer?.disconnect();
  observer = null;
  if (mountedAnchor) {
    unmountMerchOfferCard(mountedAnchor);
    mountedAnchor = null;
  }
  mountedSnapshot = null;
}
// = [M-EXTENSION][MERCH-OFFER][INDEX][END_BLOCK]