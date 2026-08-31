// [M-EXTENSION][STUDIO][RENDER][START_BLOCK]
// Панель «AI для редактора RUTUBE Studio»: композиция секций из предложений
// паспорта + монтаж в Shadow DOM поверх страницы (fixed, не внутри модалки).
// Возможности: сворачивание в пилюлю, перетаскивание и персистентность
// (localStorage), заполнение полей формы (React-safe). Примитивы — render/ui.ts,
// drag/persist — render/drag.ts, палитра — render/theme.ts.
import type { StudioSuggestions } from "./mapping";
import { applyValue, applyChecked } from "./autofill";
import type { StudioFormHandles } from "./selectors";
import { fmtViews, projectVariantMetrics } from "../content/authorTools/generate";
import { ACCENT, ACCENT_2, GRID, MUTED } from "./render/theme";
import { box, chip, applyBtn, makeToast } from "./render/ui";
import { enableDrag, restorePosition, safeGet, safeSet, COL_KEY } from "./render/drag";
import { renderReferralBlock } from "./render/referral";
import { renderPromotionBlock } from "./render/promotion";

export interface StudioPanelOpts {
  suggestions: StudioSuggestions;
  form: StudioFormHandles;
}

export function renderStudioPanel(
  root: HTMLElement,
  opts: StudioPanelOpts,
): { root: HTMLElement; cleanup: () => void } {
  const { suggestions: s, form } = opts;
  const toastCtl = makeToast(root);

  // --- Контент (сворачивается) ---
  const content = document.createElement("div");
  content.className = "rz-content";

  // --- Header (drag-ручка + сворачивание) ---
  const header = document.createElement("div");
  header.className = "rz-header";
  header.style.cssText = `padding:10px 12px;border-radius:12px;border:1px solid ${GRID};` +
    `background:linear-gradient(135deg,#2a2038,#1b2030);cursor:grab;user-select:none;margin-bottom:10px;`;

  const titleRow = document.createElement("div");
  titleRow.style.cssText = "display:flex;align-items:center;gap:8px;";
  const logo = document.createElement("div");
  logo.style.cssText = `width:26px;height:26px;border-radius:8px;flex:none;display:flex;align-items:center;justify-content:center;` +
    `background:linear-gradient(135deg,${ACCENT},${ACCENT_2});font-size:14px;`;
  logo.textContent = "✨";
  const titleWrap = document.createElement("div");
  titleWrap.style.cssText = "flex:1;min-width:0;";
  const title = document.createElement("div");
  title.style.cssText = "font-weight:800;font-size:13.5px;color:#fff;";
  title.textContent = "AI для редактора RUTUBE Studio";
  const sub = document.createElement("div");
  sub.style.cssText = `font-size:10.5px;color:${MUTED};margin-top:1px;`;
  sub.textContent = `Паспорт: ${s.binding} · заполнение всех полей`;
  titleWrap.append(title, sub);
  titleRow.append(logo, titleWrap);

  const collapseBtn = document.createElement("button");
  collapseBtn.type = "button";
  collapseBtn.setAttribute("aria-label", "Свернуть панель");
  collapseBtn.title = "Свернуть";
  collapseBtn.textContent = "—";
  collapseBtn.style.cssText = `width:24px;height:24px;border-radius:7px;border:1px solid ${GRID};` +
    `background:#1a2030;color:${MUTED};cursor:pointer;font-size:14px;line-height:1;flex:none;` +
    "transition:background .15s,color .15s;";
  collapseBtn.addEventListener("mouseenter", () => { collapseBtn.style.background = "#243050"; collapseBtn.style.color = "#fff"; });
  collapseBtn.addEventListener("mouseleave", () => { collapseBtn.style.background = "#1a2030"; collapseBtn.style.color = MUTED; });
  titleRow.append(collapseBtn);
  header.append(titleRow);

  const allBtn = applyBtn("✨ Заполнить всё по паспорту", () => {
    const t = s.title.find((v) => v.source === "ai") ?? s.title[0];
    const d = s.descriptions[0];
    let applied = 0;
    if (t) applied += applyValue(form.title, t.text) ? 1 : 0;
    if (d) applied += applyValue(form.description, d.text) ? 1 : 0;
    if (s.category) applied += applyValue(form.categoryInput, s.category.label) ? 1 : 0;
    applied += applyChecked(form.isAdult, s.adult) ? 1 : 0;
    applied += applyChecked(form.withComments, s.comments) ? 1 : 0;
    if (s.publish === "now") applied += applyChecked(form.publishNow, true) ? 1 : 0;
    else applied += applyChecked(form.publishDelayed, true) ? 1 : 0;
    if (s.playlists[0] && form.playlistSearch) {
      applied += applyValue(form.playlistSearch, s.playlists[0].name) ? 1 : 0;
    }
toastCtl.show(applied ? `Применено полей: ${applied} ✓` : "Нечего заполнять");
  });
  header.append(allBtn);
  content.append(header);

  // --- Табы: «Публикация», «Монетизация» и «Продвижение» ---
  const PANES = {
    publish: { id: "publish", label: "📝 Публикация" },
    monetize: { id: "monetize", label: "💰 Монетизация" },
    promote: { id: "promote", label: "🚀 Продвижение" },
  } as const;
  type PaneId = keyof typeof PANES;
  const tabBar = document.createElement("div");
  tabBar.style.cssText = "display:flex;gap:6px;margin-bottom:10px;";
  const paneBtns = new Map<PaneId, HTMLButtonElement>();
  const publishingPane = document.createElement("div");
  const monetizationPane = document.createElement("div");
  const promotionPane = document.createElement("div");
  function showPane(id: PaneId): void {
    publishingPane.style.display = id === "publish" ? "" : "none";
    monetizationPane.style.display = id === "monetize" ? "" : "none";
    promotionPane.style.display = id === "promote" ? "" : "none";
    for (const [pid, b] of paneBtns) {
      const active = pid === id;
      b.style.background = active ? "#2a2038" : "#232838";
      b.style.color = active ? ACCENT : "#cfd4e3";
      b.style.borderColor = active ? ACCENT : GRID;
      b.style.fontWeight = active ? "700" : "600";
    }
  }
  (Object.keys(PANES) as PaneId[]).forEach((id) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = PANES[id].label;
    btn.style.cssText = `flex:1;background:#232838;color:#cfd4e3;border:1px solid ${GRID};` +
      "border-radius:9px;padding:8px 10px;font-size:12.5px;cursor:pointer;font-weight:600;" +
      "transition:background .15s,color .15s,border-color .15s;";
    btn.addEventListener("click", () => showPane(id));
    tabBar.append(btn);
    paneBtns.set(id, btn);
  });
  content.append(tabBar, publishingPane, monetizationPane, promotionPane);
  showPane("publish");

  // --- Название A/B ---
  if (s.title.length) {
    const block = box("📝 Название", "Варианты из паспорта (A/B) — прогноз по каждому");
    for (const v of s.title.slice(0, 4)) {
      const m = projectVariantMetrics("studio", v.text);
      const note = v.source === "native" ? `родной · CTR ${m.ctr}% · ${fmtViews(m.views)}` : `AI-вариант · ${v.note ?? ""} · CTR ${m.ctr}%`;
      block.append(chip(`${v.text.length > 60 ? `${v.text.slice(0, 57)}…` : v.text}`, () => {
        const ok = applyValue(form.title, v.text);
        toastCtl.show(ok ? `Название применено: ${v.text.slice(0, 40)}… ✓` : "Поле «Название» не найдено");
      }, v.source === "ai"));
      const noteEl = document.createElement("div");
      noteEl.style.cssText = `font-size:10px;color:${MUTED};margin:-1px 0 8px 4px;`;
      noteEl.textContent = note;
      block.append(noteEl);
    }
    publishingPane.append(block);
  }

  // --- Описание ---
  if (s.descriptions.length) {
    const block = box("🖋 Описание", `Варианты + тайм-коды сцен (${s.chapters.length})`);
    for (const [i, d] of s.descriptions.entries()) {
      block.append(chip(`вариант ${i + 1} · ${d.chars} зн.${d.features[0] ? ` · ${d.features[0]}` : ""}`, () => {
        const ok = applyValue(form.description, d.text);
        toastCtl.show(ok ? `Описание применено (вариант ${i + 1}) ✓` : "Поле «Описание» не найдено");
      }));
    }
    if (s.chapters.length) {
      const chap = document.createElement("div");
      chap.style.cssText = `font-size:11px;color:${MUTED};margin-top:8px;white-space:pre-line;line-height:1.5;`;
      chap.textContent = `Тайм-коды:\n${s.chapters.join("\n")}`;
      block.append(chap);
    }
    publishingPane.append(block);
  }

  // --- Категория ---
  if (s.category) {
    const cat = s.category;
    const block = box("🏷 Категория", cat.reason, true);
    block.append(chip(cat.label, () => {
      const ok = applyValue(form.categoryInput, cat.label);
      toastCtl.show(ok ? `Категория вставлена: «${cat.label}» — выберите из списка ✓` : "Поле «Категория» не найдено");
    }, true));
    publishingPane.append(block);
  }

  // --- Плейлисты ---
  if (s.playlists.length) {
    const block = box("📂 Плейлисты", "Подсказки из паспорта — имя вставляется в поле поиска");
    for (const p of s.playlists.slice(0, 3)) {
      block.append(chip(`${p.name} · ${p.reason.slice(0, 48)}${p.reason.length > 48 ? "…" : ""}`, () => {
        const input = form.playlistSearch;
        if (!input) {
          toastCtl.show("Поле поиска плейлиста не найдено — откройте раздел «Плейлисты» и нажмите снова");
          return;
        }
        const ok = applyValue(input, p.name);
        if (!ok) {
          toastCtl.show("Не удалось вписать имя — поле поиска плейлиста заблокировано");
          return;
        }
        const ctrl = input.closest<HTMLElement>('[data-control-name*="playlist"], [data-control-name="playlists"]');
        if (ctrl && ctrl.getAttribute("aria-expanded") !== "true") {
          try { ctrl.click(); } catch { /* необязательно */ }
        }
        toastCtl.show(ok ? `Ищу плейлист: «${p.name}» — выберите из списка ✓` : "Поле поиска плейлиста не найдено");
      }));
    }
    publishingPane.append(block);
  }

  // --- Время публикации ---
  const pubBlock = box("🕒 Время публикации", `Рекомендация: ${s.publish === "now" ? "сейчас" : "позже (проверить модерацию)"}`);
  pubBlock.append(chip(s.publish === "now" ? "⚡ Опубликовать сейчас" : "⏳ Отложенная публикация", () => {
    const target = s.publish === "now" ? form.publishNow : form.publishDelayed;
    const ok = applyChecked(target, true);
    toastCtl.show(ok ? `Время публикации: ${s.publish === "now" ? "сейчас" : "позже"} ✓` : "Переключатель времени не найден");
  }, true));
  publishingPane.append(pubBlock);

  // --- Модерация ---
  const modBlock = box("🛡 Модерация", s.disclaimerHint ?? "Возрастной рейтинг и комментарии");
  modBlock.append(chip(`18+ (isAdult): ${s.adult ? "да" : "нет"}`, () => {
    const ok = applyChecked(form.isAdult, s.adult);
    toastCtl.show(ok ? `18+ установлено: ${s.adult ? "да" : "нет"} ✓` : "Чекбокс 18+ не найден");
  }));
  modBlock.append(chip(`Комментарии: ${s.comments ? "включены" : "выключены"}`, () => {
    const ok = applyChecked(form.withComments, s.comments);
    toastCtl.show(ok ? `Комментарии: ${s.comments ? "включены" : "выключены"} ✓` : "Чекбокс комментариев не найден");
  }));
  publishingPane.append(modBlock);

  // --- Реферальная монетизация: товары из паспорта → ссылки 3 магазинов + прогноз ---
  monetizationPane.append(renderReferralBlock(s.referral, { form, toast: toastCtl.show, videoId: s.videoId }));

  // --- Продвижение видео: объявления для Я.Директ/VK/MyTarget + прогноз и бюджет ---
  promotionPane.append(renderPromotionBlock(s.promotion, { form, toast: toastCtl.show, videoId: s.videoId }));

  // --- Footer ---
  const note = document.createElement("div");
  note.style.cssText = `padding:8px 10px;font-size:10px;color:${MUTED};border:1px dashed ${GRID};border-radius:10px;line-height:1.5;`;
  note.textContent = "Демо-режим: паспорт подбирается локально (NFR-7). Облачная генерация (NFR-8) подключается без изменения UI.";
  content.append(note);

  root.append(content);

  // --- Пилюля свёрнутого состояния ---
  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "rz-pill";
  pill.setAttribute("aria-label", "Развернуть панель");
  pill.title = "Развернуть AI-панель";
  pill.style.cssText = `display:none;align-items:center;gap:7px;border-radius:999px;padding:8px 14px;cursor:pointer;` +
    `border:1px solid ${ACCENT};background:linear-gradient(135deg,#2a2038,#1b2030);color:#fff;` +
    "font-size:12.5px;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.45);";
  const pillIcon = document.createElement("span");
  pillIcon.textContent = "✨";
  const pillLabel = document.createElement("span");
  pillLabel.textContent = "AI-ассистент";
  pill.append(pillIcon, pillLabel);
  root.append(pill);

  // --- Сворачивание/разворачивание ---
  const setCollapsed = (collapsed: boolean): void => {
    content.style.display = collapsed ? "none" : "";
    pill.style.display = collapsed ? "inline-flex" : "none";
    collapseBtn.textContent = collapsed ? "⤢" : "—";
    collapseBtn.title = collapsed ? "Развернуть" : "Свернуть";
    collapseBtn.setAttribute("aria-label", collapsed ? "Развернуть панель" : "Свернуть панель");
    safeSet(COL_KEY, collapsed ? "1" : "0");
  };
  collapseBtn.addEventListener("click", () => setCollapsed(content.style.display !== "none"));
  pill.addEventListener("click", () => setCollapsed(false));

  // --- Восстановить состояние и позицию ---
  if (safeGet(COL_KEY) === "1") setCollapsed(true);
  restorePosition(root);

  // --- Drag ---
  enableDrag(header, root);

  return {
    root,
    cleanup: () => {
      toastCtl.clear();
      toastCtl.toast.remove();
    },
  };
}

const CSS = `
  :host { all: initial; }
  .rz-studio-root {
    box-sizing: border-box; color: #e8eaf0; font-size: 13px; line-height: 1.5;
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .rz-studio-root * { box-sizing: border-box; }
  .rz-content { max-height: calc(100vh - 150px); overflow-y: auto; scrollbar-width: thin; scrollbar-color: #3d4457 transparent; }
  .rz-content::-webkit-scrollbar { width: 8px; }
  .rz-content::-webkit-scrollbar-thumb { background: #3d4457; border-radius: 4px; }
  button { font-family: inherit; }
  .rz-chip:hover { filter: brightness(1.14); box-shadow: 0 2px 8px rgba(0,0,0,.35); }
  .rz-chip:active { transform: scale(.97); }
  .rz-header:active { cursor: grabbing; }
  :focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
`;

/** Смонтировать панель в Shadow DOM. Хост кладётся в document.body (fixed),
 *  чтобы React при перерисовке модалки не вычищал панель. */
export function mountStudioPanel(opts: StudioPanelOpts & { hostMark?: string }): { cleanup: () => void } {
  const host = document.createElement("div");
  host.className = "rz-studio-host";
  if (opts.hostMark) host.setAttribute(opts.hostMark, "1");
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = CSS;
  const panel = document.createElement("div");
  panel.className = "rz-studio-root";
  panel.style.cssText = `width:520px;padding:12px 14px;` +
    `background:rgba(14,16,24,0.97);border:1px solid ${GRID};border-radius:16px;` +
    `box-shadow:0 12px 40px rgba(0,0,0,0.55);backdrop-filter:blur(8px);`;
  shadow.append(style, panel);
  host.style.cssText = "position:fixed;top:72px;right:16px;z-index:2147483646;";
  document.body.append(host);
  const res = renderStudioPanel(panel, opts);
  return {
    cleanup: () => {
      res.cleanup();
      host.remove();
    },
  };
}
// = [M-EXTENSION][STUDIO][RENDER][END_BLOCK]