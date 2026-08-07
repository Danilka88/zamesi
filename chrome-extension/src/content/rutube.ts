// [M-EXTENSION][RUTUBE][START_BLOCK]
// Селекторы и адаптер плеера. Плеер RUTUBE рендерится клиентски (React SPA,
// федеративные модули Woodpecker), поэтому селекторы эмпирические + каскад
// фолбэков. На дев-мок-странице те же селекторы, чтобы автотесты работали без сети.
export interface PlayerHandle {
  video: HTMLVideoElement | null;
  progressBar: HTMLElement | null;
  timecode: HTMLElement | null;
  getDuration(): number;
  getCurrentTime(): number;
  seekTo(sec: number): void;
}

const VIDEO_SELECTORS = [
  "video",
  "video[src]",
  "main video",
  '[class*="player"] video',
  '[data-testid*="player"] video',
];

const PROGRESS_SELECTORS = [
  '[class*="progress"]',
  '[class*="timeline"]',
  '.player-progress',
  'input[type="range"]',
];

const TIMECODE_SELECTORS = [
  '[class*="timecode"]',
  '[class*="time-text"]',
  '[class*="duration"]',
  'span[class*="time"]',
];

// Правый сайдбар страницы видео (React монтирует его клиентски). Классы — это
// CSS-модули Woodpecker, поэтому каскад фолбэков как у плеера.
const SIDEBAR_SELECTORS = [
  ".side-container-module__side",
  ".video-page-layout-module__side",
  ".video-page-layout-module__right",
];

function first(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) return el as HTMLElement;
    } catch {
      /* невалидный селектор — пропускаем */
    }
  }
  return null;
}

export function capturePlayer(): PlayerHandle {
  const video = first(VIDEO_SELECTORS) as HTMLVideoElement | null;
  const progressBar = first(PROGRESS_SELECTORS);
  const timecode = first(TIMECODE_SELECTORS);
  return {
    video,
    progressBar,
    timecode,
    getDuration: () => (video && Number.isFinite(video.duration) ? video.duration : 0),
    getCurrentTime: () => (video ? video.currentTime : 0),
    seekTo: (sec) => {
      if (video) {
        video.currentTime = sec;
        void video.play().catch(() => undefined);
      }
    },
  };
}

/**
 * Универсальный poller: опрашивает probe каждые intervalMs до появления
 * не-null значения или до истечения timeoutMs. Возвращает null по таймауту.
 * Единая точка для всех waitFor* — один тестируемый код-путь.
 */
export function waitFor<T>(
  probe: () => T | null,
  timeoutMs: number,
  intervalMs = 300,
): Promise<T | null> {
  const immediate = probe();
  if (immediate !== null) return Promise.resolve(immediate);
  return new Promise((resolve) => {
    const started = performance.now();
    const timer = window.setInterval(() => {
      const value = probe();
      if (value !== null || performance.now() - started > timeoutMs) {
        clearInterval(timer);
        resolve(value);
      }
    }, intervalMs);
  });
}

/** Ждать появления видео-элемента (SPA может монтировать плеер с задержкой). */
export function waitForPlayer(timeoutMs = 8000): Promise<PlayerHandle> {
  return waitFor(() => {
    const p = capturePlayer();
    return p.video ? p : null;
  }, timeoutMs).then((p) => p ?? capturePlayer());
}

// Строка мета-данных («информация о видео») — якорь для игрового оффер-блока.
export const META_ROW_SELECTOR = 'section[aria-label="информация о видео"]';

/** Найти правый сайдбар под панель расширения (или null). */
export function findSidebar(): HTMLElement | null {
  return first(SIDEBAR_SELECTORS);
}

/** Ждать появления meta-row (React SPA монтирует его клиентски). Возвращает null по таймауту. */
export function waitForMetaRow(timeoutMs = 8000): Promise<HTMLElement | null> {
  return waitFor(() => document.querySelector<HTMLElement>(META_ROW_SELECTOR), timeoutMs);
}

/** Ждать появления сайдбара (SPA монтирует его клиентски). Возвращает null по таймауту. */
export function waitForSidebar(timeoutMs = 8000): Promise<HTMLElement | null> {
  return waitFor(() => findSidebar(), timeoutMs);
}
// = [M-EXTENSION][RUTUBE][END_BLOCK]