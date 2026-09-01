// [M-EXTENSION][INDEX][START_BLOCK]
// Entry content-script: детект видео-страницы, извлечение video_id, подбор
// паспорта (binding), загрузка данных (DataProvider), монтаж Shadow DOM и
// запуск ModesController (A-C003-01/04/06). Слушает сообщения popup для
// ручной привязки паспорта (A-C003-04).
import { DemoDataProvider, computeMetrics } from "./data/demo";
import { resolveBindingDetailed } from "./data/bindings";
import { getPassportById, getDefaultPassport } from "../data/registry";
import type { Passport } from "../data/types";
import { mountHost, type ExtensionHost } from "./shadow";
import { waitForPlayer, waitForSidebar, type PlayerHandle } from "./rutube";
import { ModesController } from "./modes";
import { mountGameOffer } from "./gameOffer";
import { mountTravelOffer } from "./travelOffer";
import { mountMerchOffer } from "./merchOffer";
import { mountBikeSearch } from "./bikeSearch";
import { mountComments } from "./comments";

export function parseVideoId(url: string): string | null {
  const m = url.match(/rutube\.ru\/video\/([a-f0-9]+)\/?/);
  return m ? m[1] : null;
}

export function isVideoPage(url: string): boolean {
  return /rutube\.ru\/video\/[a-f0-9]+/.test(url);
}

export function pageTitle(): string {
  const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content;
  if (og) return og;
  const h1 = document.querySelector<HTMLElement>("h1")?.textContent ?? "";
  if (h1) return h1;
  return document.title;
}

let controller: ModesController | null = null;
let hostRef: ExtensionHost | null = null;
let playerRef: PlayerHandle | null = null;

async function main(): Promise<void> {
  console.log("[M-EXTENSION] injected");

  // Страница поиска: показываем микс-блок «Велосипеды» (без видео-панелей).
  if (/rutube\.ru\/search\/?/.test(location.href)) {
    void mountBikeSearch();
    return;
  }

  const videoId = parseVideoId(location.href);
  if (!videoId) return; // не видео-страница — не монтируемся
  console.log("[M-EXTENSION] videoId:", videoId);

  const title = pageTitle();
  const binding = resolveBindingDetailed(videoId, title);
  console.log("[M-EXTENSION] binding:", binding.method, binding.entry?.id ?? "none");

  const provider = new DemoDataProvider();
  const res = await provider.load(videoId);

  // Гарантируем паспорт для UI: приоритет у привязки (video_id/заголовок),
  // затем провайдер, затем дефолтный паспорт как крайний фолбэк.
  const passport: Passport =
    binding.entry?.passport ?? res.passport ?? getDefaultPassport();

  const sidebar = await waitForSidebar();
  hostRef = mountHost(sidebar ?? document.body, { fixed: sidebar === null });
  console.log("[M-EXTENSION] sidebar:", sidebar ? "found" : "fallback overlay");
  playerRef = await waitForPlayer();
  console.log("[M-EXTENSION] player:", playerRef.video ? "found" : "null");

  const metrics = res.metrics ?? computeMetrics(passport);
  controller = new ModesController(hostRef, playerRef, { passport, metrics, title, videoId });
  controller.render();

  // Оффер-блоки после section[aria-label="информация о видео"] — взаимоисключающе:
  // первая успешно смонтированная карточка выигрывает. Порядок: игра → тревел →
  // товары/мерч (мерч срабатывает на видео с ecom/artist_merch метками).
  const offerMounts: Array<(p: Passport, t: string) => Promise<boolean>> = [
    mountGameOffer,
    mountTravelOffer,
    mountMerchOffer,
  ];
  void (async () => {
    for (const mount of offerMounts) {
      if (await mount(passport, title)) break;
    }
  })();

  // Умные комментарии: ИИ-бейджи/сводка/ответы по паспорту (демо, без сети).
  void mountComments(passport, title, playerRef, videoId);

  // :: Метаданные хоста для E2E/смоук
  hostRef.host.dataset.rzVideoId = videoId;
  hostRef.host.dataset.rzBinding = binding.method;
  hostRef.host.dataset.rzPassport = passport.frontmatter.domain_type ?? "unknown";
}

// Ручная привязка из popup (A-C003-04) — обновляем паспорт поверх текущего хоста.
chrome.runtime.onMessage?.addListener((msg: unknown) => {
  const m = msg as { type?: string; id?: string };
  if (m.type === "rz-set-binding" && m.id) {
    const passport = getPassportById(m.id);
    if (passport && controller && hostRef) {
      console.log("[M-EXTENSION] binding: manual", m.id);
      controller = new ModesController(hostRef, playerRef!, {
        passport,
        metrics: computeMetrics(passport),
        title: pageTitle(),
        videoId: parseVideoId(location.href) ?? "",
      }, controller.current);
      controller.render();
      hostRef.host.dataset.rzPassport = passport.frontmatter.domain_type ?? "unknown";
    }
  }
});

void main();
// = [M-EXTENSION][INDEX][EXIT]