// [M-EXTENSION][SHADOW][START_BLOCK]
// Shadow DOM-хост: изоляция стилей панелей от CSS страницы (NFR-6).
export const HOST_ID = "rz-host";

export interface ExtensionHost {
  host: HTMLElement;
  root: ShadowRoot;
  /** Корневой контейнер для панелей (viewer/analyst/simulation). */
  panel: HTMLElement;
  /** Отключить наблюдатели (вызывается при демонтаже хоста). */
  disconnect?: () => void;
}

const observers = new WeakMap<HTMLElement, MutationObserver | null>();

const CSS = `
  :host { all: initial; }
  .rz-root {
    box-sizing: border-box;
    color: #e8eaf0;
    background: rgba(23, 29, 44, 0.92);
    border: 1px solid #384058;
    border-radius: 12px;
    padding: 12px 14px;
    font-size: 13px;
    line-height: 1.5;
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 8px 30px rgba(0,0,0,0.45);
    backdrop-filter: blur(6px);
  }
  .rz-chip {
    display: inline-flex; align-items: center; gap: 6px;
    border-radius: 999px; padding: 3px 9px; margin: 2px;
    font-size: 12px; cursor: pointer; border: 1px solid transparent;
  }
  .rz-chip:hover { transform: translateY(-1px); }
  .rz-title { font-weight: 700; margin: 0 0 8px; }
  .rz-muted { color: #9aa1b5; font-size: 12px; }
  .rz-row { margin: 6px 0; }
  .rz-btn {
    background: #fb5f93; color: #fff; border: 0; border-radius: 8px;
    padding: 7px 12px; cursor: pointer; font-weight: 700;
  }
  .rz-btn:hover { filter: brightness(1.08); }
  .rz-toggle {
    display: inline-flex; gap: 4px; margin-bottom: 10px;
  }
  .rz-toggle button {
    background: #232838; color: #cfd4e3; border: 1px solid #384058;
    border-radius: 8px; padding: 5px 10px; cursor: pointer; font-size: 12px;
  }
  .rz-toggle button.active { background: #fb5f93; color: #fff; border-color: #fb5f93; }
  .rz-toggle.wide button { padding: 7px 14px; font-size: 13px; }
  .rz-expand:hover, .rz-modal-close:hover { filter: brightness(1.15); }
`;

/**
 * Смонтировать/получить хост на выбранном контейнере.
 * opts.fixed=false — потоковое размещение внутри контейнера (например, сайдбар);
 * opts.fixed=true — overlay поверх страницы справа вверху (фолбэк).
 */
export function mountHost(
  container: ParentNode = document.body,
  opts?: { fixed?: boolean },
): ExtensionHost {
  const fixed = opts?.fixed ?? true;
  const existing = document.getElementById(HOST_ID) as HTMLElement | null;
  if (existing?.shadowRoot) {
    return readHost(existing);
  }
  const host = document.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = CSS;
  const panel = document.createElement("div");
  panel.className = "rz-root";
  if (fixed) {
    panel.style.position = "fixed";
    panel.style.top = "96px";
    panel.style.right = "16px";
    panel.style.zIndex = "2147483647";
    panel.style.maxWidth = "360px";
  } else {
    panel.style.position = "static";
    panel.style.marginBottom = "16px";
    panel.style.maxWidth = "360px";
  }
  shadow.append(style, panel);
  container.append(host);
  // SPA (React Woodpecker) может перерисовать контейнер и вычистить наш хост.
  // Наблюдаем и возвращаем его первым ребёнком (только для потокового режима).
  let observer: MutationObserver | null = null;
  if (!fixed && typeof MutationObserver !== "undefined") {
    observer = new MutationObserver(() => {
      if (!host.isConnected) container.prepend(host);
    });
    observer.observe(container, { childList: true });
  }
  observers.set(host, observer);
  return {
    host,
    root: shadow,
    panel,
    disconnect: () => observer?.disconnect(),
  };
}

export function readHost(host: HTMLElement): ExtensionHost {
  const root = host.shadowRoot!;
  const panel =
    root.querySelector<HTMLElement>(".rz-root") ?? (() => {
      const p = document.createElement("div");
      p.className = "rz-root";
      root.appendChild(p);
      return p;
    })();
  const observer = observers.get(host);
  return { host, root, panel, disconnect: () => observer?.disconnect() };
}

export function unmountHost(): void {
  const host = document.getElementById(HOST_ID);
  if (host) {
    readHost(host).disconnect?.();
    host.remove();
    observers.delete(host);
  }
}
// = [M-EXTENSION][SHADOW][END_BLOCK]