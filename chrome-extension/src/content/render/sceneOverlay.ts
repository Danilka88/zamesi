// [M-EXTENSION][SCENE-OVERLAY][START_BLOCK]
// Плавающая панель текущей сцены — подписка на timeupdate (A-C003-02).
import type { Passport, SceneAnalysisResult } from "../../data/types";
import { MONETIZATION_LABELS } from "../../data/labels";
import type { PlayerHandle } from "../rutube";
import { fmtTime, sceneStarts } from "./layout";

const cache = new WeakMap<Passport, { scene: SceneAnalysisResult; startSec: number }[]>();

export function currentScene(passport: Passport, t: number): { scene: SceneAnalysisResult; startSec: number } {
  let steps = cache.get(passport);
  if (!steps) {
    steps = sceneStarts(passport);
    cache.set(passport, steps);
  }
  let cur = steps[0];
  for (const s of steps) if (s.startSec <= t) cur = s;
  return cur;
}

/**
 * Рендер панели текущей сцены и подписка на timeupdate.
 * Возвращает функцию очистки (отписка) — вызывается при перерисовке.
 */
export function renderSceneOverlay(
  container: HTMLElement,
  player: PlayerHandle,
  passport: Passport,
): () => void {
  const box = document.createElement("div");
  box.style.cssText =
    "border-top:1px solid #33363f;margin-top:8px;padding-top:8px;max-width:320px;";
  const video = player.video;
  const tick = () => {
    const t = player.getCurrentTime();
    const { scene, startSec } = currentScene(passport, t);
    const chips = scene.monetization
      .map((m) => {
        const l = MONETIZATION_LABELS[m.type];
        return `<span class="rz-chip" style="background:${l.color};color:#0b0e1a">${l.icon} ${l.short}</span>`;
      })
      .join("");
    box.innerHTML = `
      <div class="rz-muted">Сцена @${fmtTime(startSec)} · сейчас ${fmtTime(t)}</div>
      <div style="margin-top:4px">${scene.scene_summary || "—"}</div>
      <div style="margin-top:6px">${chips || '<span class="rz-muted">нет монетизации</span>'}</div>
    `;
  };
  tick();
  container.append(box);
  video?.addEventListener("timeupdate", tick);
  return () => video?.removeEventListener("timeupdate", tick);
}
// = [M-EXTENSION][SCENE-OVERLAY][END_BLOCK]