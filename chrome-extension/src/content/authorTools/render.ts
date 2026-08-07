// [M-EXTENSION][AUTHOR-TOOLS][RENDER][START_BLOCK]
// Рендер панели «Инструменты автора»: A/B-варианты заголовков и описаний с
// копированием в один клик, прогноз эффективности каждого варианта (CTR/охват/
// вовлечённость) + сравнение и демо-графики (удержание, монетизации, почасовые).
import type { Passport } from "../../data/types";
import {
  buildTitleVariants,
  buildDescriptionVariants,
  projectVariantMetrics,
  fmtViews,
  type TitleVariant,
  type DescriptionVariant,
  type VariantMetrics,
} from "./generate";
import { retentionSeries, monetizationStack, hourlyBars, sparklineSvg, barChartSvg } from "./charts";

const ACCENT = "#fb5f93";
const GRID = "#33363f";
const BG = "#1b2030";
const CARD = "#20263a";
const MUTED = "#9aa1b5";

export interface AuthorToolsData {
  passport: Passport;
  title: string;
  videoId: string;
}

function box(title: string, sub?: string): HTMLElement {
  const b = document.createElement("div");
  b.style.cssText = `padding:10px 12px;margin-bottom:10px;border:1px solid ${GRID};border-radius:12px;background:${BG};`;
  const h = document.createElement("div");
  h.className = "rz-title";
  h.textContent = title;
  b.append(h);
  if (sub) {
    const s = document.createElement("div");
    s.className = "rz-muted";
    s.style.cssText = "font-size:11px;margin-top:2px;";
    s.textContent = sub;
    b.append(s);
  }
  return b;
}

/** Кнопка копирования с транзиентным «Скопировано ✓». */
function copyButton(text: string, toast: HTMLElement): HTMLElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "⧉";
  btn.title = "Скопировать";
  btn.style.cssText = `border:1px solid ${GRID};background:#12151f;color:#e7e9f0;border-radius:8px;` +
    "width:28px;height:28px;cursor:pointer;font-size:13px;flex:none;";
  btn.addEventListener("click", () => {
    void navigator.clipboard?.writeText(text).then(() => showToast(toast, "Скопировано ✓")).catch(() => undefined);
  });
  return btn;
}

let toastTimer = 0;
function showToast(toast: HTMLElement, text: string): void {
  toast.textContent = text;
  toast.style.opacity = "1";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.style.opacity = "0";
  }, 1400);
}

/** Метрики-чипы для карточки варианта. */
function metricsChips(m: VariantMetrics, best: boolean): HTMLElement {
  const chips = document.createElement("div");
  chips.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;align-items:center;";
  const mk = (text: string, color = MUTED, bg = "#151a28"): void => {
    const s = document.createElement("span");
    s.textContent = text;
    s.style.cssText = `font-size:10px;color:${color};background:${bg};border-radius:999px;padding:1px 7px;`;
    chips.append(s);
  };
  mk(`CTR ~${m.ctr}%`);
  mk(`👁 ${fmtViews(m.views)}`);
  mk(`вовлеч. ${m.engagement}`);
  if (best) mk("🏆 лидер прогноза", ACCENT, "#2a2030");
  return chips;
}

/** Подзаголовок секции внутри блока сравнения. */
function cmpSectionTitle(text: string): HTMLElement {
  const h = document.createElement("div");
  h.style.cssText = `font-size:11px;color:${MUTED};font-weight:600;margin:8px 0 2px;`;
  h.textContent = text;
  return h;
}

/** Горизонтальный бар сравнения (для A/B прогноза). */
function cmpBar(label: string, value: number, max: number, color: string, right: string): HTMLElement {
  const w = document.createElement("div");
  w.style.cssText = "margin:5px 0;";
  const top = document.createElement("div");
  top.style.cssText = "display:flex;justify-content:space-between;gap:8px;font-size:11px;margin-bottom:3px;";
  const lbl = document.createElement("span");
  lbl.style.cssText = "color:#cfd3e0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;";
  lbl.textContent = label;
  const val = document.createElement("span");
  val.style.cssText = "color:#9aa1b5;flex:none;";
  val.textContent = right;
  top.append(lbl, val);
  const track = document.createElement("div");
  track.classList.add("rz-cmp-track");
  track.style.cssText = "height:8px;border-radius:999px;background:#2a3040;overflow:hidden;";
  const fill = document.createElement("div");
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  fill.style.cssText = `width:${pct}%;height:100%;border-radius:999px;background:${color};`;
  track.append(fill);
  w.append(top, track);
  return w;
}

function titleCard(
  v: TitleVariant,
  metrics: VariantMetrics,
  best: boolean,
  selected: boolean,
  onSelect: () => void,
  toast: HTMLElement,
): HTMLElement {
  const card = document.createElement("div");
  card.classList.add("rz-ab-card");
  card.style.cssText = `padding:8px 10px;border:1px solid ${selected ? ACCENT : GRID};border-radius:10px;` +
    `background:${CARD};cursor:pointer;margin-bottom:6px;`;
  const top = document.createElement("div");
  top.style.cssText = "display:flex;align-items:flex-start;gap:8px;";
  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "rz-ab-title";
  radio.checked = selected;
  radio.style.cssText = "margin-top:2px;accent-color:" + ACCENT + ";";
  const body = document.createElement("div");
  body.style.cssText = "flex:1;";
  const t = document.createElement("div");
  t.style.cssText = "font-size:13px;line-height:1.35;color:#e7e9f0;";
  t.textContent = v.text;
  const meta = document.createElement("div");
  meta.className = "rz-muted";
  meta.style.cssText = "font-size:10px;margin-top:2px;";
  meta.textContent = v.source === "native" ? "родной заголовок" : `AI · ${v.note ?? ""}`;
  body.append(t, meta, metricsChips(metrics, best));
  top.append(radio, body, copyButton(v.text, toast));
  card.append(top);
  card.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onSelect();
  });
  return card;
}

function descCard(v: DescriptionVariant, metrics: VariantMetrics, best: boolean, toast: HTMLElement): HTMLElement {
  const card = document.createElement("div");
  card.style.cssText = `padding:8px 10px;border:1px solid ${GRID};border-radius:10px;background:${CARD};margin-bottom:6px;`;
  const head = document.createElement("div");
  head.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:6px;";
  const badge = document.createElement("span");
  badge.textContent = `вариант ${v.chars} зн.`;
  badge.style.cssText = `font-size:10px;color:${MUTED};border:1px solid ${GRID};border-radius:999px;padding:1px 7px;`;
  const feats = document.createElement("div");
  feats.style.cssText = "display:flex;gap:4px;flex-wrap:wrap;flex:1;";
  for (const f of v.features) {
    const chip = document.createElement("span");
    chip.textContent = f;
    chip.style.cssText = `font-size:10px;color:${ACCENT};background:#2a2030;border-radius:999px;padding:1px 7px;`;
    feats.append(chip);
  }
  head.append(badge, feats, copyButton(v.text, toast));
  const body = document.createElement("div");
  body.style.cssText = "font-size:12px;line-height:1.45;color:#cfd3e0;white-space:pre-wrap;";
  body.textContent = v.text;
  card.append(head, metricsChips(metrics, best), body);
  return card;
}

export function renderAuthorTools(container: HTMLElement, data: AuthorToolsData): () => void {
  const { passport, title, videoId } = data;
  const timers: number[] = [];

  const header = box("✍️ Инструменты автора", "A/B-подбор заголовка и описания (демо, детерминированно)");
  container.append(header);

  const toast = document.createElement("div");
  toast.classList.add("rz-toast");
  toast.style.cssText = `position:fixed;bottom:18px;left:50%;transform:translateX(-50%);` +
    `background:#0e0f16;color:#e7e9f0;border:1px solid ${ACCENT};border-radius:999px;` +
    "padding:6px 14px;font-size:12px;opacity:0;transition:opacity .25s;z-index:99999;pointer-events:none;";
  document.body.append(toast);
  timers.push(0);

  // --- Заголовки A/B ---
  const titles = buildTitleVariants(passport, title, videoId);
  const titleMetrics = titles.map((v) => ({ v, m: projectVariantMetrics(videoId, v.text) }));
  const bestTitle = titleMetrics.length ? titleMetrics.reduce((a, b) => (b.m.engagement > a.m.engagement ? b : a), titleMetrics[0]).v.id : undefined;
  let selectedIdx = 0;
  const tBlock = box("📝 Заголовок A/B", `${titles.length} вариантов · выберите для замены`);
  const tWrap = document.createElement("div");
  const rerender = () => {
    tWrap.innerHTML = "";
    titleMetrics.forEach(({ v, m }, i) => {
      tWrap.append(titleCard(v, m, v.id === bestTitle, i === selectedIdx, () => { selectedIdx = i; rerender(); }, toast));
    });
  };
  rerender();
  tBlock.append(tWrap);
  container.append(tBlock);

  // --- Описания ---
  const descs = buildDescriptionVariants(passport, videoId);
  const descMetrics = descs.map((d) => ({ d, m: projectVariantMetrics(videoId, d.text) }));
  const bestDesc = descMetrics.length ? descMetrics.reduce((a, b) => (b.m.engagement > a.m.engagement ? b : a), descMetrics[0]).d.id : undefined;
  if (descs.length) {
    const dBlock = box("🖋 Описание", `${descs.length} варианта · разная длина и акценты`);
    for (const { d, m } of descMetrics) dBlock.append(descCard(d, m, d.id === bestDesc, toast));
    container.append(dBlock);
  }

  // --- A/B прогноз эффективности ---
  const ab = box("🧪 A/B прогноз эффективности", "Сравнение вариантов по прогнозным метрикам (детерминировано из video_id+текста)");
  const abT = document.createElement("div");
  const maxCtr = Math.max(...titleMetrics.map((x) => x.m.ctr), 0.1);
  const sortedT = [...titleMetrics].sort((a, b) => b.m.ctr - a.m.ctr);
  for (const { v, m } of sortedT) {
    abT.append(cmpBar(
      `${v.id === bestTitle ? "🏆 " : ""}${v.text.length > 42 ? `${v.text.slice(0, 42)}…` : v.text}`,
      m.ctr,
      maxCtr,
      v.id === bestTitle ? ACCENT : "#4c5470",
      `CTR ${m.ctr}%`,
    ));
  }
  ab.append(cmpSectionTitle("Заголовки · CTR"));
  ab.append(abT);
  if (descs.length) {
    const abD = document.createElement("div");
    const maxEng = Math.max(...descs.map((d) => projectVariantMetrics(videoId, d.text).engagement), 1);
    const sortedD = [...descs]
      .map((d) => ({ d, m: projectVariantMetrics(videoId, d.text) }))
      .sort((a, b) => b.m.engagement - a.m.engagement);
    for (const { d, m } of sortedD) {
      abD.append(cmpBar(
        `${d.id === bestDesc ? "🏆 " : ""}Вариант ${d.features[d.features.length - 1]} · ${d.chars} зн.`,
        m.engagement,
        maxEng,
        d.id === bestDesc ? "#8B5CF6" : "#4c5470",
        `вовлеч. ${m.engagement}`,
      ));
    }
    ab.append(cmpSectionTitle("Описания · вовлечённость"));
    ab.append(abD);
  }
  const abNote = document.createElement("div");
  abNote.className = "rz-muted";
  abNote.style.cssText = "font-size:10px;margin-top:6px;";
  abNote.textContent = "Демо-прогноз: в реальной схеме здесь будут клики/досмотры из облачной аналитики (NFR-8).";
  ab.append(abNote);
  container.append(ab);

  // --- Демо-графики ---
  const gBlock = box("📊 Графики (демо)", "Считаются из паспорта локально — без сети (NFR-7)");
  const retention = retentionSeries(passport);
  const spark = document.createElement("div");
  spark.innerHTML = sparklineSvg(retention.map((p) => p.value), { w: 320, h: 56 });
  const cap = document.createElement("div");
  cap.className = "rz-muted";
  cap.style.cssText = "font-size:11px;text-align:center;margin:4px 0 10px;";
  cap.textContent = `Удержание: старт ${retention[0].value}% → конец ${retention[retention.length - 1].value}%`;
  gBlock.append(spark, cap);

  const stack = monetizationStack(passport);
  if (stack.length) {
    const bar = document.createElement("div");
    bar.style.cssText = "display:flex;height:14px;border-radius:6px;overflow:hidden;margin:6px 0;";
    for (const s of stack) {
      const seg = document.createElement("div");
      seg.style.cssText = `width:${s.value}%;background:${s.color};`;
      seg.title = `${s.label} ${s.value}%`;
      bar.append(seg);
    }
    const legend = document.createElement("div");
    legend.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;";
    for (const s of stack) {
      const l = document.createElement("span");
      l.style.cssText = `display:inline-flex;align-items:center;gap:3px;font-size:10px;color:${MUTED};`;
      l.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${s.color}"></span>${s.label} ${s.value}%`;
      legend.append(l);
    }
    gBlock.append(bar, legend);
  }

  const hours = hourlyBars(passport);
  const hoursBar = document.createElement("div");
  hoursBar.innerHTML = barChartSvg(hours, { w: 320, h: 76, highlightLast: false });
  const hoursCap = document.createElement("div");
  hoursCap.className = "rz-muted";
  hoursCap.style.cssText = "font-size:11px;text-align:center;";
  const peak = hours.reduce((a, b) => (b.value > a.value ? b : a), hours[0]);
  hoursCap.textContent = `Пик просмотров: ${peak.label}:00`;
  gBlock.append(hoursBar, hoursCap);
  container.append(gBlock);

  // --- Footer: детерминированность (NFR-7) ---
  const note = document.createElement("div");
  note.style.cssText = `padding:8px 10px;font-size:10px;color:${MUTED};border:1px dashed ${GRID};border-radius:10px;`;
  note.textContent = "Демо-режим: варианты и графики генерируются детерминированно из паспорта и video_id. Облачная генерация (NFR-8) подключается позже без изменения UI.";
  container.append(note);

  return () => {
    window.clearTimeout(toastTimer);
    for (const t of timers) window.clearTimeout(t);
    toast.remove();
  };
}
// = [M-EXTENSION][AUTHOR-TOOLS][RENDER][END_BLOCK]
