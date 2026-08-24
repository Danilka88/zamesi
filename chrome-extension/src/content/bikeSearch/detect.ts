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