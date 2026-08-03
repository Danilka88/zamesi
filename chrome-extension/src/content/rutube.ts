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

/** Ждать появления видео-элемента (SPA может монтировать плеер с задержкой). */
export function waitForPlayer(timeoutMs = 8000): Promise<PlayerHandle> {
  const probe = capturePlayer();
  if (probe.video) return Promise.resolve(probe);
  return new Promise((resolve) => {
    const started = performance.now();
    const timer = window.setInterval(() => {
      const p = capturePlayer();
      if (p.video || performance.now() - started > timeoutMs) {
        clearInterval(timer);
        resolve(capturePlayer());
      }
    }, 300);
  });
}
// = [M-EXTENSION][RUTUBE][END_BLOCK]