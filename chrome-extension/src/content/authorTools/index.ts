// [M-EXTENSION][AUTHOR-TOOLS][INDEX][START_BLOCK]
// Публичная точка входа «Инструментов автора». Монтирует панель в переданный
// контейнер (используется ModesController как вкладка «✍️ Автор»). Экспортирует
// билдеры вариантов для тестов и будущего popup-интеграции.
import type { Passport } from "../../data/types";
import { renderAuthorTools, type AuthorToolsData } from "./render";
export { buildTitleVariants, buildDescriptionVariants, resolvePassportKey } from "./generate";
export type { TitleVariant, DescriptionVariant } from "./generate";
export { retentionSeries, monetizationStack, hourlyBars } from "./charts";

export type { AuthorToolsData };

export interface AuthorToolsOptions extends AuthorToolsData {
  passport: Passport;
}

/** Смонтировать панель автора в контейнер; возвращает cleanup. */
export function mountAuthorTools(container: HTMLElement, opts: AuthorToolsOptions): () => void {
  return renderAuthorTools(container, { passport: opts.passport, title: opts.title, videoId: opts.videoId });
}
// = [M-EXTENSION][AUTHOR-TOOLS][INDEX][END_BLOCK]
