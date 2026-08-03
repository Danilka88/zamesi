// [M-EXTENSION][SHADOW][START_BLOCK]
// Shadow DOM-хост: изоляция стилей панелей от CSS страницы (NFR-6).
export const HOST_ID = "rz-host";

export interface ExtensionHost {
  host: HTMLElement;
  root: ShadowRoot;
  /** Корневой контейнер для панелей (viewer/analyst/simulation). */
  panel: HTMLElement;
}

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
`;

/** Смонтировать/получить хост на выбранном контейнере. */
export function mountHost(container: ParentNode = document.body): ExtensionHost {
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
  panel.style.position = "absolute";
  panel.style.zIndex = "9999";
  shadow.append(style, panel);
  container.append(host);
  return { host, root: shadow, panel };
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
  return { host, root, panel };
}

export function unmountHost(): void {
  document.getElementById(HOST_ID)?.remove();
}
// = [M-EXTENSION][SHADOW][END_BLOCK]