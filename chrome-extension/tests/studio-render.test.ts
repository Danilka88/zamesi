// [M-EXTENSION][TEST-STUDIO-RENDER][START_BLOCK]
// Панель AI-ассистента: монтируется в контейнер, кнопка «Заполнить всё» пишет в
// поля формы, секции названия/описания/категории/плейлистов/модерации рендерятся.
import { describe, it, expect, vi } from "vitest";
import { PASSPORT_REGISTRY } from "../src/data/registry";
import { buildStudioSuggestions } from "../src/studio/mapping";
import { renderStudioPanel } from "../src/studio/render";
import { captureStudioForm } from "../src/studio/selectors";
import { buildReferralBundle, SHOPS, SHOP_ORDER } from "../src/studio/referral";
import { buildStudioModalFixture } from "./studio-fixture";
import type { Passport } from "../src/data/types";

function passportOf(id: string): Passport {
  const entry = PASSPORT_REGISTRY.find((e) => e.id === id);
  expect(entry).toBeDefined();
  return entry!.passport;
}

function mountRoot(): { root: HTMLElement; modal: HTMLElement; cleanup: () => void } {
  const root = document.createElement("div");
  document.body.append(root);
  const modal = buildStudioModalFixture();
  document.body.append(modal);
  const s = buildStudioSuggestions(passportOf("vietnam_nha_trang"), "Вьетнам", "Rv_vietnam_nha_trang_001");
  const res = renderStudioPanel(root, { suggestions: s, form: captureStudioForm(modal) });
  return { root, modal, cleanup: () => { res.cleanup(); root.remove(); modal.remove(); } };
}

describe("studio render: структура панели", () => {
  it("рендерит заголовок и все секции", () => {
    const { root, cleanup } = mountRoot();
    const text = root.textContent ?? "";
    expect(text).toContain("AI для редактора RUTUBE Studio");
    expect(text).toContain("Заполнить всё по паспорту");
    expect(text).toContain("Название");
    expect(text).toContain("Описание");
    expect(text).toContain("Категория");
    expect(text).toContain("Плейлисты");
    expect(text).toContain("Время публикации");
    expect(text).toContain("Модерация");
    cleanup();
  });

  it("рендерит таббар и по умолчанию показывает «Публикацию», скрывая «Монетизацию»", () => {
    const { root, cleanup } = mountRoot();
    const btns = Array.from(root.querySelectorAll("button")).map((b) => b.textContent ?? "");
    expect(btns.some((t) => t.includes("Публикация"))).toBe(true);
    expect(btns.some((t) => t.includes("Монетизация"))).toBe(true);
    // Монетизация скрыта, пока не переключили вкладку
    const pane = Array.from(root.querySelectorAll("div")).find((d) => d.style.display === "none");
    const hiddenText = pane?.textContent ?? "";
    expect(hiddenText).toContain("Реферальные ссылки");
    cleanup();
  });

  it("клик по табу «Монетизация» показывает реферальный блок", () => {
    const { root, cleanup } = mountRoot();
    const tab = Array.from(root.querySelectorAll("button")).find((b) => b.textContent?.includes("Монетизация")) as HTMLButtonElement;
    expect(tab).toBeDefined();
    tab.click();
    // после клика панель-обёртка с рефералкой больше не display:none
    const visible = Array.from(root.querySelectorAll("div")).some((d) =>
      d.style.display !== "none" && d.textContent?.includes("Реферальные ссылки"));
    expect(visible).toBe(true);
    cleanup();
  });

  it("показывает тайм-коды в описании", () => {
    const { root, cleanup } = mountRoot();
    expect(root.textContent).toContain("Тайм-коды:");
    cleanup();
  });

  it("рендерит 3 таба и показывает «Продвижение» после клика", () => {
    const { root, cleanup } = mountRoot();
    const btns = Array.from(root.querySelectorAll("button")).map((b) => b.textContent ?? "");
    expect(btns.some((t) => t.includes("Публикация"))).toBe(true);
    expect(btns.some((t) => t.includes("Монетизация"))).toBe(true);
    expect(btns.some((t) => t.includes("Продвижение"))).toBe(true);
    const tab = Array.from(root.querySelectorAll("button")).find((b) => b.textContent?.includes("Продвижение")) as HTMLButtonElement;
    expect(tab).toBeDefined();
    tab.click();
    const visible = Array.from(root.querySelectorAll("div")).some((d) =>
      d.style.display !== "none" && d.textContent?.includes("Продвижение · Реклама"));
    expect(visible).toBe(true);
    cleanup();
  });

  it("рендерит реферальный блок монетизации: KPI, магазины, кнопки действий", () => {
    const { root, cleanup } = mountRoot();
    const text = root.textContent ?? "";
    expect(text).toContain("Монетизация · Реферальные ссылки");
    expect(text).toContain("Яндекс Маркет");
    expect(text).toContain("AliExpress");
    expect(text).toContain("Admitad");
    expect(text).toContain("потенциал");
    expect(Array.from(root.querySelectorAll("button")).some((b) => b.textContent?.includes("Копировать все ссылки"))).toBe(true);
    expect(Array.from(root.querySelectorAll("button")).some((b) => b.textContent?.includes("Вставить блок в описание"))).toBe(true);
    cleanup();
  });

  it("«Вставить блок в описание» дописывает товары со ссылками в textarea", () => {
    vi.useFakeTimers();
    const { modal, root, cleanup } = mountRoot();
    const btn = Array.from(root.querySelectorAll("button")).find((b) => b.textContent?.includes("Вставить блок в описание")) as HTMLButtonElement;
    expect(btn).toBeDefined();
    btn.click();
    const desc = captureStudioForm(modal).description;
    expect(desc?.value).toContain("Товары из видео:");
    expect(desc?.value).toContain("https://");
    expect(root.textContent).toContain("вставлен в описание");
    vi.useRealTimers();
    cleanup();
  });

  it("первый оффер содержит 3 таба магазинов и кнопку «Копировать»", () => {
    const { root, cleanup } = mountRoot();
    const tabs = Array.from(root.querySelectorAll("button")).filter((b) => b.textContent?.includes("·"));
    expect(tabs.filter((t) => t.textContent?.includes("Яндекс Маркет")).length).toBeGreaterThan(0);
    expect(tabs.filter((t) => t.textContent?.includes("AliExpress")).length).toBeGreaterThan(0);
    expect(tabs.filter((t) => t.textContent?.includes("Admitad")).length).toBeGreaterThan(0);
    expect(Array.from(root.querySelectorAll("button")).some((b) => b.textContent?.includes("Копировать"))).toBe(true);
    cleanup();
  });

  it("«вставить ссылку в описание» использует выбранную вкладку магазина, а не лучший оффер", () => {
    vi.useFakeTimers();
    const { modal, root, cleanup } = mountRoot();
    // Показываем вкладку монетизации
    const tabMonet = Array.from(root.querySelectorAll("button")).find((b) => b.textContent?.includes("Монетизация")) as HTMLButtonElement;
    tabMonet.click();
    // Для первого оффера выбираем магазин, отличный от «лучшего»
    const bundle = buildReferralBundle(passportOf("vietnam_nha_trang"), "Rv_vietnam_nha_trang_001");
    const firstOffer = bundle.offers[0];
    const targetShop = SHOP_ORDER.find((s) => s !== firstOffer.best.shop)!;
    const expected = firstOffer.links.find((l) => l.shop === targetShop)!;
    const shopTab = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent?.includes(SHOPS[targetShop].label))!;
    expect(shopTab).toBeDefined();
    shopTab.click();
    const insertBtn = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent?.includes("вставить ссылку в описание")) as HTMLButtonElement;
    expect(insertBtn).toBeDefined();
    insertBtn.click();
    const desc = captureStudioForm(modal).description;
    expect(desc?.value).toContain(expected.shortUrl);
    expect(desc?.value).not.toContain(firstOffer.best.shortUrl);
    vi.useRealTimers();
    cleanup();
  });
});

describe("studio render: кнопка «Заполнить всё»", () => {
  it("заполняет title, description, категорию, чекбоксы и радио", () => {
    const { modal, root, cleanup } = mountRoot();
    const btn = Array.from(root.querySelectorAll("button")).find((b) => b.textContent?.includes("Заполнить всё"));
    expect(btn).toBeDefined();
    btn!.click();
    const f = captureStudioForm(modal);
    expect(f.title?.value.length).toBeGreaterThan(0);
    expect(f.description?.value).toContain("Тайм-коды:");
    expect(f.categoryInput?.value).toBe("Путешествия");
    expect(f.isAdult?.checked).toBe(false); // vietnam 0+
    expect(f.withComments?.checked).toBe(true); // approved
    expect(f.publishNow?.checked).toBe(true);
    cleanup();
  });

  it("18+ проставляется для паспорта с age_rating 18+", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const modal = buildStudioModalFixture();
    document.body.append(modal);
    const p = passportOf("vietnam_nha_trang");
    const mod = {
      ...p,
      frontmatter: {
        ...p.frontmatter,
        moderation: {
          age_rating: "18+", verdict: "approved", categories_flagged: [],
          flags: [], brand_safety_score: 60, summary: "",
        },
      },
    } as Passport;
    const s = buildStudioSuggestions(mod, "Вьетнам", "Rv_vietnam_nha_trang_001");
    renderStudioPanel(root, { suggestions: s, form: captureStudioForm(modal) });
    const btn = Array.from(root.querySelectorAll("button")).find((b) => b.textContent?.includes("Заполнить всё")) as HTMLButtonElement;
    btn.click();
    expect(captureStudioForm(modal).isAdult?.checked).toBe(true);
    root.remove();
    modal.remove();
  });

  it("при клике по чипу названия поле title обновляется", () => {
    const { modal, root, cleanup } = mountRoot();
    const boxes = Array.from(root.querySelectorAll("div")).filter((d) => d.textContent?.includes("📝 Название"));
    expect(boxes.length).toBeGreaterThan(0);
    const chips = boxes[0].querySelectorAll(".rz-chip") as unknown as HTMLButtonElement[];
    expect(chips.length).toBeGreaterThan(0);
    chips[0].click();
    expect(captureStudioForm(modal).title?.value.length).toBeGreaterThan(0);
    cleanup();
  });

  it("не падает без DOM (toast привязан к root)", () => {
    const root = document.createElement("div");
    const modal = buildStudioModalFixture();
    const s = buildStudioSuggestions(passportOf("tech_review"), "Обзор", "Rv_tech_review_001");
    const res = renderStudioPanel(root, { suggestions: s, form: captureStudioForm(modal) });
    expect(root.querySelectorAll(".rz-chip").length).toBeGreaterThan(0);
    res.cleanup();
  });
});

describe("studio render: toast", () => {
  it("при клике «Заполнить всё» показывает toast «Применено»", () => {
    vi.useFakeTimers();
    const { root, cleanup } = mountRoot();
    const btn = Array.from(root.querySelectorAll("button")).find((b) => b.textContent?.includes("Заполнить всё"));
    btn!.click();
    expect(root.textContent).toContain("Применено полей:");
    vi.useRealTimers();
    cleanup();
  });
});
// = [M-EXTENSION][TEST-STUDIO-RENDER][END_BLOCK]