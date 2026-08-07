// [M-EXTENSION][AUTHOR-TOOLS][GENERATE][START_BLOCK]
// Генерация вариантов заголовков и описаний для A/B-теста автора. Demo-режим:
// детерминированная генерация из паспорта (NFR-7 — без сети) + курируемая
// библиотека вариантов для известных паспортов. Чистые функции (без DOM).
import { PASSPORT_REGISTRY } from "../../data/registry";
import type { Passport } from "../../data/types";
import { hashSeed, mulberry32 } from "./charts";

export interface TitleVariant {
  id: string;
  text: string;
  /** native — родной заголовок страницы; ai — сгенерированный. */
  source: "native" | "ai";
  /** Пометка для AI-варианта (откуда взят). */
  note?: string;
}

export interface DescriptionVariant {
  id: string;
  text: string;
  /** Короткие теги-фичи, почему это «AI» (SEO, аудитория, сцены). */
  features: string[];
  chars: number;
}

/** Курируемые AI-заголовки по паспорту (ключ — id записи PASSPORT_REGISTRY). */
const CURATED_TITLES: Record<string, string[]> = {
  tech_review: [
    "3 флагманские наушники 2026: какой выбрать? Sony vs Audio-Technica vs Sennheiser",
    "Лучшие наушники года: честное сравнение флагманов — есть явный победитель",
    "Наушники за свои деньги: TDS флагманов Sony, Audio-Technica и Sennheiser",
  ],
  iphone_50k_wylsacom: [
    "iPhone за 50 000 ₽: какую модель реально стоит брать в 2026?",
    "iPhone 15, 16e, 16 или 17e — сравнение за 50 тысяч",
    "Дешёвый iPhone без подводных камней: выбор Wylsacom за 50 000 ₽",
  ],
  diy_frame: [
    "Фоторамка из картона за 29 секунд — проще не бывает!",
    "DIY-декор: рамка из подручных материалов за полминуты",
    "Поделка для дома из картона: фоторамка своими руками",
  ],
  movie_review: [
    "«Эхо Будущего»: лучший сайфай 2026 или переоценённый фильм?",
    "Разбор фильма «Эхо Будущего»: стоит ли идти в кино?",
    "Кинокритик о «Эхе Будущего»: синопсис без спойлеров и вердикт",
  ],
  cooking_dinner: [
    "Паста с томатным соусом за 15 минут — рецепт на каждый день",
    "Быстрый ужин: паста за 15 минут из простых продуктов",
    "Идеальный ужин за 15 минут: паста с томатами и базиликом",
  ],
  atomic_heart_review: [
    "Atomic Heart в 2026: стоит ли играть сейчас? Полный разбор",
    "Обзор Atomic Heart: великий мир, спорные баги — наш вердикт",
    "Atomic Heart: от хайпа до хейта — честный разбор игры Mundfish",
  ],
  vietnam_nha_trang: [
    "Вьетнам 2026: бюджет жизни в Нячанге — все цены честно",
    "Сколько нужно денег в месяц на жизнь в Нячанге? Полный разбор трат",
    "Жизнь в Нячанге: аренда, еда, экскурсии — реальные цифры из первых рук",
  ],
};

/** Курируемые AI-описания по паспорту (ключ — id записи PASSPORT_REGISTRY). */
const CURATED_DESCRIPTIONS: Record<string, string[]> = {
  tech_review: [
    `Сравниваем три флагманские модели наушников 2026 года — Sony, Audio-Technica и Sennheiser.\n\nВ этом видео: распаковка и комплектация, дизайн и материалы, звук и шумоподавление, вердикт для разных сценариев.\n\nКому будет полезно: меломанам, аудиофилам, гикам и всем, кто выбирает наушники.\n\n#наушники #обзорнаушников #Sony #AudioTechnica #Sennheiser #лучшиенаушники2026`,
    `Флагманские наушники 2026 — что выбрать?\n\nРазбираем Sony, Audio-Technica и Sennheiser: плюсы, минусы, подводные камни.\n\n#обзортехники #HiFi #аудиофилия`,
  ],
  iphone_50k_wylsacom: [
    `Какой iPhone купить за 50 000 рублей в 2026?\n\nСравниваем четыре актуальные модели — iPhone 15, 16e, 16 и 17e: камеры, экраны, батарея, подводные камни и на чём сэкономить.\n\nКому будет полезно: покупателям смартфонов, фанатам Apple и охотникам за скидками.\n\n#iPhone #айфонза50000 #сравнениеiPhone #Wylsacom #купитьайфон`,
    `iPhone за 50 тысяч — разбор всех моделей.\n\nКритерии выбора, реальные цены и на чём не стоит экономить.\n\n#iPhone #выборсмартфона #смартфондо60000`,
  ],
  diy_frame: [
    `Делаем фоторамку из картона всего за 29 секунд!\n\nЧто понадобится: картон, ножницы, клей и декор. Пошаговая инструкция — от разметки до готовой рамки.\n\nОтличный бюджетный декор для дома и подарок своими руками.\n\n#фоторамкасвоимируками #DIY #поделкиизкартона #handmade`,
    `Быстрый DIY: фоторамка из подручных материалов.\n\nПростая поделка для дома за полминуты — попробует каждый.\n\n#поделкиизкартона #бюджетныйдекор`,
  ],
  movie_review: [
    `Обзор фильма «Эхо Будущего» — главный сайфай 2026?\n\nУчёный Лев Волков обнаруживает сигнал из будущего. Что получилось: синопсис без спойлеров, разбор с кинокритиком и вердикт — стоит ли идти в кино.\n\n#ЭхоБудущего #обзорфильма #сайфай2026 #чтопосмотреть`,
    `«Эхо Будущего»: мнение кинокритика.\n\nРазбираем сюжет, атмосферу и саундтрек — без спойлеров.\n\n#кинообзор #фантастика2026`,
  ],
  cooking_dinner: [
    `Паста с томатным соусом за 15 минут — идеальный ужин.\n\nПростой рецепт: паста, оливковое масло, пармезан, спелые помидоры, чеснок и свежий базилик. Пошагово — от ингредиентов до готового блюда.\n\nКому будет полезно: студентам, молодым семьям и любителям итальянской кухни.\n\n#паста #ужинза15минут #рецепт #итальянскаякухня`,
    `Быстрый рецепт ужина: паста за 15 минут.\n\nМинимум продуктов, максимум вкуса. Готовим вместе.\n\n#паста #рецепт #быстрыйужин`,
  ],
  atomic_heart_review: [
    `Обзор Atomic Heart — стоит ли играть в 2026?\n\nПрошли заново и разбираем: мир альтернативного СССР, сюжет майора Нечаева, экшн, саундтрек Мика Гордона и те самые баги.\n\nКому будет полезно: игрокам, фанатам шутеров и тем, кто ещё не решился купить.\n\n#AtomicHeart #обзоригры #StopGame #Mundfish #стоитлииграть`,
    `Atomic Heart: разбор после повторного прохождения.\n\nОт хайпа до хейта — честно о главном шутере про СССР.\n\n#AtomicHeart #обзоригры #экшн2026`,
  ],
  vietnam_nha_trang: [
    `Сколько стоит жить в Нячанге в 2026? Честные цифры из первых рук.\n\nСемья с детьми после переезда: аренда квартиры в жилом комплексе «Океанус», коммуналка, продукты, экскурсии и другие траты.\n\nКому будет полезно: планирующим жизнь за границей, релоцированным в Азию, зимующим семьям и цифровым кочевникам.\n\n#Вьетнам #Нячанг #стоимостьжизни #переездвазию #зимовка`,
    `Жизнь в Нячанге: аренда, еда, экскурсии — реальные цены.\n\nСколько уходит в месяц и на чём можно сэкономить.\n\n#Вьетнам #Нячанг #жизньвазии`,
  ],
};

/** Разрешить ключ паспорта (id записи реестра) по video_id / frontmatter / domain_type. */
export function resolvePassportKey(videoId: string, passport: Passport): string | null {
  const vid = videoId.trim().toLowerCase();
  const byUrl = PASSPORT_REGISTRY.find((e) => e.boundVideoId?.toLowerCase() === vid);
  if (byUrl) return byUrl.id;
  const byFront = PASSPORT_REGISTRY.find((e) => e.passport.frontmatter.video_id === passport.frontmatter.video_id);
  if (byFront) return byFront.id;
  const byDomain = PASSPORT_REGISTRY.find((e) => e.domainType === passport.frontmatter.domain_type);
  if (byDomain) return byDomain.id;
  return null;
}

/** Fallback-заголовок из полей паспорта (для неизвестных видео). */
function fallbackTitle(passport: Passport, native: string): string[] {
  const fm = passport.frontmatter;
  const out: string[] = [];
  if (fm.seo_title && fm.seo_title.trim().toLowerCase() !== native.trim().toLowerCase()) {
    out.push(fm.seo_title);
  }
  if (fm.seo_tags[0]) out.push(`${fm.seo_tags[0]}: что нужно знать`);
  if (fm.ad_targeting_keywords[0]) out.push(`Обзор: ${fm.ad_targeting_keywords[0]} — подробный разбор`);
  return out.slice(0, 3);
}

/** Fallback-описания из полей паспорта (для неизвестных видео). */
function fallbackDescription(passport: Passport): string[] {
  const fm = passport.frontmatter;
  const scenes = passport.timeline
    .slice(0, 4)
    .map((s) => s.scene_summary)
    .filter(Boolean)
    .map((t) => `• ${t}`);
  const hook = fm.seo_title || `Видео: ${fm.trending_cluster || "обзор"}`;
  const audience = fm.target_audience.length ? `Кому будет полезно: ${fm.target_audience.join(", ")}.` : "";
  const tags = [...fm.seo_tags.slice(0, 4), ...fm.ad_targeting_keywords.slice(0, 2)]
    .map((t) => `#${t.replace(/[^\p{L}\p{N}_]+/gu, "_")}`)
    .join(" ");
  const full = [hook, "В этом видео:", ...scenes, audience, tags].filter(Boolean).join("\n");
  const short = [hook, fm.target_audience[0] ? `Для: ${fm.target_audience[0]}.` : "", tags].filter(Boolean).join("\n");
  return [full, short];
}

/** Получить AI-варианты заголовка: курируемые для известного паспорта, иначе fallback. */
export function aiTitleVariants(passport: Passport, nativeTitle: string, videoId: string): TitleVariant[] {
  const key = resolvePassportKey(videoId, passport);
  const list = (key && CURATED_TITLES[key]) || fallbackTitle(passport, nativeTitle);
  return list.map((text, i) => ({
    id: `ai-title-${key ?? "fb"}-${i}`,
    text,
    source: "ai" as const,
    note: key ? `вариант для «${key}»` : "из полей паспорта",
  }));
}

/** Получить AI-варианты описания: курируемые для известного паспорта, иначе fallback. */
export function aiDescriptionVariants(passport: Passport, videoId: string): DescriptionVariant[] {
  const key = resolvePassportKey(videoId, passport);
  const list = (key && CURATED_DESCRIPTIONS[key]) || fallbackDescription(passport);
  return list.map((text, i) => ({
    id: `ai-desc-${key ?? "fb"}-${i}`,
    text,
    features: key ? ["курировано по паспорту", `вариант ${i + 1}`] : ["собрано из полей паспорта", `вариант ${i + 1}`],
    chars: text.length,
  }));
}

/** Все варианты заголовка для A/B: родной первым, затем AI. */
export function buildTitleVariants(passport: Passport, nativeTitle: string, videoId: string): TitleVariant[] {
  const native = nativeTitle.trim();
  const result: TitleVariant[] = [];
  if (native) result.push({ id: "native-title", text: native, source: "native" });
  for (const v of aiTitleVariants(passport, nativeTitle, videoId)) {
    if (v.text.trim().toLowerCase() !== native.toLowerCase()) result.push(v);
  }
  return result;
}

/** Все варианты описания для A/B (AI). */
export function buildDescriptionVariants(passport: Passport, videoId: string): DescriptionVariant[] {
  return aiDescriptionVariants(passport, videoId);
}

export interface VariantMetrics {
  /** Прогнозный CTR кликов (0..100, шаг 0.1). */
  ctr: number;
  /** Прогнозный охват (просмотры, чел.). */
  views: number;
  /** Прогноз вовлечённости (0..100). */
  engagement: number;
}

/** Компактный формат охвата: 18400 → «18.4K». */
export function fmtViews(views: number): string {
  return views >= 1000 ? `${(views / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(views);
}

/**
 * Детерминированный прогноз эффективности варианта (NFR-7): сид строится из
 * video_id + текста варианта, поэтому у каждого заголовка/описания стабильные
 * «предсказанные» метрики A/B. Демо — в реальной схеме тут показатели
 * кликов/досмотров из облачной аналитики (NFR-8).
 */
export function projectVariantMetrics(videoId: string, text: string): VariantMetrics {
  const rnd = mulberry32(hashSeed(`${videoId}:ab:${text}`));
  const ctr = Math.round((2.5 + rnd() * 4.5) * 10) / 10; // 2.5..7.0%
  const views = Math.round((80 + rnd() * 240) * (ctr / 3.5));
  const engagement = Math.round(40 + rnd() * 55); // 40..95
  return { ctr, views, engagement };
}
// = [M-EXTENSION][AUTHOR-TOOLS][GENERATE][END_BLOCK]
