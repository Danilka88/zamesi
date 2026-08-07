// [M-EXTENSION][GAME-OFFER][RENDER][START_BLOCK]
// Карточка «купить / играть в облаке». Встраивается сразу после
// section[aria-label="информация о видео"]. Визуально — полноценный рабочий
// блок (кнопки-сетка 2×2, брендированные), тема подстраивается под страницу.
// Реальные переходы на внешние площадки здесь не выполняются (NFR-7) —
// клик обрабатывается превью, чтобы блок никуда не уводил в демо-режиме.
export const GAME_OFFER_ATTR = "data-rz-game-offer";

export interface GameOfferAction {
  label: string;
  hint: string;
  /** href всегда "#" — переход наружу виртуальный (NFR-7). */
  href: string;
  /** Иконка-эмодзи для плитки. */
  icon: string;
}

/** Единый акцентный градиент всех плиток (в тон расширению, NFR-6). */
export const OFFER_GRADIENT =
  "linear-gradient(135deg,#0552e8 0%,#2f7cff 55%,#6c9fff 100%)";

/** Набор действий оффер-блока (российские площадки; 2×2 сетка). */
export const GAME_OFFER_ACTIONS: GameOfferAction[] = [
  {
    label: "Купить в VK Play",
    hint: "магазин vkplay.ru",
    href: "#",
    icon: "🛒",
  },
  {
    label: "Играть в облаке VK Play Cloud",
    hint: "cloud.vkplay.ru",
    href: "#",
    icon: "☁️",
  },
  {
    label: "Yandex Play / Игромир",
    hint: "play.yandex.ru",
    href: "#",
    icon: "🎮",
  },
  {
    label: "Похожие игры на RUTUBE",
    hint: "каталог на rutube.ru",
    href: "#",
    icon: "🎯",
  },
];

/**
 * Обложки игр → src изображения. Значение — либо относительный путь внутри
 * бандла расширения (public/img/...), либо полный внешний URL, который
 * используется как есть (reserved: avatars.mds.yandex.net и т.п.).
 * Ключ — нормализованное название игры в нижнем регистре.
 */
export const GAME_COVER_BY_NAME: Record<string, string> = {
  "atomic heart":
    "https://avatars.mds.yandex.net/get-mpic/16011298/2a0000019e7428e259323d23641f2677d981/orig",
};

/** src обложки для названия игры: внешний URL как есть, локальный — через chrome.runtime.getURL. */
export function gameCoverSrc(gameName: string): string | null {
  const raw = GAME_COVER_BY_NAME[gameName.trim().toLowerCase()];
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
  panelBg: string;
}

const DARK_PALETTE: Palette = {
  cardBg: "rgba(20,26,42,0.96)",
  cardBorder: "#3a4466",
  title: "#eef1fb",
  sub: "#9aa1b5",
  panelBg: "#141a2c",
};

const LIGHT_PALETTE: Palette = {
  cardBg: "#ffffff",
  cardBorder: "#e3e6ee",
  title: "#1b2030",
  sub: "#6b7280",
  panelBg: "#f6f7fa",
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

/** Элемент миниатюры обложки игры (56×72, скруглённый). */
export function buildCoverElement(gameName: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = [
    "flex:0 0 56px",
    "width:56px",
    "height:72px",
    "border-radius:9px",
    "overflow:hidden",
    "background:linear-gradient(135deg,#2f7cff,#a55bff)",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "box-shadow:0 6px 16px rgba(0,0,0,.28)",
    "position:relative",
  ].join(";");

  const src = gameCoverSrc(gameName);
  if (src) {
    const img = document.createElement("img");
    img.dataset.rzCover = "1";
    img.src = src;
    img.alt = `Обложка: ${gameName}`;
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
  span.textContent = "🎮";
  span.style.cssText = "font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35));";
  return span;
}

/** Создать элемент карточки (не монтирует в DOM). */
export function buildGameOfferCard(gameName: string): HTMLElement {
  const dark = isDarkTheme();
  const p = dark ? DARK_PALETTE : LIGHT_PALETTE;

  const card = document.createElement("div");
  card.setAttribute(GAME_OFFER_ATTR, "");
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

  // Шапка: обложка игры + бейдж «ИГРЫ» + название.
  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;gap:11px;margin-bottom:12px;";

  const cover = buildCoverElement(gameName);
  header.append(cover);

  const headText = document.createElement("div");
  headText.style.cssText = "display:flex;flex-direction:column;gap:5px;min-width:0;";
  const brandPill = document.createElement("span");
  brandPill.textContent = "ИГРЫ";
  brandPill.style.width = "fit-content";
  brandPill.style.cssText =
    "font-size:9px;font-weight:800;letter-spacing:.08em;padding:2px 8px;border-radius:999px;" +
    "background:linear-gradient(135deg,#2f7cff,#a55bff);color:#fff;box-shadow:0 4px 12px rgba(47,124,255,.45);width:fit-content;";
  const title = document.createElement("span");
  title.style.cssText = `font-weight:800;font-size:15px;color:${p.title};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
  title.title = gameName;
  title.textContent = gameName;
  headText.append(brandPill, title);
  header.append(headText);
  card.append(header);

  // Сетка действий 2×2.
  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:repeat(2,1fr);gap:8px;";
  for (const action of GAME_OFFER_ACTIONS) {
    const tile = document.createElement("a");
    tile.href = action.href;
    tile.target = "_blank";
    tile.rel = "noopener noreferrer";
    tile.dataset.rzGameOfferAction = action.label;
    tile.title = action.hint;
    tile.style.cssText = [
      "box-sizing:border-box",
      "display:flex",
      "align-items:center",
      "gap:8px",
      `background:${OFFER_GRADIENT}`,
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
    tile.style.setProperty("--rw-grad", OFFER_GRADIENT);
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
  dot.style.cssText = "color:#2f7cff;font-weight:800;";
  const txt = document.createElement("span");
  txt.textContent = "Чтобы сыграть — выберите площадку";
  footer.append(dot, txt);
  card.append(footer);

  return card;
}

/**
 * Вставить карточку сразу после якоря (meta-row). Идемпотентно: повторный вызов
 * с тем же якорем не создаёт дубликат.
 */
export function mountGameOfferCard(anchor: HTMLElement, gameName: string): HTMLElement | null {
  const next = anchor.nextElementSibling;
  if (next && next.hasAttribute(GAME_OFFER_ATTR)) return next as HTMLElement;
  const card = buildGameOfferCard(gameName);
  anchor.insertAdjacentElement("afterend", card);
  return card;
}

/** Убрать карточку, если она смонтирована сразу после якоря. */
export function unmountGameOfferCard(anchor: HTMLElement): void {
  const next = anchor.nextElementSibling;
  if (next && next.hasAttribute(GAME_OFFER_ATTR)) next.remove();
}
// = [M-EXTENSION][GAME-OFFER][RENDER][END_BLOCK]