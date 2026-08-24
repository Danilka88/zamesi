// [M-EXTENSION][BIKE-SEARCH][DETECT][START_BLOCK]
// Детект поисковой страницы RUTUBE и выборка «вело-подборки» из реестра
// паспортов. Чистые функции — тестируются без DOM (зеркало gameOffer/detect).
import { PASSPORT_REGISTRY, type PassportRegistryEntry } from "../../data/registry";
import { collectMerchProducts, type MerchProduct } from "../merchOffer/detect";

/** Команда поиска, для которой показывается блок «Замеси: велосипеды». */
export const BIKE_QUERY_KEYWORDS = [
  "велосипед",
  "веловелосипед",
  "вело",
  "велик",
  "байк",
  "mtb",
  "горный велосипед",
  "хардтейл",
  "гравийный",
  "электровелосипед",
  "bike",
];

/** Поиск по запросу из URL/полей — «это про велосипеды». */
export function isBikeQuery(query: string): boolean {
  const q = (query ?? "").toLowerCase().trim();
  if (!q) return false;
  return BIKE_QUERY_KEYWORDS.some((k) => q.includes(k));
}

/** Извлечение query из URL `/search/?query=...` (локализованный и кодированый). */
export function extractQueryFromUrl(url: string): string {
  const u = new URL(url, "https://rutube.ru");
  return u.searchParams.get("query") ?? "";
}

/** Извлечение query из хедера SPA (redux state / input). */
export function extractQueryFromHeader(): string {
  const input = document.querySelector<HTMLInputElement>(
    '.wdp-header-search-line-module__input, input[aria-label="Поиск"]'
  );
  return input?.value ?? "";
}

/** Демо-паспорт велосипедной подборки (3 VIDEO). */
export interface BikeSearchEntry {
  passportId: string;
  title: string;
  domainType: string;
  boundVideoId: string;
  /** Относительный путь к скриншоту в папке public/bike. */
  screenshot: string;
  /** Краткое описание видео для строки подборки. */
  blurb: string;
}

/** Список видео в демо-подборке «Велосипеды». */
export const BIKE_SEARCH_ENTRIES: BikeSearchEntry[] = [
  {
    passportId: "bike_dont_buy",
    title: "Не покупай велосипед, пока не посмотришь это видео",
    domainType: "how_to",
    boundVideoId: "1925a43e9479e500654b611eb8009072",
    screenshot: "bike_dont_buy.png",
    blurb: "Гайд по выбору первого велосипеда: классы, статистика 4000 человек, 5 ошибок",
  },
  {
    passportId: "bike_top_april",
    title: "ТОП велосипедов АПРЕЛЬ 2025: Hagen, Aspect, Welt, Rush Hour",
    domainType: "review",
    boundVideoId: "555c960ce50ecde6170c6560e3ac8888",
    screenshot: "bike_top_april.png",
    blurb: "Топ-4 модели от 30 до 160 000: Hagen HG10, Welt G10, Aspect Allroad, Rush Hour",
  },
  {
    passportId: "bike_mtb_80k",
    title: "Горный ВЕЛОСИПЕД за 80000р в 2025. Как НЕ купить ХЛАМ?",
    domainType: "review",
    boundVideoId: "7acf946b872b1f304345c7ca8b249f21",
    screenshot: "bike_mtb_80k.png",
    blurb: "Эксперт-чеклист: рама, вилка Suntour, трансмиссия Shimano, тормоза MT200",
  },
];

/** Найти паспорт велосипедной подборки по id. */
export function findBikeEntryById(id: string): BikeSearchEntry | undefined {
  return BIKE_SEARCH_ENTRIES.find((e) => e.passportId === id);
}

/** video_id подборки по passportId (для тайм-код-ссылок). */
export function videoIdForPassport(passportId: string): string {
  return findBikeEntryById(passportId)?.boundVideoId ?? "";
}

/** Фрагмент видео для «пути зрителя» (кликабельный тайм-код). */
export interface BikeJourneyClip {
  /** id паспорта из подборки (bike_dont_buy / bike_top_april / bike_mtb_80k). */
  passportId: string;
  /** Короткое название фрагмента. */
  title: string;
  startSec: number;
  endSec: number;
}

/** Ступень «пути зрителя»: вопрос новичка → фрагменты-ответы. */
export interface BikeJourneyStage {
  /** Номер ступени (1..3). */
  level: number;
  /** Гуманитарный лейбл уровня. */
  levelLabel: string;
  /** Вопрос пользователя, на который отвечает ступень. */
  question: string;
  /** Клипы из разных видео, которые «миксуются» в этой ступени. */
  clips: BikeJourneyClip[];
}

/**
 * Курируемый «путь новичка → профи» для демонстрации миксирования.
 * Тайм-коды взяты из реальных паспортов (raw_timeline_segments).
 */
export const BIKE_JOURNEY_STAGES: BikeJourneyStage[] = [
  {
    level: 1,
    levelLabel: "Новичок",
    question: "Какой класс велосипеда мне подходит?",
    clips: [
      { passportId: "bike_dont_buy", title: "Хардтейл XC — универсальный (Aspect AMP DC)", startSec: 303, endSec: 430 },
      { passportId: "bike_dont_buy", title: "Gravel — для смешанной езды (Aspect Allroad Pro)", startSec: 470, endSec: 560 },
    ],
  },
  {
    level: 2,
    levelLabel: "Продвинутый",
    question: "Сколько стоит хороший велосипед?",
    clips: [
      { passportId: "bike_top_april", title: "Hagen HG10 — городской универсал за 91 000", startSec: 22, endSec: 66 },
      { passportId: "bike_top_april", title: "Aspect Allroad Elite 1x11 — 160 000", startSec: 156, endSec: 215 },
      { passportId: "bike_top_april", title: "Rush Hour — фитнес-МТВ за 30 000", startSec: 215, endSec: 265 },
    ],
  },
  {
    level: 3,
    levelLabel: "Профи",
    question: "Как не купить «хлам» за 80 000?",
    clips: [
      { passportId: "bike_mtb_80k", title: "Рама: алюминий 601, конусный стакан", startSec: 268, endSec: 340 },
      { passportId: "bike_mtb_80k", title: "Вилка: Suntour или китайская воздушная", startSec: 410, endSec: 460 },
      { passportId: "bike_mtb_80k", title: "Тормоза: гидравлика Shimano MT200", startSec: 724, endSec: 770 },
      { passportId: "bike_mtb_80k", title: "Итог: 80 000 — балансный байк, а не хлам", startSec: 835, endSec: 866 },
    ],
  },
];

/** Зарегистрированный entry паспорта (для получения Passport и монетизации). */
export function registryEntryFor(passportId: string): PassportRegistryEntry | undefined {
  return PASSPORT_REGISTRY.find((e) => e.id === passportId);
}

/** Товары подборки: ecom-метки со всех 3 паспортов, отсортированные, до limit. */
export function collectBikeProducts(limit = 9): MerchProduct[] {
  const seen = new Set<string>();
  const products: MerchProduct[] = [];
  for (const entry of BIKE_SEARCH_ENTRIES) {
    const reg = registryEntryFor(entry.passportId);
    if (!reg) continue;
    for (const p of collectMerchProducts(reg.passport, 12)) {
      const key = p.query.toLowerCase().replace(/\s+/g, " ").trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      products.push(p);
    }
  }
  products.sort((a, b) => b.confidence - a.confidence);
  return products.slice(0, limit);
}
// = [M-EXTENSION][BIKE-SEARCH][DETECT][END_BLOCK]