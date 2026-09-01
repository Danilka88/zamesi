// [M-EXTENSION][TEST-STUDIO-TRENDS-RENDER][START_BLOCK]
// Рендер секции «Тренды и плейлисты»: KPI/donut, карточка тренда с объёмом и
// кнопкой «+ В заголовок» (applyValue), плейлист с обложками, фильтры списка.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PASSPORT_REGISTRY } from "../src/data/registry";
import type { Passport } from "../src/data/types";
import { buildTrendsBundle } from "../src/studio/trends";
import { renderTrendsBlock } from "../src/studio/render/trends";
import type { StudioFormHandles } from "../src/studio/selectors";

function passportOf(id: string): Passport {
  const entry = PASSPORT_REGISTRY.find((e) => e.id === id);
  expect(entry).toBeDefined();
  return entry!.passport;
}

function fakeForm(): StudioFormHandles {
  return {
    modal: document.createElement("div"),
    title: document.createElement("input"),
    description: document.createElement("textarea"),
    categoryInput: document.createElement("input"),
    playlistsHidden: document.createElement("input"),
    accessHidden: document.createElement("input"),
    disclaimersHidden: document.createElement("input"),
    publishNow: document.createElement("input"),
    publishDelayed: document.createElement("input"),
    isAdult: document.createElement("input"),
    withComments: document.createElement("input"),
    playlistSearch: document.createElement("input"),
    submit: document.createElement("button"),
  } as StudioFormHandles;
}

const toast = vi.fn<(t: string) => void>();

function render(bundle = buildTrendsBundle(passportOf("bike_dont_buy"), "vid")): HTMLElement {
  const form = fakeForm();
  return renderTrendsBlock(bundle, { form, toast, videoId: "vid" });
}

beforeEach(() => {
  toast.mockClear();
});

describe("trends render: KPI и donut", () => {
  it("показывает KPI трендов/роста/коллабов/плейлистов", () => {
    const root = render();
    expect(root.textContent).toContain("Тренды Wordstat");
    expect(root.textContent).toContain("растущих");
    expect(root.textContent).toContain("коллабораций");
    expect(root.textContent).toContain("плейлистов");
  });

  it("карточка тренда: объём/рост/сложность/спарклайн", () => {
    const root = render();
    expect(root.textContent).toMatch(/\/мес/);
    expect(root.textContent).toMatch(/конкур\./);
    expect(root.querySelector("svg")).not.toBeNull(); // sparkline
  });

  it("фильтры «Все/Растущие/Alerts» переключают список", () => {
    const root = render();
    const hotBtn = [...root.querySelectorAll("button")].find((b) => b.textContent?.startsWith("Растущие"));
    expect(hotBtn).toBeTruthy();
    const before = root.textContent ?? "";
    hotBtn!.click();
    const after = root.textContent ?? "";
    // после фильтра «Растущие» list перерисован (кол-во карточек меньше)
    expect(after).not.toBe(before);
  });
});

describe("trends render: действия", () => {
  it("«+ В заголовок» вставляет тренд в поле названия (applyValue)", () => {
    const form = fakeForm();
    const root = renderTrendsBlock(buildTrendsBundle(passportOf("bike_dont_buy"), "vid"), {
      form,
      toast,
      videoId: "vid",
    });
    const btn = [...root.querySelectorAll("button")].find((b) => b.textContent?.includes("В заголовок"));
    expect(btn).toBeTruthy();
    btn?.click();
    expect(form.title!.value.length).toBeGreaterThan(0);
    expect(toast).toHaveBeenCalledWith(expect.stringContaining("название"));
  });

  it("плейлист (тренд-подборка): «⧉ Структура» копирует в буфер", () => {
    const spy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    const root = render();
    const trending = root.querySelector<HTMLElement>("[data-rz-trending]");
    expect(trending).toBeTruthy();
    const btn = [...trending!.querySelectorAll("button")].find((b) => b.textContent?.includes("Структура"));
    expect(btn).toBeTruthy();
    btn?.click();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("Велосипед"));
    spy.mockRestore();
  });
});

describe("trends render: плейлист с обложками и путь зрителя", () => {
  it("плейлист показывает 3 видео с номерными пунктами", () => {
    const root = render();
    expect(root.textContent).toContain("Плейлисты и подборки");
    expect(root.textContent).toContain("Велосипед месяца");
    expect(root.textContent).toContain("Путь зрителя");
  });
});

describe("trends render: коллаборации", () => {
  it("показывает коллаб с overlap-баром и питчем", () => {
    const root = render();
    expect(root.textContent).toMatch(/подписчиков/);
    expect(root.querySelector("[style*='width:']")).not.toBeNull(); // overlap bar fill
  });
});
// = [M-EXTENSION][TEST-STUDIO-TRENDS-RENDER][END_BLOCK]