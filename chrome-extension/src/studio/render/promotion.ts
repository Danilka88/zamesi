// [M-EXTENSION][STUDIO][RENDER][PROMOTION][START_BLOCK]
// Promotion section for the Studio AI panel: ready-to-use ad creatives for
// Yandex Direct / VK Ads / MyTarget built from the passport, live budget
// slider with a passport-based recommendation, targeting chips, UTM links,
// per-platform forecast, and actions (copy all / CSV / JSON / mock submit).
// Offline and deterministic (NFR-7); real API posting needs OAuth keys.
import {
  PLATFORMS,
  PLATFORM_ORDER,
  BUDGET_MIN,
  BUDGET_MAX,
  buildUTM,
  forecastForPlatform,
  type PromotionBundle,
  type PromoCampaign,
} from "../promotion";
import { applyValue } from "../autofill";
import type { StudioFormHandles } from "../selectors";
import { box, type ShowToast } from "./ui";
import { ACCENT, ACCENT_2, GRID, BG_CARD, MUTED } from "./theme";

export interface PromotionBlockOpts {
  form: StudioFormHandles;
  toast: ShowToast;
  videoId: string;
}

function fmtMoney(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function fmtNum(n: number): string {
  return n.toLocaleString("ru-RU");
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.style.cssText = style;
  if (text !== undefined) node.textContent = text;
  return node;
}

function copyText(text: string, toast: ShowToast): void {
  const done = (): void => toast("Скопировано в буфер ✓");
  const nav = navigator as Navigator & { clipboard?: { writeText: (t: string) => Promise<void> } };
  if (nav.clipboard?.writeText) {
    nav.clipboard.writeText(text).then(done).catch(done);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.append(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch {
    /* fallback */
  }
  ta.remove();
  done();
}

function download(id: string, content: string, type: string, filename: string, toast: ShowToast): void {
  const u = (URL as { createObjectURL?: (b: Blob) => string }).createObjectURL;
  if (!u) {
    toast("Экспорт недоступен в этом окружении");
    return;
  }
  const url = u(new Blob(["\ufeff" + content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  toast(`${id} скачан ✓`);
}

/** Donut распределения дневного бюджета по площадкам. */
function budgetDonut(bundle: PromotionBundle): HTMLElement {
  const total = bundle.totals.dailyBudget;
  const wrap = el("div", "display:flex;flex-direction:column;align-items:center;margin:2px 0 6px;");
  const size = 96;
  const d = el("div", `width:${size}px;height:${size}px;border-radius:50%;` +
    "display:flex;align-items:center;justify-content:center;position:relative;flex:none;");
  if (total > 0) {
    const stops: string[] = [];
    let acc = 0;
    for (const p of PLATFORM_ORDER) {
      const share = bundle.totals.perPlatform[p];
      const pct = (share.budget / total) * 100;
      if (pct <= 0) continue;
      stops.push(`${share.color} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`);
      acc += pct;
    }
    d.style.background = stops.length ? `conic-gradient(${stops.join(",")})` : "#2a3040";
  } else {
    d.style.background = "#2a3040";
  }
  const hole = el("div", `width:${size - 22}px;height:${size - 22}px;border-radius:50%;background:#1b2030;` +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;");
  const v = el("div", "font-weight:800;font-size:14px;color:#fff;", fmtMoney(total));
  const lbl = el("div", `font-size:10px;color:${MUTED};`, "бюджет/день");
  hole.append(v, lbl);
  d.append(hole);
  wrap.append(d);

  const legend = el("div", "display:flex;flex-direction:column;gap:3px;font-size:11px;");
  for (const p of PLATFORM_ORDER) {
    const st = bundle.totals.perPlatform[p];
    const row = el("div", "display:flex;align-items:center;gap:6px;color:#cfd4e3;");
    row.innerHTML = `<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${st.color}"></span>` +
      `<span>${st.icon} ${st.label}</span>` +
      `<span style="margin-left:auto;font-weight:700;color:#fff">${fmtMoney(st.budget)}</span>`;
    legend.append(row);
  }
  wrap.append(legend);
  return wrap;
}

/** CSV-отчёт по кампаниям (для импорта в рекламные кабинеты). */
export function buildPromotionCsv(bundle: PromotionBundle): string {
  const header = ["platform", "variant", "title", "text", "cta", "age", "geo", "interests", "budget", "forecast_ctr", "forecast_cpc", "forecast_reach", "forecast_clicks", "utm"];
  const rows: string[][] = [];
  for (const c of bundle.campaigns) {
    for (const v of c.variants) {
      rows.push([
        c.platform,
        v.id,
        v.title,
        v.text,
        v.cta,
        c.targeting.age,
        c.targeting.geo,
        c.targeting.interests.join("|"),
        String(c.activeBudget),
        String(c.forecast.ctr),
        String(c.forecast.cpc),
        String(c.forecast.reach),
        String(c.forecast.clicks),
        buildUTM(bundle.videoId, c.platform, v.id),
      ]);
    }
  }
  const esc = (cells: string[]): string => cells.map((s) => `"${s.replace(/"/g, '""')}"`).join(";");
  return [esc(header), ...rows.map(esc)].join("\n");
}

/** JSON-экспорт (мок прямого запроса к API площадки). */
export function buildPromotionJson(bundle: PromotionBundle): string {
  const payload = bundle.campaigns.map((c) => ({
    platform: c.platform,
    api: PLATFORMS[c.platform].apiName,
    name: `rz_${bundle.videoId}_${c.platform}`,
    budgetDaily: c.activeBudget,
    targeting: { age: c.targeting.age, geo: c.targeting.geo, interests: c.targeting.interests },
    adGroups: c.variants.map((v) => ({
      title: v.title,
      text: v.text,
      cta: v.cta,
      displayUrl: v.displayUrl,
      utm: buildUTM(bundle.videoId, c.platform, v.id),
      videoUrl: bundle.videoUrl,
    })),
  }));
  return JSON.stringify(payload, null, 2);
}

/** Формат mm:ss для метки видеокреатива. */
function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

interface CampaignCardOpts {
  bundle: PromotionBundle;
  campaign: PromoCampaign;
  form: StudioFormHandles;
  toast: ShowToast;
}

/** Карточка кампании на площадку: превью, варианты, бюджет-слайдер, таргетинг. */
function campaignCard(opts: CampaignCardOpts): HTMLElement {
  const { bundle, campaign, form, toast } = opts;
  const meta = PLATFORMS[campaign.platform];
  let activeVariant = 0;
  let budget = campaign.activeBudget;

  const card = el("div", `border:1px solid ${GRID};border-radius:12px;background:${BG_CARD};padding:10px 12px;margin:8px 0;`);

  // Header
  const head = el("div", "display:flex;align-items:center;gap:8px;flex-wrap:wrap;");
  const icon = el("div", `flex:none;width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;` +
    `background:linear-gradient(135deg,${ACCENT},${ACCENT_2});font-size:16px;`, meta.icon);
  const metaWrap = el("div", "flex:1;min-width:0;");
  metaWrap.append(
    el("div", "font-weight:800;font-size:13px;color:#fff;", meta.label),
    el("div", `font-size:10.5px;color:${MUTED};`, `${meta.apiName} · объявление`),
  );
  const badge = el("div", `flex:none;font-size:10px;font-weight:700;color:#0b0e1a;background:${meta.color};` +
    "border-radius:999px;padding:2px 8px;", "готово");
  head.append(icon, metaWrap, badge);
  card.append(head);

  // Budget recommendation
  const rec = el("div", `margin-top:8px;padding:6px 9px;background:#1b2030;border:1px dashed ${GRID};border-radius:9px;` +
    "font-size:11px;color:#cfd4e3;");
  rec.textContent = `Рекомендуем ${fmtMoney(bundle.totals.recommended)}/день — ${bundle.totals.recommendedReason}`;
  card.append(rec);

  // Video creative preview
  const cv = campaign.creative;
  const preview = el("div", `position:relative;height:74px;margin-top:8px;border-radius:10px;overflow:hidden;` +
    `background:linear-gradient(135deg,#1b2030,#141826);border:1px solid ${GRID};display:flex;align-items:center;padding:0 12px;`);
  const play = el("div", `flex:none;width:34px;height:34px;border-radius:50%;background:${meta.color};color:#fff;` +
    "display:flex;align-items:center;justify-content:center;font-size:14px;", "▶");
  const thumbText = el("div", "flex:1;margin-left:10px;font-size:12px;color:#cfd4e3;line-height:1.4;max-height:38px;overflow:hidden;",
    cv.thumbText);
  const badgeT = el("div", `position:absolute;right:10px;bottom:8px;background:rgba(0,0,0,0.7);color:#e7e9f0;border-radius:6px;` +
    "padding:2px 7px;font-size:10px;", `${fmtClock(cv.thumbTimeSec)} · ${fmtClock(cv.durationSec)}`);
  preview.append(play, thumbText, badgeT);
  card.append(preview);

  // Variant tabs
  const variantTabs = el("div", "display:flex;gap:4px;margin-top:8px;");
  const variantBody = el("div", "margin-top:6px;");
  const paintVariants = (): void => {
    for (const btn of variantTabs.querySelectorAll("button")) {
      const idx = Number((btn as HTMLButtonElement).dataset.idx ?? "0");
      const active = idx === activeVariant;
      (btn as HTMLButtonElement).style.background = active ? "#2a2038" : "#1a2030";
      (btn as HTMLButtonElement).style.color = active ? ACCENT : "#cfd4e3";
      (btn as HTMLButtonElement).style.borderColor = active ? ACCENT : GRID;
      (btn as HTMLButtonElement).style.fontWeight = active ? "700" : "500";
    }
    const v = campaign.variants[activeVariant];
    variantBody.innerHTML = "";
    variantBody.append(
      el("div", `padding:6px 8px;background:#10131c;border-radius:8px;font-size:12px;color:#fff;font-weight:700;` +
        `border-left:3px solid ${meta.color};`, `${v.title} (${v.title.length}/${PLATFORMS[campaign.platform].titleMax})`),
      el("div", `margin-top:5px;padding:5px 8px;background:#10131c;border-radius:8px;font-size:11.5px;color:#cfd4e3;line-height:1.4;` +
        `border-left:3px solid ${GRID};`, v.text),
      el("div", `margin-top:5px;font-size:10.5px;color:${MUTED};`, `CTA: «${v.cta}» · URL: ${v.displayUrl}`),
    );
  };
  campaign.variants.forEach((_, i) => {
    const tab = el("button", `border:1px solid ${GRID};background:#1a2030;color:#cfd4e3;border-radius:8px;` +
      "padding:3px 9px;font-size:11px;cursor:pointer;font-weight:500;", `Вариант ${i + 1}`);
    tab.type = "button";
    tab.dataset.idx = String(i);
    tab.addEventListener("click", () => {
      activeVariant = i;
      paintVariants();
    });
    variantTabs.append(tab);
  });
  paintVariants();
  card.append(variantTabs, variantBody);

  // Budget slider + live forecast
  const budgetRow = el("div", "margin-top:8px;");
  const budgetLabel = el("div", "display:flex;justify-content:space-between;font-size:11px;color:#cfd4e3;margin-bottom:3px;");
  budgetLabel.innerHTML = `<span>Бюджет/день</span><span style="font-weight:800;color:${ACCENT}">${fmtMoney(budget)}</span>`;
  const slider = el("input", "width:100%;accent-color:" + meta.color) as HTMLInputElement;
  slider.type = "range";
  slider.min = String(BUDGET_MIN);
  slider.max = String(BUDGET_MAX);
  slider.step = "100";
  slider.value = String(budget);
  const forecastSlot = el("div", `margin-top:4px;font-size:10.5px;color:${MUTED};line-height:1.5;`);
  const paintForecast = (): void => {
    const f = forecastForPlatform(campaign.platform, bundle.videoId, budget);
    forecastSlot.textContent =
      `CTR ${f.ctr}% · CPC ${Math.round(f.cpc)} ₽ · CPM ${Math.round(f.cpm)} ₽ · охват ${fmtNum(f.reach)} · ` +
      `клики ${fmtNum(f.clicks)} · CPA ${f.cpa} ₽`;
  };
  slider.addEventListener("input", () => {
    budget = Number(slider.value);
    budgetLabel.innerHTML = `<span>Бюджет/день</span><span style="font-weight:800;color:${ACCENT}">${fmtMoney(budget)}</span>`;
    paintForecast();
  });
  budgetRow.append(budgetLabel, slider, forecastSlot);
  paintForecast();
  card.append(budgetRow);

  // Targeting chips
  const tg = el("div", "display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;");
  const chip = (label: string): void => {
    tg.append(el("span", `display:inline-flex;align-items:center;border-radius:999px;padding:2px 8px;font-size:10.5px;` +
      `background:#1a2030;border:1px solid ${GRID};margin:1px 2px;`, label));
  };
  chip(`Аудитория ${campaign.targeting.age}`);
  for (const i of campaign.targeting.interests) chip(i);
  chip(campaign.targeting.geo);
  card.append(tg);

  // UTM row
  const v = campaign.variants[activeVariant];
  const utmLabel = el("div", "display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap;");
  const utmCo = el("code", `flex:1;min-width:0;font-size:10.5px;color:#9aa1b5;background:#10131c;` +
    "border:1px solid #2a3040;border-radius:8px;padding:4px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;",
    buildUTM(bundle.videoId, campaign.platform, v?.id ?? "ad"));
  const utmBtn = el("button", `flex:none;background:#2a2038;color:#cfd4e3;border:1px solid ${GRID};` +
    "border-radius:8px;padding:4px 8px;font-size:11px;cursor:pointer;", "Копировать");
  utmBtn.type = "button";
  utmBtn.addEventListener("click", () => copyText(utmCo.textContent ?? buildUTM(bundle.videoId, campaign.platform, v?.id ?? "ad"), toast));
  utmLabel.append(utmCo, utmBtn);
  card.append(utmLabel);

  // Actions: copy ad / insert UTM into description
  const acts = el("div", "display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;");
  const activeV = (): typeof campaign.variants[number] => campaign.variants[activeVariant] ?? campaign.variants[0];
  const copyAd = el("button", `flex:1;background:linear-gradient(135deg,${ACCENT},${ACCENT_2});color:#fff;border:0;` +
    "border-radius:8px;padding:6px 8px;font-size:11px;cursor:pointer;font-weight:700;", "📋 Копировать объявление");
  copyAd.type = "button";
  copyAd.addEventListener("click", () => {
    const av = activeV();
    copyText(`[${av.title}]\n${av.text}\n${av.displayUrl}\n${buildUTM(bundle.videoId, campaign.platform, av.id)}`, toast);
  });
  const insertUtm = el("button", `flex:1;background:#1a2030;color:#e7e9f0;border:1px solid ${GRID};` +
    "border-radius:8px;padding:6px 8px;font-size:11px;cursor:pointer;", "😊 вставить UTM в описание");
  insertUtm.type = "button";
  insertUtm.addEventListener("click", () => {
    const target = form.description;
    if (!target) { toast("Поле «Описание» не найдено"); return; }
    const url = buildUTM(bundle.videoId, campaign.platform, activeV().id);
    const sep = target.value.trim() ? "\n\n" : "";
    const ok = applyValue(target, `${target.value}${sep}Продвижение (${PLATFORMS[campaign.platform].label}): ${url}`);
    toast(ok ? "UTM добавлен в описание ✓" : "Не удалось заполнить");
  });
  acts.append(copyAd, insertUtm);
  card.append(acts);

  return card;
}

/** Полный блок продвижения: KPI + рекомендация + donut + кампании + действия. */
export function renderPromotionBlock(
  bundle: PromotionBundle,
  opts: PromotionBlockOpts,
): HTMLElement {
  const { form, toast, videoId } = opts;
  const t = bundle.totals;

  const block = box(
    "🚀 Продвижение · Реклама",
    "Готовые объявления из паспорта: RUTUBE (нативно) + Яндекс Директ, VK Реклама, MyTarget. Демо-режим (NFR-7).",
    true,
  );

  // KPI-ряд
  const kpis: [string, string, string][] = [
    ["👁", fmtNum(t.reach), "охват/день"],
    ["🖱", fmtNum(t.clicks), "клики/день"],
    ["🎯", `${t.avgCtr}%`, "ср. CTR"],
    ["💳", fmtMoney(t.dailyBudget), "бюджет/день"],
  ];
  const kpi = el("div", "display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:10px;");
  for (const [icon, num, name] of kpis) {
    const c = el("div", `padding:8px 6px;border:1px solid ${GRID};border-radius:10px;background:#20263a;text-align:center;`);
    c.innerHTML = `<div style="font-size:15px">${icon}</div>` +
      `<div style="font-weight:800;font-size:13px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${num}</div>` +
      `<div style="font-size:10px;color:${MUTED}">${name}</div>`;
    kpi.append(c);
  }
  block.append(kpi);

  // Donut распределения бюджета
  block.append(budgetDonut(bundle));

  // Глобальные действия
  const actions = el("div", "display:flex;gap:6px;flex-wrap:wrap;margin:8px 0;");
  const btnAllCopy = el("button", `flex:1;min-width:110px;background:linear-gradient(135deg,${ACCENT},${ACCENT_2});color:#fff;border:0;` +
    "border-radius:9px;padding:8px 10px;font-size:12px;cursor:pointer;font-weight:700;", "📋 Копировать все");
  btnAllCopy.type = "button";
  btnAllCopy.addEventListener("click", () => {
    const lines = bundle.campaigns.flatMap((c) =>
      c.variants.map((v) => `[${PLATFORMS[c.platform].label}] ${v.title}\n${v.text}\n${v.displayUrl}\n${buildUTM(bundle.videoId, c.platform, v.id)}`),
    );
    copyText(lines.join("\n\n"), toast);
  });
  const btnCsv = el("button", `flex:1;min-width:90px;background:#1a2030;color:#cfd4e3;border:1px solid ${GRID};` +
    "border-radius:9px;padding:8px 10px;font-size:12px;cursor:pointer;", "⬇ CSV");
  btnCsv.type = "button";
  btnCsv.addEventListener("click", () => download("CSV", buildPromotionCsv(bundle), "text/csv;charset=utf-8", `promo-${videoId || "passport"}.csv`, toast));
  const btnJson = el("button", `flex:1;min-width:90px;background:#1a2030;color:#cfd4e3;border:1px solid ${GRID};` +
    "border-radius:9px;padding:8px 10px;font-size:12px;cursor:pointer;", "⬇ JSON");
  btnJson.type = "button";
  btnJson.addEventListener("click", () => download("JSON", buildPromotionJson(bundle), "application/json;charset=utf-8", `promo-${videoId || "passport"}.json`, toast));
  const btnSend = el("button", `flex:1;min-width:140px;background:#2a2038;color:#e7e9f0;border:1px solid ${ACCENT};` +
    "border-radius:9px;padding:8px 10px;font-size:12px;cursor:pointer;font-weight:700;", "🚀 Отправить (демо)");
  btnSend.type = "button";
  btnSend.addEventListener("click", () => {
    const apis = PLATFORM_ORDER.map((p) => PLATFORMS[p].apiName).join(", ");
    toast(`Готово к отправке: ${apis} — подключите OAuth ✓`);
  });
  actions.append(btnAllCopy, btnCsv, btnJson, btnSend);
  block.append(actions);

  // Кампании — группировка: нативное RUTUBE отдельно, внешние каналы ниже
  const rutubeCampaign = bundle.campaigns.find((c) => c.platform === "rutube");
  const externalCampaigns = bundle.campaigns.filter((c) => c.platform !== "rutube");

  if (rutubeCampaign) {
    const headerNative = el(
      "div",
      `margin-top:8px;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:700;letter-spacing:.3px;` +
        `color:#fff;background:linear-gradient(135deg,#E32636,#7a0a14);border:1px solid #E32636;`,
      "▶️ ВНУТРЕННЕЕ ПРОДВИЖЕНИЕ — RUTUBE · платный буст в рекомендациях и на главной",
    );
    block.append(headerNative);
    block.append(campaignCard({ bundle, campaign: rutubeCampaign, form, toast }));
  }

  if (externalCampaigns.length) {
    const headerExt = el(
      "div",
      `margin-top:10px;padding:5px 10px;border-radius:8px;font-size:11px;font-weight:700;letter-spacing:.3px;` +
        `color:${MUTED};background:#1a2030;border:1px dashed ${GRID};`,
      "🌐 ВНЕШНИЕ КАНАЛЫ — Яндекс Директ · VK Реклама · MyTarget",
    );
    block.append(headerExt);
    for (const c of externalCampaigns) {
      block.append(campaignCard({ bundle, campaign: c, form, toast }));
    }
  }

  // Подпись
  const note = el("div", `margin-top:10px;font-size:10px;color:${MUTED};border:1px dashed ${GRID};border-radius:10px;padding:8px 10px;line-height:1.5;`);
  note.textContent = "Демо-режим: объявления, прогноз и бюджет сгенерированы локально из паспорта (NFR-7). " +
    "Реальная отправка: RUTUBE POST /pangolin/api/studio/promo (OAuth Studio) + " +
    "Директ POST /json/v5/campaigns, VK ads.create, MyTarget /api/v2/campaigns.json.";
  block.append(note);

  return block;
}
// = [M-EXTENSION][STUDIO][RENDER][PROMOTION][END_BLOCK]