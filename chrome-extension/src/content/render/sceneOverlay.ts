// [M-EXTENSION][SCENE-OVERLAY][START_BLOCK]
// Плавающая панель текущей сцены — подписка на timeupdate (A-C003-02).
import type { Passport, SceneAnalysisResult } from "../../data/types";
import { MONETIZATION_LABELS } from "../../data/labels";
import type { PlayerHandle } from "../rutube";
import { fmtTime, sceneStarts, videoDuration } from "./layout";

const cache = new WeakMap<Passport, { scene: SceneAnalysisResult; startSec: number; index: number }[]>();

export function currentScene(
  passport: Passport,
  t: number,
): { scene: SceneAnalysisResult; startSec: number; index: number } {
  let steps = cache.get(passport);
  if (!steps) {
    steps = sceneStarts(passport).map((s, i) => ({ ...s, index: i }));
    cache.set(passport, steps);
  }
  let cur = steps[0];
  for (const s of steps) if (s.startSec <= t) cur = s;
  return cur;
}

/**
 * Рендер карточки текущей сцены: заголовок, прогресс-бар видео, сводка сцены
 * и живые чипы монетизации. Возвращает функцию очистки (отписка).
 */
export function renderSceneOverlay(
  container: HTMLElement,
  player: PlayerHandle,
  passport: Passport,
): () => void {
  const box = document.createElement("div");
  box.style.cssText =
    "border:1px solid #33363f;border-radius:12px;background:#1b2030;margin-top:8px;padding:10px 12px;";

  const head = document.createElement("div");
  head.style.cssText = "display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;";
  head.innerHTML = `<span class="rz-title" style="margin:0;font-size:13px">🎬 Сцена</span>`;
  const sceneTag = document.createElement("span");
  sceneTag.className = "rz-chip";
  sceneTag.style.cssText = "background:#fb5f93;color:#fff;font-size:11px;margin:0;";
  head.append(sceneTag);

  // прогресс-бар видео с позицией текущей сцены
  const bar = document.createElement("div");
  bar.style.cssText = "position:relative;height:10px;border-radius:5px;background:#2a3040;overflow:hidden;margin:4px 0;";
  const fill = document.createElement("div");
  fill.style.cssText = "position:absolute;top:0;left:0;bottom:0;width:0%;background:#fb5f93;border-radius:5px;transition:width .3s linear;";
  const marker = document.createElement("div");
  marker.style.cssText = "position:absolute;top:-2px;bottom:-2px;width:2px;background:#8B5CF6;left:0%;";
  bar.append(fill, marker);

  const timeRow = document.createElement("div");
  timeRow.style.cssText = "display:flex;justify-content:space-between;font-size:11px;color:#9aa1b5;margin-top:2px;";
  const now = document.createElement("span");
  const total = document.createElement("span");
  timeRow.append(now, total);

  const summary = document.createElement("div");
  summary.style.cssText = "margin-top:6px;font-size:13px;line-height:1.45;";

  const chipsRow = document.createElement("div");
  chipsRow.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;";

  box.append(head, bar, timeRow, summary, chipsRow);
  container.append(box);

  const duration = videoDuration(passport);
  const tick = () => {
    const t = player.getCurrentTime();
    const { scene, startSec, index } = currentScene(passport, t);
    const pct = duration ? (t / duration) * 100 : 0;
    fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    marker.style.left = `${duration ? (startSec / duration) * 100 : 0}%`;
    now.textContent = fmtTime(t);
    total.textContent = `из ${fmtTime(duration)}`;
    sceneTag.textContent = `${index + 1} из ${passport.timeline.length} · @${fmtTime(startSec)}`;
    summary.textContent = scene.scene_summary || "—";
    chipsRow.innerHTML = "";
    const chips = scene.monetization.map((m) => {
      const l = MONETIZATION_LABELS[m.type];
      return `<span class="rz-chip" style="background:${l.color};color:#0b0e1a">${l.icon} ${l.short}</span>`;
    });
    chipsRow.innerHTML = chips.join("") || '<span class="rz-muted" style="font-size:11px">нет монетизации</span>';
  };
  tick();
  player.video?.addEventListener("timeupdate", tick);
  return () => player.video?.removeEventListener("timeupdate", tick);
}
// = [M-EXTENSION][SCENE-OVERLAY][END_BLOCK]