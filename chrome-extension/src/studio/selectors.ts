// [M-EXTENSION][STUDIO][SELECTORS][START_BLOCK]
// Селекторы окна редактора RUTUBE Studio (studio.rutube.ru). React SPA рендерит
// модалку клиентски, CSS-классы хэшированы (__studio_*_v1-39-0), поэтому как и в
// rutube.ts — эмпирические селекторы + каскад фолбэков. Все поиски скоупированы
// модалкой [data-testid="video-editor-layout"], чтобы не зацепить поля других форм.

export const MODAL_SELECTOR = '[data-testid="video-editor-layout"]';

/** Кандидат модалки: ближайший контейнер поля title (overlay/dialog). */
function containerOf(el: HTMLElement): HTMLElement | null {
  let cur: HTMLElement | null = el.parentElement;
  while (cur && cur !== document.body) {
    const r = cur.getAttribute("role");
    if (r === "dialog" || r === "overlay") return cur;
    if (cur.dataset.testid && String(cur.dataset.testid).toLowerCase().includes("editor")) return cur;
    cur = cur.parentElement;
  }
  return null;
}

export interface StudioFormHandles {
  modal: HTMLElement;
  title: HTMLInputElement | null;
  description: HTMLTextAreaElement | null;
  categoryInput: HTMLInputElement | null;
  playlistsHidden: HTMLInputElement | null;
  accessHidden: HTMLInputElement | null;
  disclaimersHidden: HTMLInputElement | null;
  publishNow: HTMLInputElement | null;
  publishDelayed: HTMLInputElement | null;
  isAdult: HTMLInputElement | null;
  withComments: HTMLInputElement | null;
  playlistSearch: HTMLInputElement | null;
  submit: HTMLButtonElement | null;
}

const TITLE_SELECTORS = ['input[name="title"]', 'input[placeholder*="назван"]'];
const DESC_SELECTORS = ['textarea[name="description"]', 'textarea[placeholder*="о чём ваше видео"]'];
const CATEGORY_SELECTORS = [
  '[data-control-name="category"] input[type="text"]',
  '[data-control-name="category"] input',
  'input[placeholder*="Выберите категорию"]',
];
const PLAYLIST_SEARCH_SELECTORS = [
  '[data-control-name*="playlist"] input[type="text"]',
  '[data-control-name*="playlist"] input',
  '[data-control-name="playlists"] input[type="text"]',
  'input[placeholder*="плейлист"]',
  'input[placeholder*="Плейлист"]',
  'input[placeholder*="Поиск"]',
  'input[name="playlist"]',
];
const SUBMIT_SELECTORS = ['button[type="submit"][form]', 'button[type="submit"]'];

function firstWithin<T extends HTMLElement>(root: ParentNode, selectors: string[]): T | null {
  for (const sel of selectors) {
    try {
      const el = root.querySelector<T>(sel);
      if (el) return el;
    } catch {
      /* невалидный селектор — пропускаем */
    }
  }
  return null;
}

export function findStudioModal(): HTMLElement | null {
  const primary = document.querySelector<HTMLElement>(MODAL_SELECTOR);
  if (primary) return primary;
  const title = document.querySelector<HTMLElement>('input[name="title"]');
  if (title) return containerOf(title) ?? title.closest("form") ?? title;
  return null;
}

/** Захватить хендлы полей формы в пределах модалки. */
export function captureStudioForm(modal: HTMLElement): StudioFormHandles {
  return {
    modal,
    title: firstWithin<HTMLInputElement>(modal, TITLE_SELECTORS),
    description: firstWithin<HTMLTextAreaElement>(modal, DESC_SELECTORS),
    categoryInput: firstWithin<HTMLInputElement>(modal, CATEGORY_SELECTORS),
    playlistsHidden: modal.querySelector<HTMLInputElement>('input[name="playlists"]'),
    accessHidden: modal.querySelector<HTMLInputElement>('input[name="access"]'),
    disclaimersHidden: modal.querySelector<HTMLInputElement>('input[name="disclaimers"]'),
    publishNow: modal.querySelector<HTMLInputElement>('input[value="now"]'),
    publishDelayed: modal.querySelector<HTMLInputElement>('input[value="delayed"]'),
    isAdult: modal.querySelector<HTMLInputElement>('input[name="isAdult"]'),
    withComments: modal.querySelector<HTMLInputElement>('input[name="withComments"]'),
    playlistSearch: firstWithin<HTMLInputElement>(modal, PLAYLIST_SEARCH_SELECTORS),
    submit: firstWithin<HTMLButtonElement>(modal, SUBMIT_SELECTORS),
  };
}
// = [M-EXTENSION][STUDIO][SELECTORS][END_BLOCK]