// [M-EXTENSION][AUTHOR-TOOLS][RENDER][START_BLOCK]
// Рендер панели «Инструменты автора»: A/B-варианты заголовков и описаний с
// копированием в один клик, прогноз эффективности каждого варианта (CTR/охват/
// вовлечённость) + сравнение и демо-графики (удержание, монетизации, почасовые).
// Один и тот же контент рендерится в сайдбар (wide=false) и в полноширинную
// модалку (wide=true) через renderAuthorBody.
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

export interface AuthorToolsRenderOpts {
  /** Полноширинная раскладка (модалка) — сетки карточек и 2-колоночный низ. */
  wide?: boolean;
}

type ShowToast = (text: string) => void;

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
function copyButton(text: string, show: ShowToast): HTMLElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "⧉";
  btn.title = "Скопировать";
  btn.setAttribute("aria-label", "Скопировать");
  btn.style.cssText = `border:1px solid ${GRID};background:#12151f;color:#e7e9f0;border-radius:8px;` +
    "width:28px;height:28px;cursor:pointer;font-size:13px;flex:none;";
  btn.addEventListener("click", () => {
    void navigator.clipboard?.writeText(text).then(() => show("Скопировано ✓")).catch(() => undefined);
  });
  return btn;
}

/** Создать toast, прикреплённый к корню body (виден и над модалкой в shadow root). */
function makeToast(root: HTMLElement): { toast: HTMLElement; show: ShowToast; clear: () => void } {
  const toast = document.createElement("div");
  toast.classList.add("rz-toast");
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.style.cssText = `position:fixed;bottom:18px;left:50%;transform:translateX(-50%);` +
    `background:#0e0f16;color:#e7e9f0;border:1px solid ${ACCENT};border-radius:999px;` +
    "padding:6px 14px;font-size:12px;opacity:0;transition:opacity .25s;z-index:99999;pointer-events:none;";
  root.append(toast);
  let timer = 0;
  const show: ShowToast = (text: string) => {
    toast.textContent = text;
    toast.style.opacity = "1";
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      toast.style.opacity = "0";
    }, 1400);
  };
  const clear = (): void => window.clearTimeout(timer);
  return { toast, show, clear };
}

/** Метрики-чипы для карточки варианта (CTR / просмотры / вовлечённость). */
function metricsChips(m: VariantMetrics): HTMLElement {
  const chips = document.createElement("div");
  chips.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-top:5px;align-items:center;";
  const mk = (text: string): void => {
    const s = document.createElement("span");
    s.textContent = text;
    s.style.cssText = `font-size:11px;color:${MUTED};background:#151a28;border-radius:999px;padding:2px 8px;`;
    chips.append(s);
  };
  mk(`CTR ~${m.ctr}%`);
  mk(`👁 ${fmtViews(m.views)}`);
  mk(`вовлеч. ${m.engagement}`);
  return chips;
}

/** Акцентный бейдж «лидер прогноза» — вне потока метрик. */
function leaderBadge(): HTMLElement {
  const b = document.createElement("span");
  b.className = "rz-chip";
  b.textContent = "🏆 лидер прогноза";
  b.style.cssText = `font-size:10px;font-weight:700;color:#fff;background:${ACCENT};border-radius:999px;padding:2px 9px;flex:none;`;
  return b;
}

/** Подзаголовок секции внутри блока сравнения. */
function cmpSectionTitle(text: string): HTMLElement {
  const h = document.createElement("div");
  h.style.cssText = `font-size:11px;color:${MUTED};font-weight:600;margin:8px 0 2px;`;
  h.textContent = text;
  return h;
}

/** Горизонтальный бар сравнения (для A/B прогноза). truncate=false — полный текст (wide). */
function cmpBar(
  label: string,
  value: number,
  max: number,
  color: string,
  right: string,
  truncate = true,
): HTMLElement {
  const w = document.createElement("div");
  w.style.cssText = "margin:5px 0;";
  const top = document.createElement("div");
  top.style.cssText = "display:flex;justify-content:space-between;gap:8px;font-size:11px;margin-bottom:3px;";
  const lbl = document.createElement("span");
  lbl.style.cssText = truncate
    ? "color:#cfd3e0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;"
    : "color:#cfd3e0;flex:1;";
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
  show: ShowToast,
): HTMLElement {
  const card = document.createElement("div");
  card.classList.add("rz-ab-card");
  card.style.cssText = `padding:9px 10px;border:1px solid ${selected ? ACCENT : GRID};border-radius:10px;` +
    `background:${best ? "#241c26" : CARD};cursor:pointer;` +
    (best ? `border-left:3px solid ${ACCENT};` : "");
  const top = document.createElement("div");
  top.style.cssText = "display:flex;align-items:flex-start;gap:8px;";
  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "rz-ab-title";
  radio.checked = selected;
  radio.style.cssText = "margin-top:2px;accent-color:" + ACCENT + ";";
  const body = document.createElement("div");
  body.style.cssText = "flex:1;min-width:0;";
  const t = document.createElement("div");
  t.style.cssText = "font-size:13px;line-height:1.35;color:#e7e9f0;";
  t.textContent = v.text;
  const meta = document.createElement("div");
  meta.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:3px;";
  const src = document.createElement("span");
  src.className = "rz-muted";
  src.style.cssText = "font-size:10px;";
  src.textContent = v.source === "native" ? "родной заголовок" : `AI-вариант · ${v.note ?? ""}`;
  meta.append(src);
  if (best) meta.append(leaderBadge());
  body.append(t, meta, metricsChips(metrics));
  top.append(radio, body, copyButton(v.text, show));
  card.append(top);
  card.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onSelect();
  });
  return card;
}

function descCard(v: DescriptionVariant, metrics: VariantMetrics, best: boolean, idx: number, show: ShowToast): HTMLElement {
  const card = document.createElement("div");
  card.style.cssText = `padding:9px 10px;border:1px solid ${best ? ACCENT : GRID};border-radius:10px;background:${best ? "#241c26" : CARD};`;
  const head = document.createElement("div");
  head.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:6px;";
  const badge = document.createElement("span");
  badge.textContent = `вариант ${idx + 1} · ${v.chars} зн.`;
  badge.style.cssText = `font-size:10px;font-weight:600;color:${MUTED};border:1px solid ${GRID};border-radius:999px;padding:2px 8px;flex:none;`;
  const feats = document.createElement("div");
  feats.style.cssText = "display:flex;gap:4px;flex-wrap:wrap;flex:1;min-width:0;";
  for (const f of v.features) {
    if (/^вариант \d+$/i.test(f)) continue;
    const chip = document.createElement("span");
    chip.textContent = f;
    chip.style.cssText = `font-size:10px;color:${ACCENT};background:#2a2030;border-radius:999px;padding:2px 8px;`;
    feats.append(chip);
  }
  head.append(badge, feats, copyButton(v.text, show));
  const metricsRow = document.createElement("div");
  metricsRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;";
  metricsRow.append(metricsChips(metrics));
  if (best) metricsRow.append(leaderBadge());
  const body = document.createElement("div");
  body.style.cssText = "font-size:12px;line-height:1.45;color:#cfd3e0;white-space:pre-wrap;margin-top:6px;";
  body.textContent = v.text;
  card.append(head, metricsRow, body);
  return card;
}

export interface AuthorBody {
  root: HTMLElement;
  cleanup: () => void;
}

/** Построить контент панели автора. wide=true — раскладка полноширинной модалки. */
export function renderAuthorBody(data: AuthorToolsData, opts?: AuthorToolsRenderOpts): AuthorBody {
  const { passport, title, videoId } = data;
  const wide = opts?.wide ?? false;

  const root = document.createElement("div");
  root.classList.add("rz-author-body");
  const toastCtl = makeToast(root);

  const header = box("✍️ Инструменты автора", "A/B-подбор заголовка и описания (демо, детерминированно)");
  root.append(header);

  // --- Заголовки A/B ---
  const titles = buildTitleVariants(passport, title, videoId);
  const titleMetrics = titles.map((v) => ({ v, m: projectVariantMetrics(videoId, v.text) }));
  const bestTitle = titleMetrics.length
    ? titleMetrics.reduce((a, b) => (b.m.engagement > a.m.engagement ? b : a), titleMetrics[0]).v.id
    : undefined;
  let selectedIdx = 0;
  const tBlock = box("📝 Заголовок A/B", `${titles.length} вариантов · выберите для замены`);
  const tWrap = document.createElement("div");
  tWrap.classList.add("rz-cards");
  tWrap.style.cssText = wide
    ? "display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:6px;"
    : "display:flex;flex-direction:column;gap:6px;";
  const rerender = (): void => {
    tWrap.innerHTML = "";
    titleMetrics.forEach(({ v, m }, i) => {
      tWrap.append(titleCard(v, m, v.id === bestTitle, i === selectedIdx, () => { selectedIdx = i; rerender(); }, toastCtl.show));
    });
  };
  rerender();
  tBlock.append(tWrap);
  root.append(tBlock);

  // --- Описания ---
  const descs = buildDescriptionVariants(passport, videoId);
  const descMetrics = descs.map((d) => ({ d, m: projectVariantMetrics(videoId, d.text) }));
  const bestDesc = descMetrics.length
    ? descMetrics.reduce((a, b) => (b.m.engagement > a.m.engagement ? b : a), descMetrics[0]).d.id
    : undefined;
  if (descs.length) {
    const dBlock = box("🖋 Описание", `${descs.length} варианта · разная длина и акценты`);
    const dWrap = document.createElement("div");
    dWrap.style.cssText = wide
      ? "display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:6px;"
      : "display:flex;flex-direction:column;gap:6px;";
    for (const [i, { d, m }] of descMetrics.entries()) dWrap.append(descCard(d, m, d.id === bestDesc, i, toastCtl.show));
    dBlock.append(dWrap);
    root.append(dBlock);
  }

  // --- A/B прогноз эффективности ---
  const ab = box("🧪 A/B прогноз эффективности", "Сравнение вариантов по прогнозным метрикам (детерминировано из video_id+текста)");
  const abT = document.createElement("div");
  const maxCtr = Math.max(...titleMetrics.map((x) => x.m.ctr), 0.1);
  const sortedT = [...titleMetrics].sort((a, b) => b.m.ctr - a.m.ctr);
  for (const { v, m } of sortedT) {
    const label = v.id === bestTitle ? `🏆 ${v.text}` : v.text;
    abT.append(cmpBar(
      wide || label.length <= 42 ? label : `${label.slice(0, 42)}…`,
      m.ctr,
      maxCtr,
      v.id === bestTitle ? ACCENT : "#4c5470",
      `CTR ${m.ctr}%`,
      !wide,
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

  // --- Демо-графики ---
  const gBlock = box("📊 Графики (демо)", "Считаются из паспорта локально — без сети (NFR-7)");
  const retention = retentionSeries(passport);
  const spark = document.createElement("div");
  spark.innerHTML = sparklineSvg(retention.map((p) => p.value), { w: wide ? 640 : 320, h: 56 });
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
  hoursBar.innerHTML = barChartSvg(hours, { w: wide ? 640 : 320, h: 76, highlightLast: false });
  const hoursCap = document.createElement("div");
  hoursCap.className = "rz-muted";
  hoursCap.style.cssText = "font-size:11px;text-align:center;";
  const peak = hours.reduce((a, b) => (b.value > a.value ? b : a), hours[0]);
  hoursCap.textContent = `Пик просмотров: ${peak.label}:00`;
  gBlock.append(hoursBar, hoursCap);

  // wide: A/B прогноз и графики рядом; иначе стопкой
  if (wide) {
    ab.style.marginBottom = "0";
    const row = document.createElement("div");
    row.classList.add("rz-wide-row");
    row.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:10px;align-items:start;";
    row.append(ab, gBlock);
    root.append(row);
  } else {
    root.append(ab);
    root.append(gBlock);
  }

  // --- Footer: детерминированность (NFR-7) ---
  const note = document.createElement("div");
  note.style.cssText = `padding:8px 10px;font-size:10px;color:${MUTED};border:1px dashed ${GRID};border-radius:10px;`;
  note.textContent = "Демо-режим: варианты и графики генерируются детерминированно из паспорта и video_id. Облачная генерация (NFR-8) подключается позже без изменения UI.";
  root.append(note);

  return {
    root,
    cleanup: () => {
      toastCtl.clear();
      toastCtl.toast.remove();
    },
  };
}

/** Смонтировать панель автора в контейнер (сайдбар, wide=false по умолчанию). */
export function renderAuthorTools(
  container: HTMLElement,
  data: AuthorToolsData,
  opts?: AuthorToolsRenderOpts,
): () => void {
  const body = renderAuthorBody(data, opts);
  container.append(body.root);
  return body.cleanup;
}
// = [M-EXTENSION][AUTHOR-TOOLS][RENDER][END_BLOCK]
