// [M-EXTENSION][STUDIO][PROMOTION][START_BLOCK]
// Promotion block: video passport -> ready ad creatives for 3 platforms
// (Yandex Direct, VK Ads, MyTarget) + deterministic forecast and budget
// recommendation (NFR-7, offline). Pure functions.
import type { Passport } from "../data/types";
import { hashSeed, mulberry32 } from "../content/authorTools/charts";
import { resolvePassportKey } from "../content/authorTools/generate";
import { sceneStarts, videoDuration } from "../content/render/layout";

export type PromoPlatform = "rutube" | "yandex_direct" | "vk_ads" | "mytarget";

export interface PlatformMeta {
  label: string;
  icon: string;
  color: string;
  apiName: string;
  titleMax: number;
  textMax: number;
  utmSource: string;
}

export const PLATFORMS: Record<PromoPlatform, PlatformMeta> = {
  rutube: {
    label: "RUTUBE",
    icon: "▶️",
    color: "#E32636",
    apiName: "POST /pangolin/api/studio/promo",
    titleMax: 50,
    textMax: 120,
    utmSource: "rutube",
  },
  yandex_direct: {
    label: "Яндекс Директ",
    icon: "🟡",
    color: "#FC3F1D",
    apiName: "POST /json/v5/campaigns",
    titleMax: 33,
    textMax: 81,
    utmSource: "yandex",
  },
  vk_ads: {
    label: "VK Реклама",
    icon: "🔵",
    color: "#0077FF",
    apiName: "POST /ads.create",
    titleMax: 40,
    textMax: 90,
    utmSource: "vk",
  },
  mytarget: {
    label: "MyTarget",
    icon: "🟣",
    color: "#FF6B00",
    apiName: "POST /api/v2/campaigns.json",
    titleMax: 35,
    textMax: 80,
    utmSource: "mytarget",
  },
};

export const PLATFORM_ORDER: PromoPlatform[] = ["rutube", "yandex_direct", "vk_ads", "mytarget"];

export const DEFAULT_BUDGET = 1000;
export const BUDGET_MIN = 500;
export const BUDGET_MAX = 10000;

export interface AdVariant {
  id: string;
  title: string;
  text: string;
  cta: string;
  displayUrl: string;
}

export interface VideoCreative {
  thumbText: string;
  durationSec: number;
  thumbTimeSec: number;
}

export interface Targeting {
  age: string;
  interests: string[];
  geo: string;
}

export interface PlatformForecast {
  ctr: number;
  cpc: number;
  cpm: number;
  convRate: number;
  reach: number;
  clicks: number;
  cost: number;
  cpa: number;
}

export interface PromoCampaign {
  platform: PromoPlatform;
  variants: AdVariant[];
  targeting: Targeting;
  creative: VideoCreative;
  dailyBudget: number;
  activeBudget: number;
  forecast: PlatformForecast;
  status: "ready";
}

export interface PlatformShare {
  label: string;
  icon: string;
  color: string;
  budget: number;
  reach: number;
}

export interface PromotionTotals {
  dailyBudget: number;
  weekly: number;
  reach: number;
  clicks: number;
  avgCtr: number;
  recommended: number;
  recommendedReason: string;
  perPlatform: Record<PromoPlatform, PlatformShare>;
}

export interface PromotionBundle {
  campaigns: PromoCampaign[];
  totals: PromotionTotals;
  currency: "RUB";
  videoId: string;
  videoUrl: string;
}

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.round(v)));
const round1 = (v: number): number => Math.round(v * 10) / 10;
const round2 = (v: number): number => Math.round(v * 100) / 100;

/** Обрезать заголовок под лимит площадки (без половинчатого слова). */
function fitTitle(title: string, max: number): string {
  let t = title.trim();
  if (t.length <= max) return t;
  t = t.slice(0, max).trimEnd();
  const sp = t.lastIndexOf(" ");
  if (sp > max * 0.6) t = t.slice(0, sp);
  return t.slice(0, max).trimEnd() || title.slice(0, max).trimEnd();
}

/** Курируемые заголовки объявлений по домену (платформа → заголовок). */
const PROMO_TITLES: Record<string, Record<string, string>> = {
  tech_review: {
    default: "Обзор техники: что выбрать в 2026",
    rutube: "Топ техники 2026 — смотрите на RUTUBE",
    yandex_direct: "Топ техники 2026: честный обзор",
    vk_ads: "Смотрите свежий обзор техники",
    mytarget: "Обзор гаджетов 2026 за минуту",
  },
  iphone_50k_wylsacom: {
    default: "Какой iPhone купить за 50 000",
    rutube: "iPhone за 50 000 — честное сравнение на RUTUBE",
    yandex_direct: "iPhone за 50 000: какой выбрать",
    vk_ads: "Сравнение iPhone за 50 тысяч",
    mytarget: "Лучший iPhone до 60 000",
  },
  diy_frame: {
    default: "Поделка своими руками за 29 секунд",
    rutube: "Фоторамка за 29 сек — смотрите на RUTUBE",
    yandex_direct: "DIY: фоторамка за 29 секунд",
    vk_ads: "Мастер-класс: сделайте сами",
    mytarget: "Простая поделка для дома",
  },
  movie_review: {
    default: "Разбор фильма без спойлеров",
    rutube: "Эхо Будущего — разбор на RUTUBE",
    yandex_direct: "Стоит ли смотреть: разбор фильма",
    vk_ads: "Кинокритик о новинке — вердикт",
    mytarget: "Кино, которое обсуждают",
  },
  cooking_dinner: {
    default: "Ужин за 15 минут: простой рецепт",
    rutube: "Ужин за 15 минут — рецепт на RUTUBE",
    yandex_direct: "Ужин за 15 минут на каждый день",
    vk_ads: "Быстрый ужин из простых продуктов",
    mytarget: "Рецепт ужина за четверть часа",
  },
  atomic_heart_review: {
    default: "Atomic Heart в 2026: стоит ли играть",
    rutube: "Atomic Heart — честный разбор на RUTUBE",
    yandex_direct: "Atomic Heart: разбор в 2026",
    vk_ads: "Игра года? Полный обзор",
    mytarget: "Atomic Heart — что говорят",
  },
  vietnam_nha_trang: {
    default: "Жизнь в Нячанге: реальные цены",
    rutube: "Жизнь в Нячанге — честно на RUTUBE",
    yandex_direct: "Нячанг: сколько стоит жить",
    vk_ads: "Вьетнам 2026: цены из первых рук",
    mytarget: "Переезд в Азию — честные цифры",
  },
};

/** Заголовок для варианта: курируемый по домену/площадке, иначе seo_title. */
function titleFor(passport: Passport, platform: PromoPlatform, key: string | null): string {
  const curated = key ? PROMO_TITLES[key] ?? {} : {};
  const base =
    curated[platform] ??
    curated.default ??
    (passport.frontmatter.seo_title || "Смотрите видео");
  return fitTitle(base, PLATFORMS[platform].titleMax);
}

/** Ключ паспорта (id реестра) для курируемых креативов. */
function passportKey(passport: Passport, videoId: string): string | null {
  return resolvePassportKey(videoId, passport);
}

/** Текст объявления из сцен/тегов + CTA. Учитывает лимит площадки. */
function textFor(passport: Passport, platform: PromoPlatform): string {
  const scenes = passport.timeline.map((s) => s.scene_summary).filter(Boolean);
  const base = scenes.length
    ? scenes.slice(0, 2).join(". ")
    : (passport.frontmatter.seo_tags ?? []).slice(0, 3).join(", ");
  const suffix = " Смотрите на RUTUBE.";
  const max = PLATFORMS[platform].textMax;
  let t = base.trim();
  const maxT = max - suffix.length;
  if (t.length > maxT) {
    t = t.slice(0, maxT).trimEnd();
    const sp = t.lastIndexOf(" ");
    if (sp > maxT * 0.6) t = t.slice(0, sp);
    t = t.slice(0, maxT).trimEnd();
  }
  const out = `${t}${suffix}`;
  return out.slice(0, max);
}

/** Возрастная группа по домену. */
function ageFor(passport: Passport): string {
  switch (passport.frontmatter.domain_type) {
    case "cooking_dinner":
    case "diy_frame":
      return "25-44";
    case "movie_review":
    case "game_review":
      return "18-34";
    case "travel_vlog":
      return "25-45";
    case "tech_review":
    default:
      return "18-34";
  }
}

/** Интересы из target_audience (до 4 чипов). */
function interestsFor(passport: Passport): string[] {
  const audience = passport.frontmatter.target_audience ?? [];
  const map = new Map<string, string>([
    ["смартфон", "Гаджеты"],
    ["apple", "Гаджеты"],
    ["гик", "Гаджеты"],
    ["меломан", "Музыка"],
    ["аудиофил", "Музыка"],
    ["кухн", "Кулинария"],
    ["итал", "Кулинария"],
    ["рецепт", "Кулинария"],
    ["игр", "Видеоигры"],
    ["гейм", "Видеоигры"],
    ["путешеств", "Путешествия"],
    ["переезд", "Путешествия"],
    ["ази", "Путешествия"],
    ["фильм", "Кино"],
    ["кино", "Кино"],
    ["фото", "DIY"],
    ["рамк", "DIY"],
  ]);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of audience) {
    for (const [k, v] of map) {
      if (a.toLowerCase().includes(k) && !seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
    if (out.length >= 4) break;
  }
  if (!out.length) out.push("Широкий интерес");
  return out.slice(0, 4);
}

/** Ключевые фразы из ad_targeting_keywords (до 20, fallback на seo_tags). */
function keywordsFor(passport: Passport): string[] {
  const kw = (passport.frontmatter.ad_targeting_keywords ?? []).filter(Boolean);
  const fb = (passport.frontmatter.seo_tags ?? []).slice(0, 10);
  return (kw.length >= 3 ? kw : [...kw, ...fb]).slice(0, 20);
}

/** Детерминированный прогноз по площадке + дневному бюджету (NFR-7). */
export function forecastForPlatform(
  platform: PromoPlatform,
  videoId: string,
  dailyBudget: number,
): PlatformForecast {
  const rnd = mulberry32(hashSeed(`promo:${videoId}:${platform}`));
  if (platform === "rutube") {
    const ctr = round1(3 + rnd() * 7); // 3..10% (нативный выше)
    const cpc = round1(3 + rnd() * 12); // 3..15 RUB
    const cpm = round1(40 + rnd() * 140); // 40..180 RUB (дешевле внешних)
    const convRate = round2(1 + rnd() * 4); // 1..5%
    const reach = Math.round((dailyBudget / cpm) * 1000);
    const clicks = Math.round(reach * (ctr / 100));
    const cost = dailyBudget;
    const cpa = clicks > 0 ? Math.round(dailyBudget / (clicks * (convRate / 100))) : 0;
    return { ctr, cpc, cpm, convRate, reach, clicks, cost, cpa };
  }
  const ctr = round1(2 + rnd() * 6); // 2..8%
  const cpc = round1(5 + rnd() * 40); // 5..45 RUB
  const cpm = round1(80 + rnd() * 270); // 80..350 RUB
  const convRate = round2(0.5 + rnd() * 3.5); // 0.5..4%
  const reach = Math.round((dailyBudget / cpm) * 1000);
  const clicks = Math.round(reach * (ctr / 100));
  const cost = dailyBudget;
  const cpa = clicks > 0 ? Math.round(dailyBudget / (clicks * (convRate / 100))) : 0;
  return { ctr, cpc, cpm, convRate, reach, clicks, cost, cpa };
}

/** UTM-ссылка на видео с меткой площадки и варианта креатива. */
export function buildUTM(videoId: string, platform: PromoPlatform, variantId: string): string {
  const src = PLATFORMS[platform].utmSource;
  return `https://rutube.ru/video/${videoId}/?utm_source=${src}&utm_medium=cpc&utm_campaign=rz_${videoId}&utm_content=${variantId}`;
}

/**
 * Рекомендация бюджета из паспорта: базовые 1000 RUB/день x поправки домена,
 * рекламных слотов и длительности; clamp 500-7000. Детерминированно (NFR-7).
 */
export function recommendedBudget(passport: Passport): { daily: number; total: number; reason: string } {
  let k = 1;
  const parts: string[] = [];
  const dom = passport.frontmatter.domain_type;
  const domK: Record<string, number> = {
    tech_review: 1.2,
    travel_vlog: 1.4,
    game_review: 1.25,
    movie_review: 1.15,
    cooking_dinner: 1.0,
    diy_frame: 0.9,
  };
  if (domK[dom]) {
    k *= domK[dom];
    parts.push(dom.replace("_", " "));
  }
  const adSlots = passport.timeline.filter((s) => s.monetization.some((m) => m.type === "ad_slot")).length;
  if (adSlots >= 3) {
    k *= 1.1;
    parts.push(`${adSlots} слота`);
  }
  const dur = videoDuration(passport);
  if (dur > 600) {
    k *= 1.15;
    parts.push("длинный ролик");
  }
  const bs = passport.frontmatter.brand_safety_score ?? 70;
  if (bs < 60) {
    k *= 0.85;
    parts.push("brand safety");
  }
  const daily = clamp(DEFAULT_BUDGET * k, 500, 7000);
  const reason = parts.length
    ? `на основе: ${parts.join(", ")}`
    : "базовый сценарий";
  return { daily, total: daily * 7, reason };
}

/** Видеокреатив: опорный кадр из первой сцены + таймкод вырезки. */
function creativeFor(passport: Passport, videoId: string): { thumb: VideoCreative } {
  const dur = videoDuration(passport);
  const starts = sceneStarts(passport).map((s) => s.startSec);
  const thumbTime = starts.length ? starts[Math.min(2, starts.length - 1)] : Math.round(dur / 2);
  const firstSummary = passport.timeline[0]?.scene_summary ?? passport.frontmatter.seo_title ?? "Видео на RUTUBE";
  const creative = {
    thumbText: firstSummary,
    durationSec: Math.round(dur),
    thumbTimeSec: Math.max(0, Math.round(thumbTime)),
  };
  void videoId;
  return { thumb: creative };
}

/** Собрать варианты креативов для площадки (2 шт., детерминированно). */
function buildAdVariants(passport: Passport, videoId: string, platform: PromoPlatform): AdVariant[] {
  const key = passportKey(passport, videoId);
  const meta = PLATFORMS[platform];
  const title = titleFor(passport, platform, key);
  const text = textFor(passport, platform);
  const keywords = keywordsFor(passport);
  const rnd = mulberry32(hashSeed(`advar:${videoId}:${platform}`));
  const titles = [title];
  // второй вариант — вариация заголовка из ключевых фраз
  const altBase = keywords[0] ? `Про ${keywords[0]}: смотрите видео` : "Новое видео на RUTUBE";
  const alt = fitTitle(altBase, meta.titleMax);
  if (alt !== title) titles.push(alt);
  const ctas = ["Смотреть", "Узнать больше", "Открыть"];
  const cta = ctas[Math.floor(rnd() * ctas.length)];
  return titles.map((t, i) => ({
    id: `ad-${platform}-${i + 1}`,
    title: t,
    text,
    cta,
    displayUrl: `rutube.ru/video/${videoId}`,
  }));
}

/** Опубликовать полный бандл продвижения для панели Studio. */
export function buildPromotionBundle(passport: Passport, videoId: string, videoUrl: string): PromotionBundle {
  const rec = recommendedBudget(passport);
  const targeting: Targeting = {
    age: ageFor(passport),
    interests: interestsFor(passport),
    geo: "Россия",
  };
  const campaigns: PromoCampaign[] = PLATFORM_ORDER.map((platform) => {
    const variants = buildAdVariants(passport, videoId, platform);
    const creative = creativeFor(passport, videoId).thumb;
    const forecast = forecastForPlatform(platform, videoId, rec.daily);
    return {
      platform,
      variants,
      targeting,
      creative,
      dailyBudget: rec.daily,
      activeBudget: rec.daily,
      forecast,
      status: "ready",
    };
  });

  const perPlatform = {} as Record<PromoPlatform, PlatformShare>;
  for (const platform of PLATFORM_ORDER) {
    const c = campaigns.find((x) => x.platform === platform)!;
    perPlatform[platform] = {
      label: PLATFORMS[platform].label,
      icon: PLATFORMS[platform].icon,
      color: PLATFORMS[platform].color,
      budget: c.activeBudget,
      reach: c.forecast.reach,
    };
  }

  const totals: PromotionTotals = {
    dailyBudget: campaigns.reduce((a, c) => a + c.activeBudget, 0),
    weekly: rec.total,
    reach: campaigns.reduce((a, c) => a + c.forecast.reach, 0),
    clicks: campaigns.reduce((a, c) => a + c.forecast.clicks, 0),
    avgCtr: round1(campaigns.reduce((a, c) => a + c.forecast.ctr, 0) / campaigns.length),
    recommended: rec.daily,
    recommendedReason: rec.reason,
    perPlatform,
  };

  return { campaigns, totals, currency: "RUB", videoId, videoUrl };
}
// = [M-EXTENSION][STUDIO][PROMOTION][END_BLOCK]