// [M-EXTENSION][TEST-STUDIO-AUTOFILL][START_BLOCK]
// React-safe запись значений: нативный setter прототипа + input/change события.
// Проверяем, что happy-dom значение записалось и события диспатчатся.
import { describe, it, expect, vi } from "vitest";
import { setNativeValue, setNativeChecked, applyValue, applyChecked } from "../src/studio/autofill";

describe("studio autofill: setNativeValue", () => {
  it("записывает значение в input и диспатчит input/change", () => {
    const input = document.createElement("input");
    input.value = "старое";
    const inputSpy = vi.fn();
    const changeSpy = vi.fn();
    input.addEventListener("input", inputSpy);
    input.addEventListener("change", changeSpy);
    setNativeValue(input, "новое");
    expect(input.value).toBe("новое");
    expect(inputSpy).toHaveBeenCalledTimes(1);
    expect(changeSpy).toHaveBeenCalledTimes(1);
  });

  it("записывает значение в textarea", () => {
    const ta = document.createElement("textarea");
    ta.value = "";
    setNativeValue(ta, "длинное описание");
    expect(ta.value).toBe("длинное описание");
  });
});

describe("studio autofill: setNativeChecked", () => {
  it("меняет checked и диспатчит события", () => {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = false;
    const changeSpy = vi.fn();
    cb.addEventListener("change", changeSpy);
    setNativeChecked(cb, true);
    expect(cb.checked).toBe(true);
    expect(changeSpy).toHaveBeenCalledTimes(1);
  });
});

describe("studio autofill: applyValue / applyChecked", () => {
  it("не пишет пустое значение и одинаковое значение", () => {
    const input = document.createElement("input");
    input.value = "same";
    expect(applyValue(input, "")).toBe(false);
    expect(applyValue(input, "same")).toBe(false);
    expect(applyValue(null, "x")).toBe(false);
  });

  it("пишет только при изменении", () => {
    const input = document.createElement("input");
    input.value = "a";
    expect(applyValue(input, "b")).toBe(true);
    expect(input.value).toBe("b");
  });

  it("applyChecked игнорирует disabled и одинаковое состояние", () => {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = true;
    expect(applyChecked(cb, true)).toBe(false);
    cb.disabled = true;
    expect(applyChecked(cb, false)).toBe(false);
  });
});
// = [M-EXTENSION][TEST-STUDIO-AUTOFILL][END_BLOCK]