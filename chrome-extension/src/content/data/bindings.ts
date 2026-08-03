// [M-EXTENSION][BINDING][START_BLOCK]
// Привязка паспорта к видео: ручной выбор + автоподбор по video_id/ключевым словам.
import { PASSPORT_REGISTRY, type PassportRegistryEntry } from "../../data/registry";

const normalize = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Прямая привязка по реальному video_id RUTUBE. */
export function resolveBinding(videoId: string, title: string): PassportRegistryEntry | undefined {
  const byId = matchByVideoId(videoId);
  if (byId) return byId;
  return matchByTitle(title);
}

export function matchByVideoId(videoId: string): PassportRegistryEntry | undefined {
  const vid = videoId.trim().toLowerCase();
  return PASSPORT_REGISTRY.find((e) => e.boundVideoId?.toLowerCase() === vid);
}

/** Автоподбор по ключевым словам заголовка — возвращает запись с максимумом совпадений (или undefined). */
export function matchByTitle(title: string): PassportRegistryEntry | undefined {
  const query = normalize(title);
  if (!query) return undefined;
  let best: PassportRegistryEntry | undefined;
  let bestScore = 0;
  for (const entry of PASSPORT_REGISTRY) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (query.includes(normalize(kw))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return (bestScore > 0 ? best : undefined) ?? undefined;
}

export type Binding = { entry: PassportRegistryEntry; method: "video_id" | "keywords" };

export function resolveBindingDetailed(
  videoId: string,
  title: string,
): { videoId: string; title: string; method: "manual" | "auto" | "none"; entry?: PassportRegistryEntry } {
  const byId = matchByVideoId(videoId);
  if (byId) return { videoId, title, method: "auto", entry: byId };
  const byTitle = matchByTitle(title);
  if (byTitle) return { videoId, title, method: "auto", entry: byTitle };
  return { videoId, title, method: "none" };
}
// = [M-EXTENSION][BINDING][END_BLOCK]