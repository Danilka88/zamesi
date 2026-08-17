// [M-EXTENSION][STUDIO][RENDER][DRAG][START_BLOCK]
// Перетаскивание панели мышью + персистентность позиции/свёрнутости в
// localStorage. Позиция хранится в виде {left, top} на fixed-предке root.
export const POS_KEY = "rz_studio_pos";
export const COL_KEY = "rz_studio_collapsed";

export function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function safeSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch { /* noop */ }
}

/** Ближайший fixed/absolute предок — то, что будем двигать при drag. */
export function positionedAncestor(el: HTMLElement): HTMLElement | null {
  let cur: HTMLElement | null = el;
  while (cur && cur !== document.documentElement) {
    if (getComputedStyle(cur).position === "fixed" || getComputedStyle(cur).position === "absolute") return cur;
    cur = cur.parentElement;
  }
  return null;
}

/** Перетаскивание панели мышью (drag из заголовка, кнопки не трогаем). */
export function enableDrag(handle: HTMLElement, root: HTMLElement): void {
  const posEl = positionedAncestor(root);
  if (!posEl) return;
  let dragging = false;
  let startX = 0, startY = 0, origLeft = 0, origTop = 0;
  handle.addEventListener("pointerdown", (e) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    origLeft = posEl.offsetLeft; origTop = posEl.offsetTop;
    handle.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    posEl.style.left = `${origLeft + dx}px`;
    posEl.style.top = `${origTop + dy}px`;
    posEl.style.right = "auto";
  });
  const stop = (): void => {
    if (!dragging) return;
    dragging = false;
    safeSet(POS_KEY, JSON.stringify({ left: posEl.style.left, top: posEl.style.top }));
  };
  handle.addEventListener("pointerup", stop);
  handle.addEventListener("pointercancel", stop);
}

/** Применить сохранённую позицию к fixed-предку root (если есть). */
export function restorePosition(root: HTMLElement): void {
  const storedPos = safeGet(POS_KEY);
  if (!storedPos) return;
  try {
    const p = JSON.parse(storedPos) as { left?: string; top?: string };
    const posEl = positionedAncestor(root);
    if (posEl && p.left && p.top) {
      posEl.style.left = p.left;
      posEl.style.top = p.top;
      posEl.style.right = "auto";
    }
  } catch { /* noop */ }
}
// = [M-EXTENSION][STUDIO][RENDER][DRAG][END_BLOCK]