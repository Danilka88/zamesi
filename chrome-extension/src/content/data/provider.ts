// [M-EXTENSION][PROVIDER][START_BLOCK]
// Контракт данных (DataProvider). DemoDataProvider работает из локальных данных;
// RealDataProvider (заглушка) готов к подключению FastAPI /analyze без переделки UI.
import type { JobMetrics, ModerationReport, Passport } from "../../data/types";

export type BindingMode = "demo" | "real";

export interface DataSource {
  mode: BindingMode;
  label: string;
}

export interface DataProviderResult {
  ok: boolean;
  reason?: string;
  passport: Passport | null;
  metrics: JobMetrics | null;
  moderation: ModerationReport | null;
}

export interface DataProvider {
  readonly source: DataSource;
  /**
   * Загрузить данные для заданного паспорта. Для demo-режима — мгновенно (Promise.resolve),
   * для real-режима — fetch к FastAPI /analyze (заглушка возвращает not_implemented).
   */
  load(videoId: string): Promise<DataProviderResult>;
  /** Заглушка для real-режима; demo-режим возвращает true всегда. */
  isAvailable(): boolean;
}
// = [M-EXTENSION][PROVIDER][END_BLOCK]