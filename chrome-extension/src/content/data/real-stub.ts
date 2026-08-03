// [M-EXTENSION][REAL-STUB][START_BLOCK]
// RealDataProvider — заглушка. Контракт готов к подключению FastAPI /analyze
// (fetch к бэкенду из content-script), без переделки UI. Пока возвращает
// ok:false / reason "not_implemented", не роняя интерфейс.
import type { DataProvider, DataProviderResult, DataSource } from "./provider";

export const realSource: DataSource = { mode: "real", label: "FastAPI /analyze (заглушка)" };

const NOT_IMPLEMENTED: DataProviderResult = {
  ok: false,
  reason: "not_implemented",
  passport: null,
  metrics: null,
  moderation: null,
};

export class RealDataProvider implements DataProvider {
  readonly source: DataSource = realSource;

  isAvailable(): boolean {
    return false;
  }

  async load(_videoId: string): Promise<DataProviderResult> {
    // TODO(real-provider): fetch(`${FASTAPI_BASE}/analyze/${videoId}`) и маппинг
    // JSON → Passport/JobMetrics. Контракт load(videoId) уже финализирован.
    return NOT_IMPLEMENTED;
  }
}
// = [M-EXTENSION][REAL-STUB][END_BLOCK]