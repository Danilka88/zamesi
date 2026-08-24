// [M-EXTENSION][REGISTRY][START_BLOCK]
// Реестр демо-паспортов + привязки к реальным video_id RUTUBE. Архитектура готова
// к добавлению новых паспортов под конкретные видео без переделки UI.
import type { Passport } from "./types";
// Внутренние video_id демо-данных остаются в паспортах; реальная привязка —
// через boundVideoId в реестре.
import diyFrame from "./passports/diy_frame.json" with { type: "json" };
import techReview from "./passports/tech_review.json" with { type: "json" };
import movieReview from "./passports/movie_review.json" with { type: "json" };
import cookingDinner from "./passports/cooking_dinner.json" with { type: "json" };
import iphone50kWylsacom from "./passports/iphone_50k_wylsacom.json" with { type: "json" };
import atomicHeartReview from "./passports/atomic_heart_review.json" with { type: "json" };
import vietnamNhaTrang from "./passports/vietnam_nha_trang.json" with { type: "json" };
import bikeDontBuy from "./passports/bike_dont_buy.json" with { type: "json" };
import bikeTopApril from "./passports/bike_top_april.json" with { type: "json" };
import bikeMtb80k from "./passports/bike_mtb_80k.json" with { type: "json" };

export interface PassportRegistryEntry {
  id: string;
  title: string;
  domainType: string;
  keywords: string[];
  /** Реальный video_id RUTUBE, к которому привязан паспорт (для демо на живой площадке). */
  boundVideoId?: string;
  passport: Passport;
}

const passports: Record<string, Passport> = {
  diy_frame: diyFrame as unknown as Passport,
  tech_review: techReview as unknown as Passport,
  movie_review: movieReview as unknown as Passport,
  cooking_dinner: cookingDinner as unknown as Passport,
  iphone_50k_wylsacom: iphone50kWylsacom as unknown as Passport,
  atomic_heart_review: atomicHeartReview as unknown as Passport,
  vietnam_nha_trang: vietnamNhaTrang as unknown as Passport,
  bike_dont_buy: bikeDontBuy as unknown as Passport,
  bike_top_april: bikeTopApril as unknown as Passport,
  bike_mtb_80k: bikeMtb80k as unknown as Passport,
};

export const PASSPORT_REGISTRY: PassportRegistryEntry[] = [
  {
    id: "tech_review",
    title: "Обзор техники (наушники)",
    domainType: "tech_review",
    keywords: ["iphone", "наушник", "смартфон", "обзор", "выбрать", "гаджет", "рублей"],
    passport: passports.tech_review,
  },
  {
    id: "iphone_50k_wylsacom",
    title: "Какой iPhone выбрать за 50 000 ₽ (Wylsacom)",
    domainType: "tech_review",
    keywords: ["iphone", "выбрать", "50 000", "смартфон", "рублей", "wylsacom", "айфон"],
    boundVideoId: "2013f4eba6ade7b01582fb411f9e901a",
    passport: passports.iphone_50k_wylsacom,
  },
  {
    id: "diy_frame",
    title: "DIY / мастер-класс",
    domainType: "diy_frame",
    keywords: ["своими руками", "мастер-класс", "поделка", "собрать", "инструмент"],
    passport: passports.diy_frame,
  },
  {
    id: "movie_review",
    title: "Обзор фильма",
    domainType: "movie_review",
    keywords: ["фильм", "кино", "обзор фильма", "трейлер"],
    passport: passports.movie_review,
  },
  {
    id: "cooking_dinner",
    title: "Кулинарный рецепт",
    domainType: "cooking_dinner",
    keywords: ["рецепт", "приготовить", "ужин", "кухня", "блюдо", "готовим"],
    passport: passports.cooking_dinner,
  },
  {
    id: "atomic_heart_review",
    title: "Обзор Atomic Heart (StopGame)",
    domainType: "game_review",
    keywords: [
      "atomic heart",
      "атомное сердце",
      "обзор игры",
      "манфиш",
      "мандафиш",
      "stopgame",
      "стопгейм",
      "шутер",
      "багратуньо",
    ],
    boundVideoId: "aceaa503bdb8c200278f94dd3deaf7f5",
    passport: passports.atomic_heart_review,
  },
  {
    id: "vietnam_nha_trang",
    title: "Вьетнам: жизнь в Нячанге",
    domainType: "travel_vlog",
    keywords: [
      "вьетнам",
      "нячанг",
      "переезд",
      "релокация",
      "зимовка",
      "стоимость жизни",
      "аренда",
      "цены",
      "экскурсия",
      "тур",
      "донг",
    ],
    boundVideoId: "7130901c1c9147f239190def16eb741c",
    passport: passports.vietnam_nha_trang,
  },
  {
    id: "bike_dont_buy",
    title: "Не покупай велосипед, пока не посмотришь это видео",
    domainType: "how_to",
    keywords: [
      "велосипед",
      "вело",
      "велик",
      "байк",
      "не покупай",
      "первый велосипед",
      "классы",
      "как выбрать",
      "велософ",
      "горный велосипед",
      "хардтейл",
    ],
    boundVideoId: "1925a43e9479e500654b611eb8009072",
    passport: passports.bike_dont_buy,
  },
  {
    id: "bike_top_april",
    title: "ТОП велосипедов АПРЕЛЬ 2025: Hagen, Aspect, Welt, Rush Hour",
    domainType: "review",
    keywords: [
      "велосипед",
      "топ велосипедов",
      "hagen",
      "aspect",
      "welt",
      "rush hour",
      "велотоп",
      "апрель",
      "жиджер",
      "вело",
    ],
    boundVideoId: "555c960ce50ecde6170c6560e3ac8888",
    passport: passports.bike_top_april,
  },
  {
    id: "bike_mtb_80k",
    title: "Горный ВЕЛОСИПЕД за 80000р в 2025. Как НЕ купить ХЛАМ?",
    domainType: "review",
    keywords: [
      "велосипед",
      "горный велосипед",
      "80000",
      "80 000",
      "mtb",
      "хардтейл",
      "как не купить",
      "хлам",
      "чест-лист",
      "выбрать горный",
    ],
    boundVideoId: "7acf946b872b1f304345c7ca8b249f21",
    passport: passports.bike_mtb_80k,
  },
];

export function getPassportById(id: string): Passport | undefined {
  return PASSPORT_REGISTRY.find((e) => e.id === id)?.passport;
}

/** Дефолтный паспорт расширения — используется, если привязка/провайдер не нашли ничего. */
export const DEFAULT_PASSPORT_ID = "iphone_50k_wylsacom";

export function getDefaultPassport(): Passport {
  return getPassportById(DEFAULT_PASSPORT_ID) ?? PASSPORT_REGISTRY[0].passport;
}

export function normalizeDomainType(domainType: string): string {
  const byDomain = PASSPORT_REGISTRY.find((e) => e.domainType === domainType);
  return byDomain ? byDomain.id : domainType;
}
// = [M-EXTENSION][REGISTRY][END_BLOCK]