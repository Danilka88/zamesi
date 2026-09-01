// [M-EXTENSION][STUDIO][MAPPING][START_BLOCK]
// Чистые функции: паспорт → предложения для полей окна редактора RUTUBE Studio.
// Без DOM (тестируемо). Использует authorTools/generate для A/B-заголовков и
// описаний; категория/плейлисты/модерация/таймкоды считаются из паспорта.
import type { Passport } from "../data/types";
import {
  buildTitleVariants,
  buildDescriptionVariants,
  type TitleVariant,
  type DescriptionVariant,
} from "../content/authorTools/generate";
import { buildReferralBundle, type ReferralBundle } from "./referral";
import { buildPromotionBundle, type PromotionBundle } from "./promotion";
import { buildTrendsBundle, type TrendsBundle } from "./trends";

export interface PlaylistSuggestion {
  /** Исходный id из паспорта (auto_playlists). */
  id: string;
  /** Человекочитаемое имя для поиска в мультиселекте Studio. */
  name: string;
  reason: string;
}

export interface CategorySuggestion {
  /** Текст категории RUTUBE (вставляется в combobox для поиска). */
  label: string;
  reason: string;
}

export interface StudioSuggestions {
  title: TitleVariant[];
  descriptions: DescriptionVariant[];
  category: CategorySuggestion | null;
  playlists: PlaylistSuggestion[];
  /** Рекомендация по времени публикации. */
  publish: "now" | "delayed";
  /** 18+ (isAdult) из moderation.age_rating. */
  adult: boolean;
  /** withComments — выключить при rejected-вердикте модерации. */
  comments: boolean;
  /** Текстовый хинт для дисклеймеров при флагах модерации. */
  disclaimerHint: string | null;
  /** Таймкоды сцен для вставки в описание (mm:ss + текст). */
  chapters: string[];
  /** Как паспорт привязан (для UI). */
  binding: string;
  /** Реальный videoId видео — ключ детерминированных демо-ссылок/прогнозов (NFR-7). */
  videoId: string;
  /** Реферальный блок монетизации: товары → партнёрские ссылки 3 магазинов + прогноз. */
  referral: ReferralBundle;
  /** Продвижение видео: объявления для Яндекс Директ/VK/MyTarget + прогноз и бюджет. */
  promotion: PromotionBundle;
  /** Тренды и плейлисты: Wordstat-идеи, подборки, коллаборации. */
  trends: TrendsBundle;
}

/** domain_type → категория RUTUBE (основные, по демо-паспортам). */
const CATEGORY_BY_DOMAIN: Record<string, string> = {
  tech_review: "Наука и техника",
  diy_frame: "Сделай сам",
  movie_review: "Кино и сериалы",
  cooking_dinner: "Кулинария",
  game_review: "Видеоигры",
  travel_vlog: "Путешествия",
};

/** domain_type → пояснение для категории. */
const CATEGORY_REASON: Record<string, string> = {
  tech_review: "обзор техники → раздел «Наука и техника»",
  diy_frame: "DIY-мастер-класс → «Сделай сам»",
  movie_review: "разбор фильма → «Кино и сериалы»",
  cooking_dinner: "рецепт/ужин → «Кулинария»",
  game_review: "обзор игры → «Видеоигры»",
  travel_vlog: "тревел-влог → «Путешествия»",
};

export function fmtClock(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function suggestedCategory(passport: Passport): CategorySuggestion | null {
  const domain = passport.frontmatter.domain_type;
  const label = CATEGORY_BY_DOMAIN[domain];
  if (!label) return null;
  return { label, reason: CATEGORY_REASON[domain] ?? "по жанру видео (domain_type)" };
}

export function suggestedPlaylists(passport: Passport): PlaylistSuggestion[] {
  return (passport.frontmatter.auto_playlists ?? []).map((p) => ({
    id: p.id,
    name: p.id.replace(/[_-]+/g, " ").trim(),
    reason: p.reason,
  }));
}

/** Таймкоды сцен из ASR-сегментов (mm:ss + текст). */
export function chapterLines(passport: Passport, max = 8): string[] {
  const segs = passport.raw_timeline_segments ?? [];
  return segs
    .slice(0, max)
    .map((s) => `${fmtClock(s.start_sec)} ${s.text.trim()}`)
    .filter((l) => l.trim().length > 0);
}

export function publishRecommendation(passport: Passport): "now" | "delayed" {
  const mod = passport.frontmatter.moderation;
  if (mod && (mod.verdict === "rejected" || mod.verdict === "flagged")) return "delayed";
  return "now";
}

export function adultSuggestion(passport: Passport): boolean {
  return passport.frontmatter.moderation?.age_rating === "18+";
}

export function commentsSuggestion(passport: Passport): boolean {
  return passport.frontmatter.moderation?.verdict !== "rejected";
}

export function disclaimerHint(passport: Passport): string | null {
  const mod = passport.frontmatter.moderation;
  if (!mod) return null;
  if (mod.verdict === "rejected" || (mod.categories_flagged && mod.categories_flagged.length > 0)) {
    const cats = (mod.categories_flagged ?? []).join(", ") || "не указаны";
    return `Модерация: «${mod.verdict}», флаги: ${cats}. Проверьте дисклеймеры перед публикацией.`;
  }
  return null;
}

/** Собрать полный набор предложений для UI панели. */
export function buildStudioSuggestions(
  passport: Passport,
  nativeTitle: string,
  videoId: string,
): StudioSuggestions {
  const chapters = chapterLines(passport);
  const descriptions = buildDescriptionVariants(passport, videoId);
  // Добавляем таймкоды в варианты описания (первый — расширенный, остальные без).
  const withChapters = descriptions.length
    ? descriptions.map((d, i) =>
        i === 0 && chapters.length
          ? { ...d, text: `${d.text}\n\nТайм-коды:\n${chapters.join("\n")}`, chars: d.text.length + chapters.reduce((a, c) => a + c.length + 1, 0) + 16 }
          : d,
      )
    : descriptions;
  return {
    title: buildTitleVariants(passport, nativeTitle, videoId),
    descriptions: withChapters,
    category: suggestedCategory(passport),
    playlists: suggestedPlaylists(passport),
    publish: publishRecommendation(passport),
    adult: adultSuggestion(passport),
    comments: commentsSuggestion(passport),
    disclaimerHint: disclaimerHint(passport),
    chapters,
    binding: passport.frontmatter.domain_type || "unknown",
    videoId,
    referral: buildReferralBundle(passport, videoId),
    promotion: buildPromotionBundle(passport, videoId, `https://rutube.ru/video/${videoId}`),
    trends: buildTrendsBundle(passport, videoId),
  };
}
// = [M-EXTENSION][STUDIO][MAPPING][END_BLOCK]