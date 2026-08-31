// [M-EXTENSION][STUDIO][RENDER][REFERRAL][START_BLOCK]
// Referral monetization section for the Studio AI panel. Shows the revenue
// potential from passport products: 4 KPI cards, a 3-shop donut, per-product
// offer cards with shop tabs (copy / open link, per-shop forecast), and global
// actions (copy all, insert block into description, export CSV). All offline
// and deterministic (NFR-7); real affiliate generation is left for OAuth keys.
import { SHOPS, SHOP_ORDER, type ReferralBundle, type ReferralLink, type ReferralShop } from "../referral";
import { applyValue } from "../autofill";
import type { StudioFormHandles } from "../selectors";
import { box, type ShowToast } from "./ui";
import { ACCENT, ACCENT_2, GRID, BG_CARD, MUTED } from "./theme";

export interface ReferralBlockOpts {
  form: StudioFormHandles;
  toast: ShowToast;
  videoId: string;
}

function fmtMoney(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₽`;
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
    /* fallback без возможности копирования */
  }
  ta.remove();
  done();
}

function downloadCsv(csv: string, filename: string, toast: ShowToast): void {
  const u = (URL as { createObjectURL?: (b: Blob) => string }).createObjectURL;
  if (!u) {
    toast("CSV недоступен в этом окружении");
    return;
  }
  const url = u(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  toast("CSV скачан ✓");
}

/** Donut распределения дохода по магазинам (conic-gradient, центр — сумма). */
function shopDonut(bundle: ReferralBundle): HTMLElement {
  const total = bundle.totals.revenue;
  const wrap = el("div", "display:flex;flex-direction:column;align-items:center;margin:2px 0 4px;");
  const size = 96;
  const d = el("div", `width:${size}px;height:${size}px;border-radius:50%;` +
    `display:flex;align-items:center;justify-content:center;position:relative;flex:none;`);
  if (total > 0) {
    const stops: string[] = [];
    let acc = 0;
    for (const shop of SHOP_ORDER) {
      const pct = (bundle.totals.perShop[shop].revenue / total) * 100;
      if (pct <= 0) continue;
      stops.push(`${SHOPS[shop].color} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`);
      acc += pct;
    }
    d.style.background = stops.length ? `conic-gradient(${stops.join(",")})` : "#2a3040";
  } else {
    d.style.background = "#2a3040";
  }
  const hole = el("div", `width:${size - 22}px;height:${size - 22}px;border-radius:50%;background:#1b2030;` +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;");
  const v = el("div", "font-weight:800;font-size:14px;color:#fff;", `${bundle.totals.revenue.toLocaleString("ru-RU")}`);
  const lbl = el("div", `font-size:10px;color:${MUTED};`, "₽ потенциал");
  hole.append(v, lbl);
  d.append(hole);
  wrap.append(d);

  const legend = el("div", "display:flex;flex-direction:column;gap:3px;margin-top:6px;font-size:11px;");
  for (const shop of SHOP_ORDER) {
    const st = bundle.totals.perShop[shop];
    const row = el("div", "display:flex;align-items:center;gap:6px;color:#cfd4e3;");
    row.innerHTML = `<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${st.color}"></span>` +
      `<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px">${st.icon} ${st.label}</span>` +
      `<span style="margin-left:auto;font-weight:700;color:#fff">${st.revenue.toLocaleString("ru-RU")}</span>`;
    legend.append(row);
  }
  wrap.append(legend);
  return wrap;
}

/** CSV отчёт по всем офферам (для экспорта). */
export function buildReferralCsv(bundle: ReferralBundle): string {
  const header = [
    "product",
    "type",
    "confidence",
    "shop",
    "commission_pct",
    "short_url",
    "url",
    "forecast_views",
    "forecast_ctr",
    "forecast_conv",
    "forecast_revenue_rub",
  ];
  const rows = bundle.offers.flatMap((o) =>
    o.links.map((l) => [
      o.product.label.replace(/[\n;]/g, " "),
      o.product.type,
      String(o.product.confidence),
      l.shop,
      String(l.commissionPct),
      l.shortUrl,
      l.url,
      String(l.forecast.views),
      String(l.forecast.ctr),
      String(l.forecast.conv),
      String(l.forecast.revenue),
    ]),
  );
  const esc = (cells: string[]): string => cells.map((c) => `"${c.replace(/"/g, '""')}"`).join(";");
  return [esc(header), ...rows.map(esc)].join("\n");
}

/** Текст-блок «Товары из видео» для вставки в описание публикации. */
export function buildReferralDescriptionBlock(bundle: ReferralBundle): string {
  const lines = bundle.offers.map((o) => {
    const l = o.best;
    const meta = SHOPS[l.shop];
    return `• ${o.product.label} — ${l.shortUrl} (${meta.icon} ${meta.label}, комиссия ${l.commissionPct}%)`;
  });
  return [
    "🛒 Товары из видео:",
    ...lines,
    "",
    `💡 Прогноз монетизации: ${bundle.totals.revenue.toLocaleString("ru-RU")} ₽ (3 магазина, средний чек ${bundle.avgOrder.toLocaleString("ru-RU")} ₽).`,
  ].join("\n");
}

interface OfferCardOpts {
  bundle: ReferralBundle;
  index: number;
  form: StudioFormHandles;
  toast: ShowToast;
}

/** Карточка одного товара: переключение магазинов (табы), ссылка, копирование. */
function offerCard(opts: OfferCardOpts): HTMLElement {
  const { bundle, index, form, toast } = opts;
  const offer = bundle.offers[index];
  const prod = offer.product;

  const card = el("div", `border:1px solid ${GRID};border-radius:12px;background:${BG_CARD};padding:10px 12px;margin:8px 0;`);

  // Шапка: иконка, имя, confidence, тип, бейдж «лучший магазин»
  const head = el("div", "display:flex;align-items:center;gap:8px;flex-wrap:wrap;");
  const icon = el("div", `flex:none;width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;` +
    `background:linear-gradient(135deg,${ACCENT},${ACCENT_2});font-size:16px;`, prod.icon);
  const meta = el("div", "flex:1;min-width:0;");
  const name = el("div", "font-weight:800;font-size:13px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;", prod.label);
  const sub = el("div", `font-size:10.5px;color:${MUTED};margin-top:1px;`,
    `уверенность ${Math.round((prod.confidence ?? 0) * 100)}% · ${prod.type === "ecom_item" ? "товар" : "мерч"}`);
  meta.append(name, sub);
  const bestBadge = el("div", `flex:none;font-size:10px;font-weight:700;color:#0b0e1a;background:${ACCENT};` +
    "border-radius:999px;padding:2px 8px;", `лучший: ${SHOPS[offer.best.shop].icon}`);
  head.append(icon, meta, bestBadge);
  card.append(head);

  // Табы магазинов — переключают активную ссылку без перерисовки панели.
  let activeShop: ReferralShop = offer.best.shop;
  const contentSlot = el("div", "margin-top:8px;");
  const tabs = el("div", "display:flex;gap:4px;flex-wrap:wrap;");

  const paintTabs = (): void => {
    for (const btn of tabs.querySelectorAll("button")) {
      const si = (btn as HTMLButtonElement).dataset.shop as ReferralShop;
      const active = si === activeShop;
      (btn as HTMLButtonElement).style.background = active ? "#2a2038" : "#1a2030";
      (btn as HTMLButtonElement).style.color = active ? ACCENT : "#cfd4e3";
      (btn as HTMLButtonElement).style.fontWeight = active ? "700" : "500";
      (btn as HTMLButtonElement).style.borderColor = active ? ACCENT : GRID;
    }
  };

  const paintBody = (): void => {
    const l = (offer.links.find((x) => x.shop === activeShop) ?? offer.links[0]) as ReferralLink;
    contentSlot.innerHTML = "";
    const row = el("div", "display:flex;align-items:center;gap:6px;");
    const url = el("code", `flex:1;min-width:0;font-size:11px;color:#9aa1b5;background:#10131c;` +
      "border:1px solid #2a3040;border-radius:8px;padding:5px 8px;" +
      "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;", l.shortUrl);
    url.title = l.url;
    const copy = el("button", `flex:none;background:#2a2038;color:${ACCENT};border:1px solid ${ACCENT};` +
      "border-radius:8px;padding:4px 9px;font-size:11px;cursor:pointer;font-weight:700;", "Копировать");
    copy.type = "button";
    copy.addEventListener("click", () => copyText(l.url, toast));
    const open = el("button", `flex:none;background:#1a2030;color:#cfd4e3;border:1px solid ${GRID};` +
      "border-radius:8px;padding:4px 9px;font-size:11px;cursor:pointer;", "Открыть");
    open.type = "button";
    open.addEventListener("click", () => window.open(l.url, "_blank", "noopener,noreferrer"));
    row.append(url, copy, open);
    const f = l.forecast;
    const stats = el("div", `margin-top:6px;font-size:10.5px;color:${MUTED};line-height:1.5;`,
      `CTR ${f.ctr}% · конверсия ${f.conv}% · охват ${f.views.toLocaleString("ru-RU")} · EPC ${f.epc} ₽ · ` +
      `доход ${f.revenue.toLocaleString("ru-RU")} ₽`);
    contentSlot.append(row, stats);
  };

  for (const shop of SHOP_ORDER) {
    const l = offer.links.find((x) => x.shop === shop);
    if (!l) continue;
    const tab = el("button", `border:1px solid ${GRID};background:#1a2030;color:#cfd4e3;` +
      "border-radius:8px;padding:3px 9px;font-size:11px;cursor:pointer;font-weight:500;",
      `${SHOPS[shop].icon} ${SHOPS[shop].label} · ${l.commissionPct}%`);
    tab.type = "button";
    tab.dataset.shop = shop;
    tab.addEventListener("click", () => {
      activeShop = shop;
      paintTabs();
      paintBody();
    });
    tabs.append(tab);
  }
  paintTabs();
  paintBody();
  card.append(tabs, contentSlot);

  // Быстрое действие карточки: вставить ссылку выбранного магазина в описание.
  const insert = el("button", `margin-top:8px;width:100%;background:${ACCENT};color:#fff;border:0;border-radius:8px;` +
    "padding:6px 10px;font-size:11px;cursor:pointer;font-weight:700;", "😊 вставить ссылку в описание");
  insert.type = "button";
  insert.addEventListener("click", () => {
    const link = offer.links.find((x) => x.shop === activeShop) ?? offer.best;
    const line = `${prod.label}: ${link.shortUrl}`;
    const target = form.description;
    if (!target) {
      toast("Поле «Описание» не найдено");
      return;
    }
    const sep = target.value.trim() ? "\n\n" : "";
    const ok = applyValue(target, `${target.value}${sep}${line}`);
    toast(ok ? `Ссылка (${SHOPS[link.shop].label}) добавлена в описание ✓` : "Не удалось заполнить описание");
  });
  card.append(insert);
  return card;
}

/** Собрать и отрендерить весь блок монетизации (KPI + donut + офферы + действия). */
export function renderReferralBlock(
  bundle: ReferralBundle,
  opts: ReferralBlockOpts,
): HTMLElement {
  const { form, toast, videoId } = opts;
  const t = bundle.totals;

  const block = box("💰 Монетизация · Реферальные ссылки", "Товары из паспорта → партнёрские ссылки на 3 магазина. Демо-режим (NFR-7).", true);

  // KPI-ряд: потенциал, ссылок, ср. CTR, ср. комиссия.
  const kpis: [string, string, string][] = [
    ["💵", fmtMoney(t.revenue), "потенциал"],
    ["🔗", String(t.links), "ссылок"],
    ["🎯", `${t.avgCtr}%`, "ср. CTR"],
    ["💰", `${t.avgCommission}%`, "ср. комиссия"],
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

  // Donut распределения по магазинам.
  block.append(shopDonut(bundle));

  // Глобальные действия: копировать все / вставить блок / экспорт CSV.
  const actions = el("div", "display:flex;gap:6px;flex-wrap:wrap;margin:8px 0;");
  const btnAllCopy = el("button", `flex:1;min-width:120px;background:linear-gradient(135deg,${ACCENT},${ACCENT_2});color:#fff;border:0;` +
    "border-radius:9px;padding:8px 10px;font-size:12px;cursor:pointer;font-weight:700;", "📋 Копировать все ссылки");
  btnAllCopy.type = "button";
  btnAllCopy.addEventListener("click", () => {
    const text = bundle.offers.map((o) => `${o.product.label}: ${o.best.shortUrl}`).join("\n");
    copyText(text, toast);
  });
  const btnInsert = el("button", `flex:1;min-width:120px;background:#2a2038;color:#e7e9f0;border:1px solid ${ACCENT};` +
    "border-radius:9px;padding:8px 10px;font-size:12px;cursor:pointer;font-weight:700;", "🛒 Вставить блок в описание");
  btnInsert.type = "button";
  btnInsert.addEventListener("click", () => {
    const target = form.description;
    const text = buildReferralDescriptionBlock(bundle);
    if (!target) {
      toast("Поле «Описание» не найдено");
      return;
    }
    const sep = target.value.trim() ? "\n\n" : "";
    const ok = applyValue(target, `${target.value}${sep}${text}`);
    toast(ok ? "Блок «Товары из видео» вставлен в описание ✓" : "Не удалось заполнить описание");
  });
  const btnCsv = el("button", `flex:1;min-width:100px;background:#1a2030;color:#cfd4e3;border:1px solid ${GRID};` +
    "border-radius:9px;padding:8px 10px;font-size:12px;cursor:pointer;", "⬇ CSV");
  btnCsv.type = "button";
  btnCsv.addEventListener("click", () => downloadCsv(buildReferralCsv(bundle), `referral-${videoId || "passport"}.csv`, toast));
  actions.append(btnAllCopy, btnInsert, btnCsv);
  block.append(actions);

  // Офферы.
  for (let i = 0; i < bundle.offers.length; i++) {
    block.append(offerCard({ bundle, index: i, form, toast }));
  }

  // Подпись: как это станет реальным API.
  const note = el("div", `margin-top:10px;font-size:10px;color:${MUTED};border:1px dashed ${GRID};border-radius:10px;padding:8px 10px;line-height:1.5;`);
  note.textContent = "Демо-режим: ссылки и прогноз сгенерированы локально из паспорта (NFR-7, без сети). " +
    "Реальные партнёрские ссылки появятся после подключения OAuth: ЯМ /partner/link/create, " +
    "AliExpress aliexpress.affiliate.link.generate, Admitad /deeplink/{w_id}/{c_id}/.";
  block.append(note);

  return block;
}
// = [M-EXTENSION][STUDIO][RENDER][REFERRAL][END_BLOCK]