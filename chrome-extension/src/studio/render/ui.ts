// [M-EXTENSION][STUDIO][RENDER][UI][START_BLOCK]
// UI-примитивы панели AI-ассистента Studio: палитра, карточки, чипы, кнопки,
// toast. Чистые DOM-хелперы без состояния модуля (тестируются через render).
import { ACCENT, ACCENT_2, GRID, BG_CARD, MUTED } from "./theme";

export type ShowToast = (text: string) => void;

/** Карточка-секция с заголовком, подзаголовком и акцентной полосой слева. */
export function box(title: string, sub?: string, accent = false): HTMLElement {
  const b = document.createElement("div");
  b.style.cssText = `padding:10px 12px;margin-bottom:10px;border:1px solid ${GRID};` +
    `border-left:3px solid ${accent ? ACCENT : "#3d4457"};border-radius:12px;background:${BG_CARD};`;
  const h = document.createElement("div");
  h.className = "rz-title";
  h.style.cssText = "font-weight:700;margin:0 0 6px;font-size:13px;letter-spacing:.1px;";
  h.textContent = title;
  b.append(h);
  if (sub) {
    const s = document.createElement("div");
    s.style.cssText = `font-size:11px;color:${MUTED};margin-bottom:8px;line-height:1.45;`;
    s.textContent = sub;
    b.append(s);
  }
  return b;
}

/** Чип-кнопка (вариант, категория, чекбокс-подсказка). accent — выделенный. */
export function chip(label: string, onClick: () => void, accent = false): HTMLElement {
  const c = document.createElement("button");
  c.type = "button";
  c.className = "rz-chip";
  c.textContent = label;
  c.style.cssText = `display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 11px;` +
    `margin:2px 4px 4px 0;font-size:12px;cursor:pointer;border:1px solid ${accent ? ACCENT : GRID};` +
    `background:${accent ? "#2a2030" : "#1a2030"};color:${accent ? ACCENT : "#e7e9f0"};` +
    "transition:transform .1s, box-shadow .15s, border-color .15s;";
  c.addEventListener("click", onClick);
  return c;
}

/** Основная кнопка действия (градиент, на всю ширину). */
export function applyBtn(label: string, onClick: () => void): HTMLElement {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.style.cssText = `background:linear-gradient(135deg,${ACCENT},${ACCENT_2});color:#fff;border:0;` +
    "border-radius:10px;padding:9px 14px;cursor:pointer;font-weight:700;font-size:12.5px;" +
    "width:100%;box-shadow:0 4px 14px rgba(251,95,147,.25);transition:transform .1s, box-shadow .15s;" +
    "margin-top:10px;";
  b.addEventListener("click", onClick);
  return b;
}

/** Toast внизу экрана (fixed), привязан к root для автоудаления. */
export function makeToast(root: HTMLElement): { toast: HTMLElement; show: ShowToast; clear: () => void } {
  const toast = document.createElement("div");
  toast.classList.add("rz-toast");
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.style.cssText = `position:fixed;bottom:18px;left:50%;transform:translateX(-50%);` +
    `background:#0e0f16;color:#e7e9f0;border:1px solid ${ACCENT};border-radius:999px;` +
    "padding:7px 16px;font-size:12px;opacity:0;transition:opacity .25s;z-index:99999;pointer-events:none;";
  root.append(toast);
  let timer = 0;
  const show: ShowToast = (text: string) => {
    toast.textContent = text;
    toast.style.opacity = "1";
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      toast.style.opacity = "0";
    }, 1600);
  };
  const clear = (): void => window.clearTimeout(timer);
  return { toast, show, clear };
}
// = [M-EXTENSION][STUDIO][RENDER][UI][END_BLOCK]