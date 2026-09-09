// [M-EXTENSION][STUDIO][INDEX][START_BLOCK]
// Entry content-script для studio.rutube.ru: детект модалки video-editor (React
// SPA монтирует клиентски → лёгкий поллинг), захват полей формы, автоподбор
// паспорта по video_id/заголовку, сбор предложений и монтаж Shadow DOM-панели.
// Слушает сообщения popup (rz-set-binding) для ручной смены паспорта.
import { findStudioModal, captureStudioForm } from "./selectors";
import { buildStudioSuggestions } from "./mapping";
import { mountStudioPanel } from "./render";
import { resolveBindingDetailed } from "../content/data/bindings";
import { getDefaultPassport, getPassportById } from "../data/registry";
import type { Passport } from "../data/types";
import { observeVideoList } from "./videoList";

const VIDEO_ID_RE = /rutube\.ru\/video\/(?:private\/)?([a-f0-9]{20,})\/?/i;

/** Извлечь video_id из ссылки приватного/публичного видео внутри модалки. */
export function findStudioVideoId(modal: HTMLElement): string | null {
  const link = modal.querySelector<HTMLAnchorElement>('a[href*="/video/"]');
  if (!link) return null;
  const m = link.href.match(VIDEO_ID_RE);
  return m ? m[1] : null;
}

/** Заголовок из поля формы (React может ещё не записать value при рендере). */
export function studioNativeTitle(modal: HTMLElement): string {
  const form = captureStudioForm(modal);
  const v = form.title?.value ?? "";
  if (v.trim()) return v.trim();
  const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content;
  return og ?? document.title;
}

export function resolveStudioPassport(modal: HTMLElement): { passport: Passport; method: "auto" | "none" | "manual" } {
  const videoId = findStudioVideoId(modal) ?? "";
  const title = studioNativeTitle(modal);
  const binding = resolveBindingDetailed(videoId, title);
  if (binding.entry) return { passport: binding.entry.passport, method: "auto" };
  const def = getDefaultPassport();
  return { passport: def, method: "none" };
}

let cleanupPanel: (() => void) | null = null;
let mountedModal: HTMLElement | null = null;

/** Хост панели помечается атрибутом — чтобы не монтировать дважды. */
const HOST_MARK = "data-rz-studio-host";

function findPanelHost(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[${HOST_MARK}]`);
}

/**
 * Смонтировать/перерисовать панель для текущей модалки с выбранным паспортом.
 * Идемпотентно: если хост уже в этой модалке — снимаем старый перед новым.
 */
export function mountForModal(modal: HTMLElement, passport: Passport, method: "auto" | "none" | "manual"): void {
  const existing = findPanelHost();
  if (existing) existing.remove();
  if (mountedModal && mountedModal !== modal) {
    cleanupPanel?.();
    cleanupPanel = null;
  }
  mountedModal = modal;
  const form = captureStudioForm(modal);
  const nativeTitle = studioNativeTitle(modal);
  const videoId = findStudioVideoId(modal) ?? "";
  const suggestions = buildStudioSuggestions(passport, nativeTitle, videoId || passport.frontmatter.video_id);
  const res = mountStudioPanel({ suggestions, form, hostMark: HOST_MARK });
  cleanupPanel = res.cleanup;
  modal.dataset.rzStudioBinding = method;
  modal.dataset.rzStudioPassport = passport.frontmatter.domain_type ?? "unknown";
}

/** Размонтировать панель (модалка закрыта). */
function teardown(modal: HTMLElement | null): void {
  if (modal && findPanelHost()) return;
  cleanupPanel?.();
  cleanupPanel = null;
  mountedModal = null;
}

const POLL_MS = 500;

function observeStudio(): void {
  if (!document.body) {
    console.warn("[M-EXTENSION][STUDIO] body отсутствует на старте — ожидаем DOMContentLoaded");
    document.addEventListener("DOMContentLoaded", () => observeStudio());
    return;
  }
  console.log("[M-EXTENSION][STUDIO] content-script загружен, pathname:", location.pathname);
  // Видео-список: заметная кнопка «Продвижение» на каждой карточке (Variant A, NFR-7)
  if (/\/videos/.test(location.pathname)) {
    try {
      observeVideoList();
    } catch (e) {
      console.warn("[M-EXTENSION][STUDIO][VIDEOLIST][ERROR]", e);
    }
  }
  const tryMount = (): void => {
    const modal = findStudioModal();
    if (modal) {
      // React может перерисовать модалку — хост в body переживает это.
      const live = findPanelHost();
      if (live && mountedModal === modal) return;
      const { passport, method } = resolveStudioPassport(modal);
      mountForModal(modal, passport, method);
    } else {
      teardown(mountedModal);
    }
  };
  tryMount();
  // Лёгкий поллинг вместо MutationObserver: не нагружает страницу во время
  // непрерывных перерисовок (загрузка видео, графики, чаты).
  setInterval(tryMount, POLL_MS);
}

// Ручная привязка из popup (аналог rz-set-binding на видео-странице).
chrome.runtime.onMessage?.addListener((msg: unknown) => {
  const m = msg as { type?: string; id?: string };
  if (m.type === "rz-set-binding" && m.id) {
    const modal = findStudioModal();
    const passport = getPassportById(m.id);
    if (modal && passport) {
      console.log("[M-EXTENSION][STUDIO] binding: manual", m.id);
      mountForModal(modal, passport, "manual");
      return;
    }
    // Список видео: перемонтировать кнопки (демо-паспорт сменится при следующем клике по «Продвижение» — резолв идёт по заголовку, не глобально)
    if (/\/videos/.test(location.pathname)) {
      console.log("[M-EXTENSION][STUDIO][VIDEOLIST] manual binding on list:", m.id);
    }
  }
});

void observeStudio();
// = [M-EXTENSION][STUDIO][INDEX][END_BLOCK]