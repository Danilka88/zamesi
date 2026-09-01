// [M-EXTENSION][COMMENTS][GENERATE][START_BLOCK]
// Детерминированная генерация быстрых ответов автора на комментарий (NFR-7,
// без сети). Формулировки выбираются сидированным PRNG (videoId + текст), как
// «Инструменты автора». В ответ встраиваются факты из сцены паспорта (цена,
// модель, verdict-hook). Чистые функции — тестируются без DOM.
import type { Passport } from "../../data/types";
import { hashSeed, mulberry32 } from "../authorTools/charts";
import { fmtSceneTime } from "./detect";
import type { CommentInsight } from "./detect";

export interface ReplyVariant {
  id: string;
  text: string;
  /** Таймкод релевантной сцены (mm:ss) — кликабельная ссылка в UI. */
  sceneTime: string | null;
  /** Тип отклика (для метки в UI). */
  kind: "answer" | "fact" | "softio" | "thank" | "warn";
}

interface SceneFacts {
  sceneTime: string;
  model: string | null;
  price: string | null;
  query: string | null;
  verdict: string | null;
}

/** Извлечь цену из summary сцены: «53 990 ₽», «49 990 ₽ за...». */
function extractPrice(summary: string): string | null {
  const m = summary.match(/(?:стоит|цена|ценник|за)\s+(\d[\d\s]*)\s*[₽р]?/iu);
  if (!m) return null;
  const digits = m[1].replace(/\s+/g, "");
  return /₽р?$/.test(m[0]) ? `${digits} ₽` : `${digits} ₽`;
}

/** Извлечь имя модели из summary сцены: «iPhone 17E», «iPhone 16e». */
function extractModel(summary: string): string | null {
  const m = summary.match(/(?:iphone|айфон|airpods|ipad)\s*[\dа-яa-z+\-]*/iu);
  return m ? m[0] : null;
}

/** Собрать факты сцены для шаблонов. */
function sceneFacts(insight: CommentInsight): SceneFacts | null {
  const s = insight.scene;
  if (!s) return null;
  const ecom = s.monetization.find(
    (m) => m.type === "ecom_item" || m.type === "artist_merch" || m.type === "event_ticket",
  );
  const vote = s.monetization.some((m) => m.type === "event_ticket");
  const verdict =
    s.hook && /итог|вердикт|берите|лучше|стоит/i.test(s.hook)
      ? s.hook
      : vote
        ? `участвуйте в розыгрыше — условия в описании (${fmtSceneTime(s.startSec)})`
        : null;
  return {
    sceneTime: fmtSceneTime(s.startSec),
    model: extractModel(s.summary),
    price: extractPrice(s.summary),
    query: ecom?.search_query ?? null,
    verdict,
  };
}

function makeId(videoId: string, comment: string, i: number): string {
  return `${hashSeed(`${videoId}:reply:${comment}`)}-${i}`;
}

/** Массив формулировок по типу отклика (перемешивается PRNG). */
function pools(f: SceneFacts): Record<ReplyVariant["kind"], string[]> {
  const model = f.model ?? "модель";
  const time = f.sceneTime;
  return {
    fact: [
      `Спасибо за комментарий 🙌 В видео ${model} разбираю на таймкоде ${time}.`,
      `По этому вопросу — подробный разбор на ${time}: что учитывал при выборе, там всё по полочкам.`,
      `${model[0].toUpperCase()}${model.slice(1)} — детали на ${time}, включая подводные камни, о которых часто забывают.`,
    ],
    answer: [
      `Хороший вопрос! Если коротко — ${f.verdict ?? `рекомендация в разборе на ${time}`}. Детали с цифрами на ${time}.`,
      `Отвечу с цифрами на ${time}: там сравниваю варианты и даю честный вердикт.`,
      `Короткий ответ — ${f.verdict ?? "смотри разбор"}; все расклады на ${time}.`,
    ],
    softio: [
      `Спасибо за просмотр 🙃 Обсуждаем по делу без оскорблений — рад конструктиву.`,
      `Услышал мнение. Что именно не зашло? Могу разобрать подробнее.`,
      `Негатив понял, спасибо за откровенность ✌️ Пишите по существу — отвечаю.`,
    ],
    thank: [
      `Спасибо большое! 🔥 Рад, что зашло.`,
      `Благодарю! Заглядывайте: разборов по теме ещё много.`,
      `Спасибо ❤️ Подписывайтесь — впереди свежие обзоры.`,
    ],
    warn: [
      `Важно ⚠️ Именно об этом предупреждаю на ${time}: покупайте в проверенных магазинах, а не по «заманчивым» ценам.`,
      `Спасибо, что делитесь! Осторожность важна: разбор мошеннических схем на ${time}.`,
      `Отличное дополнение 👍 Подробно про риски рынка я рассказываю на ${time}.`,
    ],
  };
}

/** Выбрать n уникальных формулировок из пула детерминированно. */
function pick(pool: string[], rnd: () => number, n: number): string[] {
  const arr = [...pool];
  const out: string[] = [];
  for (let i = 0; i < n && arr.length; i++) {
    const idx = Math.floor(rnd() * arr.length);
    out.push(arr.splice(idx, 1)[0]);
  }
  return out;
}

/** Основной вид отклика по тегам инсайта. */
function primaryKind(insight: CommentInsight): ReplyVariant["kind"] {
  if (insight.tags.includes("scam")) return "warn";
  if (insight.tags.includes("toxic")) return "softio";
  if (insight.tags.includes("question")) return "answer";
  if (insight.tags.includes("praise")) return "thank";
  if (insight.tags.includes("monetizable") || insight.tags.includes("product")) return "fact";
  return "answer";
}

/** Общие формулировки без фактов сцены (для оффтоп-комментариев). */
const GENERIC: Record<ReplyVariant["kind"], string[]> = {
  fact: ["Спасибо за отклик! По этому товару все детали — в разборе видео."],
  answer: ["Отличный вопрос! В видео даю развёрнутый ответ с цифрами — рекомендую посмотреть."],
  softio: ["Спасибо за просмотр 🙃 Обсуждаем по делу без оскорблений — рад конструктиву."],
  thank: ["Спасибо большое! 🔥 Рад, что зашло."],
  warn: ["Спасибо, что делитесь осторожностью! В видео это предупреждение вынесено отдельно."],
};

/**
 * Сгенерировать 2–3 варианта ответа на комментарий. Детерминированно:
 * один и тот же videoId+текст → одинаковые ответы (NFR-7).
 */
export function buildReplyVariants(
  comment: string,
  insight: CommentInsight,
  _passport: Passport,
  videoId: string,
): ReplyVariant[] {
  const rnd = mulberry32(hashSeed(`${videoId}:reply:${comment}`));
  const facts = sceneFacts(insight);
  const kind = primaryKind(insight);
  const pool = facts ? pools(facts)[kind] : GENERIC[kind];
  const variants = pick(pool, rnd, 3);
  const sceneTime = facts?.sceneTime ?? null;
  return variants.map((text, i) => ({
    id: makeId(videoId, comment, i),
    text,
    sceneTime,
    kind,
  }));
}
// = [M-EXTENSION][COMMENTS][GENERATE][END_BLOCK]