// [M-EXTENSION][ANALYST-MODE][START_BLOCK]
// Режим «Аналитик»: сайдбар с блоками монетизации, модерации, аудио и метрик (P6).
import type { ModeData } from "../modes";
import { MONETIZATION_LABELS, VERDICT_LABELS, SEVERITY_LABELS } from "../../data/labels";
import { fmtDur } from "./layout";

function box(title: string): HTMLElement {
  const b = document.createElement("div");
  b.style.cssText = "padding:8px 10px;margin-bottom:8px;border:1px solid #33363f;border-radius:10px;background:#1b2030;";
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

export function renderAnalyst(container: HTMLElement, data: ModeData): () => void {
  const p = data.passport;
  const metrics = data.metrics;

  // --- Монетизации (агрегат по типу) ---
  const mon = box("💰 Монетизации");
  const counts = new Map<string, number>();
  for (const s of p.timeline) for (const mm of s.monetization) counts.set(mm.type, (counts.get(mm.type) ?? 0) + 1);
  if (counts.size) {
    const chips = document.createElement("div");
    chips.innerHTML = [...counts.entries()]
      .map(([t, n]) => {
        const l = MONETIZATION_LABELS[t as keyof typeof MONETIZATION_LABELS];
        if (!l) return "";
        return `<span class="rz-chip" style="background:${l.color};color:#0b0e1a">${l.icon} ${l.short} ×${n}</span>`;
      })
      .join("");
    mon.append(chips);
  } else {
    mon.append(muted("нет точек монетизации"));
  }
  container.append(mon);

  // --- Модерация ---
  const mod = box("🛡 Модерация");
  const mr = p.frontmatter.moderation;
  if (mr) {
    const v = VERDICT_LABELS[mr.verdict] ?? { label: mr.verdict, icon: "❓" };
    mod.append(row(`Возраст: <b>${mr.age_rating}</b> · Вердикт: <b>${v.icon} ${v.label}</b>`));
    mod.append(row(`Brand safety: <b>${mr.brand_safety_score}/100</b>`));
    for (const f of mr.flags) {
      const s = SEVERITY_LABELS[f.severity] ?? { label: f.severity };
      const when = f.timestamp_sec != null ? ` @${fmtDur(f.timestamp_sec)}` : "";
      mod.append(row(`⚠ ${f.category} (${s.label})${when} — ${f.evidence ?? ""}`));
    }
  } else {
    mod.append(muted("модерация не обнаружена"));
  }
  container.append(mod);

  // --- Аудио ---
  const aud = box("🎧 Аудио");
  if (p.audio_matches.length) {
    for (const a of p.audio_matches) {
      aud.append(row(`🎵 ${a.track_name} — ${a.artist} (увер. ${Math.round(a.confidence * 100)}%)`));
    }
  } else {
    aud.append(muted("треки не найдены"));
  }
  if (p.celebrity_voice) {
    aud.append(row(`⭐ Звезда: ${p.celebrity_voice.name} (${Math.round(p.celebrity_voice.confidence * 100)}%)`));
  }
  container.append(aud);

  // --- Метрики ---
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
      ["Время анализа", `${metrics.processing_time_sec.toFixed(1)}с`],
    ];
    for (const [k, v] of rows) met.append(row(`<b>${k}:</b> ${v}`));
  }
  container.append(met);
  return () => undefined;
}
// = [M-EXTENSION][ANALYST-MODE][END_BLOCK]