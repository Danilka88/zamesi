// [M-EXTENSION][CTA][START_BLOCK]
// Демо-CTA: товар/билет/афиша/мерч по типу монетизации (A-C003-05).
import type { SceneAnalysisResult } from "../../data/types";
import { MONETIZATION_LABELS } from "../../data/labels";

export interface CtaView {
  title: string;
  subtitle: string;
  ctaText: string;
}

function ctaFor(m: SceneAnalysisResult["monetization"][number]): CtaView {
  const l = MONETIZATION_LABELS[m.type];
  switch (m.type) {
    case "ecom_item":
      return { title: "Купить товар", subtitle: m.search_query ?? l.label, ctaText: "🔥 Купить" };
    case "event_ticket":
      return { title: "Билет на событие", subtitle: m.search_query ?? "Концерт / событие", ctaText: "🎫 Билеты" };
    case "artist_merch":
      return { title: "Мерч артиста", subtitle: m.search_query ?? l.label, ctaText: "👕 Мерч" };
    case "music_track":
      return { title: "Слушать трек", subtitle: m.search_query ?? l.label, ctaText: "🎵 Слушать" };
    case "clip_candidate":
      return { title: "Клип-фрагмент", subtitle: m.reason ?? "Вырезать клип", ctaText: "✂️ Клип" };
    default:
      return { title: l.label, subtitle: m.reason ?? "", ctaText: "Подробнее" };
  }
}

/** Рендер демо-CTA текущей сцены (без внешних переходов — NFR-7). */
export function renderCta(container: HTMLElement, scene: SceneAnalysisResult): void {
  const monet = scene.monetization.filter((m) => m.type !== "ad_slot");
  if (!monet.length) return;
  const wrap = document.createElement("div");
  wrap.style.cssText = "margin-top:8px;";
  wrap.innerHTML = `<div class="rz-title" style="font-size:12px">💡 Демо-монетизация</div>`;
  for (const m of monet.slice(0, 3)) {
    const v = ctaFor(m);
    const card = document.createElement("div");
    card.className = "rz-row";
    card.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;gap:8px;background:#1b2030;border:1px solid #2b3144;border-radius:8px;padding:7px 9px;";
    card.innerHTML = `
      <div>
        <div style="font-weight:700">${v.title}</div>
        <div class="rz-muted">${v.subtitle}</div>
      </div>
      <button class="rz-btn" type="button" data-cta>${v.ctaText}</button>
    `;
    card.querySelector<HTMLElement>("[data-cta]")!.addEventListener("click", () => {
      card.querySelector<HTMLElement>("[data-cta]")!.textContent = "Открыть (демо)";
    });
    wrap.append(card);
  }
  container.append(wrap);
}
// = [M-EXTENSION][CTA][END_BLOCK]