// [M-EXTENSION][COMMENTS][DETECT][START_BLOCK]
// Классификация комментариев по данным видео-паспорта (NFR-7, без сети).
// Строит корпус из scene_summary + search_query + hook и raw_timeline_segments,
// затем для текста комментария считает Jaccard-пересечение с весовым бустом
// по confidence монетизаций. Дополнительно детектит вопрос/похвалу/токсичность
// и скам на основе moderation.flags паспорта. Чистые функции — тестируются без DOM.
import type { Passport, SceneAnalysisResult, MonetizationItem } from "../../data/types";
import { collectMerchProducts, productIconFor } from "../merchOffer/detect";
import { stemSet, tokenizeStemmed, tokenize, stem, normalizeToken, productStems } from "./text";

export type CommentTag =
  | "product" // товарное намерение (совпадение с ecom/merch корпусом)
  | "monetizable" // сильный лид (confidence>=0.85 + brand_safety)
  | "question" // вопрос (?, какой/где/сколько/стоит ли...)
  | "praise" // похвала/благодарность
  | "toxic" // токсичность/оскорбления
  | "scam" // скам/развод (moderation scam_warning)
  | "interesting" // интересный (высокий virality hook / ранний вопрос автора)
  | "offtopic"; // ни одна тема не сработала

export interface ScoredScene {
  index: number;
  startSec: number;
  endSec: number;
  summary: string;
  /** Максимальный confidence монетизаций сцены (для взвешивания). */
  maxConfidence: number;
  monetization: MonetizationItem[];
  hook: string | null;
  virality: "low" | "medium" | "high" | null;
}

interface CommentScore {
  scene: ScoredScene | null;
  /** Взвешенный Jaccard: |q∩c|/|q| * (0.7 + 0.3*maxConf). */
  score: number;
  overlap: number;
}

export interface CommentInsight {
  tags: CommentTag[];
  text: string;
  /** Лучшая сцена видео по перекрытию (или null). */
  scene: ScoredScene | null;
  /** Числовой лид-скоринг 0..1 (weighted confidence для product). */
  monetizableScore: number;
  toxicityScore: number;
  /** Объяснение для тултипа («совпало: царское стекло 0.98»). */
  explain: string;
}

/** Диапазон времени в тексте (для scene link). */
export function fmtSceneTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/** Слово-индекс по raw-сегментам с word_timestamps (для точной привязки). */
export function buildWordIndex(passport: Passport): Map<string, number[]> {
  const idx = new Map<string, number[]>();
  for (const seg of passport.raw_timeline_segments ?? []) {
    for (const wt of seg.word_timestamps ?? []) {
      const k = stem(wt.word);
      if (!k) continue;
      const arr = idx.get(k);
      if (arr) {
        if (arr[arr.length - 1] !== wt.start_sec) arr.push(wt.start_sec);
      } else {
        idx.set(k, [wt.start_sec]);
      }
    }
  }
  return idx;
}

/** Корпус сцены: summary + search_query + hook + релевантные keywords. */
function sceneCorpus(scene: SceneAnalysisResult, passport: Passport): string {
  const fm = passport.frontmatter;
  const queries = (scene.monetization ?? [])
    .map((m) => m.search_query ?? "")
    .filter(Boolean)
    .join(" ");
  const hook = scene.clip_candidate?.hook ?? "";
  const kw = [...(fm.seo_tags ?? []), ...(fm.ad_targeting_keywords ?? [])]
    .filter((k) => `${scene.scene_summary} ${queries}`.toLowerCase().includes(k.toLowerCase()))
    .join(" ");
  return `${scene.scene_summary} ${queries} ${hook} ${kw}`;
}

/** Собрать проиндексированные сцены паспорта (всегда отсортированы по времени). */
export function buildSceneIndex(passport: Passport): ScoredScene[] {
  const maxConf = (scene: SceneAnalysisResult): number =>
    (scene.monetization ?? []).reduce((a, m) => Math.max(a, m.confidence ?? 0), 0);
  return passport.timeline
    .map((scene, i) => ({
      index: i,
      startSec: typeof scene.start_sec === "number" ? scene.start_sec : 0,
      endSec: typeof scene.end_sec === "number" ? scene.end_sec : scene.start_sec ?? 0,
      summary: scene.scene_summary,
      maxConfidence: maxConf(scene),
      monetization: scene.monetization ?? [],
      hook: scene.clip_candidate?.hook ?? null,
      virality: scene.clip_candidate?.virality_potential ?? null,
      corpus: stemSet(sceneCorpus(scene, passport)),
    }))
    .sort((a, b) => a.startSec - b.startSec);
}

interface IndexedScene extends ScoredScene {
  corpus: Set<string>;
}

/** Курируемые словосочетания покупки (для ст product-намерения). */
const BUY_INTENT = [
  "купить", "куплю", "купил", "купили", "куплен", "цена", "ценник", "сколько",
  "ссылка", "заказать", "приобрести", "стоит", "стоить", "брать", "взять",
  "взял", "выбрал", "рекоменду", "вариант", "подойд", "стоимость", "магазин",
  "маркетплей", "скидк",
];

/** Признаки вопроса (без «лучше» — это признак похвалы/варианта). */
const QUESTION_WORDS = [
  "какой", "какая", "какие", "какое", "как", "где", "когда", "скольк",
  "почему", "зачем", "стоит", "можно", "а", "правда", "что",
];

/** Признаки похвалы. */
const PRAISE_WORDS = [
  "спасибо", "отлично", "класс", "круто", "супер", "топ", "лучш", "имба",
  "годнота", "нравится", "кайф", "огонь", "пушка", "шедевр", "вау", "здорово",
];

/** База оскорбительной лексики (подстрока; токен считается оскорблением). */
const TOXIC_BASE = [
  "блят", "ублюд", "говно", "херн", "мудак", "дурак", "болван",
  "дебил", "идиот", "туп", "лох", "сук", "падл", "сволоч", "козел", "пидор",
  "наху", "поху", "хули", "затасу", "отсос", "пращ", "гандон", "кретин", "мудил",
];

/** База скам-лексики (подстрока). */
const SCAM_BASE = [
  "развод", "мошенник", "кидалов", "кидают", "лохов", "фуфло", "скам",
  "поддел", "пересобранн", "тенге", "навар", "замануха", "разводят", "кинул",
];

export interface ClassifyOptions {
  /** Количество лайков комментария (для interesting). */
  likeCount?: number;
  /** Сид из video_id+текста для стабильных решений между перерисовками. */
  videoId?: string;
}

/**
 * Главная функция: классифицировать один комментарий по паспорту.
 * Возвращает теги + лучшую сцену + объяснение. Детерминированна.
 */
export function classifyComment(
  text: string,
  passport: Passport,
  opts: ClassifyOptions = {},
): CommentInsight {
  const source = text.trim();
  const q = tokenizeStemmed(source);
  const qRaw = tokenize(source);
  // qSet с вариантами стемов имён моделей («17е»→['17е','17e']).
  const qSet = new Set<string>();
  for (const tok of q) for (const v of productStems(tok)) qSet.add(v);

  // 1) Построение корпуса (идемпотентно-дешёвое: 15 сцен).
  const idx = buildSceneIndex(passport) as IndexedScene[];

  // 2) Jaccard-скоринг по сценам.
  let best: CommentScore = { scene: null, score: 0, overlap: 0 };
  for (const scene of idx) {
    if (scene.corpus.size === 0 || qSet.size === 0) continue;
    let overlap = 0;
    // Считаем по словам комментария, а не всех слов корпуса → цена O(q).
    for (const tok of qSet) if (scene.corpus.has(tok)) overlap += 1;
    if (overlap === 0) continue;
    const jaccard = overlap / qSet.size;
    const score = jaccard * (0.7 + 0.3 * scene.maxConfidence);
    if (score > best.score) best = { scene, score, overlap };
  }

  // 3) Точная привязка по словам raw-сегментов, если сцена не найдена.
  if (!best.scene) {
    const wordIdx = buildWordIndex(passport);
    for (const tok of qSet) {
      const starts = wordIdx.get(tok);
      if (starts && starts.length > 0) {
        const sec = starts[0];
        const scene = idx.find((s) => sec >= s.startSec && sec <= s.endSec);
        if (scene) {
          best = { scene, score: 0.35, overlap: 1 };
          break;
        }
      }
    }
  }

  const top = best.scene;
  const sceneMaxConf = top?.maxConfidence ?? 0;
  const brandsafety = passport.frontmatter.brand_safety_score;

  // 4) Тематические сигналы.
  const buyBoost =
    q.some((t) => BUY_INTENT.some((b) => t.startsWith(b))) ||
    qRaw.some((t) => ["купить", "цен", "заказ", "взят", "купл"].some((b) => t.startsWith(b)));
  // Розыгрыш/конкурс — тоже лид (event_ticket в паспорте).
  const giveawayBoost = /розыгрыш|конкурс|приз|победител|участие/i.test(source);

  // Товарное намерение: сцена с монетизацией + буст покупки/розыгрыша ИЛИ 2+ слова.
  const isProduct = top != null && sceneMaxConf > 0 && (buyBoost || giveawayBoost || best.overlap >= 2);

  // Скам-сцена: флаг scam_warning попадает в диапазон сцены ИЛИ summary про мошенников.
  const modFlags = passport.frontmatter.moderation?.flags ?? [];
  const isScamScene =
    top != null &&
    (modFlags.some(
      (f) =>
        f.category === "scam_warning" &&
        f.timestamp_sec != null &&
        f.timestamp_sec >= top.startSec - 1 &&
        f.timestamp_sec <= top.endSec,
    ) || /мошенник|развод|замануха|поддел|авито|фуфло|пересобран/i.test(top.summary));

  const isMonetizable =
    isProduct && sceneMaxConf >= 0.85 && brandsafety >= 70 && !isScamScene;

  // Вопрос: «?» или вопросительное слово.
  const isQuestion = /[?？]/u.test(source) || qRaw.some((t) => QUESTION_WORDS.some((w) => t.startsWith(w)));

  // Похвала: и по стему, и по сырым токенам (стемм «спасибо» → «спасиб»).
  const isPraise =
    q.some((t) => PRAISE_WORDS.some((w) => t.startsWith(w))) ||
    qRaw.some((t) => PRAISE_WORDS.some((w) => t.startsWith(w)));

  // Токсичность: подстрока токена по базе (без распыления лексикона флагами,
  // чтобы «iPhone 16e» из evidence не считался оскорблением).
  const modEvidentToxic = modFlags
    .filter((f) => f.category === "language")
    .flatMap((f) => tokenize(f.evidence ?? ""));
  const toxicAll = [...TOXIC_BASE, ...modEvidentToxic];
  const toxHits: string[] = [];
  for (const t of qRaw) {
    const norm = normalizeToken(t);
    if (toxicAll.some((b) => b.length >= 4 && norm.includes(b))) toxHits.push(t);
  }
  // «Крик»: 3+ слов подряд в верхнем регистре.
  const shoutWords = (source.match(/[А-ЯЁ]{3,}(?:\s+[А-ЯЁ]{3,}){2,}/gu) ?? []).length;
  const isToxic = toxHits.length > 0 || shoutWords > 0;

  // Скам: тоже только база + evidence, по подстроке.
  const modEvidentScam = modFlags
    .filter((f) => f.category === "scam_warning")
    .flatMap((f) => tokenize(f.evidence ?? ""));
  const scamAll = [...SCAM_BASE, ...modEvidentScam];
  const scamHits = qRaw.filter((t) => {
    const norm = normalizeToken(t);
    return scamAll.some((b) => b.length >= 4 && norm.includes(b));
  });
  const isScam = scamHits.length > 0 || /развод/i.test(source);

  // Interesting: высокий virality hook или >=3 лайка или высокий монетизируемый скор.
  const isInteresting =
    top != null &&
    ((top.virality === "high") ||
    (isMonetizable && sceneMaxConf >= 0.93) ||
    (opts.likeCount ?? 0) >= 3);

  // Итоговые теги.
  const tags = new Set<CommentTag>();
  if (isScam) tags.add("scam");
  if (isToxic) tags.add("toxic");
  if (isMonetizable) tags.add("monetizable");
  if (isProduct) tags.add("product");
  if (isQuestion) tags.add("question");
  if (isPraise) tags.add("praise");
  if (isInteresting) tags.add("interesting");
  if (tags.size === 0) tags.add("offtopic");

  const monetizableScore = isMonetizable
    ? Math.min(1, sceneMaxConf * (brandsafety / 100))
    : 0;

  // Объяснение.
  const explain = buildExplain(top, sceneMaxConf, buyBoost, toxHits, scamHits, isQuestion, isPraise);

  return {
    tags: [...tags],
    text: source,
    scene: top,
    monetizableScore,
    toxicityScore: isToxic ? Math.min(1, (toxHits.length + (shoutWords > 0 ? 1 : 0)) / 3) : 0,
    explain,
  };
}

function buildExplain(
  top: ScoredScene | null,
  conf: number,
  buy: boolean,
  tox: string[],
  scam: string[],
  question: boolean,
  praise: boolean,
): string {
  const parts: string[] = [];
  if (top && conf > 0) {
    parts.push(`сцена «${truncate(top.summary, 46)}»`);
    if (conf > 0) parts.push(`confidence ${conf.toFixed(2)}`);
  }
  if (buy && top) parts.push("товарное намерение");
  if (question) parts.push("вопрос");
  if (praise) parts.push("похвала");
  if (tox.length) parts.push(`токсично: ${tox.slice(0, 2).join(", ")}`);
  if (scam.length) parts.push(`скам: ${scam.slice(0, 2).join(", ")}`);
  return parts.join(" · ") || "совпадений с паспортом нет";
}

function truncate(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** Метка товара для карточки лида (из collectMerchProducts, по сцене). */
export function leadProductFor(
  passport: Passport,
  insight: CommentInsight,
): { label: string; icon: string; query: string; confidence: number } | null {
  if (!insight.scene || !insight.monetizableScore) return null;
  const products = collectMerchProducts(passport, 10);
  if (!products.length) return null;
  // Приоритет: товар, чьи слова пересекаются со сценой лида.
  const sceneWords = stemSet(`${insight.scene.summary} ${insight.scene.monetization.map((m) => m.search_query ?? "").join(" ")}`);
  const scored = products
    .map((p) => {
      const pw = stemSet(p.query);
      let overlap = 0;
      for (const w of pw) if (sceneWords.has(w)) overlap += 1;
      return { p, overlap: overlap / Math.max(pw.size, 1) };
    })
    .sort((a, b) => b.overlap - a.overlap || b.p.confidence - a.p.confidence);
  const best = scored[0];
  if (!best) return null;
  return {
    label: best.p.label,
    icon: best.p.icon || productIconFor(best.p.query),
    query: best.p.query,
    confidence: best.p.confidence,
  };
}

export type { IndexedScene };
// = [M-EXTENSION][COMMENTS][DETECT][END_BLOCK]