// [M-EXTENSION][AUTHOR-TOOLS][CHARTS][START_BLOCK]
// Демо-графики для «Инструментов автора»: детерминированные SVG, считаются
// из паспорта (NFR-7 — без сети). Удержание из плотности сцен, стек монетизаций
// из timeline, почасовые бары из сидированного PRNG.
import type { Passport } from "../../data/types";
import { monetizationLabel } from "../../data/labels";
import { sceneStarts, videoDuration } from "../render/layout";

/** Хеш строки в 32-битное число (seed для PRNG). */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32: детерминированный PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RetentionPoint {
  label: string;
  value: number;
}

/** Кривая «удержания»: медленное падение + шум плотности сцен. Демо-метрика. */
export function retentionSeries(passport: Passport, salt = 7): RetentionPoint[] {
  const duration = videoDuration(passport);
  const starts = sceneStarts(passport).map((s) => s.startSec);
  const n = 12;
  const rnd = mulberry32(hashSeed(`${passport.frontmatter.video_id}:${salt}`));
  const noise = Array.from({ length: n }, () => (rnd() - 0.5) * 0.08);
  return Array.from({ length: n }, (_, i) => {
    const t = duration ? (i * duration) / (n - 1) : i;
    const density = starts.reduce((acc, s) => acc + (s <= t ? 1 : 0), 0) / Math.max(starts.length, 1);
    const decline = 1 - 0.45 * (i / (n - 1));
    const value = Math.max(0.02, Math.min(1, decline * (0.85 + 0.3 * density) + noise[i]));
    const pct = Math.round(value * 100);
    return { label: `${Math.round((t / 60) * 10) / 10}м`, value: pct };
  });
}

export interface MonStack {
  type: string;
  value: number;
  color: string;
  label: string;
}

/** Стек распределения типов монетизации из timeline. */
export function monetizationStack(passport: Passport): MonStack[] {
  const counts = new Map<string, number>();
  for (const s of passport.timeline) for (const m of s.monetization) counts.set(m.type, (counts.get(m.type) ?? 0) + 1);
  const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
  return [...counts.entries()]
    .map(([type, value]) => {
      const l = monetizationLabel(type);
      return { type, value, color: l.color, label: l.short };
    })
    .sort((a, b) => b.value - a.value)
    .map((m) => ({ ...m, value: Math.round((m.value / total) * 100) }));
}

export interface HourBucket {
  label: string;
  value: number;
}

/** Почасовая гистограмма «просмотров» — сидированный демо-ряд (24 ч). */
export function hourlyBars(passport: Passport, salt = 13): HourBucket[] {
  const rnd = mulberry32(hashSeed(`${passport.frontmatter.video_id}:${salt}`));
  return Array.from({ length: 24 }, (_, h) => {
    const evening = h >= 19 && h <= 23 ? 1.8 : 0;
    const morning = h >= 7 && h <= 10 ? 1.3 : 0;
    const base = 0.35 + rnd() * 0.6;
    return { label: `${h}`, value: Math.round((base + evening + morning) * 100) };
  });
}

export interface SparklineOpts {
  w: number;
  h: number;
  color?: string;
  fill?: boolean;
}

/** SVG-спарклайн из точек [0..100]. */
export function sparklineSvg(points: number[], opts: SparklineOpts): string {
  const { w, h, color = "#fb5f93", fill = true } = opts;
  if (!points.length) return "";
  const pad = 2;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);
  const coords = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = coords.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = coords.length ? `${line}L${coords[coords.length - 1][0].toFixed(1)},${h - pad}L${coords[0][0].toFixed(1)},${h - pad}Z` : "";
  const gid = `rzspark-${hashSeed(line)}`;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="спарклайн удержания">
  <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${color}" stop-opacity="0.35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/>
  </linearGradient></defs>
  ${fill ? `<path d="${area}" fill="url(#${gid})"/>` : ""}
  <path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
</svg>`;
}

export interface BarChartOpts {
  w: number;
  h: number;
  accent?: string;
  highlightLast?: boolean;
}

/** SVG-гистограмма из баров (значения нормируются к max). */
export function barChartSvg(bars: HourBucket[], opts: BarChartOpts): string {
  const { w, h, accent = "#fb5f93", highlightLast = false } = opts;
  if (!bars.length) return "";
  const max = Math.max(...bars.map((b) => b.value), 1);
  const n = bars.length;
  const gap = 1;
  const bw = Math.max(1, (w / n) - gap);
  const rects = bars
    .map((b, i) => {
      const bh = Math.max(1, (b.value / max) * (h - 14));
      const x = i * (bw + gap);
      const y = h - bh - 12;
      const color = i === bars.length - 1 && highlightLast ? accent : "#4c5470";
      const isPeak = b.value === max;
      const c = isPeak ? accent : color;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="1" fill="${c}"/>`;
    })
    .join("");
  const labels = [bars[0]?.label ?? "", bars[Math.floor(n / 2)]?.label ?? "", bars[n - 1]?.label ?? ""];
  const ticks = labels
    .map((l, i) => `<text x="${(i * (n / 2) * (bw + gap)).toFixed(0)}" y="${h - 2}" font-size="8" fill="#9aa1b5">${l}ч</text>`)
    .join("");
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="почасовая гистограмма">${rects}${ticks}</svg>`;
}
// = [M-EXTENSION][AUTHOR-TOOLS][CHARTS][END_BLOCK]
