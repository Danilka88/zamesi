// [M-EXTENSION][GAME-OFFER][INDEX][START_BLOCK]
// Оркестрация оффер-блока: ждёт появления meta-row (React SPA монтирует его
// клиентски), детектит «игровое видео» по сигналам страницы и паспорта, вставляет
// карточку после section[aria-label="информация о видео"]. SPA может перерисовать
// контейнер и вычистить карточку — наблюдаем и перевставляем (паттерн shadow.ts).
import { waitForMetaRow } from "../rutube";
import { detectGameContext, type GameContext } from "./detect";
import { mountGameOfferCard, unmountGameOfferCard } from "./render";
import type { Passport } from "../../data/types";

export interface GameOfferPageSignals {
  /** meta[property="ya:ovs:category"] контент. */
  metaCategory: string | null;
  /** Хэштеги из описания видео (без '#', в нижнем регистре). */
  hashtags: string[];
}

export function readPageSignals(): GameOfferPageSignals {
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
 * Определить, игровое ли видео, по паспорту и сигналам страницы.
 * @param passport привязанный паспорт (может быть дефолтным — тогда используем страницу).
 * @param title заголовок видео.
 * @param signals сигналы страницы (по умолчанию — из текущего DOM).
 */
export function evaluateGameOffer(
  passport: Passport,
  title: string,
  signals: GameOfferPageSignals = readPageSignals(),
): GameContext {
  return detectGameContext({
    title,
    metaCategory: signals.metaCategory,
    hashtags: signals.hashtags,
    domainType: passport.frontmatter.domain_type,
  });
}

function restoreCard(): void {
  if (!mountedAnchor || !mountedAnchor.isConnected) return;
  const next = mountedAnchor.nextElementSibling;
  if (!next || !next.hasAttribute("data-rz-game-offer")) {
    const ctx = detectGameContext({
      title: mountedTitle,
      metaCategory: readPageSignals().metaCategory,
      hashtags: readPageSignals().hashtags,
      domainType: null,
    });
    if (ctx.isGame && ctx.gameName) {
      mountGameOfferCard(mountedAnchor, ctx.gameName);
    }
  }
}

/**
 * Смонтировать оффер-блок после meta-row, если видео игровое.
 * Идемпотентно; наблюдает за перерисовкой контейнера (React SPA).
 */
export async function mountGameOffer(
  passport: Passport,
  title: string,
  timeoutMs = 8000,
): Promise<boolean> {
  const ctx = evaluateGameOffer(passport, title);
  if (!ctx.isGame || !ctx.gameName) return false;

  const anchor = await waitForMetaRow(timeoutMs);
  if (!anchor) return false;

  unmountGameOfferCard(anchor);
  mountedAnchor = anchor;
  mountedTitle = title;

  mountGameOfferCard(anchor, ctx.gameName);

  observer?.disconnect();
  observer = new MutationObserver(() => restoreCard());
  observer.observe(anchor.parentElement ?? document.body, { childList: true, subtree: true });

  return true;
}

export function removeGameOffer(): void {
  observer?.disconnect();
  observer = null;
  if (mountedAnchor) {
    unmountGameOfferCard(mountedAnchor);
    mountedAnchor = null;
  }
  mountedTitle = "";
}
// = [M-EXTENSION][GAME-OFFER][INDEX][END_BLOCK]
