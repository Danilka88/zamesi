// [M-EXTENSION][MARKERS][START_BLOCK]
// Маркеры монетизаций на прогресс-баре (клик = перемотка, A-C003-02).
import type { Passport } from "../../data/types";
import { MONETIZATION_LABELS } from "../../data/labels";
import type { PlayerHandle } from "../rutube";
import { sceneStarts } from "./layout";

export interface MarkerSpec {
  startSec: number;
  type: string;
  label: string;
  color: string;
  tooltip: string;
}

export function collectMarkers(passport: Passport): MarkerSpec[] {
  const out: MarkerSpec[] = [];
  for (const { scene, startSec } of sceneStarts(passport)) {
    for (const m of scene.monetization) {
      const meta = MONETIZATION_LABELS[m.type];
      out.push({
        startSec,
        type: m.type,
        label: meta.short,
        color: meta.color,
        tooltip: meta.tooltip,
      });
    }
  }
  return out.sort((a, b) => a.startSec - b.startSec);
}

/**
 * Рендер чипов-маркеров. Прогресс-бар позиционируется относительно доступного
 * контейнера; клик вызывает player.seekTo(startSec) + play.
 */
export function renderMarkers(
  container: HTMLElement,
  player: PlayerHandle,
  passport: Passport,
): void {
  const markers = collectMarkers(passport);
  const bar = document.createElement("div");
  bar.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;";
  for (const mk of markers) {
    const chip = document.createElement("span");
    chip.className = "rz-chip";
    chip.title = mk.tooltip;
    chip.style.background = mk.color;
    chip.style.color = "#0b0e1a";
    chip.style.fontWeight = "700";
    chip.textContent = `${mk.label} @${(mk.startSec / 60).toFixed(1)}мин`;
    chip.addEventListener("click", () => player.seekTo(mk.startSec));
    bar.append(chip);
  }
  container.append(bar);
}
// = [M-EXTENSION][MARKERS][END_BLOCK]