// [M-EXTENSION][LABELS][START_BLOCK]
// Метки монетизаций, зеркало ui/src/i18n/labels.ts (7 меток: label/icon/short/tooltip/color).
import type { MonetizationType } from "./types";

export interface MonetizationLabel {
  label: string;
  icon: string;
  short: string;
  tooltip: string;
  color: string;
}

export const MONETIZATION_LABELS: Record<MonetizationType, MonetizationLabel> = {
  ad_slot: {
    label: "Рекламная пауза",
    icon: "📢",
    short: "Реклама",
    tooltip:
      "Место для вставки рекламы. В этом моменте видео платформа может показывать рекламное объявление.",
    color: "#3B82F6",
  },
  ecom_item: {
    label: "Товар к покупке",
    icon: "🛒",
    short: "Товар",
    tooltip:
      "В видео упоминается товар, который можно купить. Добавьте ссылку на интернет-магазин.",
    color: "#10B981",
  },
  clip_candidate: {
    label: "Кандидат в клипы",
    icon: "✂️",
    short: "Клип",
    tooltip:
      "Этот фрагмент видео можно вырезать как отдельный короткий клип — он привлечёт новых зрителей.",
    color: "#8B5CF6",
  },
  music_track: {
    label: "Музыкальный трек",
    icon: "🎵",
    short: "Трек",
    tooltip:
      "В видео звучит эта песня. Можно добавить ссылку на артиста или музыкальный сервис.",
    color: "#F59E0B",
  },
  artist_merch: {
    label: "Мерч артиста",
    icon: "👕",
    short: "Мерч",
    tooltip:
      "У этого артиста есть товары (одежда, аксессуары). Можно предложить зрителю купить.",
    color: "#EC4899",
  },
  event_ticket: {
    label: "Билет на событие",
    icon: "🎫",
    short: "Билет",
    tooltip: "Артист выступает с концертом. Можно предложить зрителю купить билет.",
    color: "#EF4444",
  },
  celebrity_appearance: {
    label: "Появление звезды",
    icon: "⭐",
    short: "Звезда",
    tooltip: "В видео участвует известная личность. Можно использовать для привлечения внимания.",
    color: "#FCD34D",
  },
};

export const VERDICT_LABELS: Record<string, { label: string; icon: string }> = {
  approved: { label: "Одобрено", icon: "🟢" },
  flagged: { label: "Требует проверки", icon: "🟡" },
  rejected: { label: "Запрещено", icon: "🔴" },
};

export const SEVERITY_LABELS: Record<string, { label: string }> = {
  low: { label: "Низкая" },
  medium: { label: "Средняя" },
  high: { label: "Высокая" },
};
// = [M-EXTENSION][LABELS][END_BLOCK]