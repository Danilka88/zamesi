// [M-EXTENSION][STUDIO][RENDER][TRENDS][START_BLOCK]
// Секция «Тренды и плейлисты» для AI-панели Studio. Показывает: KPI и donut
// распределения по сложности, карточки трендов Wordstat (объём/рост/сезонность/
// Alerts), идеи плейлистов с обложками и «путём зрителя», предложения
// коллабораций с overlap-барами. Всё офлайн и детерминированно (NFR-7).
import { applyValue } from "../autofill";
import type { StudioFormHandles } from "../selectors";
import type { ShowToast } from "./ui";
import { ACCENT, ACCENT_2, GRID, MUTED } from "./theme";
import { box } from "./ui";
import type {
  Collaborator,
  Trend,
  TrendPlaylist,
  TrendsBundle,
  TrendDifficulty,
} from "../trends";
import { sparklineSvg } from "../../content/authorTools/charts";
import { BIKE_GRADIENT } from "../../content/bikeSearch/render";

export interface TrendsBlockOpts {
  form: StudioFormHandles;
  toast: ShowToast;
  videoId: string;
}

const GROW_UP = "#22c55e";
const GROW_DOWN = "#ef4444";

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/** Признак CSS-строки (свойство:значение). */
function isCss(s: string): boolean {
  return /(?:^|;)\s*[a-z-]+\s*:/i.test(s) && s.includes(":");
}

/**
 * Создать элемент с inline-стилем и текстом. Порядок аргументов гибкий:
 * el(tag, css) / el(tag, css, text) / el(tag, text, css) — css распознаётся
 * по виду «свойство:значение».
 */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  a: string,
  b?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (b === undefined) {
    node.style.cssText = a;
  } else if (isCss(a)) {
    node.style.cssText = a;
    node.textContent = b;
  } else {
    node.textContent = a;
    node.style.cssText = b;
  }
  return node;
}

function copyText(text: string, toast: ShowToast): void {
  const nav = navigator as Navigator & { clipboard?: { writeText: (t: string) => Promise<void> } };
  const done = (): void => toast("Скопировано в буфер ✓");
  if (nav.clipboard?.writeText) {
    nav.clipboard.writeText(text).then(done).catch(done);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;opacity:0;";
  document.body.append(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch {
    /* no-op */
  }
  ta.remove();
  done();
}

const DIFF_META: Record<TrendDifficulty, { label: string; color: string }> = {
  low: { label: "Низкая", color: "#22c55e" },
  medium: { label: "Средняя", color: "#f59e0b" },
  high: { label: "Высокая", color: "#ef4444" },
};

/** KPI-строка + donut по сложности трендов. */
function trendsKpi(bundle: TrendsBundle): HTMLElement {
  const wrap = el("div", "display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:2px;");
  const kpis = el("div", "flex:1;min-width:170px;display:grid;grid-template-columns:1fr 1fr;gap:6px;");
  const mk = (icon: string, value: string, label: string, color = "#fff"): HTMLElement => {
    const c = el("div", `padding:8px 10px;border:1px solid ${GRID};border-radius:10px;background:#1b2030;`);
    c.append(el("div", icon, "font-size:15px;"));
    c.append(el("div", value, `font-weight:800;font-size:15px;color:${color};`));
    c.append(el("div", label, `font-size:9.5px;color:${MUTED};margin-top:1px;`));
    return c;
  };
  const T = bundle.totals;
  const hot = T.hotCount > 0 ? "🔥" : "🌡️";
  kpis.append(mk(hot, String(T.hotCount), "растущих >20%", "#fb5f93"));
  kpis.append(mk("📈", `${T.avgGrowth > 0 ? "+" : ""}${T.avgGrowth}%`, "средний рост", T.avgGrowth >= 0 ? GROW_UP : GROW_DOWN));
  kpis.append(mk("👥", String(T.collabCount), "коллабораций"));
  kpis.append(mk("📋", String(T.playlistCount), "плейлистов"));
  wrap.append(kpis);

  // Donut распределения по сложности.
  const total = Math.max(T.trendCount, 1);
  const counts: Record<TrendDifficulty, number> = { low: 0, medium: 0, high: 0 };
  for (const t of bundle.trends) counts[t.difficulty] += 1;
  const size = 84;
  const d = el("div", `width:${size}px;height:${size}px;border-radius:50%;flex:none;display:flex;` +
    "align-items:center;justify-content:center;position:relative;");
  const stops: string[] = [];
  let acc = 0;
  for (const diff of Object.keys(DIFF_META) as TrendDifficulty[]) {
    const pct = (counts[diff] / total) * 100;
    if (pct <= 0) continue;
    stops.push(`${DIFF_META[diff].color} ${acc.toFixed(1)}% ${(acc + pct).toFixed(1)}%`);
    acc += pct;
  }
  d.style.background = stops.length ? `conic-gradient(${stops.join(",")})` : "#2a3040";
  const hole = el("div", `width:${size - 20}px;height:${size - 20}px;border-radius:50%;background:#1b2030;` +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;");
  hole.append(el("div", String(T.trendCount), "font-weight:800;font-size:15px;color:#fff;"));
  hole.append(el("div", "трендов", `font-size:9px;color:${MUTED};`));
  d.append(hole);

  const legend = el("div", "display:flex;flex-direction:column;gap:3px;font-size:10.5px;");
  for (const diff of Object.keys(DIFF_META) as TrendDifficulty[]) {
    const row = el("div", "display:flex;align-items:center;gap:6px;color:#cfd4e3;");
    row.innerHTML = `<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${DIFF_META[diff].color}"></span>` +
      `<span>${DIFF_META[diff].label}</span>` +
      `<span style="margin-left:auto;font-weight:700;color:#fff">${counts[diff]}</span>`;
    legend.append(row);
  }
  const donutWrap = el("div", "display:flex;align-items:center;gap:10px;");
  donutWrap.append(d, legend);
  wrap.append(donutWrap);
  return wrap;
}

/** Чип-кнопка действия внутри карточки тренда. */
function actionChip(label: string, primary: boolean, onClick: () => void): HTMLElement {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.style.cssText = `border-radius:8px;padding:5px 10px;font-size:10.5px;cursor:pointer;font-weight:700;` +
    (primary
      ? `background:linear-gradient(135deg,${ACCENT},${ACCENT_2});color:#fff;border:0;`
      : `background:#1a2030;color:#e7e9f0;border:1px solid ${GRID};`);
  b.addEventListener("click", onClick);
  return b;
}

/** Карточка одного тренда Wordstat. */
function trendCard(t: Trend, bundle: TrendsBundle, opts: TrendsBlockOpts): HTMLElement {
  const card = el("div", `border:1px solid ${GRID};border-radius:12px;background:#1b2030;padding:9px 11px;margin-bottom:8px;`);
  const growthColor = t.growth >= 0 ? GROW_UP : GROW_DOWN;
  const growthArrow = t.growth >= 0 ? "▲" : "▼";

  // Верхняя строка: query + рост.
  const top = el("div", "display:flex;align-items:center;gap:8px;");
  const q = el("div", "flex:1;min-width:0;font-size:12.5px;font-weight:800;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;", t.query);
  top.append(q);
  const growth = el("span", `font-size:11px;font-weight:800;color:${growthColor};flex:none;`, `${growthArrow} ${t.growth >= 0 ? "+" : ""}${t.growth}%`);
  top.append(growth);
  card.append(top);

  // Строка метаданных: объём + сложность + источники.
  const meta = el("div", "display:flex;align-items:center;gap:8px;margin:6px 0 6px;flex-wrap:wrap;");
  meta.append(el("span", `👁 ${t.volume.toLocaleString("ru-RU")}/мес`, `font-size:10.5px;color:${MUTED};`));
  const diff = DIFF_META[t.difficulty];
  meta.append(el("span", `конкур. ${diff.label}`, `font-size:10px;color:${diff.color};border:1px solid ${diff.color};border-radius:999px;padding:1px 7px;`));
  meta.append(el("span", "Yandex Wordstat ✓", t.sources.wordstat ? `font-size:10px;color:#fc3f1d;` : `font-size:10px;color:${MUTED};`));
  if (t.sources.alerts) meta.append(el("span", "Google Alerts", "font-size:10px;color:#4285f4;"));
  card.append(meta);

  // Ряд: сезонность sparkline + прогноз.
  const rowFc = el("div", "display:flex;align-items:center;gap:10px;");
  const season = el("div", "flex:1;min-width:0;display:flex;align-items:center;gap:5px;");
  season.append(el("span", "🌤", "font-size:11px;"));
  const spark = document.createElement("div");
  spark.innerHTML = sparklineSvg(t.seasonality, { w: 120, h: 24 });
  spark.style.flex = "1";
  season.append(spark);
  rowFc.append(season);
  rowFc.append(el("div", `≈ ${fmtNum(t.forecast.estViews)} показов`, `font-size:10.5px;color:${MUTED};text-align:right;`));
  card.append(rowFc);

  // Related (если есть).
  if (t.related.length) {
    const rel = el("div", "display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;");
    for (const r of t.related.slice(0, 3)) {
      rel.append(el("span", r, `font-size:9.5px;color:${MUTED};background:#232a3d;border-radius:999px;padding:1px 7px;`));
    }
    card.append(rel);
  }

  // Действия.
  const acts = el("div", "display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;");
  acts.append(actionChip("⧉ Копировать запрос", false, () => copyText(t.query, opts.toast)));
  acts.append(actionChip("+ В заголовок", true, () => {
    const ok = applyValue(opts.form.title, t.query);
    opts.toast(ok ? "Тренд вставлен в название ✓" : "Поле «Название» не найдено");
  }));
  void bundle;
  card.append(acts);
  return card;
}

/** Обложка видео плейлиста (web_accessible bike/*.png или заглушка). */
function playlistThumb(screenshot: string | null): HTMLElement {
  const thumb = el("div", "flex:0 0 54px;width:54px;height:36px;border-radius:6px;overflow:hidden;" +
    `background:${BIKE_GRADIENT};display:flex;align-items:center;justify-content:center;font-size:16px;`);
  if (screenshot && typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    const img = document.createElement("img");
    img.src = chrome.runtime.getURL(`bike/${screenshot}`);
    img.style.cssText = "width:100%;height:100%;object-fit:cover;";
    thumb.append(img);
  } else {
    thumb.textContent = "🚴";
  }
  return thumb;
}

/** Строка видео в плейлисте. */
function videoRow(v: TrendPlaylist["videos"][number], open: (url: string) => void): HTMLElement {
  const row = el("a", "display:flex;align-items:center;gap:8px;text-decoration:none;margin:5px 0;cursor:pointer;");
  row.style.background = "transparent";
  row.appendChild(playlistThumb(v.screenshot));
  const body = el("div", "flex:1;min-width:0;");
  body.append(el("div", v.title, "font-size:11.5px;font-weight:700;color:#fff;line-height:1.25;"));
  body.append(el("div", `${v.blurb} · ${v.domainType}`, `font-size:9.5px;color:${MUTED};margin-top:1px;`));
  row.append(body);
  row.append(el("span", "↗", "flex:none;font-size:11px;color:#fb5f93;"));
  row.addEventListener("click", (e) => {
    e.preventDefault();
    open(v.boundVideoId ? `https://rutube.ru/video/${v.boundVideoId}/` : "#");
  });
  row.href = v.boundVideoId ? `https://rutube.ru/video/${v.boundVideoId}/` : "#";
  return row;
}

/** Карточка плейлиста с «путём зрителя». */
function playlistCard(pl: TrendPlaylist, opts: TrendsBlockOpts): HTMLElement {
  const card = el("div", `border:1px solid ${GRID};border-radius:12px;background:#1b2030;padding:9px 11px;margin-bottom:8px;border-left:3px solid ${ACCENT};`);
  if (pl.source === "trending") card.setAttribute("data-rz-trending", "1");
  const head = el("div", "display:flex;align-items:center;gap:8px;");
  const icon = pl.source === "trending" ? "🔥" : pl.source === "mix" ? "🎬" : "📂";
  head.append(el("span", icon, "font-size:15px;"));
  const tt = el("div", "flex:1;min-width:0;");
  tt.append(el("div", pl.title, "font-size:12.5px;font-weight:800;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"));
  if (pl.reason) tt.append(el("div", pl.reason, `font-size:10px;color:${MUTED};`));
  head.append(tt);
  card.append(head);

  if (pl.videos.length) {
    const list = el("div", "margin-top:6px;");
    for (const v of pl.videos) list.append(videoRow(v, () => undefined));
    card.append(list);
  }

  if (pl.journal.length) {
    const jl = el("div", "margin-top:7px;padding-top:6px;border-top:1px dashed #33363f;");
    jl.append(el("div", "🧭 Путь зрителя", `font-size:10px;font-weight:800;letter-spacing:.05em;color:${MUTED};margin-bottom:5px;text-transform:uppercase;`));
    for (const stage of pl.journal) {
      const st = el("div", "display:flex;gap:6px;margin-bottom:5px;align-items:flex-start;");
      st.append(el("span", stage.level[0] ?? "•", `width:18px;height:18px;border-radius:50%;flex:none;font-size:10px;font-weight:800;background:${BIKE_GRADIENT};color:#fff;display:flex;align-items:center;justify-content:center;`));
      const body = el("div", "flex:1;min-width:0;");
      body.append(el("div", stage.question, "font-size:10.5px;color:#e7e9f0;"));
      for (const clip of stage.clips) {
        const c = el("a", "display:block;font-size:10px;color:#38bdf8;text-decoration:none;margin-top:1px;cursor:pointer;", `▶ ${clip.time} · ${clip.title}`);
        c.href = clip.url;
        c.addEventListener("click", (e) => e.preventDefault());
        body.append(c);
      }
      st.append(body);
      jl.append(st);
    }
    card.append(jl);
  }

  const acts = el("div", "display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;");
  acts.append(actionChip("⧉ Структура плейлиста", false, () => {
    const lines = pl.videos.map((v, i) => `${i + 1}. ${v.title}`).join("\n");
    copyText(`${pl.title}\n${pl.reason}\n${lines}`, opts.toast);
  }));
  acts.append(actionChip("+ В поиск плейлиста", true, () => {
    if (!opts.form.playlistSearch) {
      opts.toast("Откройте раздел «Плейлисты» и нажмите снова");
      return;
    }
    const ok = applyValue(opts.form.playlistSearch, pl.title);
    opts.toast(ok ? `Ищу плейлист: «${pl.title}» ✓` : "Поле поиска плейлиста не найдено");
  }));
  card.append(acts);
  return card;
}

/** Карточка коллаборации с overlap-баром. */
function collabCard(c: Collaborator): HTMLElement {
  const card = el("div", `border:1px solid ${GRID};border-radius:12px;background:#1b2030;padding:9px 11px;margin-bottom:8px;`);
  const top = el("div", "display:flex;align-items:center;gap:9px;");
  const ava = el("div", "width:34px;height:34px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;" +
    `background:linear-gradient(135deg,${ACCENT},${ACCENT_2});font-size:16px;`, "👤");
  top.append(ava);
  const info = el("div", "flex:1;min-width:0;");
  info.append(el("div", c.channelName, "font-size:12.5px;font-weight:800;color:#fff;"));
  info.append(el("div", `${fmtNum(c.subscriberCount)} подписчиков · ${c.reason}`, `font-size:10px;color:${MUTED};`));
  top.append(info);
  top.append(el("span", `${Math.round(c.overlap * 100)}%`, "font-size:13px;font-weight:800;color:#fb5f93;flex:none;"));
  card.append(top);

  // Overlap bar.
  const barWrap = el("div", "margin-top:7px;");
  const track = el("div", "height:6px;border-radius:999px;background:#2a3040;overflow:hidden;");
  const fill = el("div", `height:100%;border-radius:999px;background:${BIKE_GRADIENT};width:${Math.max(4, Math.round(c.overlap * 100))}%;`);
  track.append(fill);
  barWrap.append(track);
  barWrap.append(el("div", `Пересечение аудиторий ${Math.round(c.overlap * 100)}%`, `font-size:9.5px;color:${MUTED};margin-top:2px;`));
  card.append(barWrap);

  const formatLine = el("div", `font-size:10px;color:#cfd4e3;margin-top:6px;`, `Формат: ${c.format}`);
  card.append(formatLine);

  const acts = el("div", "display:flex;gap:6px;margin-top:7px;flex-wrap:wrap;");
  acts.append(actionChip("⧉ Питч", false, () => copyText(c.pitch, () => undefined)));
  card.append(acts);

  // Питч (скрыт до клика).
  const pitchBlock = el("div", "display:none;margin-top:7px;");
  pitchBlock.style.border = `1px dashed ${GRID}`;
  pitchBlock.style.borderRadius = "8px";
  pitchBlock.style.padding = "6px 8px";
  pitchBlock.style.fontSize = "10px";
  pitchBlock.style.color = "#cfd4e3";
  pitchBlock.style.whiteSpace = "pre-wrap";
  pitchBlock.textContent = c.pitch;
  card.append(pitchBlock);
  acts.firstElementChild?.addEventListener("click", () => {
    pitchBlock.style.display = pitchBlock.style.display === "none" ? "" : "none";
  });
  return card;
}

/** Полная секция «Тренды и плейлисты». */
export function renderTrendsBlock(bundle: TrendsBundle, opts: TrendsBlockOpts): HTMLElement {
  const root = document.createElement("div");

  // KPI + donut.
  root.append(trendsKpi(bundle));

  // Фильтры трендов.
  const ALL_FILTERS = [
    { id: "all", label: `Все · ${bundle.trends.length}` },
    { id: "hot", label: `Растущие · ${bundle.totals.hotCount}` },
    { id: "alerts", label: `Alerts · ${bundle.totals.alertCount}` },
  ] as const;
  type TrendFilter = (typeof ALL_FILTERS)[number]["id"];
  let activeFilter: TrendFilter = "all";

  const trendSection = box("📈 Тренды Wordstat", `${bundle.domainLabel} · Яндекс.Wordstat + Google Alerts (демо, без сети)`, true);
  const filterRow = el("div", "display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;");
  const paints: { el: HTMLElement; paint: (f: TrendFilter) => void }[] = [];

  function visibleTrends(f: TrendFilter): Trend[] {
    if (f === "hot") return bundle.trends.filter((t) => t.growth > 15);
    if (f === "alerts") return bundle.trends.filter((t) => t.sources.alerts);
    return bundle.trends;
  }
  const trendList = el("div", "");
  const paintTrends = (f: TrendFilter): void => {
    trendList.innerHTML = "";
    const list = visibleTrends(f);
    for (const t of list) trendList.append(trendCard(t, bundle, opts));
    if (!list.length) trendList.append(el("div", "Нет трендов по выбранному фильтру", `font-size:11px;color:${MUTED};padding:6px 2px;`));
  };

  for (const f of ALL_FILTERS) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = f.label;
    b.style.cssText = `border-radius:999px;padding:4px 11px;font-size:11px;cursor:pointer;font-weight:700;` +
      (f.id === activeFilter ? `background:${ACCENT};color:#fff;border:1px solid ${ACCENT};` : `background:#1a2030;color:#e7e9f0;border:1px solid ${GRID};`);
    const setActive = (): void => {
      activeFilter = f.id;
      for (const { el: be, paint } of paints) {
        be.style.background = be === b ? ACCENT : "#1a2030";
        be.style.color = be === b ? "#fff" : "#e7e9f0";
        be.style.borderColor = be === b ? ACCENT : GRID;
        void paint;
      }
      paintTrends(f.id);
    };
    b.addEventListener("click", setActive);
    filterRow.append(b);
    paints.push({ el: b, paint: setActive });
  }
  trendSection.append(filterRow, trendList);
  paintTrends("all");
  root.append(trendSection);

  // Плейлисты.
  const plSection = box("📋 Плейлисты и подборки", "Автоплейлисты паспорта + тренд-подборка месяца (обложки реальных видео)", true);
  for (const pl of bundle.playlists) plSection.append(playlistCard(pl, opts));
  if (!bundle.playlists.length) plSection.append(el("div", "Плейлисты появятся после анализа видео", `font-size:11px;color:${MUTED};padding:6px 2px;`));
  root.append(plSection);

  // Коллаборации.
  const coSection = box(`🤝 Коллаборации · ${bundle.totals.collabCount}`, "Каналы RUTUBE с пересечением аудитории — скопируйте питч для переписки", true);
  for (const c of bundle.collabs.slice(0, 3)) coSection.append(collabCard(c));
  root.append(coSection);

  // Футер-дисклеймер.
  const note = el("div", `padding:8px 10px;font-size:10px;color:${MUTED};border:1px dashed ${GRID};border-radius:10px;line-height:1.5;`,
    "Демо-тренды: объёмы Wordstat и метрики детерминированы из видео (NFR-7). Живой прокси Wordstat/Alerts подключается позже без изменения UI.");
  root.append(note);

  return root;
}
// = [M-EXTENSION][STUDIO][RENDER][TRENDS][END_BLOCK]