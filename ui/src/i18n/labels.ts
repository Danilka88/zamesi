export const MONETIZATION_LABELS: Record<string, {
  label: string
  icon: string
  short: string
  tooltip: string
  color: string
}> = {
  ad_slot: {
    label: 'Рекламная пауза',
    icon: '📢',
    short: 'Реклама',
    tooltip: 'Место для вставки рекламы. В этом моменте видео платформа может показывать рекламное объявление.',
    color: '#3B82F6',
  },
  ecom_item: {
    label: 'Товар к покупке',
    icon: '🛒',
    short: 'Товар',
    tooltip: 'В видео упоминается товар, который можно купить. Добавьте ссылку на интернет-магазин.',
    color: '#10B981',
  },
  clip_candidate: {
    label: 'Кандидат в клипы',
    icon: '✂️',
    short: 'Клип',
    tooltip: 'Этот фрагмент видео можно вырезать как отдельный короткий клип — он привлечёт новых зрителей.',
    color: '#8B5CF6',
  },
  music_track: {
    label: 'Музыкальный трек',
    icon: '🎵',
    short: 'Трек',
    tooltip: 'В видео звучит эта песня. Можно добавить ссылку на артиста или музыкальный сервис.',
    color: '#F59E0B',
  },
  artist_merch: {
    label: 'Мерч артиста',
    icon: '👕',
    short: 'Мерч',
    tooltip: 'У этого артиста есть товары (одежда, аксессуары). Можно предложить зрителю купить.',
    color: '#EC4899',
  },
  event_ticket: {
    label: 'Билет на событие',
    icon: '🎫',
    short: 'Билет',
    tooltip: 'Артист выступает с концертом. Можно предложить зрителю купить билет.',
    color: '#EF4444',
  },
  celebrity_appearance: {
    label: 'Появление звезды',
    icon: '⭐',
    short: 'Звезда',
    tooltip: 'В видео участвует известная личность. Можно использовать для привлечения внимания.',
    color: '#FCD34D',
  },
}

export const METRIC_TOOLTIPS: Record<string, string> = {
  brand_safety: 'Безопасность для бренда — насколько видео подходит для показа рекламы. Чем выше, тем безопаснее.',
  vlm_percent: 'Процент сцен, где понадобился анализ картинки. Чем меньше — тем быстрее обработано видео.',
  confidence: 'Насколько система уверена в результате. 100% — максимальная уверенность.',
  fingerprint: 'Система сравнила аудио-отпечаток видео с базой известных треков. Как Shazam.',
  processing_time: 'Сколько времени занял полный анализ видео от начала до конца.',
  fallback: 'Система не смогла обработать сцену основным методом и применила упрощённый.',
  moderation_verdict: 'Решение системы модерации: можно ли публиковать видео.',
  total_monetization_points: 'Общее количество найденных возможностей для монетизации.',
}

export const MODERATION_LABELS: Record<string, { label: string; color: string }> = {
  approved: { label: 'Одобрено', color: 'text-green-600' },
  flagged: { label: 'Требует проверки', color: 'text-yellow-600' },
  rejected: { label: 'Запрещено', color: 'text-red-600' },
}

export const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'Низкая', color: 'bg-green-100 text-green-800' },
  medium: { label: 'Средняя', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'Высокая', color: 'bg-red-100 text-red-800' },
}

export const VERDICT_ICONS: Record<string, string> = {
  approved: '🟢',
  flagged: '🟡',
  rejected: '🔴',
}

export const STATUS_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  pending: { label: 'Ожидает', icon: '⏳', color: 'text-gray-500' },
  processing: { label: 'Обрабатывается', icon: '⏳', color: 'text-yellow-500' },
  done: { label: 'Готов', icon: '✅', color: 'text-green-500' },
  error: { label: 'Ошибка', icon: '❌', color: 'text-red-500' },
}

export const NAV_ITEMS = [
  { path: '/', label: 'Панель управления', icon: '🔬' },
  { path: '/search', label: 'Поиск сцен', icon: '🔍' },
]
