// [M-EXTENSION][POPUP][START_BLOCK]
// Popup: выбор демо-сценария (ручной) + автоподбор + статус. Полная логика — P8.
import { PASSPORT_REGISTRY } from "../data/registry";
import { resolveBinding } from "../content/data/bindings";
import "./popup.css";

const app = document.getElementById("app");
if (!app) throw new Error("app root missing");

app.innerHTML = `
  <h3 style="margin:0 0 10px;color:var(--brand);font-weight:700">RUTUBE Замеси</h3>
  <form id="bind-form">
    <label style="color:var(--muted);display:block;margin-bottom:6px;">Демо-сценарий</label>
    <select id="scenario" style="width:100%;padding:8px;background:var(--panel);color:var(--text);border:1px solid #384058;border-radius:var(--radius);"></select>
    <div id="auto-note" style="color:var(--muted);font-size:12px;margin:8px 0;"></div>
    <button type="submit" style="width:100%;padding:9px;background:var(--brand);color:#fff;border:0;border-radius:var(--radius);cursor:pointer;font-weight:700;">Применить на видео</button>
  </form>
`;

const select = document.getElementById("scenario") as HTMLSelectElement;
const note = document.getElementById("auto-note") as HTMLDivElement;

PASSPORT_REGISTRY.forEach((entry) => {
  const opt = document.createElement("option");
  opt.value = entry.id;
  opt.textContent = entry.title;
  if (entry.boundVideoId) opt.textContent += ` (video_id)`;
  select.appendChild(opt);
});

// Автоподбор для текущей вкладки
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  const url = tab?.url ?? "";
  const videoId = /rutube\.ru\/video\/[a-f0-9]+/.test(url)
    ? (url.match(/video\/([a-f0-9]+)/)?.[1] ?? null)
    : null;
  if (videoId) {
    const title =
      tab?.title?.replace(/\s+-\s+.*$/, "") || PASSPORT_REGISTRY[0]?.title || "";
    const resolved = resolveBinding(videoId, title);
    if (resolved) {
      select.value = resolved.id;
      note.textContent = `Авто: «${resolved.title}» под видео ${videoId}`;
    } else {
      note.textContent = `Нет паспорта под video_id ${videoId}`;
    }
  } else {
    note.textContent = "Откройте страницу видео RUTUBE, чтобы подобрать сценарий.";
  }
});

document.getElementById("bind-form")!.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = select.value;
  chrome.storage.local.set({ rzBinding: { id, ts: Date.now() } }, () => {
    note.textContent = `Сценарий «${id}» применён к вкладке.`;
  });
});
// [M-EXTENSION][POPUP][END_BLOCK]