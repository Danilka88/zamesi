// [M-EXTENSION][LAYOUT][START_BLOCK]
// Хелперы раскладки: таймкоды сцен, форматирование времени.
import type { Passport, SceneAnalysisResult } from "../../data/types";

/** Определить начальный таймкод каждой сцены для позиционирования маркеров. */
export function sceneStarts(passport: Passport): { scene: SceneAnalysisResult; startSec: number }[] {
  const scenes = passport.timeline;
  const raw = passport.raw_timeline_segments;
  const duration = raw.length ? Math.max(...raw.map((s) => s.end_sec)) : 60;
  if (raw.length === scenes.length) {
    return scenes.map((scene, i) => ({ scene, startSec: raw[i].start_sec }));
  }
  // распределяем равномерно, если число ASR-сегментов не совпадает
  const step = duration / Math.max(scenes.length, 1);
  return scenes.map((scene, i) => ({ scene, startSec: i * step }));
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