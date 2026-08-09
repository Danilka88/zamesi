// [M-EXTENSION][MERCH-OFFER][RENDER][START_BLOCK]
// Карточка «товары из видео + мерч канала + магазины». Встраивается сразу
// после section[aria-label="информация о видео"] — как игровой/тревел-оффер.
// Тема подстраивается под страницу, свой градиентный стиль (NFR-6). Реальные
// переходы на внешние площадки не выполняются (NFR-7) — клик обрабатывается
// превью, чтобы блок никуда не уводил в демо-режиме.
import type { MerchProduct } from "./detect";

export const MERCH_OFFER_ATTR = "data-rz-merch-offer";

export interface MerchStoreOffer {
  label: string;
  hint: string;
  /** href всегда "#" — переход наружу виртуальный (NFR-7). */
  href: string;
  /** Иконка-эмодзи для чипа магазина. */
  icon: string;
}

/** Градиент плиток/бейджа мерч-оффера (отличается от игрового и тревел, NFR-6). */
export const MERCH_GRADIENT =
  "linear-gradient(135deg,#5d3fd3 0%,#9b4dff 55%,#f2a0ff 100%)";

/**
 * Курируемые магазины по бренду мерча (ключ — в нижнем регистре; частичное
 * совпадение). Для бренда без карты используется DEFAULT_STORES.
 */
export const MERCH_STORE_BY_BRAND: Record<string, MerchStoreOffer[]> = {
  wylsacom: [
    { label: "Biggeek", hint: "магазин гаджетов biggeek.ru", href: "#", icon: "💎" },
    { label: "Царские стёкла", hint: "мерч блогера tsar.wylsa.com", href: "#", icon: "👑" },
    { label: "Wildberries", hint: "площадка wildberries.ru", href: "#", icon: "🟣" },
    { label: "OZON", hint: "площадка ozon.ru", href: "#", icon: "🚚" },
    { label: "Яндекс Маркет", hint: "площадка market.yandex.ru", href: "#", icon: "🛒" },
  ],
};

/** Магазины по умолчанию, если у бренда нет своей карты. */
export const DEFAULT_STORES: MerchStoreOffer[] = [
  { label: "Wildberries", hint: "площадка wildberries.ru", href: "#", icon: "🟣" },
  { label: "OZON", hint: "площадка ozon.ru", href: "#", icon: "🚚" },
  { label: "Яндекс Маркет", hint: "площадка market.yandex.ru", href: "#", icon: "🛒" },
];

/** Магазины для бренда: карта бренда, при её отсутствии — DEFAULT_STORES. */
export function merchStoresFor(brand: string | null): MerchStoreOffer[] {
  if (!brand) return DEFAULT_STORES;
  const key = brand.trim().toLowerCase();
  for (const k of Object.keys(MERCH_STORE_BY_BRAND)) {
    if (key.includes(k)) return MERCH_STORE_BY_BRAND[k];
  }
  return DEFAULT_STORES;
}

/** Палитры тёмной/светлой темы карточки. */
interface Palette {
  cardBg: string;
  cardBorder: string;
  title: string;
  sub: string;
  sectionBg: string;
  tileBg: string;
}

const DARK_PALETTE: Palette = {
  cardBg: "rgba(30,24,52,0.96)",
  cardBorder: "#6a53c8",
  title: "#f3eeff",
  sub: "#a99fc4",
  sectionBg: "rgba(255,255,255,0.04)",
  tileBg: "rgba(255,255,255,0.07)",
};

const LIGHT_PALETTE: Palette = {
  cardBg: "#ffffff",
  cardBorder: "#e3dcf5",
  title: "#2b2350",
  sub: "#7a71a3",
  sectionBg: "#f6f3fe",
  tileBg: "#f0ecfc",
};

/** Определить тёмная ли тема страницы (data-theme RUTUBE → prefers-color-scheme). */
export function isDarkTheme(win: Window = window): boolean {
  const dt = win.document.documentElement.dataset;
  const attr = dt.penTheme ?? dt.theme;
  if (attr === "light") return false;
  if (attr === "dark") return true;
  return typeof win.matchMedia === "function" &&
    win.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Элемент миниатюры мерча (56×72, скруглённый, заглушка 👑). */
export function buildCoverElement(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = [
    "flex:0 0 56px",
    "width:56px",
    "height:72px",
    "border-radius:9px",
    "overflow:hidden",
    "background:linear-gradient(135deg,#7b2ff7,#f05ab5)",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "box-shadow:0 6px 16px rgba(0,0,0,.28)",
    "position:relative",
  ].join(";");
  const fallback = document.createElement("span");
  fallback.textContent = "👑";
  fallback.style.cssText = "font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35));";
  wrap.append(fallback);
  return wrap;
}

/** Строчная метка-подзаголовок секции. */
function buildSectionLabel(text: string, p: Palette): HTMLElement {
  const label = document.createElement("div");
  label.textContent = text;
  label.style.cssText = `font-size:10px;font-weight:800;letter-spacing:.08em;color:${p.sub};margin-bottom:8px;text-transform:uppercase;`;
  return label;
}

/** Плитка товара: иконка + имя (+ тег «мерч» для artist_merch). */
export function buildProductTile(product: MerchProduct, p: Palette): HTMLAnchorElement {
  const tile = document.createElement("a");
  tile.href = "#";
  tile.target = "_blank";
  tile.rel = "noopener noreferrer";
  tile.dataset.rzMerchProduct = product.label;
  tile.title = product.query;
  tile.style.cssText = [
    "box-sizing:border-box",
    "display:flex",
    "align-items:center",
    "gap:9px",
    `background:${p.tileBg}`,
    "padding:9px 10px",
    "border-radius:10px",
    "text-decoration:none",
    "color:inherit",
    "cursor:pointer",
    "transition:transform .12s ease,filter .12s ease",
    "min-width:0",
  ].join(";");
  tile.addEventListener("mouseenter", () => {
    tile.style.filter = "brightness(1.06)";
    tile.style.transform = "translateY(-1px)";
  });
  tile.addEventListener("mouseleave", () => {
    tile.style.filter = "";
    tile.style.transform = "";
  });

  const icon = document.createElement("span");
  icon.textContent = product.icon;
  icon.style.cssText = "font-size:19px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3));flex:0 0 auto;";

  const text = document.createElement("span");
  text.style.cssText = "display:flex;flex-direction:column;gap:2px;min-width:0;";
  const name = document.createElement("span");
  name.textContent = product.label;
  name.style.cssText = `font-size:12px;font-weight:700;color:${p.title};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
  text.append(name);
  if (product.type === "artist_merch") {
    const tag = document.createElement("span");
    tag.textContent = "мерч канала";
    tag.style.cssText =
      "font-size:8px;font-weight:800;letter-spacing:.06em;color:#fff;padding:1px 6px;border-radius:999px;" +
      `background:${MERCH_GRADIENT};width:fit-content;`;
    text.append(tag);
  }

  tile.append(icon, text);
  tile.addEventListener("click", (ev) => ev.preventDefault());
  return tile;
}

/** Чип-ссылка на магазин. */
export function buildStoreChip(store: MerchStoreOffer): HTMLAnchorElement {
  const chip = document.createElement("a");
  chip.href = store.href;
  chip.target = "_blank";
  chip.rel = "noopener noreferrer";
  chip.dataset.rzMerchStore = store.label;
  chip.title = store.hint;
  chip.style.cssText = [
    "box-sizing:border-box",
    "display:flex",
    "align-items:center",
    "gap:6px",
    `background:${MERCH_GRADIENT}`,
    "padding:7px 11px",
    "border-radius:999px",
    "text-decoration:none",
    "color:#fff",
    "font-weight:700",
    "font-size:11px",
    "line-height:1.15",
    "cursor:pointer",
    "transition:transform .12s ease,filter .12s ease,box-shadow .12s ease",
    "box-shadow:0 5px 12px rgba(0,0,0,.2)",
    "text-shadow:0 1px 2px rgba(0,0,0,.25)",
  ].join(";");
  chip.addEventListener("mouseenter", () => {
    chip.style.filter = "brightness(1.12)";
    chip.style.transform = "translateY(-1px)";
  });
  chip.addEventListener("mouseleave", () => {
    chip.style.filter = "";
    chip.style.transform = "";
  });
  const icon = document.createElement("span");
  icon.textContent = store.icon;
  icon.style.cssText = "font-size:15px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3));";
  const label = document.createElement("span");
  label.textContent = store.label;
  chip.append(icon, label);
  chip.addEventListener("click", (ev) => ev.preventDefault());
  return chip;
}

/** Создать элемент карточки (не монтирует в DOM). */
export function buildMerchOfferCard(
  brandName: string | null,
  products: MerchProduct[],
  stores: MerchStoreOffer[] = merchStoresFor(brandName),
): HTMLElement {
  const dark = isDarkTheme();
  const p = dark ? DARK_PALETTE : LIGHT_PALETTE;

  const card = document.createElement("div");
  card.setAttribute(MERCH_OFFER_ATTR, "");
  card.style.cssText = [
    "box-sizing:border-box",
    "margin:14px 0",
    "padding:14px 16px",
    `border:1px solid ${p.cardBorder}`,
    "border-radius:14px",
    `background:${p.cardBg}`,
    `color:${p.title}`,
    "font-family:-apple-system,'Segoe UI',Roboto,sans-serif",
    "font-size:13px",
    "line-height:1.45",
    "box-shadow:0 10px 30px rgba(0,0,0,.28)",
    "overflow:hidden",
  ].join(";");

  // Шапка: миниатюра + бейдж «МЕРЧ» + название бренда.
  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;gap:11px;margin-bottom:12px;";
  header.append(buildCoverElement());
  const headText = document.createElement("div");
  headText.style.cssText = "display:flex;flex-direction:column;gap:5px;min-width:0;";
  const brandPill = document.createElement("span");
  brandPill.textContent = "МЕРЧ";
  brandPill.style.cssText =
    "font-size:9px;font-weight:800;letter-spacing:.08em;padding:2px 8px;border-radius:999px;" +
    `background:${MERCH_GRADIENT};color:#fff;box-shadow:0 4px 12px rgba(123,47,247,.45);width:fit-content;`;
  const brand = document.createElement("span");
  const brandTitle = brandName ?? "Товары из видео";
  brand.style.cssText = `font-weight:800;font-size:15px;color:${p.title};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
  brand.title = brandTitle;
  brand.textContent = brandTitle;
  headText.append(brandPill, brand);
  header.append(headText);
  card.append(header);

  // Секция «Товары из видео» — сетка плиток (до 2 в ряд, переносится).
  const productSection = document.createElement("div");
  if (products.length > 0) {
    productSection.append(buildSectionLabel("Товары из видео", p));
    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(2,1fr);gap:8px;";
    for (const product of products) {
      grid.append(buildProductTile(product, p));
    }
    productSection.append(grid);
    card.append(productSection);
  } else {
    // Без товаров из паспорта — подсказка (fallback-домен/хэштеги).
    const hint = document.createElement("div");
    hint.textContent = "Стек товаров появится после анализа видео";
    hint.style.cssText = `font-size:12px;color:${p.sub};padding:8px 10px;border-radius:10px;background:${p.sectionBg};`;
    hint.style.display = "block";
    card.append(hint);
  }

  // Секция «Где купить» — чипы магазинов.
  const storeSection = document.createElement("div");
  storeSection.style.cssText = "margin-top:12px;";
  storeSection.append(buildSectionLabel("Где купить", p));
  const chips = document.createElement("div");
  chips.style.cssText = "display:flex;flex-wrap:wrap;gap:7px;";
  for (const store of stores) {
    chips.append(buildStoreChip(store));
  }
  storeSection.append(chips);
  card.append(storeSection);

  // Нижняя строка — «подпись» блока (без слова «демо»).
  const footer = document.createElement("div");
  footer.style.cssText = `margin-top:12px;font-size:11px;color:${p.sub};display:flex;align-items:center;gap:6px;`;
  const dot = document.createElement("span");
  dot.textContent = "•";
  dot.style.cssText = "color:#9b4dff;font-weight:800;";
  const txt = document.createElement("span");
  txt.textContent = "Товары из видео и мерч — ссылки на магазины-партнёры канала";
  footer.append(dot, txt);
  card.append(footer);

  return card;
}

/**
 * Вставить карточку сразу после якоря (meta-row). Идемпотентно: повторный вызов
 * с тем же якорем не создаёт дубликат.
 */
export function mountMerchOfferCard(
  anchor: HTMLElement,
  brandName: string | null,
  products: MerchProduct[],
): HTMLElement | null {
  const next = anchor.nextElementSibling;
  if (next && next.hasAttribute(MERCH_OFFER_ATTR)) return next as HTMLElement;
  const card = buildMerchOfferCard(brandName, products);
  anchor.insertAdjacentElement("afterend", card);
  return card;
}

/** Убрать карточку, если она смонтирована сразу после якоря. */
export function unmountMerchOfferCard(anchor: HTMLElement): void {
  const next = anchor.nextElementSibling;
  if (next && next.hasAttribute(MERCH_OFFER_ATTR)) next.remove();
}
// = [M-EXTENSION][MERCH-OFFER][RENDER][END_BLOCK]