// [M-EXTENSION][MODES][START_BLOCK]
// Оркестратор режимов: Зритель / Аналитик / Симуляция / Автор. Переключение
// сохраняет данные (паспорт, метрики, заголовок, video_id) и текущий выбор (A-C003-05).
// Полноширинная модалка (expand): дублирует таббар всех 4 режимов. Пока открыта,
// сайдбар приостановлен — нет двойных timeupdate-листенеров и таймеров симуляции.
import type { ViewerMode } from "../data/types";
import type { ExtensionHost } from "./shadow";
import type { PlayerHandle } from "./rutube";
import { renderViewer } from "./render/viewerMode";
import { renderAnalyst } from "./render/analystMode";
import { renderSimulation } from "./render/simulationMode";
import { mountAuthorTools } from "./authorTools";

export interface ModeData {
  passport: import("../data/types").Passport;
  metrics: import("../data/types").JobMetrics;
  /** Родной заголовок страницы — для A/B-вариантов (вкладка «Автор»). */
  title?: string;
  /** Реальный video_id RUTUBE — детерминированный seed генерации. */
  videoId?: string;
}

type Cleanup = () => void;
const noop: Cleanup = () => undefined;

const TABS: { id: ViewerMode; label: string }[] = [
  { id: "simulation", label: "⚙️ Симуляция" },
  { id: "analyst", label: "📊 Аналитик" },
  { id: "viewer", label: "👁 Зритель" },
  { id: "author", label: "✍️ Автор" },
];

export class ModesController {
  private mode: ViewerMode = "simulation";
  private cleanup: Cleanup = noop;
  #modal: HTMLElement | null = null;
  #modalMode: ViewerMode = "simulation";
  #modalBody: HTMLElement | null = null;
  #modalCleanup: Cleanup = noop;
  #modalKey: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    private host: ExtensionHost,
    private player: PlayerHandle,
    private data: ModeData,
    private initialMode: ViewerMode = "simulation",
  ) {
    this.mode = this.initialMode;
  }

  get current(): ViewerMode {
    return this.mode;
  }

  get isExpanded(): boolean {
    return this.#modal !== null;
  }

  setMode(next: ViewerMode): void {
    if (this.#modal) {
      // Сайдбар приостановлен — переключаем вкладку модалки.
      this.#switchModal(next);
      return;
    }
    this.mode = next;
    this.render();
  }

  render(): void {
    this.cleanup();
    const { panel } = this.host;
    panel.innerHTML = "";

    const toolbar = document.createElement("div");
    toolbar.className = "rz-toolbar";
    toolbar.style.cssText = "display:flex;align-items:center;gap:4px;margin-bottom:10px;";
    const tabs = this.#buildTabs("rz-toggle", (m) => this.setMode(m), this.mode);
    tabs.style.marginBottom = "0";
    const expand = document.createElement("button");
    expand.type = "button";
    expand.className = "rz-expand";
    expand.textContent = "⛶";
    expand.title = "Развернуть на весь экран";
    expand.style.cssText =
      "margin-left:auto;background:#232838;color:#cfd4e3;border:1px solid #384058;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:12px;";
    expand.addEventListener("click", () => this.expand());
    toolbar.append(tabs, expand);
    panel.append(toolbar);

    const content = document.createElement("div");
    panel.append(content);
    this.cleanup = this.#renderInto(content, this.mode, false);
  }

  /** Полноширинная модалка со всеми вкладками (внутри shadow root). */
  expand(): void {
    if (this.#modal) return;
    this.cleanup();
    this.cleanup = noop;
    this.host.panel.innerHTML = ""; // сайдбар приостановлен полностью

    const overlay = document.createElement("div");
    overlay.className = "rz-modal-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;background:rgba(8,10,16,0.82);" +
      "display:flex;align-items:center;justify-content:center;padding:16px;";
    const win = document.createElement("div");
    win.className = "rz-modal";
    win.style.cssText =
      "width:calc(100vw - 32px);max-width:none;height:calc(100vh - 32px);max-height:none;" +
      "overflow:auto;background:#10131c;border:1px solid #384058;border-radius:14px;" +
      "box-sizing:border-box;color:#e8eaf0;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;" +
      "font-size:13px;line-height:1.5;display:flex;flex-direction:column;";
    const head = document.createElement("div");
    head.style.cssText =
      "display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #384058;flex:none;";
    const title = document.createElement("div");
    title.style.cssText = "font-weight:800;font-size:15px;flex:1;";
    title.textContent = "🧰 Инструменты RUTUBE · полный экран";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "rz-modal-close";
    close.textContent = "✕ Закрыть";
    close.style.cssText =
      "background:#232838;color:#cfd4e3;border:1px solid #384058;border-radius:8px;padding:5px 12px;cursor:pointer;font-size:12px;";
    head.append(title, close);
    const body = document.createElement("div");
    body.style.cssText = "flex:1;overflow:auto;padding:14px 16px;";
    win.append(head, body);
    overlay.append(win);
    this.host.root.append(overlay);

    this.#modal = overlay;
    this.#modalBody = body;
    this.#modalMode = this.mode;
    this.#paintModal();

    this.#modalKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") this.closeModal();
    };
    close.addEventListener("click", () => this.closeModal());
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.closeModal();
    });
    window.addEventListener("keydown", this.#modalKey);
  }

  closeModal(): void {
    if (!this.#modal) return;
    this.#modalCleanup();
    this.#modalCleanup = noop;
    if (this.#modalKey) window.removeEventListener("keydown", this.#modalKey);
    this.#modalKey = null;
    this.#modal.remove();
    this.#modal = null;
    this.#modalBody = null;
    this.render(); // восстановить сайдбар
  }

  destroy(): void {
    if (this.#modal) this.closeModal();
    this.cleanup();
    this.cleanup = noop;
  }

  #paintModal(): void {
    this.#modalCleanup();
    const body = this.#modalBody;
    if (!body) return;
    body.innerHTML = "";
    const tabs = this.#buildTabs("rz-toggle wide", (m) => this.#switchModal(m), this.#modalMode);
    body.append(tabs);
    const area = document.createElement("div");
    body.append(area);
    this.#modalCleanup = this.#renderInto(area, this.#modalMode, true);
  }

  #switchModal(next: ViewerMode): void {
    if (!this.#modal) return;
    this.#modalMode = next;
    this.#paintModal();
  }

  #goAnalyst(): void {
    if (this.#modal) {
      this.#switchModal("analyst");
    } else {
      this.setMode("analyst");
    }
  }

  #renderInto(container: HTMLElement, mode: ViewerMode, wide: boolean): Cleanup {
    container.style.maxWidth = wide ? "none" : "360px";
    switch (mode) {
      case "viewer":
        return renderViewer(container, this.player, this.data, { wide });
      case "analyst":
        return renderAnalyst(container, this.data, { wide });
      case "simulation":
        return renderSimulation(container, () => this.#goAnalyst(), { wide });
      case "author":
        return mountAuthorTools(container, {
          passport: this.data.passport,
          title: this.data.title ?? "",
          videoId: this.data.videoId ?? "",
          wide,
        });
    }
  }

  #buildTabs(className: string, onChange: (m: ViewerMode) => void, activeMode: ViewerMode): HTMLElement {
    const bar = document.createElement("div");
    bar.className = className;
    for (const it of TABS) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = it.label;
      if (it.id === activeMode) b.classList.add("active");
      b.addEventListener("click", () => onChange(it.id));
      bar.append(b);
    }
    return bar;
  }
}
// = [M-EXTENSION][MODES][END_BLOCK]
