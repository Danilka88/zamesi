// [M-EXTENSION][GAME-OFFER][DETECT][START_BLOCK]
// Детект «видео о компьютерной игре» по сигналам страницы RUTUBE (NFR-6, без сети)
// + извлечение названия игры из заголовка. Чистые функции — тестируются без DOM.
export type GameSource = "passport" | "page" | null;

export interface GameContextInput {
  /** Заголовок видео (og:title / h1 / document.title). */
  title: string;
  /** Значение meta[property="ya:ovs:category"] (RUTUBE ставит «Видеоигры»). */
  metaCategory: string | null;
  /** Хэштеги из описания видео, без '#', в нижнем регистре. */
  hashtags: string[];
  /** domain_type из привязанного паспорта (например "game_review"). */
  domainType: string | null;
}

export interface GameContext {
  isGame: boolean;
  gameName: string | null;
  source: GameSource;
}

/** Категории RUTUBE, которые считаем игровыми (в нижнем регистре). */
const GAME_CATEGORIES = ["видеоигры", "игры", "гейминг"];

/** Хэштеги-маркеры игрового видео (в нижнем регистре). */
const GAME_HASHTAGS = [
  "шутер",
  "шутеры",
  "игра",
  "игры",
  "геймплей",
  "гейминг",
  "обзор",
  "обзор игры",
  "трейлер",
  "киберспорт",
  "симулятор",
  "стрим",
];

/** Приставки заголовка, которые срезаем при извлечении названия игры. */
const TITLE_PREFIXES = [
  "обзор игры ",
  "обзор ",
  "прохождение ",
  "геймплей ",
  "трейлер ",
  "летсплей ",
  "стрим по ",
  "играем в ",
  "игра ",
];

/** Суффиксы, которые отрезаем от заголовка. */
const TITLE_SUFFIXES = [
  /[—-]\s*смотреть видео.*$/iu,
  /\s*[|·]\s*(rutube|смотреть|онлайн).*$/iu,
  /\s+полное видео.*$/iu,
];

export function isGameCategory(metaCategory: string | null): boolean {
  if (!metaCategory) return false;
  const c = metaCategory.toLowerCase();
  return GAME_CATEGORIES.some((g) => c.includes(g));
}

export function hasGameHashtags(hashtags: string[]): boolean {
  return hashtags.some((h) => GAME_HASHTAGS.includes(h));
}

/** Извлечь название игры из заголовка («Обзор Atomic Heart» → «Atomic Heart»). */
export function extractGameName(title: string): string | null {
  let t = title.trim();
  if (!t) return null;
  for (const suffix of TITLE_SUFFIXES) {
    t = t.replace(suffix, "");
  }
  t = t.trim();
  const lower = t.toLowerCase();
  for (const prefix of TITLE_PREFIXES) {
    if (lower.startsWith(prefix)) {
      t = t.slice(prefix.length).trim();
      break;
    }
  }
  // Обрезаем «— смотреть видео онлайн» и подобные хвосты ещё раз
  t = t.replace(/[—-]\s*смотреть.*$/iu, "").trim();
  return t || null;
}

/**
 * Решает, игровое ли видео, и если да — извлекает название игры.
 * Приоритет источника: паспорт (domain_type), затем категория страницы, затем хэштеги.
 */
export function detectGameContext(input: GameContextInput): GameContext {
  const { title, metaCategory, hashtags, domainType } = input;
  const isPassportGame = domainType === "game_review";
  const isCategoryGame = !isPassportGame && isGameCategory(metaCategory);
  const isHashtagGame = !isPassportGame && !isCategoryGame && hasGameHashtags(hashtags);

  const isGame = isPassportGame || isCategoryGame || isHashtagGame;
  if (!isGame) {
    return { isGame: false, gameName: null, source: null };
  }

  const source: GameSource = isPassportGame ? "passport" : "page";
  const gameName = extractGameName(title);
  return { isGame: gameName !== null, gameName, source };
}
// = [M-EXTENSION][GAME-OFFER][DETECT][END_BLOCK]
