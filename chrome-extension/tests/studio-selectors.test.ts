// [M-EXTENSION][TEST-STUDIO-SELECTORS][START_BLOCK]
// Селекторы модалки video-editor: поиск по name/data-control-name/placeholder,
// каскад фолбэков, скоупинг по модалке.
import { describe, it, expect } from "vitest";
import { buildStudioModalFixture } from "./studio-fixture";
import { captureStudioForm, findStudioModal, MODAL_SELECTOR } from "../src/studio/selectors";

describe("studio selectors", () => {
  it("MODAL_SELECTOR детектит модалку по data-testid", () => {
    const modal = buildStudioModalFixture();
    document.body.append(modal);
    const found = findStudioModal();
    expect(found).toBe(modal);
    expect(document.querySelector(MODAL_SELECTOR)).toBe(modal);
    modal.remove();
  });

  it("захватывает все поля формы", () => {
    const modal = buildStudioModalFixture();
    const f = captureStudioForm(modal);
    expect(f.title?.value).toBe("Тестовое видео");
    expect(f.description).not.toBeNull();
    expect(f.categoryInput?.getAttribute("placeholder")).toBe("Выберите категорию");
    expect(f.playlistsHidden?.getAttribute("name")).toBe("playlists");
    expect(f.accessHidden?.value).toBe("publish");
    expect(f.disclaimersHidden?.value).toContain("86bda998");
    expect(f.publishNow?.checked).toBe(true);
    expect(f.publishDelayed).not.toBeNull();
    expect(f.isAdult?.getAttribute("name")).toBe("isAdult");
    expect(f.withComments?.checked).toBe(true);
    expect(f.playlistSearch?.getAttribute("placeholder")).toBe("Найти плейлист");
    expect(f.submit?.textContent).toBe("Опубликовать");
  });

  it("категория резолвится через data-control-name", () => {
    const modal = buildStudioModalFixture();
    const f = captureStudioForm(modal);
    expect(f.categoryInput?.tagName).toBe("INPUT");
  });

  it("не находит поля вне модалки", () => {
    const other = document.createElement("input");
    other.name = "title";
    other.value = "чужая форма";
    document.body.append(other);
    const f = captureStudioForm(buildStudioModalFixture());
    expect(f.title?.value).not.toBe("чужая форма");
    other.remove();
  });
});
// = [M-EXTENSION][TEST-STUDIO-SELECTORS][END_BLOCK]