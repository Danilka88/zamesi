// [M-EXTENSION][BIKE-SEARCH][RENDER][START_BLOCK]
// Карточка «Замеси: Велосипеды» для поисковой страницы RUTUBE. Показывает
// замиксованную подборку из 3 видео (скриншоты, бренд-бейдж, ссылки-открыть)
// и секцию «товары из подборки». Реальные переходы на видео выполняются
// (открытие в новой вкладке); внешние площадки виртуальные (NFR-7).
import type { MerchProduct } from "../merchOffer/detect";
import type { BikeSearchEntry } from "./detect";

export const BIKE_SEARCH_ATTR = "data-rz-bike-search";

/** Уникальный градиент блока поиска (отличается от других оффер-блоков, NFR-6). */
export const BIKE_GRADIENT =
  "linear-gradient(135deg,#e65100 0%,#ff8f00 55%,#ffca28 100%)";

/** Видео из подборки — ссылка на rutube.ru/video/{id}. */
export function videoUrl(videoId: string): string {
  return `https://rutube.ru/video/${videoId}/`;
}

interface Palette {
  cardBg: string;
  cardBorder: string;
  title: string;
  sub: string;
  rowBg: string;
  tileBg: string;
  chipBg: string;
}

const DARK_PALETTE: Palette = {
  cardBg: "rgba(38,26,12,0.96)",
  cardBorder: "#8a5a16",
  title: "#ffe9c9",
  sub: "#b79a70",
  rowBg: "rgba(255,255,255,0.04)",
  tileBg: "rgba(255,255,255,0.07)",
  chipBg: "rgba(255,255,255,0.1)",
};

const LIGHT_PALETTE: Palette = {
  cardBg: "#ffffff",
  cardBorder: "#f0dcb6",
  title: "#4a3008",
  sub: "#8a713f",
  rowBg: "#fff8ec",
  tileBg: "#fff3d9",
  chipBg: "#fbeed8",
};

/** Определить тёмная ли тема страницы (зеркало travel/merch). */
export function isDarkTheme(win: Window = window): boolean {
  const dt = win.document.documentElement.dataset;
  const attr = dt.penTheme ?? dt.theme;
  if (attr === "light") return false;
  if (attr === "dark") return true;
  return typeof win.matchMedia === "function" &&
    win.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Скриншот подборки: внешний URL или локальный bлundle (chrome.runtime.getURL). */
export function screenshotSrc(screenshot: string): string {
  if (/^https?:\/\//i.test(screenshot)) return screenshot;
  const getURL = (globalThis as { chrome?: { runtime?: { getURL?: (a: string) => string } } })
    ?.chrome?.runtime?.getURL;
  return typeof getURL === "function" ? getURL(`bike/${screenshot}`) : `bike/${screenshot}`;
}

/** Домен видеобейджа: «how_to» → «Гайд», «review» → «Обзор». */
const DOMAIN_LABELS: Record<string, string> = {
  how_to: "Гайд",
  review: "Обзор",
  tech_review: "Обзор техники",
};

export function domainLabel(domainType: string): string {
  return DOMAIN_LABELS[domainType] ?? domainType;
}

/** Собрать иконку товара из ключевых слов (легковесная копия merch). */
const PRODUCT_ICON_RULES: ReadonlyArray<{ match: string; icon: string }> = [
  { match: "велосипед", icon: "🚴" },
  { match: "вилка", icon: "🔧" },
  { match: "тормоз", icon: "🛑" },
  { match: "покрышк", icon: "⭕" },
  { match: "кассет", icon: "⚙️" },
  { match: "трансмисси", icon: "⚙️" },
  { match: "руль", icon: "🛞" },
  { match: "диск", icon: "💿" },
  { match: "рам", icon: "🩳" },
  { match: "седл", icon: "🪑" },
  { match: "велострана", icon: "🏪" },
  { match: "sport", icon: "🎽" },
  { match: "промокод", icon: "🏷️" },
  { match: "купить", icon: "🛒" },
];

export function bikeProductIcon(query: string): string {
  const lower = query.toLowerCase();
  for (const rule of PRODUCT_ICON_RULES) {
    if (lower.includes(rule.match)) return rule.icon;
  }
  return "🚲";
}

/** Чистка label из search_query («горный велосипед купить» → «горный велосипед»). */
function cleanLabel(query: string): string {
  return query
    .replace(/купить\s*$/iu, "")
    .replace(/заказать\s*$/iu, "")
    .replace(/\s+/g, " ")
    .trim() || query;
}

/** Миниатюра видеов-строки: скриншот 100×56 (16:9) с fallback-эмодзи. */
function buildThumb(screenshot: string, alt: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = [
    "flex:0 0 96px",
    "width:96px",
    "height:54px",
    "border-radius:8px",
    "overflow:hidden",
    `background:${BIKE_GRADIENT}`,
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "box-shadow:0 4px 12px rgba(0,0,0,.25)",
    "position:relative",
  ].join(";");
  const img = document.createElement("img");
  img.src = screenshotSrc(screenshot);
  img.alt = alt;
  img.loading = "lazy";
  img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
  img.addEventListener("error", () => {
    img.style.display = "none";
    const fb = document.createElement("span");
    fb.textContent = "🚴";
    fb.style.cssText = "font-size:22px;";
    wrap.append(fb);
  });
  wrap.append(img);
  return wrap;
}

/** Сборка одной строки-видео подборки. */
function buildVideoRow(entry: BikeSearchEntry, p: Palette): HTMLAnchorElement {
  const row = document.createElement("a");
  row.href = videoUrl(entry.boundVideoId);
  row.target = "_blank";
  row.rel = "noopener noreferrer";
  row.dataset.rzBikeSearchVideo = entry.passportId;
  row.title = `${entry.title} — открыть в новой вкладке`;
  row.style.cssText = [
    "box-sizing:border-box",
    "display:flex",
    "align-items:center",
    "gap:12px",
    `background:${p.rowBg}`,
    "border:1px solid rgba(255,255,255,.06)",
    "border-radius:12px",
    "padding:9px 11px",
    "text-decoration:none",
    "color:inherit",
    "transition:transform .12s ease,filter .12s ease",
    "min-width:0",
  ].join(";");
  row.addEventListener("mouseenter", () => {
    row.style.filter = "brightness(1.08)";
    row.style.transform = "translateY(-1px)";
  });
  row.addEventListener("mouseleave", () => {
    row.style.filter = "";
    row.style.transform = "";
  });

  row.append(buildThumb(entry.screenshot, entry.title));

  const col = document.createElement("div");
  col.style.cssText = "display:flex;flex-direction:column;gap:5px;min-width:0;flex:1;";

  const title = document.createElement("div");
  title.textContent = entry.title;
  title.style.cssText = `font-weight:800;font-size:13.5px;line-height:1.35;color:${p.title};display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;`;

  const blurb = document.createElement("div");
  blurb.textContent = entry.blurb;
  blurb.style.cssText = `font-size:11.5px;line-height:1.4;color:${p.sub};display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;`;

  const meta = document.createElement("div");
  meta.style.cssText = "display:flex;align-items:center;gap:8px;flex-wrap:wrap;";
  const chip = document.createElement("span");
  chip.textContent = domainLabel(entry.domainType);
  chip.style.cssText = `font-size:9px;font-weight:800;letter-spacing:.08em;padding:2px 8px;border-radius:999px;background:${BIKE_GRADIENT};color:#fff;`;
  const open = document.createElement("span");
  open.textContent = "Открыть видео ↗";
  open.style.cssText = `font-size:11px;font-weight:700;color:${p.sub};opacity:.95;`;
  meta.append(chip, open);

  col.append(title, blurb, meta);
  row.append(col);
  return row;
}

/** Плитка товара секции «Товары из подборки». */
function buildProductTile(product: MerchProduct, p: Palette): HTMLElement {
  const tile = document.createElement("div");
  tile.dataset.rzBikeProduct = product.label;
  tile.title = product.query;
  tile.style.cssText = [
    "box-sizing:border-box",
    "display:flex",
    "align-items:center",
    "gap:8px",
    `background:${p.tileBg}`,
    "border-radius:10px",
    "padding:8px 10px",
    "min-width:0",
  ].join(";");

  const icon = document.createElement("span");
  icon.textContent = bikeProductIcon(product.query);
  icon.style.cssText = "font-size:17px;line-height:1;flex:0 0 auto;";

  const label = document.createElement("span");
  label.textContent = cleanLabel(product.label);
  label.style.cssText = `font-size:11.5px;font-weight:700;line-height:1.3;color:${p.title};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
  label.title = product.query;

  tile.append(icon, label);
  return tile;
}

/**
 * Создать карточку «Замеси: Велосипеды» (не монтирует в DOM).
 * @param entries видео подборки.
 * @param products товары (уже дедуплицированные, до limit).
 */
export function buildBikeSearchCard(entries: BikeSearchEntry[], products: MerchProduct[]): HTMLElement {
  const dark = isDarkTheme();
  const p = dark ? DARK_PALETTE : LIGHT_PALETTE;

  const card = document.createElement("div");
  card.setAttribute(BIKE_SEARCH_ATTR, "");
  card.style.cssText = [
    "box-sizing:border-box",
    "margin:14px 0",
    "padding:16px",
    `border:1px solid ${p.cardBorder}`,
    "border-radius:16px",
    `background:${p.cardBg}`,
    `color:${p.title}`,
    "font-family:-apple-system,'Segoe UI',Roboto,sans-serif",
    "font-size:13px",
    "line-height:1.45",
    "box-shadow:0 12px 34px rgba(0,0,0,.30)",
    "max-width:920px",
    "overflow:hidden",
  ].join(";");

  // Шапка с градиентным заголовком + бренд-пилюля.
  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;gap:11px;margin-bottom:13px;flex-wrap:wrap;";

  const badge = document.createElement("span");
  badge.textContent = "🚴 RUTUBE Замеси";
  badge.style.cssText = [
    `background:${BIKE_GRADIENT}`,
    "color:#fff",
    "font-weight:800",
    "font-size:11px",
    "padding:6px 12px",
    "border-radius:999px",
    "letter-spacing:.04em",
    "box-shadow:0 5px 14px rgba(230,81,0,.4)",
  ].join(";");

  const title = document.createElement("div");
  title.textContent = "Велосипеды — замиксованная подборка";
  title.style.cssText = "font-weight:900;font-size:16px;line-height:1.3;";

  const sub = document.createElement("div");
  sub.textContent = "3 видео из сезона: гайд, топ моделей и чек-лист покупки";
  sub.style.cssText = `width:100%;font-size:12.5px;color:${p.sub};`;

  header.append(badge, title, sub);
  card.append(header);

  // Список видео подборки.
  const list = document.createElement("div");
  list.style.cssText = "display:flex;flex-direction:column;gap:9px;";
  for (const e of entries) list.append(buildVideoRow(e, p));
  card.append(list);

  // Товарная секция.
  if (products.length > 0) {
    const divider = document.createElement("div");
    divider.style.cssText = `margin:14px 0 10px;height:1px;background:${p.cardBorder};opacity:.55;`;
    card.append(divider);

    const sec = document.createElement("div");
    sec.style.cssText = `font-size:10px;font-weight:800;letter-spacing:.09em;color:${p.sub};text-transform:uppercase;margin-bottom:9px;`;
    sec.textContent = "🛒 Товары из подборки";
    card.append(sec);

    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;";
    for (const prod of products) grid.append(buildProductTile(prod, p));
    card.append(grid);
  }

  // Подпись-нота.
  const footer = document.createElement("div");
  footer.style.cssText = `margin-top:12px;font-size:11px;color:${p.sub};display:flex;align-items:center;gap:6px;`;
  const dot = document.createElement("span");
  dot.textContent = "•";
  dot.style.cssText = "color:#ff8f00;font-weight:800;";
  const txt = document.createElement("span");
  txt.textContent = "Подборку собрал RUTUBE Video Analyzer на основе анализа трёх видео";
  footer.append(dot, txt);
  card.append(footer);

  return card;
}

/** Вставить карточку сразу после якоря. Идемпотентно. */
export function mountBikeSearchCard(anchor: HTMLElement, entries: BikeSearchEntry[], products: MerchProduct[]): HTMLElement | null {
  const next = anchor.nextElementSibling;
  if (next && next.hasAttribute(BIKE_SEARCH_ATTR)) return next as HTMLElement;
  const card = buildBikeSearchCard(entries, products);
  anchor.insertAdjacentElement("afterend", card);
  return card;
}

/** Убрать карточку поиска, если она за якорем. */
export function unmountBikeSearchCard(anchor: HTMLElement): void {
  const next = anchor.nextElementSibling;
  if (next && next.hasAttribute(BIKE_SEARCH_ATTR)) next.remove();
}
// = [M-EXTENSION][BIKE-SEARCH][RENDER][END_BLOCK]