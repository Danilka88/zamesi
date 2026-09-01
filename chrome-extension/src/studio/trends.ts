// [M-EXTENSION][STUDIO][TRENDS][START_BLOCK]
// Блок «Тренды и плейлисты» для AI-панели Studio. Демо-детерминизм (NFR-7):
// объёмы/динамика/сезонность берутся из курируемого Wordstat-файкстура и сида
// VideoId (hashSeed + mulberry32), как в referral/promotion. Реальный прокси
// к Яндекс.Wordstat / Google Alerts подключается позже без переделки UI.
import type { Passport } from "../data/types";
import { resolvePassportKey } from "../content/authorTools/generate";
import { hashSeed, mulberry32 } from "../content/authorTools/charts";
import { BIKE_SEARCH_ENTRIES, type BikeSearchEntry } from "../content/bikeSearch/detect";

export type TrendDifficulty = "low" | "medium" | "high";

export interface TrendForecast {
  /** Прогноз показов из volume (доля поискового трафика). */
  estViews: number;
  /** Прогноз CTR «заголовка с трендом». */
  ctr: number;
}

export interface Trend {
  id: string;
  query: string;
  /** Показов/мес в Яндекс.Wordstat (демо). */
  volume: number;
  /** Рост WoW, % (может быть отрицательным). */
  growth: number;
  difficulty: TrendDifficulty;
  /** Сезонность 12 точек 0..1 (sparkline). */
  seasonality: number[];
  sources: { wordstat: boolean; alerts: boolean };
  related: string[];
  forecast: TrendForecast;
}

export interface TrendVideo {
  passportId: string;
  title: string;
  domainType: string;
  boundVideoId: string;
  /** Относительный путь к скриншоту (public/bike/...), либо null. */
  screenshot: string | null;
  blurb: string;
}

export interface TrendClip {
  title: string;
  time: string;
  /** https://rutube.ru/video/{id}/?start={sec} (демо). */
  url: string;
}

export interface TrendJournalStage {
  level: string;
  question: string;
  clips: TrendClip[];
}

export interface TrendPlaylist {
  id: string;
  title: string;
  reason: string;
  source: "passport" | "mix" | "trending";
  videos: TrendVideo[];
  journal: TrendJournalStage[];
}

export interface Collaborator {
  id: string;
  channelName: string;
  subscriberCount: number;
  audience: string[];
  /** 0..1 — пересечение target_audience с аудиторией канала. */
  overlap: number;
  reason: string;
  format: string;
  /** Готовый питч для копирования. */
  pitch: string;
}

export interface TrendsTotals {
  trendCount: number;
  /** Средний рост WoW, %. */
  avgGrowth: number;
  /** Число трендов с ростом >20%. */
  hotCount: number;
  /** Число трендов с Google Alerts. */
  alertCount: number;
  totalVolume: number;
  playlistCount: number;
  collabCount: number;
}

export interface TrendsBundle {
  trends: Trend[];
  playlists: TrendPlaylist[];
  collabs: Collaborator[];
  totals: TrendsTotals;
  /** Ключ паспорта (id записи реестра). */
  key: string;
  /** Человеческое название домена. */
  domainLabel: string;
}

const round1 = (v: number): number => Math.round(v * 10) / 10;

/** Курируемый тренд (Wordstat-файкстур). */
export interface CuratedTrend {
  query: string;
  volume: number;
  growth: number;
  difficulty: TrendDifficulty;
  seasonality: number[];
  alerts: boolean;
  related: string[];
}

/** Тренды по паспорту (ключ — id записи PASSPORT_REGISTRY). */
const CURATED_TRENDS: Record<string, CuratedTrend[]> = {
  bike_dont_buy: [
    { query: "как выбрать велосипед", volume: 18400, growth: 34, difficulty: "medium",
      seasonality: [0.2, 0.3, 0.9, 1.0, 0.8, 0.35, 0.25, 0.2, 0.25, 0.4, 0.5, 0.3],
      alerts: true, related: ["размер рамы велосипед", "рост 180 какой выбор"] },
    { query: "электровелосипед купить", volume: 22100, growth: 41, difficulty: "high",
      seasonality: [0.15, 0.2, 0.75, 0.95, 0.9, 0.5, 0.3, 0.2, 0.25, 0.4, 0.45, 0.25],
      alerts: false, related: ["электровелосипед 2026", "сколько стоит электровелосипед"] },
    { query: "горный велосипед за 80000", volume: 9600, growth: 22, difficulty: "medium",
      seasonality: [0.2, 0.3, 0.8, 0.9, 0.75, 0.4, 0.3, 0.25, 0.3, 0.45, 0.5, 0.3],
      alerts: true, related: ["хардтейл до 80", "рама 601 конус"] },
    { query: "как не купить хлам велосипед", volume: 5400, growth: 12, difficulty: "low",
      seasonality: [0.3, 0.4, 0.85, 0.9, 0.8, 0.5, 0.35, 0.3, 0.35, 0.5, 0.55, 0.4],
      alerts: false, related: ["чек-лист велосипед", "ошибки при покупке вело"] },
    { query: "топ велосипедов 2026", volume: 12800, growth: 28, difficulty: "high",
      seasonality: [0.25, 0.35, 0.85, 1.0, 0.85, 0.5, 0.3, 0.25, 0.3, 0.45, 0.55, 0.3],
      alerts: true, related: ["hagen hg10", "welt g10", "aspect allroad"] },
    { query: "велосипед для ребёнка", volume: 7300, growth: 8, difficulty: "low",
      seasonality: [0.3, 0.4, 0.8, 0.9, 0.8, 0.45, 0.35, 0.3, 0.35, 0.5, 0.55, 0.4],
      alerts: false, related: ["детский вело 2026", "рама 24 дюйма"] },
  ],
  bike_top_april: [
    { query: "лучшие велосипеды весны", volume: 14200, growth: 31, difficulty: "medium",
      seasonality: [0.2, 0.35, 0.95, 1.0, 0.85, 0.45, 0.3, 0.25, 0.3, 0.4, 0.5, 0.3],
      alerts: true, related: ["велотоп апрель", "hagen", "welt"] },
    { query: "гравийный велосипед", volume: 10500, growth: 18, difficulty: "high",
      seasonality: [0.2, 0.3, 0.8, 0.95, 0.9, 0.55, 0.35, 0.3, 0.35, 0.5, 0.55, 0.3],
      alerts: true, related: ["aspect allroad elite", "gravel до 150000"] },
  ],
  bike_mtb_80k: [
    { query: "mtb до 80000", volume: 8900, growth: 25, difficulty: "high",
      seasonality: [0.25, 0.35, 0.85, 0.95, 0.8, 0.5, 0.35, 0.3, 0.3, 0.45, 0.5, 0.35],
      alerts: true, related: ["shimano mt200", "покрышки mtb 29 2.25", "suntour xct"] },
    { query: "хардтейл 29 купить", volume: 7700, growth: 19, difficulty: "medium",
      seasonality: [0.3, 0.4, 0.85, 0.95, 0.8, 0.5, 0.35, 0.3, 0.3, 0.45, 0.5, 0.35],
      alerts: false, related: ["рама 601 конус", "амортизация вилки"] },
  ],
  iphone_50k_wylsacom: [
    { query: "iphone 15 купить", volume: 54000, growth: 12, difficulty: "high",
      seasonality: [0.7, 0.75, 0.85, 0.8, 0.75, 0.7, 0.7, 0.75, 0.9, 1.0, 0.95, 0.8],
      alerts: true, related: ["айфон 15 за 50000", "iphone 15 128 гб"] },
    { query: "защитное стекло iphone 3D", volume: 18300, growth: 28, difficulty: "medium",
      seasonality: [0.6, 0.7, 0.8, 0.85, 0.8, 0.75, 0.7, 0.7, 0.8, 0.9, 0.9, 0.75],
      alerts: true, related: ["царское стекло wylsacom", "3D стекло 17 про"] },
    { query: "какой айфон выбрать 2026", volume: 26000, growth: 21, difficulty: "medium",
      seasonality: [0.65, 0.7, 0.8, 0.85, 0.8, 0.75, 0.7, 0.75, 0.85, 0.95, 0.9, 0.8],
      alerts: true, related: ["16 или 17 лучше", "выбор за 60000"] },
  ],
};

/** Человеческий лейбл домена для подписей. */
const DOMAIN_LABEL: Record<string, string> = {
  tech_review: "Гаджеты",
  how_to: "Гайд-видео",
  review: "Обзор",
  game_review: "Гейминг",
  travel_vlog: "Путешествия",
  cooking_dinner: "Кулинария",
  diy_frame: "DIY",
  movie_review: "Кино",
};

/** Тренды по ключу: курированные, иначе фолбэк из ключевых слов паспорта. */
function trendsFor(key: string, passport: Passport): CuratedTrend[] {
  const curated = CURATED_TRENDS[key];
  if (curated && curated.length) return curated;
  const kw = [...(passport.frontmatter.seo_tags ?? []), ...(passport.frontmatter.ad_targeting_keywords ?? [])];
  const out: CuratedTrend[] = [];
  for (const q of kw.slice(0, 6)) {
    const s = hashSeed(`${key}:${q}`);
    const r = mulberry32(s);
    out.push({
      query: q,
      volume: Math.round(500 + r() * 20000),
      growth: Math.round(-5 + r() * 40),
      difficulty: (s % 3 === 0 ? "low" : s % 3 === 1 ? "medium" : "high") as TrendDifficulty,
      seasonality: Array.from({ length: 12 }, () => round1(0.2 + r() * 0.8)),
      alerts: s % 2 === 0,
      related: [],
    });
  }
  return out;
}

/** Каналы-партнёры для коллабораций (6 шт, демо-метрики). */
const CHANNELS: Array<{ name: string; subs: number; audience: string[] }> = [
  { name: "Велософ", subs: 142000, audience: ["bike_beginners", "mtb", "how_to"] },
  { name: "GCN на русском", subs: 89000, audience: ["road", "gravel", "bike_beginners"] },
  { name: "Бик-обзоры Олега", subs: 61000, audience: ["mtb", "budget", "review"] },
  { name: "Электровелосипеды", subs: 34000, audience: ["electric", "urban", "new"] },
  { name: "Трек-клаб", subs: 122000, audience: ["mtb", "enduro", "trail"] },
  { name: "ВелоПутешествия", subs: 48000, audience: ["travel", "bike", "how_to"] },
];

/** Коллаборации: скор по пересечению target_audience с аудиторией канала. */
function collabsFor(passport: Passport, key: string, videoId: string): Collaborator[] {
  const aud = passport.frontmatter.target_audience ?? [];
  return CHANNELS
    .map((c) => {
      const match = aud.filter((a) => c.audience.some((x) => a.toLowerCase().includes(x) || x.includes(a.toLowerCase())));
      const overlap = aud.length ? Math.min(1, match.length / aud.length) : 0.15;
      const pitch =
        `Привет, ${c.name}! У нас пересечение аудитории ~${Math.round(overlap * 100)}% по теме «${key}». ` +
        `Давай сделаем формат «обзор + коллаб» — пришлю готовую структуру подборки каналов.`;
      return {
        id: `co-${hashSeed(`${videoId}:${c.name}`).toString(16)}`,
        channelName: c.name,
        subscriberCount: c.subs,
        audience: c.audience,
        overlap,
        reason: `пересечение аудиторий ${Math.round(overlap * 100)}%`,
        format: `обзор + ${c.name}`,
        pitch,
      };
    })
    .sort((a, b) => b.overlap - a.overlap || b.subscriberCount - a.subscriberCount);
}

/** Тренд-подборка месяца (вело-демо, обложки из public/bike). */
function trendingPlaylist(entries: BikeSearchEntry[]): TrendPlaylist | null {
  if (!entries.length) return null;
  const journal: TrendJournalStage[] = [
    {
      level: "Новичок",
      question: "Какой класс велосипеда мне подходит?",
      clips: [
        { title: "Хардтейл XC Aspect AMP DC", time: "05:03-07:10", url: `https://rutube.ru/video/${entries[0].boundVideoId}/?start=303` },
        { title: "Gravel Aspect Allroad Pro", time: "07:50-09:20", url: `https://rutube.ru/video/${entries[0].boundVideoId}/?start=470` },
      ],
    },
    {
      level: "Продвинутый",
      question: "Сколько стоит хороший велосипед?",
      clips: [
        { title: "Hagen HG10 за 91k", time: "00:22-01:06", url: `https://rutube.ru/video/${entries[1].boundVideoId}/?start=22` },
        { title: "Aspect Allroad Elite 160k", time: "02:36-03:35", url: `https://rutube.ru/video/${entries[1].boundVideoId}/?start=156` },
      ],
    },
    {
      level: "Профи",
      question: "Как не купить «хлам» за 80000?",
      clips: [
        { title: "Рама 601 конус", time: "04:28-05:40", url: `https://rutube.ru/video/${entries[2].boundVideoId}/?start=268` },
        { title: "Вилка Suntour", time: "06:50-07:40", url: `https://rutube.ru/video/${entries[2].boundVideoId}/?start=410` },
      ],
    },
  ];
  return {
    id: "pl_trending_bike_2026",
    title: "Велосипед месяца: весна 2026",
    reason: "Тренд-подборка из 3 видео: гайд, топ моделей и чек-лист покупки",
    source: "trending",
    videos: entries.map((e) => ({
      passportId: e.passportId,
      title: e.title,
      domainType: e.domainType,
      boundVideoId: e.boundVideoId,
      screenshot: e.screenshot,
      blurb: e.blurb,
    })),
    journal,
  };
}

/** Плейлисты: автоплейлисты паспорта + тренд-подборка месяца. */
function playlistsFor(passport: Passport): TrendPlaylist[] {
  const out: TrendPlaylist[] = [];
  for (const pl of passport.frontmatter.auto_playlists ?? []) {
    out.push({
      id: pl.id,
      title: pl.id.replace(/[_-]+/gu, " ").trim(),
      reason: pl.reason ?? "",
      source: "passport",
      videos: [],
      journal: [],
    });
  }
  const tp = trendingPlaylist(BIKE_SEARCH_ENTRIES);
  if (tp) out.push(tp);
  return out;
}

/** Сбор бандла трендов (детерминизм NFR-7: один videoId+паспорт → один результат). */
export function buildTrendsBundle(passport: Passport, videoId: string): TrendsBundle {
  const key = resolvePassportKey(videoId, passport) ?? "fallback";
  const domainLabel = DOMAIN_LABEL[passport.frontmatter.domain_type] ?? passport.frontmatter.domain_type;
  const raw = trendsFor(key, passport);
  const trends: Trend[] = raw.map((t, i) => {
    const rnd = mulberry32(hashSeed(`tr:${videoId}:${t.query}`));
    const estViews = Math.round(t.volume * (0.45 + rnd() * 0.8));
    const ctr = round1(2.5 + rnd() * 4.5);
    return {
      id: `tr-${key}-${i}`,
      query: t.query,
      volume: t.volume,
      growth: t.growth,
      difficulty: t.difficulty,
      seasonality: t.seasonality,
      sources: { wordstat: true, alerts: t.alerts },
      related: t.related,
      forecast: { estViews, ctr },
    };
  });
  const playlists = playlistsFor(passport);
  const collabs = collabsFor(passport, key, videoId);
  const totals: TrendsTotals = {
    trendCount: trends.length,
    avgGrowth: trends.length ? round1(trends.reduce((a, t) => a + t.growth, 0) / trends.length) : 0,
    hotCount: trends.filter((t) => t.growth > 20).length,
    alertCount: trends.filter((t) => t.sources.alerts).length,
    totalVolume: trends.reduce((a, t) => a + t.volume, 0),
    playlistCount: playlists.length,
    collabCount: collabs.length,
  };
  return { trends, playlists, collabs, totals, key, domainLabel };
}
// = [M-EXTENSION][STUDIO][TRENDS][END_BLOCK]