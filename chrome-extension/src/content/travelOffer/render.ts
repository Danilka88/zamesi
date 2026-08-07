// [M-EXTENSION][TRAVEL-OFFER][RENDER][START_BLOCK]
// Карточка «билеты до направления». Встраивается сразу после
// section[aria-label="информация о видео"] — как игровой оффер. Тема
// подстраивается под страницу, кнопки-сетка 2×2 брендированные. Реальные
// переходы на внешние площадки не выполняются (NFR-7) — клик обрабатывается
// превью, чтобы блок никуда не уводил в демо-режиме.
export const TRAVEL_OFFER_ATTR = "data-rz-travel-offer";

/** Город отправления. В проде подставляется из геолокации, в демо — константа. */
export const TRAVEL_DEPARTURE_CITY = "Краснодар";

export interface TravelOfferAction {
  label: string;
  hint: string;
  /** href всегда "#" — переход наружу виртуальный (NFR-7). */
  href: string;
  /** Иконка-эмодзи для плитки. */
  icon: string;
}

/** Градиент плиток тревел-оффера (отличается от игрового, NFR-6). */
export const TRAVEL_GRADIENT =
  "linear-gradient(135deg,#028090 0%,#00b4a0 55%,#4dd0c4 100%)";

/** Действия оффер-блока для направления (российские площадки; 2×2 сетка). */
export function buildTravelActions(destination: string): TravelOfferAction[] {
  const dep = TRAVEL_DEPARTURE_CITY;
  return [
    {
      label: `Билеты ${dep} → ${destination}`,
      hint: "поиск авиабилетов",
      href: "#",
      icon: "✈️",
    },
    {
      label: `Туры в ${destination}`,
      hint: "подбор тура",
      href: "#",
      icon: "🏖️",
    },
    {
      label: `Отели в ${destination}`,
      hint: "бронирование отелей",
      href: "#",
      icon: "🏨",
    },
    {
      label: `Экскурсии в ${destination}`,
      hint: "гиды и маршруты",
      href: "#",
      icon: "🎯",
    },
  ];
}

/**
 * Обложки направлений → src изображения. Значение — либо относительный путь внутри
 * бандла расширения (public/img/...), либо полный внешний URL, который используется
 * как есть. Ключ — нормализованное название направления в нижнем регистре.
 * Сейчас пусто: карточки используют заглушку 🌍, реальные обложки добавляются по мере готовности.
 */
export const TRAVEL_COVER_BY_DEST: Record<string, string> = {};

/** src обложки для направления: внешний URL как есть, локальный — через chrome.runtime.getURL. */
export function travelCoverSrc(destination: string): string | null {
  const raw = TRAVEL_COVER_BY_DEST[destination.trim().toLowerCase()];
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const getURL = (globalThis as { chrome?: { runtime?: { getURL?: (a: string) => string } } })
    ?.chrome?.runtime?.getURL;
  return typeof getURL === "function" ? getURL(raw) : raw;
}

/** Палитры тёмной/светлой темы карточки. */
interface Palette {
  cardBg: string;
  cardBorder: string;
  title: string;
  sub: string;
}

const DARK_PALETTE: Palette = {
  cardBg: "rgba(14,28,34,0.96)",
  cardBorder: "#2f5f5c",
  title: "#eafaf7",
  sub: "#8fa8a3",
};

const LIGHT_PALETTE: Palette = {
  cardBg: "#ffffff",
  cardBorder: "#d5e4e1",
  title: "#132b28",
  sub: "#5f7a75",
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

/** Элемент миниатюры направления (56×72, скруглённый, заглушка 🌍). */
export function buildCoverElement(destination: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = [
    "flex:0 0 56px",
    "width:56px",
    "height:72px",
    "border-radius:9px",
    "overflow:hidden",
    "background:linear-gradient(135deg,#00b4a0,#3aa7ff)",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "box-shadow:0 6px 16px rgba(0,0,0,.28)",
    "position:relative",
  ].join(";");

  const src = travelCoverSrc(destination);
  if (src) {
    const img = document.createElement("img");
    img.dataset.rzCover = "1";
    img.src = src;
    img.alt = `Обложка: ${destination}`;
    img.loading = "lazy";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
    img.addEventListener("error", () => {
      img.style.display = "none";
      wrap.appendChild(buildCoverFallback());
    });
    wrap.append(img);
  } else {
    wrap.append(buildCoverFallback());
  }
  return wrap;
}

function buildCoverFallback(): HTMLElement {
  const span = document.createElement("span");
  span.textContent = "🌍";
  span.style.cssText = "font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35));";
  return span;
}

/** Создать элемент карточки (не монтирует в DOM). */
export function buildTravelOfferCard(destination: string): HTMLElement {
  const dark = isDarkTheme();
  const p = dark ? DARK_PALETTE : LIGHT_PALETTE;

  const card = document.createElement("div");
  card.setAttribute(TRAVEL_OFFER_ATTR, "");
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

  // Шапка: миниатюра направления + бейдж «ТРАВЕЛ» + название.
  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;gap:11px;margin-bottom:12px;";

  const cover = buildCoverElement(destination);
  header.append(cover);

  const headText = document.createElement("div");
  headText.style.cssText = "display:flex;flex-direction:column;gap:5px;min-width:0;";
  const brandPill = document.createElement("span");
  brandPill.textContent = "ТРАВЕЛ";
  brandPill.style.cssText =
    "font-size:9px;font-weight:800;letter-spacing:.08em;padding:2px 8px;border-radius:999px;" +
    "background:linear-gradient(135deg,#00b4a0,#3aa7ff);color:#fff;box-shadow:0 4px 12px rgba(0,180,160,.45);width:fit-content;";
  const title = document.createElement("span");
  title.style.cssText = `font-weight:800;font-size:15px;color:${p.title};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
  title.title = destination;
  title.textContent = destination;
  headText.append(brandPill, title);
  header.append(headText);
  card.append(header);

  // Сетка действий 2×2.
  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:repeat(2,1fr);gap:8px;";
  for (const action of buildTravelActions(destination)) {
    const tile = document.createElement("a");
    tile.href = action.href;
    tile.target = "_blank";
    tile.rel = "noopener noreferrer";
    tile.dataset.rzTravelOfferAction = action.label;
    tile.title = action.hint;
    tile.style.cssText = [
      "box-sizing:border-box",
      "display:flex",
      "align-items:center",
      "gap:8px",
      `background:${TRAVEL_GRADIENT}`,
      "padding:9px 10px",
      "border-radius:10px",
      "text-decoration:none",
      "color:#fff",
      "font-weight:700",
      "font-size:12px",
      "line-height:1.25",
      "cursor:pointer",
      "transition:transform .12s ease,filter .12s ease,box-shadow .12s ease",
      "box-shadow:0 6px 14px rgba(0,0,0,.22)",
      "text-shadow:0 1px 2px rgba(0,0,0,.25)",
    ].join(";");
    tile.addEventListener("mouseenter", () => {
      tile.style.filter = "brightness(1.12)";
      tile.style.transform = "translateY(-1px)";
    });
    tile.addEventListener("mouseleave", () => {
      tile.style.filter = "";
      tile.style.transform = "";
    });
    const icon = document.createElement("span");
    icon.textContent = action.icon;
    icon.style.cssText = "font-size:17px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3));";
    const label = document.createElement("span");
    label.textContent = action.label;
    label.style.cssText = "text-align:left;";
    tile.append(icon, label);
    tile.addEventListener("click", (ev) => ev.preventDefault());
    grid.append(tile);
  }
  card.append(grid);

  // Нижняя строка — «подпись» блока (без слова «демо»).
  const footer = document.createElement("div");
  footer.style.cssText = `margin-top:10px;font-size:11px;color:${p.sub};display:flex;align-items:center;gap:6px;`;
  const dot = document.createElement("span");
  dot.textContent = "•";
  dot.style.cssText = "color:#00b4a0;font-weight:800;";
  const txt = document.createElement("span");
  txt.textContent = "Чтобы добраться — выберите сервис";
  footer.append(dot, txt);
  card.append(footer);

  return card;
}

/**
 * Вставить карточку сразу после якоря (meta-row). Идемпотентно: повторный вызов
 * с тем же якорем не создаёт дубликат.
 */
export function mountTravelOfferCard(anchor: HTMLElement, destination: string): HTMLElement | null {
  const next = anchor.nextElementSibling;
  if (next && next.hasAttribute(TRAVEL_OFFER_ATTR)) return next as HTMLElement;
  const card = buildTravelOfferCard(destination);
  anchor.insertAdjacentElement("afterend", card);
  return card;
}

/** Убрать карточку, если она смонтирована сразу после якоря. */
export function unmountTravelOfferCard(anchor: HTMLElement): void {
  const next = anchor.nextElementSibling;
  if (next && next.hasAttribute(TRAVEL_OFFER_ATTR)) next.remove();
}
// = [M-EXTENSION][TRAVEL-OFFER][RENDER][END_BLOCK]
