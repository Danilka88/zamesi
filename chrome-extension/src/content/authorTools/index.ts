// [M-EXTENSION][AUTHOR-TOOLS][INDEX][START_BLOCK]
// Публичная точка входа «Инструментов автора». Монтирует панель в переданный
// контейнер (используется ModesController как вкладка «✍️ Автор»). Экспортирует
// билдеры вариантов для тестов и будущего popup-интеграции.
import type { Passport } from "../../data/types";
import { renderAuthorTools, renderAuthorBody, type AuthorToolsData, type AuthorToolsRenderOpts } from "./render";
export { buildTitleVariants, buildDescriptionVariants, resolvePassportKey, projectVariantMetrics, fmtViews } from "./generate";
export type { TitleVariant, DescriptionVariant, VariantMetrics } from "./generate";
export { retentionSeries, monetizationStack, hourlyBars } from "./charts";
export { renderAuthorBody };
export type { AuthorToolsData, AuthorToolsRenderOpts };

export interface AuthorToolsOptions extends AuthorToolsData {
  passport: Passport;
  /** Полноширинная раскладка (модалка ModesController.expand). */
  wide?: boolean;
}

/** Смонтировать панель автора в контейнер; возвращает cleanup. */
export function mountAuthorTools(container: HTMLElement, opts: AuthorToolsOptions): () => void {
  return renderAuthorTools(container, { passport: opts.passport, title: opts.title, videoId: opts.videoId }, { wide: opts.wide });
}
// = [M-EXTENSION][AUTHOR-TOOLS][INDEX][END_BLOCK]
