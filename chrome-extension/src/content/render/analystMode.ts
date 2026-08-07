// [M-EXTENSION][ANALYST-MODE][START_BLOCK]
// Режим «Аналитик»: дашборд с KPI-карточками, CSS-графиками (donut, бары),
// таймлайном монетизаций, модерацией, аудио и метриками (P6).
import type { ModeData } from "../modes";
import type { MonetizationType } from "../../data/types";
import { monetizationLabel, VERDICT_LABELS, SEVERITY_LABELS } from "../../data/labels";
import { fmtDur, sceneStarts, videoDuration } from "./layout";

const ACCENT = "#fb5f93";
const GRID = "#33363f";

function box(title: string): HTMLElement {
  const b = document.createElement("div");
  b.style.cssText = `padding:10px 12px;margin-bottom:10px;border:1px solid ${GRID};border-radius:12px;background:#1b2030;`;
  const h = document.createElement("div");
  h.className = "rz-title";
  h.textContent = title;
  b.append(h);
  return b;
}

function muted(text: string): HTMLElement {
  const d = document.createElement("div");
  d.className = "rz-muted";
  d.textContent = text;
  return d;
}

function row(html: string): HTMLElement {
  const d = document.createElement("div");
  d.className = "rz-row";
  d.innerHTML = html;
  return d;
}

/** Donut-диаграмма на conic-gradient. */
function donut(percent: number, size = 96, label: string, sub: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;margin:6px 0;";
  const d = document.createElement("div");
  const pct = Math.max(0, Math.min(100, percent));
  d.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;` +
    `background:conic-gradient(${ACCENT} ${pct}%, #2a3040 ${pct}% 100%);` +
    `display:flex;align-items:center;justify-content:center;position:relative;`;
  const hole = document.createElement("div");
  hole.style.cssText = `width:${size - 22}px;height:${size - 22}px;border-radius:50%;background:#1b2030;` +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;";
  const v = document.createElement("div");
  v.style.cssText = "font-weight:800;font-size:16px;";
  v.textContent = `${Math.round(pct)}%`;
  const lbl = document.createElement("div");
  lbl.className = "rz-muted";
  lbl.textContent = label;
  hole.append(v, lbl);
  d.append(hole);
  wrap.append(d);
  if (sub) wrap.append(muted(sub));
  return wrap;
}

/** Горизонтальная полоса с процентом. */
function bar(label: string, value: number, max: number, color: string, right?: string): HTMLElement {
  const w = document.createElement("div");
  w.style.cssText = "margin:6px 0;";
  const top = document.createElement("div");
  top.style.cssText = "display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;";
  top.innerHTML = `<span>${label}</span><span style="color:#9aa1b5">${right ?? `${value}/${max}`}</span>`;
  const track = document.createElement("div");
  track.style.cssText = `height:8px;border-radius:999px;background:#2a3040;overflow:hidden;`;
  const fill = document.createElement("div");
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  fill.style.cssText = `width:${pct}%;height:100%;border-radius:999px;background:${color};transition:width .5s ease;`;
  track.append(fill);
  w.append(top, track);
  return w;
}

/** Строка таймлайна монетизаций: точки на общей шкале длительности. */
function timeline(p: ModeData["passport"]): HTMLElement {
  const duration = videoDuration(p);

  const wrap = document.createElement("div");
  wrap.style.cssText = "margin:8px 0 4px;";
  const strip = document.createElement("div");
  strip.style.cssText = "position:relative;height:26px;border-radius:6px;background:#2a3040;overflow:hidden;";
  const marks: { startSec: number; color: string; icon: string }[] = [];
  for (const { startSec, scene } of sceneStarts(p)) {
    for (const m of scene.monetization) {
      const l = monetizationLabel(m.type);
      marks.push({ startSec, color: l.color, icon: l.icon });
    }
  }
  for (const mk of marks) {
    const dot = document.createElement("div");
    dot.style.cssText = `position:absolute;left:${duration ? (mk.startSec / duration) * 100 : 0}%;` +
      `top:2px;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;` +
      `font-size:11px;background:${mk.color};transform:translateX(-50%);box-shadow:0 0 0 2px #1b2030;`;
    dot.textContent = mk.icon;
    strip.append(dot);
  }
  const legend = document.createElement("div");
  legend.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;";
  const seen = new Map<string, string>();
  for (const mk of marks) if (!seen.has(mk.icon)) seen.set(mk.icon, mk.color);
  for (const [icon, color] of seen) {
    const l = document.createElement("span");
    l.style.cssText = "display:inline-flex;align-items:center;gap:3px;font-size:11px;color:#9aa1b5;";
    l.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color}"></span>${icon}`;
    legend.append(l);
  }
  wrap.append(strip, legend);
  return wrap;
}

export function renderAnalyst(
  container: HTMLElement,
  data: ModeData,
  opts?: { wide?: boolean },
): () => void {
  const p = data.passport;
  const metrics = data.metrics;
  const wide = opts?.wide ?? false;

  // --- KPI-карточки: 4 ключевых числа ---
  const kpi = document.createElement("div");
  kpi.style.cssText = `display:grid;grid-template-columns:${wide ? "repeat(4, minmax(120px, 1fr))" : "1fr 1fr"};gap:8px;margin-bottom:10px;`;
  const kpiCards: [string, string, string][] = [
    ["💰", String(metrics?.ad_slots ?? 0), "AD-слоты"],
    ["🛒", String(metrics?.ecom_items ?? 0), "Товары"],
    ["✂️", String(metrics?.clip_candidates ?? 0), "Клипы"],
    ["🎵", String(metrics?.music_tracks ?? 0), "Треки"],
  ];
  for (const [icon, num, name] of kpiCards) {
    const c = document.createElement("div");
    c.style.cssText = `padding:10px;border:1px solid ${GRID};border-radius:12px;background:#20263a;text-align:center;`;
    c.innerHTML = `<div style="font-size:20px">${icon}</div>` +
      `<div style="font-weight:800;font-size:20px">${num}</div>` +
      `<div class="rz-muted" style="font-size:11px">${name}</div>`;
    kpi.append(c);
  }
  container.append(kpi);

  // --- Donut: распределение по типам монетизации ---
  const counts = new Map<MonetizationType, number>();
  for (const s of p.timeline) for (const m of s.monetization) counts.set(m.type, (counts.get(m.type) ?? 0) + 1);
  if (counts.size) {
    const mon = box("💰 Монетизации");
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    const grid = document.createElement("div");
    grid.style.cssText = "display:flex;align-items:center;gap:12px;";
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const [topType, topCount] = sorted[0];
    const don = donut((total ? topCount / total : 0) * 100, 88, "топ-тип", `${topType}×${topCount}`);
    grid.append(don);
    const list = document.createElement("div");
    list.style.cssText = "flex:1;";
    for (const [t, n] of sorted) {
      const l = monetizationLabel(t);
      list.append(bar(`${l.icon} ${l.short}`, n, topCount, l.color, `×${n}`));
    }
    grid.append(list);
    mon.append(grid);
    container.append(mon);
  }

  // --- Таймлайн монетизаций по видео ---
  const tl = box("📈 Таймлайн монетизаций");
  tl.append(timeline(p));
  container.append(tl);

  // --- VLM Gatekeeper ---
  if (metrics) {
    const vlm = box("👁 Контроль кадров (VLM)");
    const vlmPct = metrics.total_scenes ? (metrics.vlm_calls / metrics.total_scenes) * 100 : 0;
    vlm.append(bar("Кадры с VLM", metrics.vlm_calls, metrics.total_scenes, ACCENT, `${vlmPct.toFixed(0)}%`));
    vlm.append(row(`Лимит ≤6%: <b>${vlmPct <= 6 ? "✅ соблюдён" : "⚠️ превышен"}</b>`));
    vlm.append(row(`Сцен: <b>${metrics.total_scenes}</b> · Время анализа: <b>${metrics.processing_time_sec.toFixed(1)}с</b>`));
    container.append(vlm);
  }

  // --- Brand safety gauge ---
  const bs = box("🛡 Brand safety");
  const bscore = p.frontmatter.brand_safety_score;
  const gauge = document.createElement("div");
  gauge.style.cssText = "display:flex;align-items:center;gap:12px;";
  gauge.append(donut(bscore, 88, "score", `${bscore}/100`));
  const mr = p.frontmatter.moderation;
  const blist = document.createElement("div");
  blist.style.cssText = "flex:1;";
  const verdict = mr ? VERDICT_LABELS[mr.verdict] : undefined;
  if (verdict) blist.append(row(`Вердикт: <b>${verdict.icon} ${verdict.label}</b>`));
  blist.append(bar("Возраст", mr ? 12 : 0, 18, "#8B5CF6", mr ? mr.age_rating : "—"));
  for (const f of mr?.flags ?? []) {
    const s = SEVERITY_LABELS[f.severity] ?? { label: f.severity };
    const when = f.timestamp_sec != null ? ` @${fmtDur(f.timestamp_sec)}` : "";
    blist.append(row(`⚠ ${f.category} <span class="rz-muted">(${s.label})${when}</span>`));
  }
  if (!mr) blist.append(muted("модерация не обнаружена"));
  gauge.append(blist);
  bs.append(gauge);
  container.append(bs);

  // --- Аудио ---
  const aud = box("🎧 Аудио");
  if (p.audio_matches.length) {
    const maxConf = Math.max(...p.audio_matches.map((a) => a.confidence), 0.01);
    for (const a of p.audio_matches) {
      aud.append(bar(`🎵 ${a.track_name}`, a.confidence * 100, maxConf * 100, "#F59E0B", `${a.artist} · ${Math.round(a.confidence * 100)}%`));
    }
  } else {
    aud.append(muted("треки не найдены"));
  }
  if (p.celebrity_voice) {
    aud.append(bar(`⭐ ${p.celebrity_voice.name}`, p.celebrity_voice.confidence * 100, 100, "#FCD34D", `${p.celebrity_voice.profession}`));
  }
  container.append(aud);

  // --- Метрики (сводно) ---
  const met = box("📊 Метрики");
  if (metrics) {
    const rows: [string, string][] = [
      ["Длительность", fmtDur(metrics.video_duration_sec)],
      ["Сцен", String(metrics.total_scenes)],
      ["VLM-вызовы", `${metrics.vlm_calls} (${metrics.vlm_percent}%)`],
      ["AD-слоты", String(metrics.ad_slots)],
      ["E-коммерция", String(metrics.ecom_items)],
      ["Клипы", String(metrics.clip_candidates)],
      ["Треки", String(metrics.music_tracks)],
      ["Билеты", String(metrics.event_tickets)],
      ["Мерч", String(counts.get("artist_merch") ?? 0)],
      ["Время анализа", `${metrics.processing_time_sec.toFixed(1)}с`],
    ];
    for (const [k, v] of rows) met.append(row(`<b>${k}:</b> ${v}`));
  }
  container.append(met);
  return () => undefined;
}
// = [M-EXTENSION][ANALYST-MODE][END_BLOCK]
