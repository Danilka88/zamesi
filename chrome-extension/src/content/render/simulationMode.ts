// [M-EXTENSION][SIMULATION][START_BLOCK]
// Режим «Симуляция»: анимированный разбор ASR → сцены → метки → переход в Аналитик (P7).
const STAGES = [
  { label: "Извлечение аудио (ffmpeg)", icon: "🎬" },
  { label: "ASR — Whisper large-v3", icon: "🎙️" },
  { label: "Диаризация спикеров", icon: "👥" },
  { label: "Анализ сцен (SLM pass1)", icon: "🧠" },
  { label: "VLM Gatekeeper (≤6%)", icon: "👁" },
  { label: "Монетизация + модерация + аудио", icon: "💰" },
];

export function renderSimulation(container: HTMLElement, onDone: () => void): () => void {
  const box = document.createElement("div");
  box.className = "rz-panel";
  box.innerHTML = `<div class="rz-title">⚙️ Симуляция анализа</div>`;
  container.append(box);

  const list = document.createElement("div");
  box.append(list);

  let cancelled = false;
  const timers: number[] = [];
  let i = 0;
  const next = () => {
    if (cancelled) return;
    if (i >= STAGES.length) {
      const done = document.createElement("div");
      done.className = "rz-row";
      done.innerHTML = `✅ Готово! <button class="rz-btn" type="button" data-go>К Аналитику →</button>`;
      list.append(done);
      done.querySelector<HTMLElement>("[data-go]")!.addEventListener("click", onDone);
      return;
    }
    const line = document.createElement("div");
    line.className = "rz-row";
    line.textContent = `${STAGES[i].icon} ${STAGES[i].label}`;
    list.append(line);
    i += 1;
    timers.push(window.setTimeout(next, 350));
  };
  timers.push(window.setTimeout(next, 300));

  return () => {
    cancelled = true;
    timers.forEach((t) => clearTimeout(t));
  };
}
// = [M-EXTENSION][SIMULATION][END_BLOCK]