// [M-EXTENSION][STUDIO][VIDEOLIST][OVERLAY][START_BLOCK]
// Оверлей продвижения на странице-списке видео Studio.
// Клик по кнопке «🚀 Продвижение» → полноэкранный детерминированный блок
// из паспорта (Яндекс Директ / VK / MyTarget) — Variant A.
// Переиспользует buildPromotionBundle + renderPromotionBlock, но без зависимости
// от формы редактора (stub StudioFormHandles).
import type { PromotionBundle } from "../promotion";
import { renderPromotionBlock } from "./promotion";
import type { StudioFormHandles } from "../selectors";

function makeStubForm(): StudioFormHandles {
  return {
    modal: document.body as unknown as HTMLElement,
    title: null,
    description: null,
    categoryInput: null,
    playlistsHidden: null,
    accessHidden: null,
    disclaimersHidden: null,
    publishNow: null,
    publishDelayed: null,
    isAdult: null,
    withComments: null,
    playlistSearch: null,
    submit: null,
  };
}

let overlayEl: HTMLElement | null = null;
let escHandler: ((e: KeyboardEvent) => void) | null = null;

function closeOverlay(): void {
  if (escHandler) window.removeEventListener("keydown", escHandler);
  escHandler = null;
  overlayEl?.remove();
  overlayEl = null;
  document.body.style.overflow = "";
}

function makeToast(container: HTMLElement): (msg: string) => void {
  let toastEl: HTMLElement | null = null;
  let timer = 0;
  return (msg: string) => {
    if (!toastEl || !toastEl.isConnected) {
      toastEl = document.createElement("div");
      toastEl.setAttribute("role", "status");
      toastEl.style.cssText =
        "position:fixed;bottom:18px;left:50%;transform:translateX(-50%);" +
        "background:#0e0f16;color:#e7e9f0;border:1px solid #fb5f93;border-radius:999px;" +
        "padding:7px 16px;font-size:12px;opacity:0;transition:opacity .25s;z-index:2147483647;pointer-events:none;";
      container.append(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = "1";
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (toastEl) toastEl.style.opacity = "0";
    }, 1600);
  };
}

export function openVideoListPromoOverlay(bundle: PromotionBundle, videoId: string): void {
  closeOverlay();

  const overlay = document.createElement("div");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Продвижение видео");
  overlay.dataset.rzPromoOverlay = "1";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:2147483646;" +
    "background:rgba(8,10,16,.78);backdrop-filter:blur(4px);" +
    "display:flex;align-items:center;justify-content:center;padding:16px;";

  const panel = document.createElement("div");
  panel.style.cssText =
    "width:100%;max-width:720px;max-height:calc(100vh - 32px);overflow:auto;" +
    "background:rgba(14,16,24,0.98);border:1px solid #33363f;border-radius:16px;" +
    "box-shadow:0 20px 60px rgba(0,0,0,.6);padding:14px;" +
    "font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#e8eaf0;font-size:13px;line-height:1.5;box-sizing:border-box;";

  const head = document.createElement("div");
  head.style.cssText = "display:flex;align-items:center;gap:10px;padding:2px 2px 10px;border-bottom:1px solid #33363f;margin-bottom:10px;position:sticky;top:0;background:rgba(14,16,24,0.98);z-index:1;";
  const icon = document.createElement("div");
  icon.style.cssText =
    "width:30px;height:30px;border-radius:10px;flex:none;display:flex;align-items:center;justify-content:center;" +
    "background:linear-gradient(135deg,#fb5f93,#a855f7);font-size:15px;";
  icon.textContent = "🚀";
  const titleWrap = document.createElement("div");
  titleWrap.style.cssText = "flex:1;min-width:0;";
  const title = document.createElement("div");
  title.style.cssText = "font-weight:800;font-size:14px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
  title.textContent = `Продвижение видео · ${videoId}`;
  const sub = document.createElement("div");
  sub.style.cssText = "font-size:11px;color:#9aa1b5;";
  sub.textContent = "Готовые объявления из паспорта — RUTUBE (нативно) · Яндекс Директ · VK Реклама · MyTarget (демо)";
  titleWrap.append(title, sub);
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "✕ Закрыть";
  closeBtn.setAttribute("aria-label", "Закрыть");
  closeBtn.style.cssText =
    "flex:none;background:#1a2030;color:#cfd4e3;border:1px solid #33363f;border-radius:9px;" +
    "padding:6px 12px;cursor:pointer;font-size:12px;font-weight:600;";
  head.append(icon, titleWrap, closeBtn);
  panel.append(head);

  const content = document.createElement("div");
  const toast = makeToast(overlay);
  const stubForm = makeStubForm();
  const promoBlock = renderPromotionBlock(bundle, { form: stubForm, toast, videoId });
  content.append(promoBlock);
  panel.append(content);

  // footer дисклеймер уже внутри renderPromotionBlock

  overlay.append(panel);
  document.body.append(overlay);
  overlayEl = overlay;
  document.body.style.overflow = "hidden";

  const onEsc = (e: KeyboardEvent): void => {
    if (e.key === "Escape") closeOverlay();
  };
  escHandler = onEsc;
  window.addEventListener("keydown", escHandler);
  closeBtn.addEventListener("click", closeOverlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeOverlay();
  });
  closeBtn.focus();
}

export function closeVideoListPromoOverlay(): void {
  closeOverlay();
}

export function isVideoListPromoOpen(): boolean {
  return overlayEl !== null && overlayEl.isConnected;
}

// = [M-EXTENSION][STUDIO][VIDEOLIST][OVERLAY][END_BLOCK]
