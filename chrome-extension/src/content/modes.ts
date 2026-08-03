// [M-EXTENSION][MODES][START_BLOCK]
// Оркестратор режимов: Зритель / Аналитик / Симуляция. Переключение сохраняет
// данные (паспорт, метрики) и текущий выбор (A-C003-05).
import type { ViewerMode } from "../data/types";
import type { ExtensionHost } from "./shadow";
import type { PlayerHandle } from "./rutube";
import { renderViewer } from "./render/viewerMode";
import { renderAnalyst } from "./render/analystMode";
import { renderSimulation } from "./render/simulationMode";

export interface ModeData {
  passport: import("../data/types").Passport;
  metrics: import("../data/types").JobMetrics;
}

type Cleanup = () => void;
const noop: Cleanup = () => undefined;

export class ModesController {
  private mode: ViewerMode = "viewer";
  private cleanup: Cleanup = noop;

  constructor(
    private host: ExtensionHost,
    private player: PlayerHandle,
    private data: ModeData,
  ) {}

  get current(): ViewerMode {
    return this.mode;
  }

  setMode(next: ViewerMode): void {
    this.mode = next;
    this.render();
  }

  render(): void {
    this.cleanup();
    const { panel } = this.host;
    panel.innerHTML = "";
    panel.append(this.#buildToggle());
    const content = document.createElement("div");
    content.style.maxWidth = "360px";
    panel.append(content);

    switch (this.mode) {
      case "viewer":
        this.cleanup = renderViewer(content, this.player, this.data);
        break;
      case "analyst":
        this.cleanup = renderAnalyst(content, this.data);
        break;
      case "simulation":
        this.cleanup = renderSimulation(content, () => this.setMode("analyst"));
        break;
    }
  }

  destroy(): void {
    this.cleanup();
    this.cleanup = noop;
  }

  #buildToggle(): HTMLElement {
    const bar = document.createElement("div");
    bar.className = "rz-toggle";
    const items: { id: ViewerMode; label: string }[] = [
      { id: "viewer", label: "👁 Зритель" },
      { id: "analyst", label: "📊 Аналитик" },
      { id: "simulation", label: "⚙️ Симуляция" },
    ];
    for (const it of items) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = it.label;
      if (it.id === this.mode) b.classList.add("active");
      b.addEventListener("click", () => this.setMode(it.id));
      bar.append(b);
    }
    return bar;
  }
}
// = [M-EXTENSION][MODES][END_BLOCK]