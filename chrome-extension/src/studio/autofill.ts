// [M-EXTENSION][STUDIO][AUTOFILL][START_BLOCK]
// React-safe запись в контролируемые поля форм Studio. React отслеживает value
// через нативный setter прототипа; прямая запись el.value = "..." игнорируется.
// Решение: вызываем нативный setter прототипа + диспатчим input/change (bubbles),
// чтобы React-обработчики (onChange) получили событие и приняли новое значение.
// Для чекбоксов/радио — el.click() (React слушает click), но с подстраховкой
// нативного setter'а checked.

export function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void {
  const proto: object = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  if (desc?.set) {
    desc.set.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function setNativeChecked(el: HTMLInputElement, checked: boolean): void {
  const proto = HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "checked");
  const apply = (v: boolean): void => {
    if (desc?.set) desc.set.call(el, v);
    else el.checked = v;
  };
  apply(checked);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  // Некоторые среды (happy-dom) ре-тоглят checkbox на синтетический click —
  // возвращаем целевое состояние после нотификации.
  if (el.checked !== checked) apply(checked);
}

/** Заполнить поле, только если оно есть и значение отличается от текущего. */
export function applyValue(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
): boolean {
  if (!el || !value) return false;
  if (el.value === value) return false;
  setNativeValue(el, value);
  return true;
}

/** Переключить чекбокс/радио, только если он есть и состояние отличается. */
export function applyChecked(el: HTMLInputElement | null, checked: boolean): boolean {
  if (!el || el.disabled) return false;
  if (el.checked === checked) return false;
  setNativeChecked(el, checked);
  return true;
}
// = [M-EXTENSION][STUDIO][AUTOFILL][END_BLOCK]