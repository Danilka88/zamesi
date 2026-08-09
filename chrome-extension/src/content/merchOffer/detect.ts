// [M-EXTENSION][MERCH-OFFER][DETECT][START_BLOCK]
// Детект «видео с товарами» + извлечение товаров из паспорта (ecom_item /
// artist_merch) и бренда мерча (celebrity_voice / domain_type). Чистые функции —
// тестируются без DOM. Зеркало travelOffer/detect.ts и gameOffer/detect.ts.
import type { Passport } from "../../data/types";

export type MerchSource = "passport" | "page" | null;

/** Товар, показанный в оффер-блоке. */
export interface MerchProduct {
  /** Отображаемое имя товара (например «iPhone 16e»). */
  label: string;
  /** Иконка-эмодзи для плитки. */
  icon: string;
  /** raw search_query из паспорта (для покупательского намерения). */
  query: string;
  /** Тип метки, из которой извлечён товар. */
  type: "ecom_item" | "artist_merch";
  /** confidence из паспорта — используется для сортировки. */
  confidence: number;
}

export interface MerchContextInput {
  /** Заголовок видео (og:title / h1 / document.title). */
  title: string;
  /** Хэштеги из описания видео, без '#', в нижнем регистре. */
  hashtags: string[];
  /** domain_type из привязанного паспорта (например "tech_review"). */
  domainType: string | null;
  /** Локально извлечённые товары из паспорта (если паспорт привязан). */
  products: MerchProduct[];
  /** Бренд мерча из паспорта (например «Wylsacom»). */
  brandName: string | null;
}

export interface MerchContext {
  isMerch: boolean;
  /** Товары видео (уже дедуплицированные, до limit). */
  products: MerchProduct[];
  /** Бренд для шапки карточки. */
  brandName: string | null;
  source: MerchSource;
}

/** Типы меток, считающиеся «товаром». */
export const PRODUCT_MONETIZATION_TYPES: ReadonlyArray<"ecom_item" | "artist_merch"> = [
  "ecom_item",
  "artist_merch",
];

/** Хэштеги-маркеры видео с товарами/мерчем (в нижнем регистре). */
export const MERCH_HASHTAGS = [
  "мерч",
  "товар",
  "товары",
  "обзор",
  "обзор товара",
  "распаковка",
  "гаджет",
  "покупка",
];

/** Домены, для которых блок уместен даже без готовых ecom-меток (fallback). */
export const MERCH_FALLBACK_DOMAINS = [
  "tech_review",
  "review",
  "how_to",
  "diy",
  "diy_crafts",
  "cooking_dinner",
];

/** Ключевое слово → иконка товара (в нижнем регистре; первый матч выигрывает). */
export const PRODUCT_ICON_RULES: ReadonlyArray<{ match: string; icon: string }> = [
  { match: "iphone", icon: "📱" },
  { match: "айфон", icon: "📱" },
  { match: "смартфон", icon: "📱" },
  { match: "телефон", icon: "📱" },
  { match: "наушник", icon: "🎧" },
  { match: "airpods", icon: "🎧" },
  { match: "стекло", icon: "🛡️" },
  { match: "чехол", icon: "🧢" },
  { match: "кейс", icon: "🧢" },
  { match: "заряд", icon: "🔌" },
  { match: "кабель", icon: "🔌" },
  { match: "icloud", icon: "☁️" },
  { match: "колонк", icon: "🔊" },
  { match: "умные часы", icon: "⌚" },
  { match: "гаджет", icon: "🛍️" },
  { match: "аксессуар", icon: "🧰" },
  { match: "футболк", icon: "👕" },
  { match: "худи", icon: "🧥" },
  { match: "кепк", icon: "🧢" },
  { match: "кружк", icon: "☕" },
];

/** Иконка по умолчанию для товаров без явного правила. */
export const PRODUCT_DEFAULT_ICON = "🛍️";

/**
 * Подобрать иконку товара по его имени (нижний регистр). Первый матч правила
 * выигрывает; без совпадений — PRODUCT_DEFAULT_ICON.
 */
export function productIconFor(label: string): string {
  const lower = label.toLowerCase();
  for (const rule of PRODUCT_ICON_RULES) {
    if (lower.includes(rule.match)) return rule.icon;
  }
  return PRODUCT_DEFAULT_ICON;
}

/** Срезать «хвосты покупки» из search_query при формировании имени товара. */
const PURCHASE_SUFFIXES = [
  /купить\s*$/iu,
  /купить\s+в\s+[а-яё0-9\s-]+$/iu,
  /заказать\s*$/iu,
  /цены\s*$/iu,
  /тариф\s*$/iu,
  /оригинал\s*$/iu,
  /рейтинг\s*$/iu,
  /для\s+(?:какого-то|старых|чтобы|покупать).*$/iu,
];

function cleanProductLabel(query: string): string {
  let label = query.trim();
  if (!label) return label;
  for (const re of PURCHASE_SUFFIXES) {
    label = label.replace(re, "");
  }
  label = label.replace(/^защитное\s+стекло/i, "Стекло").trim();
  label = label.replace(/\s+/g, " ").trim();
  return label || query.trim();
}

/** Привести видимые имена товаров к человеческому виду («iPhone 16e» → «iPhone 16e» без хвостов). */
function friendlyLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Собрать товары из паспорта: метки ecom_item/artist_merch из всех сцен.
 * Дедупликация по нижнему регистру search_query; сортировка по confidence
 * (выше — раньше). Лимит limit сверху.
 */
export function collectMerchProducts(passport: Passport, limit = 6): MerchProduct[] {
  const seen = new Set<string>();
  const products: MerchProduct[] = [];
  for (const scene of passport.timeline) {
    for (const m of scene.monetization ?? []) {
      const t = m.type;
      if (t !== "ecom_item" && t !== "artist_merch") continue;
      const query = m.search_query ?? scene.scene_summary ?? "";
      const key = query.toLowerCase().replace(/\s+/g, " ").trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      products.push({
        label: friendlyLabel(cleanProductLabel(query)),
        icon: productIconFor(query),
        query,
        type: t,
        confidence: m.confidence ?? 0,
      });
    }
  }
  products.sort((a, b) => b.confidence - a.confidence);
  return products.slice(0, limit);
}

/** Словарь имён-заглушек для шапки карточки по domain_type. */
const BRAND_FALLBACK_BY_DOMAIN: Record<string, string> = {
  tech_review: "Обзор техники",
  review: "Обзор",
  how_to: "Гайд",
  diy: "Сделай сам",
  diy_crafts: "Поделки",
  cooking_dinner: "Кулинария",
  game_review: "Гейминг",
};

/** Бренд мерча из celebrity_voice: «Wylsacom (Валентин Петухов)» → «Wylsacom». */
export function merchBrandFor(passport: Passport): string | null {
  const cv = passport.celebrity_voice;
  if (cv?.name) {
    const name = cv.name.trim();
    const paren = name.match(/^([^()]+)\s*\(/u);
    return (paren ? paren[1] : name).trim() || null;
  }
  const domain = passport.frontmatter.domain_type;
  return domain ? BRAND_FALLBACK_BY_DOMAIN[domain] ?? null : null;
}

export function merchBrandForDomain(domainType: string | null): string | null {
  return domainType ? BRAND_FALLBACK_BY_DOMAIN[domainType] ?? null : null;
}

/**
 * Решает, показывать ли оффер-блок товаров. Приоритет: готовые товары из
 * паспорта (ecom_item/artist_merch). Fallback — домен и хэштеги (страница),
 * когда паспорт не дал товаров.
 */
export function detectMerchContext(input: MerchContextInput): MerchContext {
  const { domainType, hashtags, products } = input;
  if (products.length > 0) {
    return { isMerch: true, products, brandName: input.brandName, source: "passport" };
  }
  const isDomainMerch = domainType != null && MERCH_FALLBACK_DOMAINS.includes(domainType);
  const isHashtagMerch = hashtags.some((h) => MERCH_HASHTAGS.includes(h));
  const isPageMerch = isDomainMerch || isHashtagMerch;
  if (!isPageMerch) {
    return { isMerch: false, products: [], brandName: null, source: null };
  }
  return {
    isMerch: true,
    products,
    brandName: input.brandName ?? merchBrandForDomain(domainType),
    source: "page",
  };
}
// = [M-EXTENSION][MERCH-OFFER][DETECT][END_BLOCK]