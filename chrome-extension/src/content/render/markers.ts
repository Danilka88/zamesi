// [M-EXTENSION][MARKERS][START_BLOCK]
// Маркеры монетизаций на прогресс-баре (клик = перемотка, A-C003-02) +
// визуальный таймлайн (цветные точки по времени видео).
import type { Passport } from "../../data/types";
import { monetizationLabel } from "../../data/labels";
import type { PlayerHandle } from "../rutube";
import { sceneStarts, videoDuration, fmtTime } from "./layout";

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
      const meta = monetizationLabel(m.type);
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
 * Визуальный таймлайн: цветные точки-метки по шкале длительности, клик = seek.
 * Возвращает cleanup (отписка от timeupdate playhead'а).
 */
export function renderMarkerTimeline(
  container: HTMLElement,
  player: PlayerHandle,
  passport: Passport,
): () => void {
  const markers = collectMarkers(passport);
  const duration = videoDuration(passport);
  const box = document.createElement("div");
  box.className = "rz-marker-timeline";
  box.style.cssText = "margin:8px 0;";

  const strip = document.createElement("div");
  strip.style.cssText =
    "position:relative;height:14px;border-radius:7px;background:rgba(255,255,255,0.08);border:1px solid #33363f;overflow:hidden;";

  const playhead = document.createElement("div");
  playhead.style.cssText =
    "position:absolute;top:0;bottom:0;width:2px;background:#fb5f93;z-index:1;left:0;transition:left .3s linear;";
  playhead.title = "00:00";
  const set = () => {
    const t = duration ? (player.getCurrentTime() / duration) * 100 : 0;
    playhead.style.left = `${Math.max(0, Math.min(100, t))}%`;
    playhead.title = fmtTime(player.getCurrentTime());
  };

  for (const mk of markers) {
    const dot = document.createElement("div");
    dot.style.cssText =
      `position:absolute;top:1px;left:${duration ? (mk.startSec / duration) * 100 : 0}%;` +
      `width:12px;height:12px;border-radius:50%;background:${mk.color};` +
      "cursor:pointer;transform:translateX(-50%);box-shadow:0 0 0 2px #1b2030;z-index:2;";
    dot.title = `${mk.label} @${fmtTime(mk.startSec)}`;
    dot.addEventListener("click", () => player.seekTo(mk.startSec));
    strip.append(dot);
  }
  strip.append(playhead);
  box.append(strip);

  const legend = document.createElement("div");
  legend.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;";
  const seen = new Map<string, string>();
  for (const mk of markers) if (!seen.has(mk.type)) seen.set(mk.type, mk.color);
  for (const [type, color] of seen) {
    const l = monetizationLabel(type);
    const chip = document.createElement("span");
    chip.className = "rz-chip";
    chip.style.background = color;
    chip.style.color = "#0b0e1a";
    chip.style.fontSize = "11px";
    chip.textContent = `${l.icon} ${l.short}`;
    legend.append(chip);
  }
  if (markers.length === 0) {
    legend.append(Object.assign(document.createElement("span"), { className: "rz-muted", textContent: "нет монетизации" }));
  }
  box.append(legend);

  player.video?.addEventListener("timeupdate", set);
  set();
  container.append(box);
  return () => player.video?.removeEventListener("timeupdate", set);
}

/**
 * Рендер чипов-маркеров. Сохранено .rz-chip для совместимости (клик = seek).
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