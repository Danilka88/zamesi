// [M-EXTENSION][INDEX][START_BLOCK]
// Entry content-script: детект видео-страницы, извлечение video_id, подбор
// паспорта (binding), загрузка данных (DataProvider), монтаж Shadow DOM и
// запуск ModesController (A-C003-01/04/06). Слушает сообщения popup для
// ручной привязки паспорта (A-C003-04).
import { DemoDataProvider, computeMetrics } from "./data/demo";
import { resolveBindingDetailed } from "./data/bindings";
import { PASSPORT_REGISTRY, getPassportById } from "../data/registry";
import type { Passport } from "../data/types";
import { mountHost, type ExtensionHost } from "./shadow";
import { waitForPlayer, type PlayerHandle } from "./rutube";
import { ModesController } from "./modes";

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
  const videoId = parseVideoId(location.href);
  if (!videoId) return; // не видео-страница — не монтируемся

  const title = pageTitle();
  const binding = resolveBindingDetailed(videoId, title);

  const provider = new DemoDataProvider();
  const res = await provider.load(videoId);

  // Гарантируем паспорт для UI: если провайдер не вернул — привязанный/первый
  const passport: Passport =
    res.passport ?? binding.entry?.passport ?? PASSPORT_REGISTRY[0].passport;

  hostRef = mountHost();
  playerRef = await waitForPlayer();

  const metrics = res.metrics ?? computeMetrics(passport);
  controller = new ModesController(hostRef, playerRef, { passport, metrics });
  controller.render();

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
      controller = new ModesController(hostRef, playerRef!, {
        passport,
        metrics: computeMetrics(passport),
      });
      controller.render();
      hostRef.host.dataset.rzPassport = passport.frontmatter.domain_type ?? "unknown";
    }
  }
});

void main();
// = [M-EXTENSION][INDEX][EXIT]