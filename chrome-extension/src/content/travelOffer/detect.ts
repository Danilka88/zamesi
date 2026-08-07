// [M-EXTENSION][TRAVEL-OFFER][DETECT][START_BLOCK]
// Детект «тревел-видео» по сигналам страницы RUTUBE (NFR-6, без сети)
// + извлечение направления (города/страны) из заголовка. Чистые функции —
// тестируются без DOM. Зеркало gameOffer/detect.ts.
export type TravelSource = "passport" | "page" | null;

export interface TravelContextInput {
  /** Заголовок видео (og:title / h1 / document.title). */
  title: string;
  /** Значение meta[property="ya:ovs:category"] (RUTUBE ставит «Путешествия» и т.п.). */
  metaCategory: string | null;
  /** Хэштеги из описания видео, без '#', в нижнем регистре. */
  hashtags: string[];
  /** domain_type из привязанного паспорта (например "travel_vlog"). */
  domainType: string | null;
}

export interface TravelContext {
  isTravel: boolean;
  /** Направление (город/страна), например «Нячанг». */
  destination: string | null;
  source: TravelSource;
}

/** Категории RUTUBE, которые считаем тревел (в нижнем регистре). */
const TRAVEL_CATEGORIES = ["путешеств", "тревел", "туризм", "travel"];

/** Хэштеги-маркеры тревел-видео (в нижнем регистре). */
const TRAVEL_HASHTAGS = [
  "вьетнам",
  "нячанг",
  "путешествие",
  "путешествия",
  "тревел",
  "travel",
  "отпуск",
  "туризм",
  "зимовка",
  "переезд",
  "релокация",
  "экскурсия",
  "туры",
  "отдых",
];

/** Регулярки-паттерны «жизнь/отдых/переезд в <локация>» — самое конкретное указание направления. */
const LOCATION_PATTERN =
  /(?:жизнь|жить|стоимость\s+жизни|отдых|переезд|зимовка)\s+(?:в|во)\s+([а-яёА-ЯЁ][а-яёА-ЯЁ\s-]*)/i;

/**
 * Известные направления: ключ — основа слова в нижнем регистре (устойчивая к
 * русским падежам: «турц» матчит «Турция», «Турции», «Турцией»; «мальдив» —
 * «Мальдивы», «Мальдивах»), значение — отображаемое название. Сортировка по
 * длине ключа даёт приоритет более специфичному («индонези» > «инди»).
 */
export const TRAVEL_DESTINATION_MAP: Record<string, string> = {
  "турц": "Турция",
  "анталь": "Анталья",
  "шри-ланк": "Шри-Ланка",
  "вьетнам": "Вьетнам",
  "нячанг": "Нячанг",
  "индонези": "Индонезия",
  "филиппин": "Филиппины",
  "камбодж": "Камбоджа",
  "мальдив": "Мальдивы",
  "таиланд": "Таиланд",
  "тайланд": "Таиланд",
  "дубай": "Дубай",
  "инди": "Индия",
  "бали": "Бали",
  "гоа": "Гоа",
  "оаэ": "ОАЭ",
};

/** Поиск известного направления по тексту (нижний регистр). Длинный ключ — приоритет. */
function matchKnownDestination(lowerText: string): string | null {
  const keys = Object.keys(TRAVEL_DESTINATION_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lowerText.includes(key)) return TRAVEL_DESTINATION_MAP[key];
  }
  return null;
}

export function isTravelCategory(metaCategory: string | null): boolean {
  if (!metaCategory) return false;
  const c = metaCategory.toLowerCase();
  return TRAVEL_CATEGORIES.some((t) => c.includes(t));
}

export function hasTravelHashtags(hashtags: string[]): boolean {
  return hashtags.some((h) => TRAVEL_HASHTAGS.includes(h));
}

/**
 * Извлечь направление из заголовка: «Вьетнам: сколько стоит жить в Нячанге?» →
 * «Нячанг». Сначала конкретный паттерн «...в <локация>», затем словарь известных
 * направлений по всему заголовку.
 */
export function extractTravelDestination(title: string): string | null {
  const t = title.trim();
  if (!t) return null;

  const m = t.match(LOCATION_PATTERN);
  if (m) {
    const loc = m[1].replace(/[?,.!—:;].*$/u, "").trim().replace(/\s+/g, " ");
    if (loc) {
      const known = matchKnownDestination(loc.toLowerCase());
      return known ?? loc;
    }
  }

  return matchKnownDestination(t.toLowerCase());
}

/**
 * Решает, тревел-ли видео, и если да — извлекает направление.
 * Приоритет источника: паспорт (domain_type), затем категория страницы, затем хэштеги.
 */
export function detectTravelContext(input: TravelContextInput): TravelContext {
  const { title, metaCategory, hashtags, domainType } = input;
  const isPassportTravel = domainType === "travel_vlog";
  const isCategoryTravel = !isPassportTravel && isTravelCategory(metaCategory);
  const isHashtagTravel = !isPassportTravel && !isCategoryTravel && hasTravelHashtags(hashtags);

  const isTravel = isPassportTravel || isCategoryTravel || isHashtagTravel;
  if (!isTravel) {
    return { isTravel: false, destination: null, source: null };
  }

  const source: TravelSource = isPassportTravel ? "passport" : "page";
  const destination = extractTravelDestination(title);
  return { isTravel: destination !== null, destination, source };
}
// = [M-EXTENSION][TRAVEL-OFFER][DETECT][END_BLOCK]
