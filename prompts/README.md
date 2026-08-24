# Промты для генерации видео-паспорта в ИИ-чате

Готовые, самодостаточные промты: копируешь файл целиком, вставляешь в любой ИИ-чат (DeepSeek, ChatGPT, Claude, YandexGPT и т.д.) и получаешь видео-паспорт в нативном формате системы RUTUBE Video Analyzer.

## Файлы

| Файл | Видео | Жанр | Транскрипт |
|---|---|---|---|
| `passport-iphone-50k.md` | «Какой iPhone выбрать за 50 000 ₽» (Wylsacom) | `tech_review` | 22 сегмента |
| `passport-atomic-heart.md` | «Обзор Atomic Heart» (StopGame) | `game_review` | 25 сегментов |
| `passport-vietnam-nha-trang.md` | «Сколько стоит жить в Нячанге» (тревел-блог) | `travel_vlog` | 15 сегментов |
| `passport-bike-dont-buy.md` | «Не покупай велосипед, пока не посмотришь это видео» | `how_to` | 98 сегментов |
| `passport-bike-top-april-2025.md` | «ТОП велосипедов АПРЕЛЬ 2025: Hagen, Aspect, Welt, Rush Hour» | `review` | 30 сегментов |
| `passport-bike-mtb-80k.md` | «Горный велосипед за 80 000 ₽ в 2025. Как НЕ купить ХЛАМ?» | `review` | 71 сегмент |

## Как пользоваться

1. Открой нужный файл промта.
2. Скопируй **всё содержимое** файла целиком.
3. Вставь в ИИ-чат одним сообщением.
4. Чат вернёт видео-паспорт в Markdown-формате.
5. Сравни результат с эталоном (см. ниже) и зафиксируй расход токенов.

## Замер расходов

Чат сам показывает входящие (input) и исходящие (output) токены. Запиши результат в таблицу:

| Дата | Модель | Вход, токены | Выход, токены | Совпало с эталоном | Комментарий |
|---|---|---|---|---|---|
| | | | | | |

## Эталоны для сравнения

Результаты, которые система (не чат) генерирует из тех же данных — лежат в `output/`:

| Промт | Эталон JSON | Эталон Markdown |
|---|---|---|
| `passport-iphone-50k.md` | `output/Rv_iphone_50k_wylsacom_001.json` | `output/Rv_iphone_50k_wylsacom_001.md` |
| `passport-atomic-heart.md` | `output/Rv_atomic_heart_review_001.json` | `output/Rv_atomic_heart_review_001.md` |
| `passport-vietnam-nha-trang.md` | `output/Rv_vietnam_nha_trang_001.json` | `output/Rv_vietnam_nha_trang_001.md` |
| `passport-bike-dont-buy.md` | `chrome-extension/src/data/passports/bike_dont_buy.json` | (markdown из этого JSON) |
| `passport-bike-top-april-2025.md` | `chrome-extension/src/data/passports/bike_top_april.json` | (markdown из этого JSON) |
| `passport-bike-mtb-80k.md` | `chrome-extension/src/data/passports/bike_mtb_80k.json` | (markdown из этого JSON) |

Чем ближе ответ чата к эталону, тем лучше промт воспроизводит системный пайплайн.

## Что внутри промта

Каждый промт повторяет логику реального пайплайна:

- **Роль** — «ты — пайплайн RUTUBE Video Analyzer» с правилами всех 7 типов точек монетизации (`ECOM_ITEM`, `AD_SLOT`, `CLIP_CANDIDATE`, `MUSIC_TRACK`, `ARTIST_MERCH`, `EVENT_TICKET`, `CELEBRITY_APPEARANCE`) и жанровыми подсказками.
- **Входные данные** — `video_id`, жанр, длительность, распознанные треки (`audio_matches`) и голос (`celebrity_voice`) — как их дают не-LLM модули системы (фингерпринтинг).
- **Полный транскрипт** — все сегменты ASR со спикером и таймингами.
- **Правила модерации** — рейтинг, вердикт, категории нарушений, `brand_safety_score`, флаги с цитатами.
- **Правила SEO-frontmatter** — `seo_title`, `seo_tags`, `trending_cluster`, `target_audience`, `auto_playlists`, `ad_targeting_keywords`.
- **Задача** — выдать паспорт строго в нативном Markdown-шаблоне (frontmatter → таймлайн сцен с точками монетизации → музыка → знаменитость).

## Примечание

Промт рассчитывает на полный транскрипт — это и есть основной вклад во входящие токены. По-словные тайм-коды (`word_timestamps`) намеренно не включены: реальный LLM-вход системы использует текст сегмента, а не по-словные отметки.