// [M-EXTENSION][LAYOUT][START_BLOCK]
// Хелперы раскладки: таймкоды сцен, форматирование времени.
import type { Passport, SceneAnalysisResult } from "../../data/types";

/** Длительность видео из raw-сегментов (для позиционирования по шкале). */
export function videoDuration(passport: Passport): number {
  const raw = passport.raw_timeline_segments;
  return raw.length ? Math.max(...raw.map((s) => s.end_sec)) : 60;
}

/**
 * Определить начальный таймкод каждой сцены для позиционирования маркеров.
 * Приоритет: явный scene.start_sec → таймкод raw-сегмента по индексу → равномерная разбивка.
 */
export function sceneStarts(passport: Passport): { scene: SceneAnalysisResult; startSec: number }[] {
  const scenes = passport.timeline;
  const raw = passport.raw_timeline_segments;
  const aligned = raw.length === scenes.length;
  const duration = videoDuration(passport);
  const step = duration / Math.max(scenes.length, 1);
  return scenes.map((scene, i) => {
    if (typeof scene.start_sec === "number") return { scene, startSec: scene.start_sec };
    if (aligned) return { scene, startSec: raw[i].start_sec };
    return { scene, startSec: i * step };
  });
}

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function fmtDur(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
// = [M-EXTENSION][LAYOUT][END_BLOCK]