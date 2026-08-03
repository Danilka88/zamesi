// [M-EXTENSION][VIEWER-MODE][START_BLOCK]
// Режим «Зритель»: таймлайн монетизаций (P4) + карточка текущей сцены + демо-CTA (P5).
import type { ModeData } from "../modes";
import type { PlayerHandle } from "../rutube";
import { renderMarkerTimeline, renderMarkers } from "./markers";
import { renderSceneOverlay, currentScene } from "./sceneOverlay";
import { renderCta } from "./cta";

export function renderViewer(
  container: HTMLElement,
  player: PlayerHandle,
  data: ModeData,
): () => void {
  const title = document.createElement("div");
  title.className = "rz-title";
  title.textContent = `👁 Зритель · ${data.passport.frontmatter.seo_title || "Демо-видео"}`;
  container.append(title);

  // Часто используемые типы — чипы-«атомы» для быстрой перемотки
  renderMarkers(container, player, data.passport);
  const cleanupTimeline = renderMarkerTimeline(container, player, data.passport);
  const cleanupOverlay = renderSceneOverlay(container, player, data.passport);

  // CTA зависит от текущей сцены при перемотке
  const ctaSlot = document.createElement("div");
  container.append(ctaSlot);
  const tickCta = () => {
    ctaSlot.innerHTML = "";
    const { scene } = currentScene(data.passport, player.getCurrentTime());
    renderCta(ctaSlot, scene);
  };
  tickCta();
  player.video?.addEventListener("timeupdate", tickCta);

  return () => {
    cleanupTimeline();
    cleanupOverlay();
    player.video?.removeEventListener("timeupdate", tickCta);
  };
}
// = [M-EXTENSION][VIEWER-MODE][END_BLOCK]