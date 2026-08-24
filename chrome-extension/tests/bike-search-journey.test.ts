// [M-EXTENSION][TEST-BIKE-SEARCH-JOURNEY][START_BLOCK]
// Степпер «Путь зрителя»: 3 ступени по горизонтальной линии, кликабельные
// тайм-коды с ?start=, идемпотентность монтажа после плейлиста.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BIKE_JOURNEY_STAGES } from "../src/content/bikeSearch/detect";
import {
  buildBikeJourneyCard,
  mountBikeJourneyCard,
  unmountBikeJourneyCard,
  formatTimecode,
  journeyVideoUrl,
  timecodeRange,
  BIKE_JOURNEY_ATTR,
} from "../src/content/bikeSearch/render";
import { mountBikeSearchCard, BIKE_SEARCH_ATTR } from "../src/content/bikeSearch/render";
import { BIKE_SEARCH_ENTRIES, collectBikeProducts } from "../src/content/bikeSearch/detect";
import { removeBikeSearch } from "../src/content/bikeSearch/index";

describe("bike journey stepper", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.head.innerHTML = "";
  });
  afterEach(() => {
    removeBikeSearch();
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    delete (globalThis as { chrome?: unknown }).chrome;
  });

  it("formatTimecode: секунды → MM:SS (30 → 00:30, 303 → 05:03, 900 → 15:00)", () => {
    expect(formatTimecode(30)).toBe("00:30");
    expect(formatTimecode(303)).toBe("05:03");
    expect(formatTimecode(900)).toBe("15:00");
  });

  it("timecodeRange форматирует диапазон через –", () => {
    expect(timecodeRange(303, 430)).toBe("05:03–07:10");
  });

  it("journeyVideoUrl добавляет ?start= округлённый вниз", () => {
    expect(journeyVideoUrl("abc", 303)).toBe("https://rutube.ru/video/abc/?start=303");
    expect(journeyVideoUrl("abc", 303.9)).toBe("https://rutube.ru/video/abc/?start=303");
  });

  it("buildBikeJourneyCard: 3 ступени, соединители, заголовок", () => {
    const card = buildBikeJourneyCard(BIKE_JOURNEY_STAGES);
    expect(card.hasAttribute(BIKE_JOURNEY_ATTR)).toBe(true);
    expect(card.textContent).toContain("RUTUBE Замеси");
    expect(card.textContent).toContain("путь зрителя");
    const stages = card.querySelectorAll("[data-rz-bike-journey-stage]");
    expect(stages.length).toBe(3);
    expect(card.querySelectorAll("[data-rz-bike-journey-connector]").length).toBe(2);
    expect(card.textContent).toContain("Новичок");
    expect(card.textContent).toContain("Профи");
  });

  it("каждая ступень имеет вопрос и клипы с правильными ссылками ?start=", () => {
    const card = buildBikeJourneyCard(BIKE_JOURNEY_STAGES);
    const stageEls = [...card.querySelectorAll<HTMLElement>("[data-rz-bike-journey-stage]")];
    for (const [i, s] of BIKE_JOURNEY_STAGES.entries()) {
      const el = stageEls[i];
      expect(el.textContent).toContain(s.question);
      expect(el.textContent).toContain(s.levelLabel);
      const clipLinks = [...el.querySelectorAll<HTMLAnchorElement>("[data-rz-bike-journey-clip]")];
      expect(clipLinks.length).toBe(s.clips.length);
      for (const [j, clip] of s.clips.entries()) {
        expect(clipLinks[j].target).toBe("_blank");
        expect(clipLinks[j].rel).toContain("noopener");
        expect(clipLinks[j].getAttribute("href")).toContain(`start=${Math.floor(clip.startSec)}`);
        expect(clipLinks[j].textContent).toContain(formatTimecode(clip.startSec));
      }
      // каждая ступень ссылается хотя бы на одно видео из подборки
      const hrefs = clipLinks.map((a) => a.getAttribute("href") ?? "");
      expect(hrefs.length).toBeGreaterThan(0);
    }
  });

  it("BIKE_JOURNEY_STAGES: вопросы явные, все клипы ведут на видео подборки", () => {
    const known = new Set(BIKE_SEARCH_ENTRIES.map((e) => e.passportId));
    for (const stage of BIKE_JOURNEY_STAGES) {
      expect(stage.question.length).toBeGreaterThan(0);
      for (const clip of stage.clips) {
        expect(clip.startSec).toBeGreaterThanOrEqual(0);
        expect(clip.endSec).toBeGreaterThan(clip.startSec);
        expect(known.has(clip.passportId)).toBe(true);
      }
    }
  });

  it("mountBikeJourneyCard: вставляется после плейлиста и идемпотентен", () => {
    const anchor = document.createElement("div");
    document.body.append(anchor);
    const listCard = mountBikeSearchCard(anchor, BIKE_SEARCH_ENTRIES, collectBikeProducts());
    expect(listCard).not.toBeNull();
    const journey = mountBikeJourneyCard(listCard!, BIKE_JOURNEY_STAGES);
    expect(listCard?.nextElementSibling).toBe(journey);
    const again = mountBikeJourneyCard(listCard!, BIKE_JOURNEY_STAGES);
    expect(listCard?.nextElementSibling).toBe(again);
    expect(document.body.querySelectorAll(`[${BIKE_JOURNEY_ATTR}]`).length).toBe(1);
  });

  it("unmountBikeJourneyCard удаляет только степпер, плейлист остаётся", () => {
    const anchor = document.createElement("div");
    document.body.append(anchor);
    const listCard = mountBikeSearchCard(anchor, BIKE_SEARCH_ENTRIES, collectBikeProducts());
    mountBikeJourneyCard(listCard!, BIKE_JOURNEY_STAGES);
    unmountBikeJourneyCard(listCard!);
    expect(document.body.querySelector(`[${BIKE_JOURNEY_ATTR}]`)).toBeNull();
    expect(document.body.querySelector(`[${BIKE_SEARCH_ATTR}]`)).not.toBeNull();
  });
});
// = [M-EXTENSION][TEST-BIKE-SEARCH-JOURNEY][END_BLOCK]