// [M-EXTENSION][TRAVEL-OFFER][INDEX][START_BLOCK]
// Оркестрация оффер-блока: ждёт появления meta-row (React SPA монтирует его
// клиентски), детектит «тревел-видео» по сигналам страницы и паспорта, вставляет
// карточку «билеты» после section[aria-label="информация о видео"]. SPA может
// перерисовать контейнер и вычистить карточку — наблюдаем и перевставляем
// (паттерн shadow.ts / gameOffer).
import { waitForMetaRow } from "../rutube";
import { detectTravelContext, type TravelContext } from "./detect";
import { mountTravelOfferCard, unmountTravelOfferCard } from "./render";
import type { Passport } from "../../data/types";

export interface TravelOfferPageSignals {
  /** meta[property="ya:ovs:category"] контент. */
  metaCategory: string | null;
  /** Хэштеги из описания видео (без '#', в нижнем регистре). */
  hashtags: string[];
}

export function readPageSignals(): TravelOfferPageSignals {
  const meta = document.querySelector<HTMLMetaElement>('meta[property="ya:ovs:category"]');
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
  return { metaCategory: meta?.content ?? null, hashtags: [...new Set(tags)] };
}

let observer: MutationObserver | null = null;
let mountedAnchor: HTMLElement | null = null;
let mountedTitle = "";

/**
 * Определить, тревел-ли видео, по паспорту и сигналам страницы.
 * @param passport привязанный паспорт (может быть дефолтным — тогда используем страницу).
 * @param title заголовок видео.
 * @param signals сигналы страницы (по умолчанию — из текущего DOM).
 */
export function evaluateTravelOffer(
  passport: Passport,
  title: string,
  signals: TravelOfferPageSignals = readPageSignals(),
): TravelContext {
  return detectTravelContext({
    title,
    metaCategory: signals.metaCategory,
    hashtags: signals.hashtags,
    domainType: passport.frontmatter.domain_type,
  });
}

function restoreCard(): void {
  if (!mountedAnchor || !mountedAnchor.isConnected) return;
  const next = mountedAnchor.nextElementSibling;
  if (!next || !next.hasAttribute("data-rz-travel-offer")) {
    const ctx = detectTravelContext({
      title: mountedTitle,
      metaCategory: readPageSignals().metaCategory,
      hashtags: readPageSignals().hashtags,
      domainType: null,
    });
    if (ctx.isTravel && ctx.destination) {
      mountTravelOfferCard(mountedAnchor, ctx.destination);
    }
  }
}

/**
 * Смонтировать оффер-блок после meta-row, если видео тревел.
 * Идемпотентно; наблюдает за перерисовкой контейнера (React SPA).
 */
export async function mountTravelOffer(
  passport: Passport,
  title: string,
  timeoutMs = 8000,
): Promise<boolean> {
  const ctx = evaluateTravelOffer(passport, title);
  if (!ctx.isTravel || !ctx.destination) return false;

  const anchor = await waitForMetaRow(timeoutMs);
  if (!anchor) return false;

  unmountTravelOfferCard(anchor);
  mountedAnchor = anchor;
  mountedTitle = title;

  mountTravelOfferCard(anchor, ctx.destination);

  observer?.disconnect();
  observer = new MutationObserver(() => restoreCard());
  observer.observe(anchor.parentElement ?? document.body, { childList: true, subtree: true });

  return true;
}

export function removeTravelOffer(): void {
  observer?.disconnect();
  observer = null;
  if (mountedAnchor) {
    unmountTravelOfferCard(mountedAnchor);
    mountedAnchor = null;
  }
  mountedTitle = "";
}
// = [M-EXTENSION][TRAVEL-OFFER][INDEX][END_BLOCK]
