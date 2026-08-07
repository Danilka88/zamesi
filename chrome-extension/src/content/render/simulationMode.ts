// [M-EXTENSION][SIMULATION][START_BLOCK]
// Режим «Симуляция»: наглядная анимация пайплайна ASR → сцены → метки →
// переход в Аналитик (P7). Этапы с прогресс-барами, спиннерами и деталями.
const STAGES: { label: string; icon: string; detail: string; ms: number }[] = [
  { label: "Извлечение аудио", icon: "🎬", detail: "ffmpeg · демодуляция дорожки · I-кадры", ms: 1100 },
  { label: "Распознавание речи (ASR)", icon: "🎙️", detail: "Whisper large-v3 · таймкоды слов", ms: 1300 },
  { label: "Диаризация спикеров", icon: "👥", detail: "реплики · смена говорящего", ms: 1000 },
  { label: "Анализ сцен", icon: "🧠", detail: "SLM пас 1 · сюжетные сегменты", ms: 1200 },
  { label: "Контроль кадров (VLM)", icon: "👁", detail: "гейт ≤6% кадров · OCR", ms: 1000 },
  { label: "Монетизация + модерация", icon: "💰", detail: "метки · аудио-матчи · вердикт", ms: 1200 },
];

export function renderSimulation(
  container: HTMLElement,
  onDone: () => void,
  opts?: { wide?: boolean },
): () => void {
  const wide = opts?.wide ?? false;
  const box = document.createElement("div");
  box.className = "rz-panel";
  box.innerHTML = `<div class="rz-title">⚙️ Симуляция анализа</div>`;
  container.append(box);

  // общий прогресс-бар вверху
  const loop = document.createElement("div");
  loop.style.cssText = "height:6px;border-radius:3px;background:#2a3040;overflow:hidden;margin-bottom:10px;";
  const loopFill = document.createElement("div");
  loopFill.style.cssText = `height:100%;width:0%;background:linear-gradient(90deg,#fb5f93,#8B5CF6);border-radius:3px;transition:width .3s ease;`;
  loop.append(loopFill);
  box.append(loop);

  const list = document.createElement("div");
  list.style.cssText = `display:grid;grid-template-columns:${wide ? "repeat(auto-fit,minmax(300px,1fr))" : "1fr"};gap:8px;`;
  box.append(list);

  let cancelled = false;
  const timers: number[] = [];
  let started = false;

  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "rz-btn";
  startBtn.style.cssText =
    "width:100%;grid-column:1 / -1;padding:10px;font-size:14px;border-radius:10px;background:#fb5f93;color:#fff;border:0;cursor:pointer;font-weight:800;";
  startBtn.textContent = "▶ Запустить анализ";
  list.append(startBtn);

  // построение строки этапа с прогресс-баром
  function stageRow(stage: (typeof STAGES)[number]): {
    row: HTMLElement;
    fill: HTMLElement;
    pct: HTMLElement;
    spin: HTMLElement;
    status: HTMLElement;
  } {
    const row = document.createElement("div");
    row.style.cssText =
      "border:1px solid #33363f;border-radius:10px;background:#1b2030;padding:8px 10px;opacity:0;transform:translateY(4px);transition:opacity .25s ease,transform .25s ease;";
    const top = document.createElement("div");
    top.style.cssText = "display:flex;align-items:center;gap:7px;font-size:13px;font-weight:700;";
    const spin = document.createElement("span");
    spin.className = "rz-spin";
    spin.style.cssText = "display:none;font-size:14px;color:#fb5f93;";
    spin.textContent = "⟳";
    const label = document.createElement("span");
    label.textContent = `${stage.icon} ${stage.label}`;
    const status = document.createElement("span");
    status.style.cssText = "margin-left:auto;font-size:11px;color:#9aa1b5;";
    top.append(spin, label, status);
    const detail = document.createElement("div");
    detail.className = "rz-muted";
    detail.style.cssText = "font-size:11px;margin:3px 0 5px 2px;";
    detail.textContent = stage.detail;
    const track = document.createElement("div");
    track.style.cssText = "height:6px;border-radius:3px;background:#2a3040;overflow:hidden;";
    const fill = document.createElement("div");
    fill.style.cssText = "width:0%;height:100%;background:#fb5f93;border-radius:3px;transition:width .12s linear;";
    track.append(fill);
    const pct = document.createElement("div");
    pct.style.cssText = "text-align:right;font-size:10px;color:#9aa1b5;margin-top:3px;";
    pct.textContent = "0%";
    row.append(top, detail, track, pct);
    list.append(row);
    requestAnimationFrame(() => {
      row.style.opacity = "1";
      row.style.transform = "translateY(0)";
    });
    return { row, fill, pct, spin, status };
  }

  // анимация одного этапа
  function animate(stage: (typeof STAGES)[number]): Promise<void> {
    return new Promise((resolve) => {
      const { fill, pct, spin, status } = stageRow(stage);
      spin.style.display = "inline";
      status.textContent = "0%";
      const total = stage.ms;
      const startedAt = performance.now();
      const frame = () => {
        if (cancelled) return resolve();
        const p = Math.min(1, (performance.now() - startedAt) / total);
        const percent = Math.round(p * 100);
        fill.style.width = `${percent}%`;
        pct.textContent = `${percent}%`;
        status.textContent = `${percent}%`;
        if (p < 1) {
          timers.push(window.setTimeout(frame, 60));
        } else {
          spin.style.display = "none";
          spin.textContent = "✓";
          spin.style.color = "#22c55e";
          status.textContent = "✓";
          resolve();
        }
      };
      timers.push(window.setTimeout(frame, 60));
    });
  }

  async function run(): Promise<void> {
    for (let k = 0; k < STAGES.length; k++) {
      if (cancelled) return;
      await animate(STAGES[k]);
      loopFill.style.width = `${((k + 1) / STAGES.length) * 100}%`;
    }
    if (cancelled) return;
    loopFill.style.width = "100%";
    const done = document.createElement("div");
    done.className = "rz-row";
    done.style.cssText =
      "border:1px solid #22c55e;border-radius:10px;background:#14241b;padding:10px;text-align:center;";
    done.innerHTML = `✅ <b>Анализ завершён</b><div style="margin-top:8px"><button class="rz-btn" type="button" data-go>📊 К Аналитику →</button></div>`;
    list.append(done);
    done.querySelector<HTMLElement>("[data-go]")!.addEventListener("click", onDone);
  }

  startBtn.addEventListener("click", () => {
    if (started) return;
    started = true;
    startBtn.remove();
    timers.push(window.setTimeout(run, 80));
  });

  return () => {
    cancelled = true;
    timers.forEach((t) => clearTimeout(t));
  };
}
// = [M-EXTENSION][SIMULATION][END_BLOCK]