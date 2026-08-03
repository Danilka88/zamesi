// [M-EXTENSION][VIEWER-MODE][START_BLOCK]
// Режим «Зритель»: маркеры (P4) + панель текущей сцены (P4) + демо-CTA (P5).
import type { ModeData } from "../modes";
import type { PlayerHandle } from "../rutube";
import { renderMarkers } from "./markers";
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

  renderMarkers(container, player, data.passport);
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
    cleanupOverlay();
    player.video?.removeEventListener("timeupdate", tickCta);
  };
}
// = [M-EXTENSION][VIEWER-MODE][END_BLOCK]