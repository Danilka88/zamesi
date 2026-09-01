# RUTUBE Video Analyzer

AI-пайплайн: **MP4 → .md passport** с метками монетизации `AD_SLOT`, `ECOM_ITEM`, `CLIP_CANDIDATE`.

**Для RUTUBE:** автоматическая конвертация видеоконтента в монетизируемые паспорта — без ручного труда, без отправки данных вовне, с себестоимостью ~$0.004/ч электроэнергии (TCO ~$0.07/ч, на масштабе <$0.005/ч). Chrome-расширение **«RUTUBE Замеси»** (MV3 + Shadow DOM + Vitest) накладывает монетизацию прямо на страницу видео rutube.ru.

---

**До:** 45-минутное видео в MP4 → ручной просмотр, разметка, монтаж: **часы работы**  
**После:** Markdown-паспорт с 12 сценами, 3 `ECOM_ITEM`, 2 `AD_SLOT`, 1 `CLIP_CANDIDATE` → **секунды**

---

## О продукте

Асинхронный пайплайн преобразует загруженное видео в структурированный Markdown-документ с YAML-frontmatter и таймлайном, аннотированным монетизационными точками. Все модели запускаются локально — данные не покидают машину.

- **Монетизация каждой сцены** — Gemma4:e4b классифицирует каждую сцену в `AD_SLOT`, `ECOM_ITEM` или `CLIP_CANDIDATE` с confidence score. Semantic Search (qwen3-embedding + ChromaDB) находит сцены по типу метки для programmatic placement рекламы. Mixer (Gemma4:e4b planning + matcher) собирает сцены в готовые монетизируемые плейлисты. Влияние на ARPU измеримо A/B-тестом: сравнивается вовлечённость и доход с автоматически размеченными сценами против контрольной группы.

- **Юнит-экономика ~$0.004/ч электроэнергии на CPU** — ключевой фактор: VLM Gatekeeper (DomainRouter + Inquisitive SLM + OCR-дедупликация) сокращает VLM-вызовы со 100% до ≤6% сегментов. Gemma4:e4b не тратит время на thinking-токены (в 4× быстрее Qwen3.5:4b). RapidOCR v4 на ONNX — ~30 ms/кадр. Себестоимость анализа 1 часа видео ~$0.004 на CPU (реальная средняя мощность ~12 Вт), полный TCO с оборудованием ~$0.07/ч, на масштабе — <$0.005/ч; целевой с GPU — <$0.0025/ч (Metal/CUDA ускоряет VLM и SLM в 5-10×). P&L сходится на масштабе.

- **Audio-first архитектура** — в отличие от конкурентов, которые гонят 100% кадров через VLM, пайплайн стартует с аудиодорожки. Whisper large-v3 (WER 4.2% на русском, 0.3× real-time через Metal) + SpeechBrain ECAPA-TDNN + Silero VAD (CPU, 0.05× RT) → TimelineMerger → Gemma4:e4b текстовый анализ покрывает 94% сцен. Vision-модель Qwen3.5:9b вызывается только для ≤6% неопределённых сцен.

- **Локальность и приватность** — Whisper.cpp, Ollama (Gemma4:e4b, Qwen3.5:0.8b/9b, qwen3-embedding), SpeechBrain ECAPA-TDNN, RapidOCR v4 (ONNX), ChromaDB 1.5+ — всё open-source, всё работает на машине клиента. Никакие данные (видео, аудио, текст) не отправляются во внешние API. Метки монетизации извлекаются из контента, а не из профилей пользователей — полное соответствие ФЗ-152. structlog не содержит PII.

- **Воспроизводимость** — весь стек open-source (Apache 2.0 / MIT), фиксированные версии Ollama-моделей → идентичный результат на любой инсталляции. **205 pytest + ~295 vitest (M-EXTENSION, 33 файла) + 14 vitest (M-UI) ≈ 514 тестов** (было 222/26 файлов до трендов+комментариев; +6 файлов: `studio-trends*` ×2, `comments-*` ×4), с изоляцией внешних вызовов (monkeypatch, AsyncMock, jsdom). 11 независимых модулей (9 Python + Chrome-расширение M-EXTENSION + Web UI M-UI), каждый с MODULE_CONTRACT и отдельным набором тестов (для расширения и UI — Vitest). Pytest-asyncio, tmp_path для файлового I/O.

- **Production-готовность** — FastAPI + Pydantic v2 (async-native, OpenAPI spec автоматически). TimeoutManager с Circuit Breaker (10 failures → OPEN → 60s recovery → HALF-OPEN → CLOSED). Exponential backoff retry (1→2→4 с, 3 попытки). Fallback chain: shorten_prompt → skip_vision. Prometheus-метрики (latency, VLM calls, сцены, jobs, timeouts, fallbacks), structlog с 81 log-маркером и correlation_id. Lazy imports — сервер стартует <1 с.

- **Векторный семантический поиск** — qwen3-embedding:0.6b (мультиязычная, 639 MB, 1024-dim, MTEB 64.33) через Ollama `/api/embed`. ChromaDB 1.5+ (Rust core, embedded persistent mode). Каждая сцена индексируется с полями speaker, ASR, summary, monetization_types. Поиск по смыслу, не по ключевым словам. Фильтр по genre, сортировка по косинусной близости. Переиндексация через единый endpoint без даунтайма.

- **Масштабируемость P&L** — при росте объёмов стоимость за час видео **падает**, а не растёт. GPU-акселерация (Metal/CUDA) ускоряет Whisper до 0.3× RT, SLM/VLM в 5-10×. В отличие от моделей, зависящих от платных данных (стоимость привлечения лида), ценность извлекается из самого контента — дешёвая аудитория не нужна.

- **API-first архитектура для интеграции** — 3 группы эндпоинтов: анализ (`POST /analyze` → статус → passport + markdown), семантический поиск (`GET /search`, `POST /search/reindex`), подборки (`POST /mix` → `GET /mix/{id}/markdown`). Search и Mixer — опциональные модули, подключаемые через config.yaml. OpenAPI spec — интеграторам не нужна отдельная документация.

---

### 🎯 Неочевидные преимущества (Hidden Features)

Фичи, которые есть в коде, но не бросаются в глаза при первом знакомстве:

- **Мультипровайдерный LLMRouter** (`src/core/llm_router.py:30`) — единый интерфейс для Ollama и OpenAI-совместимых API. В `config.yaml` уже прописаны YandexGPT, Cloud.ru, OpenRouter. Переключение `text_model` с локальной Gemma4 на облачную YandexGPT — одна правка конфига. Более того, каждая роль задаётся **списком провайдеров с приоритетом** — при отказе первого LLMRouter автоматически переключается на следующий (per-provider Circuit Breaker + отслеживание latency), так что локальный Ollama работает как primary, а облачные API — как автоматический fallback при недоступности. Каждая из 6 ролей (`text_model`, `vision_model`, `classifier_model`, `mixer_model`, `moderation_model`, `embedding_model`) настраивается независимо: можно комбинировать локальные и облачные модели в одном пайплайне.

- **GRACE 4 — формальная верификация** (`.grace/`, 32 артефакта) — проект управляется через GRACE 4: 11 MODULE_CONTRACT (9 Python-модулей + M-EXTENSION — Chrome-расширение + M-UI — React-дашборд), 72 пары семантических блоков `START_BLOCK`/`END_BLOCK`, 60 verification-сценариев с 3 gate levels (module → phase → release). Это не ad-hoc код, а инженерная система с контрактами и assertion gates. Каждый модуль изолирован, тестирован и верифицирован — воспроизводимость гарантирована не на словах, а через формальные gates.

- **VLM Ratio Gate — CI-проверка** (`scripts/check_vlm_ratio.py`) — скрипт, анализирующий JSON-логи пайплайна и проверяющий, что VLM-вызовы ≤6% (exit code 0/1). Может использоваться как gate в CI/CD: `python scripts/check_vlm_ratio.py < pipeline.log`. Без этого automation утверждение «≤6% VLM» остаётся на совести разработчика.

- **Audio Fingerprinting + Celebrity Recognition** (`src/audio_engine/audio_fingerprinter.py`) — librosa CQT fingerprints → ChromaDB поиск для идентификации треков. ECAPA-TDNN embeddings для распознавания celebrity-голосов. Результат: 4 дополнительных monetization-метки (`MUSIC_TRACK`, `ARTIST_MERCH`, `EVENT_TICKET`, `CELEBRITY_APPEARANCE`), которые не требуют VLM или ASR.

- **Параллельная обработка аудио** (`src/api/pipeline.py:65`) — fingerprinting (музыка + celebrity voice) запускается `asyncio.create_task()` одновременно с Whisper-ASR и диаризацией, а не последовательно после них. Скрытое ускорение пайплайна: большая часть трудозатратного аудио-анализа выполняется «в тени» основной транскрипции без дополнительного железа.

- **TimeoutManager с Circuit Breaker** (`src/core/timeout_manager.py`) — единый интерфейс для всех LLM-вызовов с трёхуровневой защитой: retry (exponential backoff 1→2→4 с) → Circuit Breaker (10 failures → OPEN → 60s recovery) → fallback chain (retry_same → shorten_prompt → skip_vision). Конфигурируется в `config.yaml`. Prometheus-метрики фиксируют каждый timeout и fallback.

- **Lazy imports — старт сервера <1 с** — 8 тяжёлых зависимостей (SpeechBrain, Whisper, OCR, scene_analyzer) импортируются внутри `_run_pipeline()`, не в глобальной области. FastAPI стартует мгновенно, тяжёлые модели загружаются только при первом анализе.

- **structlog с 81 маркером** (`src/core/logging_config.py`) — структурированные JSON-логи формата `[M-{DOMAIN}][{COMPONENT}][{EVENT}]`. Каждый job логирует 15+ точек пайплайна с correlation_id. Без чтения кода можно диагностировать: какой компонент упал, сколько VLM-вызовов было, какой fallback сработал.

- **Web UI (React + Vite + TailwindCSS)** (`ui/`) — полноценный веб-интерфейс: Dashboard с историей джобов, Passport Viewer с монетизацией по сценам, Mix Viewer, страница поиска, модерация, аудио-аналитика. Переключение Demo Mode одной кнопкой — для презентаций без запущенного бэкенда.

- **Игровой оффер-блок в расширении** (`chrome-extension/src/content/gameOffer/`, NFR-7) — на видео о компьютерных играх (детект по `ya:ovs:category=Видеоигры`, хэштегам `#шутеры/#игра/#геймплей` или паспорту `game_review`) сразу после `section[aria-label="информация о видео"]` встраивается карточка с обложкой игры и кнопками «купить в VK Play / играть в облаке VK Play Cloud и Yandex Play». Новый канал монетизации для игрового сегмента — из коробки, без изменения бэкенда.

- **Тревел-оффер-блок в расширении** (`chrome-extension/src/content/travelOffer/`, NFR-7) — на видео о путешествиях (детект по `ya:ovs:category` со значениями «Путешествия»/«Туризм», хэштегам `#путешествия/#тревел/#отпуск` или паспорту `travel_vlog`) сразу после `section[aria-label="информация о видео"]` встраивается карточка «Билеты {Краснодар} → {направление}»: 4 плитки 2×2 с градиентной темой (авиабилеты, туры, отели, экскурсии). Направление извлекается из заголовка видео («…в Нячанге» → «Нячанг», словарь известных направлений). Город отправления — константа `TRAVEL_DEPARTURE_CITY = "Краснодар"` (в проде — геолокация). Демо-паспорт `vietnam_nha_trang` (`travel_vlog`, boundVideoId `7130901c1c9147f239190def16eb741c`) — 7-й в реестре. Идемпотентный монтаж + MutationObserver для перерисовки React-SPA. Новый канал монетизации для туристического сегмента — из коробки.

- **МЕРЧ-оффер-блок в расширении** (`chrome-extension/src/content/merchOffer/`, NFR-7) — на любом видео, в паспорте которого есть метки товаров (`ecom_item`/`artist_merch`), сразу после `section[aria-label="информация о видео"]` встраивается карточка «товары из видео + мерч канала + магазины». Товары извлекаются из паспорта (`collectMerchProducts()`: дедупликация, сортировка по confidence, до 6 плиток с иконками), бренд — из `celebrity_voice` (для видео Wylsacom — его мерч «Царские стёкла»), магазины — из курируемой карты `MERCH_STORE_BY_BRAND` (для `wylsacom`: Biggeek, Царские стёкла, Wildberries, OZON, Яндекс Маркет). Реальный видео_id `2013f4eba6ade7b01582fb411f9e901a` («Какой iPhone выбрать за 50 000₽») теперь привязан к паспорту `iphone_50k_wylsacom`. Три оффер-блока (игры/тревел/мерч) монтируются взаимоисключающе — первая успешная карточка выигрывает. Идемпотентный монтаж + MutationObserver. Новый канал монетизации e-commerce сегмента — из коробки.

- **Микс-блок «Замеси: Велосипеды» на странице поиска** (`chrome-extension/src/content/bikeSearch/`, NFR-7) — расширение больше не ограничивается страницей видео: на `rutube.ru/search/*` с вело-запросом («велосипеды», «велик», «байк», «mtb», …) сразу после блока фильтров встраивается карточка подборки из **3 видео**: скриншоты из `public/bike/` (web_accessible_resources), бейдж домена («Гайд»/«Обзор»), клик → реальное `rutube.ru/video/{id}` в новой вкладке, и секция **«Товары из подборки»** (ECom-метки из паспортов, сортировка по confidence, иконки). Тёмная/светлая тема, идемпотентный монтаж + MutationObserver от перерисовки React SPA. Новый способ демонстрации миксирования прямо в поиске — из коробки.

- **Степпер «Путь зрителя: новичок → профи»** (`bikeSearch/`, NFR-7) — вторая карточка под блоком подборки: **3 ступени** («Новичок», «Продвинутый», «Профи»), каждая отвечает на вопрос пользователя (например «Какой класс велосипеда мне подходит?») и собирает **кликабельные тайм-коды** из разных видео подборки (`journeyVideoUrl` → `rutube.ru/video/{id}/?start={sec}`). Ступени выстроены в одну горизонтальную линию с соединительными стрелками и градиентными номерами (зелёный→оранжевый→фиолетовый) — пользователь считывает блок как единый маршрут. Восстанавливается при перерисовке SPA вместе с плейлистом.

- **Chrome-расширение «RUTUBE Замеси»** (`chrome-extension/`, MV3 + Shadow DOM + Vanilla TS + Vitest) — монетизация прямо на странице видео `rutube.ru/video/*`: кликабельные маркеры `AD_SLOT`/`ECOM_ITEM`/`CLIP_CANDIDATE` на прогресс-баре (клик → seek), панель текущей сцены поверх плеера и сайдбар аналитика. **4 режима**: «Зритель», «Аналитик», «Симуляция» и «Автор». Shadow DOM-изоляция — ноль конфликтов с CSS RUTUBE и ноль layout-shift (NFR-6). Привязка паспорта к видео: вручную в попапе / автоподбор по keywords заголовка / по `video_id` в реестре; при отсутствии совпадений автоматически применяется паспорт по умолчанию (`getDefaultPassport()`). Контракт `DataProvider` готов под реальный FastAPI `/analyze` (`RealDataProvider` — stub). 222 vitest-теста (26 файлов), GRACE-модуль M-EXTENSION (change C-003).

- **AI-ассистент для редактора RUTUBE Studio** (`chrome-extension/src/studio/`, M-EXTENSION) — второй content-script расширения на `studio.rutube.ru/*`: поллинг-детект модалки video-editor (`[data-testid="video-editor-layout"]`), автоподбор паспорта по video_id/заголовку и монтаж Shadow DOM-панели «AI для редактора». Панель **заполняет все поля публикации одним кликом**: заголовок (A/B-варианты), описание с тайм-кодами сцен, категория (domain_type → раздел RUTUBE), плейлисты, время публикации (сейчас/позже — delayed при rejected-модерации), чекбоксы 18+ (из `age_rating`) и комментариев. Запись в React-поля через нативный setter прототипа + `input`/`change` события — без хаков. Панель сворачивается в пилюлю, перетаскивается (позиция в localStorage), toast-фидбек. 41 новый vitest-тест (5 файлов: studio-autofill/mapping/render/selectors/referral). **Реферальный блок монетизации** (`studio/referral.ts` + `studio/render/referral.ts`, NFR-7) — отдельная вкладка «💰 Монетизация» (таббар «Публикация»/«Монетизация», панель 520 px): товары из паспорта → партнёрские ссылки на 3 магазина (Яндекс Маркет `/partner/link/create`, AliExpress `affiliate.link.generate`, Admitad `/deeplink/`), 4 KPI (потенциал ₽/ссылки/CTR/комиссия), donut распределения дохода, карточки товаров с табами магазинов и прогнозом (CTR/конверсия/EPC/доход, детерминировано), кнопки «Копировать все», «Вставить блок в описание» и «Экспорт CSV». Замыкает цикл «паспорт → публикация → монетизация»: паспорт превращается в готовый черновик публикации в Studio.

- **Блок «Тренды и плейлисты» в RUTUBE Studio** (`chrome-extension/src/studio/trends.ts` + `chrome-extension/src/studio/render/trends.ts`, NFR-7) — новая вкладка AI-панели на `studio.rutube.ru/*`: KPI-строка (растущих >20% / средний рост / коллабораций / плейлистов) + donut по сложности трендов, карточки трендов Wordstat (объём/мес, рост WoW, сложность low/medium/high, сезонность sparkline 12 точек, источники Yandex Wordstat + Google Alerts, related-запросы, прогноз `estViews`/`ctr`), идеи плейлистов с обложками (`public/bike/*.png` через `chrome.runtime.getURL`, `BIKE_GRADIENT` fallback) и «путём зрителя» (3 ступени — кликабельные тайм-коды `rutube.ru/video/{id}/?start={sec}`), предложения коллабораций с overlap-баром и готовым питчем для копирования. Фильтры «Все / Растущие / Alerts», действия «Копировать запрос» / «+ В заголовок» (`applyValue` → React-поле), «Структура плейлиста» / «+ В поиск плейлиста». Курируемый Wordstat-фикстур `CURATED_TRENDS` по 5 ключам паспортов (bike_dont_buy — 6 трендов, iphone_50k_wylsacom — 3 и т.д.), иначе фолбэк из `seo_tags`/`ad_targeting_keywords` с сидированным `hashSeed+mulberry32` (один `videoId+паспорт` → один результат). 2 новых vitest-файла (`studio-trends.test.ts`, `studio-trends-render.test.ts`). Живой прокси Wordstat/Alerts подключается позже без переделки UI — демо-дисклеймер в футере.

- **Умные комментарии на странице видео** (`chrome-extension/src/content/comments/`, NFR-7) — content-script на `rutube.ru/video/*` обогащает ленту комментариев без сети: `detect.ts` строит корпус сцены (`scene_summary + search_query + hook + keywords`) и считает взвешенный Jaccard `|q∩c|/|q| * (0.7+0.3*maxConf)` со стеммингом (`tokenizeStemmed` + `productStems` для «17е»→«17e») + фолбэк по `word_timestamps`; классифицирует в 8 тегов — `product` (товарное намерение: ecom-сцена + buyBoost/розыгрыш или overlap≥2), `monetizable` (лид: `product` + `confidence≥0.85` + `brand_safety≥70` без скам-сцены), `question` (`?` / вопросительные слова), `praise`, `toxic` (база оскорблений + `language`-evidence + «КРИК» 3+ слов капсом), `scam` (база + `scam_warning`-evidence), `interesting` (virality high / монетизируемый ≥0.93 / лайков ≥3), `offtopic`. `generate.ts` — детерминированная генерация 3 вариантов «ИИ-ответа» (`hashSeed+mulberry32` по `videoId:reply:comment`) по kind `fact/answer/softio/thank/warn` с фактами сцены (`extractPrice`/`extractModel`/`verdict`/`sceneTime`). `render.ts` — сводная карточка над списком (KPI-чипы лидов/товарных/вопросов/токсичных + donut топ-категории + табы-фильтры `Все/Лиды/Вопросы/Интересные/Токсичные/Скам` + «Сводка» CSV в буфер), бейджи-чипы на каждом `li` (`data-rz-comment-tags`, цвет `TAG_META`, тултип-explain + `⏱ mm:ss` seek через `PlayerHandle.seekTo` + `✨ ИИ-ответ`), товарная мини-карта для лидов (`leadProductFor` → `collectMerchProducts` + иконка) и подсветка токсичных рамкой. `index.ts` — `waitFor` появления блока (React SPA монтирует клиентски), `enhanceAll` + `MutationObserver` на список и wrapper (восстановление при «Показать ещё» / сортировке) + поповер-диалог (3 варианта + «Копировать» / «Вставить в ответ» через `setNativeValue` с `@author` + «▶ @mm:ss» seek, закрытие по Esc/оверлею, toast-фидбек). Тёмная/светлая тема, идемпотентный монтаж, 4 новых vitest-файла.

- **Инструменты автора — A/B-тестирование контента** (`chrome-extension/src/content/authorTools/`, NFR-7) — 4-й режим «✍️ Автор»: генератор вариантов заголовков и описаний для A/B-теста. Детерминированная генерация из паспорта (`mulberry32` PRNG, seeded по `video_id`) + курируемая библиотека для 7 известных паспортов. Метрики эффективности вариантов (прогнозные views/CTR), SVG-графики retention-кривой, стека монетизации и почасовых баров — всё считается из паспорта без сети. Полноширинная модалка (`ModesController.expand`) с таббаром всех 4 режимов.

- **SSE / EventSource — live-уведомления** (`ui/src/api/RealApiClient.ts:73`) — клиент подписывается на события через `EventSource`. При изменении статуса обработки UI обновляется в реальном времени без polling.

- **Demo Mode для презентаций** (`ui/src/api/DemoApiClient.ts`) — UI работает полностью offline с 7 предзагруженными паспортами (кинообзор «Эхо Будущего», обзор техники — наушники, обзор iPhone от Wylsacom, DIY, кулинарный рецепт, обзор игры Atomic Heart, тревел-влог «Вьетнам: жизнь в Нячанге»), готовым миксом «как выбрать наушники» и 11 поисковыми результатами. Переключение через `DemoModeContext` в рантайме. Позволяет демонстрировать продукт судьям и заказчикам без установки Ollama, Whisper и моделей.

- **Двойной формат экспорта: .md + .json** (`src/passport_builder/passport_builder.py:233`) — `save_passport_to_disk()` сохраняет каждый паспорт одновременно в Markdown (для людей и UI) и JSON (для programmatic consumption). JSON содержит полную Pydantic-схему Passport: frontmatter, timeline, метрики, модерацию, музыкальные треки, celebrity recognition. Интеграторам не нужно парсить Markdown — можно читать `output/{video_id}.json` напрямую.

- **Автоиндексация в ChromaDB при сборке паспорта** (`src/passport_builder/passport_builder.py:165-166`) — после завершения паспорта `build_passport()` автоматически вызывает `index_passport()` для немедленной индексации сцен в семантическом поиске. Паспорты доступны для поиска сразу после обработки, без ручного вызова `POST /search/reindex`. Ошибки индексации не блокируют паспорт — он сохраняется в любом случае.

- **Строгий режим валидации паспорта** (`src/passport_builder/validator.py:9`) — `validate(passport, strict=True)` вместо логирования ошибок выбрасывает `PipelineValidationError`, обрывая пайплайн. Проверяет: наличие `video_id`, хронологический порядок таймкодов, обязательность `search_query` для `ECOM_ITEM`. Для отладки: временно включить strict mode и пройти E2E-тест.

- **FingerprintDB — персистентное хранилище аудиоотпечатков** (`src/audio_engine/audio_fingerprinter.py:22`) — `FingerprintDB` сохраняет CQT-хэши и метаданные треков в `data/fingerprint_db.json`. Функция `index_track()` позволяет программно добавить любой аудиофайл в базу отпечатков с метаданными (artist, track_name, album, year, afisha/merch/events URLs). Скрипт `scripts/index_test_tracks.py` демонстрирует пакетную индексацию. ChromaDB (`data/chroma/`) и fingerprint DB — два независимых персистентных хранилища с разными схемами данных.

---

### Экономическая эффективность

VLM Gatekeeper (трёхуровневая фильтрация перед вызовом vision-модели) сокращает число VLM-вызовов со 100% до ≤6% сегментов:

| Метрика | Без Gatekeeper | С Gatekeeper | Эффект |
|---|---|---|---|
| VLM-вызовов / час видео | ~180 (100%) | ~10 (≤6%) | –94% |
| Время CPU на VLM | ~180 мин | ~10 мин | –17× |

Себестоимость электроэнергии на 1 час видео при локальном CPU (Mac M1, реальная средняя мощность под AI-нагрузкой ~12 Вт вместо пиковых 50 Вт, $0.12/kWh, расчёт — `my/monetization-all-variants.md` §9):

| Компонент | Вызовов | Wall-clock | Мощность | Стоимость |
|---|---|---|---|---|
| Whisper large-v3 (ASR) | 1 | 1080 с | 25 Вт (GPU) | $0.0009 |
| Gemma4:e4b (SLM, текст) | ~180 | 5400 с | 12 Вт | $0.0022 |
| Qwen3.5:0.8B (классификатор жанров) | 1 | 30 с | 12 Вт | $0.0001 |
| Qwen3.5:9b (VLM, vision) | ≤10 | 600 с | 12 Вт | $0.0002 |
| RapidOCR + SpeechBrain + ffmpeg | — | 300 с | 12 Вт | $0.0001 |
| Audio Fingerprinting + Moderation | — | 100 с | 12 Вт | $0.0001 |
| **Итого (электроэнергия)** | | **~3210 с** | | **~$0.004** |

**Полная стоимость владения (TCO) на 1 час — электроэнергия + амортизация оборудования + обслуживание:**

| Сценарий | Электроэнергия | CAPEX | Обслуживание | **TCO/ч** |
|---|---|---|---|---|
| Mac M1 Max (CPU) | $0.004 | $0.065 | $0.003 | **~$0.07** |
| Mac M4 Pro (GPU) | $0.002 | $0.053 | $0.003 | **~$0.06** |
| Облако (GPT-4o mini через LLMRouter) | $0.387 | — | — | **~$0.39** |
| Облако (Яндекс AI Studio: DeepSeek 4 Flash / Alisa AI) | ~$0.18 | — | — | **~$0.18** |
| Гибрид: лок. Whisper + облачный LLM | $0.027 | +CAPEX | $0.003 | **~$0.10** |

**Яндекс AI Studio** (замеры на реальных паспортах, `my/Расчет затрат на Видео Паспорт на основе AI Studio.xlsx`): стоимость генерации паспорта через DeepSeek 4 Flash (0.30 ₽/1k вход / 0.50 ₽/1k выход) или Alisa AI (0.50 ₽/1k / 1.20 ₽/1k) — **в среднем ~5.73 ₽/паспорт и ~0.26 ₽/мин видео** (~15.8 ₽/ч ≈ **$0.18/ч**). Это в **~2× дешевле GPT-4o mini** и без CAPEX (не нужен Mac/GPU) — оптимальный middle-ground между локальным пайплайном ($0.004/ч энергии, но ~$0.07/ч TCO с железом) и облаком OpenAI. Разброс 0.15–0.38 ₽/мин зависит от длины ролика и объёма исходящих токенов.

**Сходимость P&L на масштабе** (критерий #2 ТЗ): CAPEX амортизируется при росте объёмов. При 1000+ ч/мес на одном железе амортизация падает до ~$0.001/ч, и доминирует только электроэнергия: **~$0.005/ч (CPU)** или **~$0.003/ч (GPU)** — в 80–130× дешевле облачного сценария. VLM Gatekeeper дополнительно экономит ~$0.008/ч, а LLM-as-Judge модерация добавляет лишь **+$0.00002/ч**, переиспользуя уже собранные ASR+OCR данные (нулевая marginal стоимость).

Целевой порог с GPU — **<$0.0025/ч** (Ollama через CUDA/Metal ускоряет VLM и SLM в 5–10×).

### Типы монетизационных меток

| Метка | Условие |
|---|---|
| `AD_SLOT` | Сегмент подходит для контекстной рекламной врезки |
| `ECOM_ITEM` | Назван конкретный товар, бренд или инструмент |
| `CLIP_CANDIDATE` | Сцена содержит лайфхак, ошибку или неожиданный сюжетный поворот |
| `MUSIC_TRACK` | Обнаружена фоновая музыка (librosa fingerprinting) |
| `ARTIST_MERCH` | Упоминание исполнителя/группы в контексте мерча |
| `EVENT_TICKET` | Анонс концерта, тура или ивента |
| `CELEBRITY_APPEARANCE` | Обнаружен celebrity voice (ECAPA embeddings) |

**Как Search и Mixer работают с метками:**

- **Semantic Search** — возвращает сцены с фильтром по `monetization_types`. Позволяет найти все `ECOM_ITEM`-сцены для каталога товаров или все `AD_SLOT`-сцены для programmatic размещения рекламы.
- **Mixer (Замеси)** — автоматически собирает сцены с `AD_SLOT` и `ECOM_ITEM` в структурированные видеоподборки. Каждая подборка — готовый монетизируемый плейлист: рекламные блоки + товарные сцены без ручного монтажа.

**Валидация паспорта** (`src/passport_builder/validator.py:9`) — `validate()` проверяет наличие `video_id`, хронологический порядок таймкодов, обязательность `search_query` для `ECOM_ITEM`. По умолчанию ошибки только логируются; параметр `strict=True` переключает в режим исключения (`PipelineValidationError`) — для отладки и CI-гейтов.

### Соответствие критериям технического задания

| Критерий | Раздел в README |
|---|---|---|
| Влияние на метрики монетизации | Типы меток, схема работы, Search + Mixer |
| Юнит-экономика | Экономическая эффективность |
| Воспроизводимость | Тестирование (205 тестов) |
| Чувствительные данные | Приватность и безопасность |
| Production-готовность | Отказоустойчивость, мониторинг |
| UC-5: Семантический поиск (VideoRAG) | Семантический поиск, API: `GET /search`, Быстрый старт |
| UC-6: Mixer (Замеси) | Mixer, API: `POST /mix`, Быстрый старт |

---

### Сравнение с альтернативами

| Критерий | **RUTUBE Analyzer** | Assembler / Premiere (ручной монтаж) | Облачные AI-сервисы (Google Video AI, AWS Rekognition) |
|---|---|---|---|
| **Себестоимость 1 ч видео** | **$0.015** (CPU), <$0.0025 (GPU) | $30–60 (работа редактора) | $3–12 (API + compute) |
| **Приватность** | Полностью локально, ФЗ-152 | Локально | Данные уходят в облако |
| **Монетизация** | AD_SLOT, ECOM_ITEM, CLIP_CANDIDATE + MUSIC, ARTIST_MERCH, EVENT, CELEBRITY | Только ручная разметка | Только сцены/объекты (без монетизационной классификации) |
| **VLM Gatekeeper** | ≤6% вызовов | Не применимо | 100% кадров |
| **Семантический поиск** | ChromaDB + qwen3-embedding (VideoRAG) | Нет | Ограничен (key-based) |
| **Mixer (подборки)** | LLM → поиск → matching → Markdown | Часы ручной работы | Нет |
| **Open Source** | Apache 2.0 / MIT, весь стек | Нет | Проприетарные API |
| **Модульность** | 11 модулей (9 Python + Chrome-расширение MV3 + Web UI), GRACE-верификация | Нет | Чёрный ящик |
| **Русский язык** | WER 4.2% (Whisper large-v3), кириллический OCR | Любой | WER >10% на русском |
| **GPU не обязателен** | Да (CPU $0.015/ч), GPU как ускорение | Нет | Нет |

---

## Схема работы пайплайна

```
MP4
├── PyAV: extract_audio()  ──────────────► Whisper.cpp (large-v3) ──► сегменты ASR
│                                              │
│                                        SpeechBrain ECAPA-TDNN ──────────────► сегменты спикеров
│                                              │
│                                        TimelineMerger ────────────► timeline[]
│                                              │
│                                        Audio Fingerprinting ─────► music_matches + celebrity_hits
│                                        librosa CQT → ChromaDB
│
├── PyAV: extract_iframes() ──► RapidOCR v4 (все кадры) ──► OCRBuffer (окно ±5 с)
│                                  │
│                             Genre Classifier (Qwen3.5:0.8b) ──► жанр + vision_blocked
│
└── Анализ каждого сегмента timeline[] в цикле analyze_scenes():

    [сегмент]
        │
        ▼
    Gemma4:e4b (pass1 text: ASR + OCR-контекст)
        │
        ├── action_is_clear=true  ─────────────────────────────► .md passport
        │
        └── requires_vision=true И !vision_blocked И нет OCR
                │
                ▼
            Qwen3.5:9b Vision (pass2: base64 I-frame) ─────────► .md passport

    После сборки паспорта:
        ► Moderation (LLM-as-Judge) ──► age_rating + verdict + flags
        ► Итоговый паспорт (.md) с YAML frontmatter + moderation
```

Три уровня Gatekeeper, решающих, вызывать ли VLM:

1. **DomainRouter** — жанровая блокировка: `podcast`, `lecture`, `stream`, `true_crime`, `education` → `vision_blocked=true`
2. **Inquisitive SLM** — Gemma4:e4b сам возвращает `requires_vision: true/false` на основе неопределённых местоимений («эта штука», «сюда», «такой»)
3. **OCR-дедупликация** — если OCRBuffer содержит текст на временно́м отрезке сегмента, VLM не вызывается (текст на кадре уже покрывает семантику)

Итог: VLM вызывается для ≤6% сегментов вместо 100%.

---

## Технологический стек

### Аудиообработка

#### Whisper large-v3 (ASR)

- **Почему:** whisper.cpp — C++ имплементация OpenAI Whisper без Python-оверхеда. Metal/CUDA из коробки. large-v3 даёт WER 4,2% для русского языка (Common Voice ru).
- **Реализация:** subprocess на бинарник `whisper-cli` с флагами `-ojf --language ru`. Результат — JSON с текстом, таймстемпами начала/конца сегмента и покадровыми метками слов.
- **Время:** 0,3× реального времени на Mac M1 Metal (1 час видео → ~18 мин CPU).
- **Память:** ~3 GB VRAM для large-v3.

#### SpeechBrain ECAPA-TDNN + Silero VAD

- **Почему:** ECAPA-TDNN — state-of-the-art speaker embedding (200 MB) без gated моделей. Silero VAD v5 (1.2 MB) — лучшая открытая VAD. Всё полностью локально, HF_TOKEN не требуется.
- **Реализация:** `torchaudio.load` → Silero VAD (`get_speech_timestamps`) → ECAPA embeddings (`EncoderClassifier.from_hparams`) → `SpectralClustering` → `SpeakerSegment[]` с метками `SPEAKER_00`, `SPEAKER_01`.
- **Преимущество:** таймлайн со спикером → SLM учитывает, кто говорит (рекламодатель, ведущий, гость — разные контексты). Без зависимостей от HuggingFace gated моделей.
- **Время:** ~0,1× real-time на CPU.

#### ffmpeg subprocess (PyAV)

- **Почему:** ffmpeg — единственный надёжный способ демодуляции MP4. Альтернатива (PyAV/ffmpeg-python, av≥14) удалена из зависимостей — subprocess даёт полный контроль над таймаутами и cancel-безопасностью.
- **Реализация:** `asyncio.create_subprocess_exec` (не `subprocess.run`). Каждый вызов обёрнут в `asyncio.wait_for()` с таймаутом. При TimeoutError процесс убивается через `proc.kill()`.
- **Преимущество:** не блокирует event loop — пайплайн можно отменить на любом этапе (Cancel на уровне API).

#### TimelineMerger

Склеивает ASR-сегменты и speaker segments: каждому ASR-сегменту присваивается спикер, чей отрезок перекрывается по времени. При отсутствии перекрытия — `speaker="unknown"`.

#### Audio Fingerprinting

Анализ аудиодорожки через librosa (CQT fingerprints → ChromaDB) и ECAPA-TDNN embeddings для обнаружения музыки и celebrity voice:

- **`analyze_audio_for_monetization()`** — entry point: запускает fingerprinting + celebrity detection + genre-анализ, возвращает `AudioMonetizationResult`
- **`fingerprint_audio()`** — librosa CQT → peaks → хэши → поиск по ChromaDB. Возвращает `MusicMatch[]` (трек, исполнитель, таймстемпы, confidence)
- **`detect_celebrity()`** — ECAPA-TDNN embedding → косинусное расстояние с эталонными celebrity-голосами → `CelebrityVoice[]`
- **`match_audio()`** — запрос к ChromaDB (`audio_fingerprints`) по peaks-хэшам, `top_k=5`, distance < 0.25

Данные fingerprinting передаются в PassportBuilder и попадают в метрики паспорта:
`music_tracks`, `celebrity_hits`, `fingerprint_matches`.

Результат: новые monetization-метки `MUSIC_TRACK`, `ARTIST_MERCH`, `EVENT_TICKET`, `CELEBRITY_APPEARANCE`.

**Индексация новых треков** — `src/audio_engine/audio_fingerprinter.py:201` (`index_track()`) добавляет аудиофайл в `FingerprintDB` с метаданными (artist, album, year, afisha/merch URLs, events). `scripts/index_test_tracks.py` — CLI-скрипт для пакетной и побатчевой индексации: `--track /path/to/track.mp3 --artist "Name" --title "Track"`. После индексации новые треки автоматически обнаруживаются `match_audio()`.

---

### Визуальный анализатор

#### RapidOCR v4 (ONNX)

- **Почему:** ONNX-рантайм, работает на CPU без GPU. Модель PP-OCRv4 с кириллической поддержкой. Альтернативы (Tesseract, EasyOCR) в 3–10× медленнее на CPU.
- **Реализация:** `RapidOCR()` (singleton для всего пайплайна) → `engine(str(fpath))` → `(box, text, confidence)`. Фильтр уверенности: ≥0,5 (настраивается в `config.yaml`). JPG-кадры сохраняются до конца пайплайна (нужны для VLM).
- **Время:** ~30 ms на кадр (CPU).
- **Зачем:** если на I-frame уже есть текст, VLM не нужен — OCRBuffer обеспечивает экономию 5–15% VLM-вызовов на утилитарных видео (how_to, review).

#### Genre Classifier (Qwen3.5:0.8b)

- **Почему:** минимальная модель Ollama (0,8B параметров). Распознаёт 14 жанров (задаются в `config.yaml → genres.labels`): podcast, lecture, stream, how_to, review, tech_review, diy, diy_crafts, game_review, travel_vlog, entertainment, true_crime, education, unknown. Необходима для DomainRouter — жанровой блокировки VLM.
- **Параметры:** `max_tokens=8192` — перекрывает thinking-токены Qwen3.5. При 4096 thinking обрезал JSON-ответ. Keyword fallback при недоступности Ollama.
- **Время:** ~30 с на классификацию.

#### OCRBuffer

Кольцевой буфер OCR-результатов с окном ±5 с. При запросе `check(timestamp)` возвращает объединённый текст всех результатов в окне. `clear()` сбрасывает буфер между job'ами.

---

### Модерация контента (LLM-as-Judge)

Отдельный модуль `M-MODERATOR` (`src/moderator/`), выполняющий анализ контента на предмет возрастных ограничений и запрещённых категорий. Запускается в `PassportBuilder.build_passport()` после завершения основного пайплайна — **не влияет** на существующие промты scene-анализа.

- **`assess_moderation()`** — LLM-вызов к Gemma4:e4b с промтом `moderation_judge`. Возвращает `ModerationReport` (age_rating, verdict, flags[]).
- **9 категорий флагов:** `profanity`, `hate_speech`, `violence`, `nsfw`, `drugs_weapons`, `self_harm`, `misinformation`, `controversial_figure`, `copyright_music`.
- **Age rating:** `0+` / `6+` / `12+` / `16+` / `18+`.
- **Verdict:** `approved` / `flagged` / `rejected`.
- **Prompt:** system-prompt задаёт роль RUTUBE-модератора, user-prompt включает ASR-текст + OCR-контекст. Формат ответа — JSON.

Результат сохраняется в `PassportFrontmatter.moderation` и отражается в метриках:
- `moderation_verdict` — verdict прометей-метрики
- `moderation_flags_count` — количество флагов
- `moderation_age_rating` — возрастной рейтинг

В YAML frontmatter паспорта появляется блок `moderation:` с полным отчётом.

---

### Семантический анализатор

#### Gemma4:e4b (SLM — Small Language Model)

- **Почему:** Gemma4:e4b — эволюция Gemma2 от Google DeepMind. Ключевое отличие от предшественника (Qwen3.5:4b): **не тратит токены на thinking** (хотя capability `thinking` присутствует — на практике ответ без рассуждений).
  - Qwen3.5:4b тратил ~160 с/call на thinking → Gemma4:e4b ~35–43 с/call (**4× быстрее**).
  - Промпт не требует специального форматирования — Gemma4 не чувствителен к шаблону `<|im_start|>`.
  - Важно: у Gemma4:e4b и Qwen3.5:9b в Ollama есть capability `thinking`. Gemma4 выдаёт ответ без лишних рассуждений, а Qwen3.5:9b генерирует скрытые thinking-токены, которые Ollama отрезает через PARSER qwen3.5. Из-за этого vision-запросы требуют запаса `vision_max_tokens: 8192`.
- **Реализация:** до 180 вызовов на 1 ч видео (по одному на сегмент таймлайна). Возвращает структурированный JSON:

```json
{
  "action_is_clear": true,
  "requires_vision": false,
  "scene_summary": "Краткое описание",
  "monetization": [
    {"type": "ecom_item", "search_query": "рожковый ключ на 13", "confidence": 0.85},
    {"type": "ad_slot", "search_query": "инструменты", "reason": "контекст ремонта"}
  ],
  "clip_candidate": null
}
```

#### Qwen3.5:9b Vision (VLM — Vision Language Model)

- **Почему:** единственная локальная vision-модель Ollama, влезающая в 16 GB RAM. Принимает base64-изображение вместе с ASR-контекстом. Вызывается только для ≤6% сегментов.
- **Защита:** I-frame >2 MB → вызов пропускается (base64-чтение без лимита может вызвать OOM на 4K-кадрах). Размер проверяется через `os.path.getsize()` до чтения.
- **Thinking:** Qwen3.5:9b в Ollama имеет capability `thinking` — модель генерирует скрытые токены рассуждения перед ответом. Ollama отрезает их через `PARSER qwen3.5`, поэтому видимый ответ может быть пустым, если не хватило `num_predict`. Решение: `vision_max_tokens: 8192` в config.yaml.
- **Время:** ~60-120 с/call на CPU (с учётом thinking-токенов).

#### Prompt Templates (шаблоны промптов)

Три шаблона в `prompt_templates.py`:
- PASS1_TEXT — SLM-анализ текста сегмента (ASR + OCR-контекст + жанр)
- PASS2_VISION — VLM-анализ I-frame (весь I-frame как base64 + отрезок ASR)
- FRONTMATTER — генерация YAML-метаданных на основе полного транскрипта

Формат ответа — JSON. Маркдаун-код-фенсы (```json) стрипаются до парсинга через `extract_json()`.

#### Сохранение результатов

`save_passport_to_disk()` (`src/passport_builder/passport_builder.py:233`) сохраняет каждый паспорт **в двух форматах**:
- `.md` — читаемый Markdown с YAML frontmatter, таймлайном и монетизационными метками
- `.json` — полная Pydantic-схема Passport (frontmatter + timeline + moderation + music/celebrity data) для programmatic consumption. Интеграторам не нужно парсить Markdown.

Оба файла записываются в `passport.output_dir` (по умолчанию `./output/`).

`.md` также содержит секции **«Музыка»** (треки из `audio_matches`: артист — трек, жанр/альбом/год, уверенность) и **«Знаменитость»** (`celebrity_voice`); тайминги сцен берутся из `scene.start_sec/end_sec` (заполняются из `raw_timeline_segments`).

**Demo-артефакты:** `python scripts/generate_demo_outputs.py` сериализует 7 паспортов из `chrome-extension/src/data/passports/` через канонический контракт `Passport` в `output/{video_id}.json` + `.md` — как если бы их реализовала сама система (audio_matches/celebrity_voice сохраняются).

---

### Семантический поиск (VideoRAG)

Поиск сцен по смыслу, а не по ключевым словам. Возвращает не просто текст, а готовые монетизационные точки: какие сцены содержат `AD_SLOT` (контекст для рекламы), `ECOM_ITEM` (товары), `CLIP_CANDIDATE` (виральный клип). Каждый результат — готовая единица для programmatic placement.

#### ChromaDB 1.5+ (Vector Search)

- **Почему:** ChromaDB — Apache 2.0, Rust core, `pip install`, embedded mode без внешнего сервера. Для масштаба тысяч сцен — оптимально.
- **Реализация:** lazy-инициализация `PersistentClient(path=config.search_chroma_path)`. Каждая сцена → векторный чанк (speaker + ASR + summary + monetization_types) → `collection.add(embedding, metadata, id)`. Расстояние — косинусная близость.
- **Индексация:** автоматически при сборке паспорта в `build_passport()` (после `validate` и `assess_moderation`) — `index_passport()` добавляет сцены в ChromaDB немедленно. Паспорт доступен для поиска сразу после обработки. Опциональная ручная переиндексация через `POST /search/reindex`. Ошибки индексации не блокируют паспорт (graceful degradation).

#### Qwen3-Embedding:0.6b

- **Почему:** мультиязычная модель (русский включён), 639 MB, 1024-dim, MTEB 64.33. Альтернатива `nomic-embed-text` — только английский.
- **Реализация:** Ollama `/api/embed` через `httpx.Client` (connection pooling) с таймаутом 30 с.
- **Время:** <200 ms на один embedding (CPU, Mac M1).

---

### Mixer (Замеси)

Генератор монетизируемых видеоподборок по текстовому запросу пользователя. Каждая подборка — готовый плейлист из сцен с `AD_SLOT` (рекламные блоки), `ECOM_ITEM` (товары) и `CLIP_CANDIDATE` (виральные клипы). Без Mixer подборки собираются редактором вручную часы; с Mixer — секунды.

- **Почему:** ручной монтаж подборок — часы работы редактора. Mixer автоматизирует: LLM-планирование этапов → семантический поиск сцен → LLM-матчинг → Markdown. Результат можно сразу передавать в рекомендательную систему RUTUBE или на ручную доработку.
- **Реализация:** фоновый `_run_mix` pipeline (аналог `_run_pipeline`):
  1. `plan_stages` — `gemma4:e4b` разбивает запрос на 3-5 этапов
  2. `compose_mix` — для каждого этапа `search_scenes` (фильтр по monetization_types) + `gemma4:e4b` матчинг → `MixStage`
  3. `mix_to_markdown` — `Mix` → структурированный Markdown
- **Хранилище:** `MemoryStore[Mix]` (TTL-кеш с автоматической очисткой)

---

### API и инфраструктура

#### FastAPI

- **Почему:** async-native фреймворк с Pydantic v2 на каждом эндпоинте. OpenAPI spec генерируется автоматически — интеграторам не нужна отдельная документация.
- **Эндпоинты основного пайплайна:**
  - `POST /analyze` — загрузка видео, возврат `job_id`, фоновый запуск
  - `GET /analyze/{job_id}` — полный результат (passport + метрики)
  - `GET /analyze/{job_id}/status` — краткий статус
  - `GET /analyze/{job_id}/markdown` — текст .md паспорта
- **Эндпоинты семантического поиска:**
  - `GET /search?q=...&top_k=20&genre=...` — поиск сцен по текстовому запросу
  - `POST /search/reindex` — переиндексация всех `.md` паспортов в ChromaDB
- **Эндпоинты Mixer (Замеси):**
  - `POST /mix` — создание видеоподборки, возврат `mix_id`, фоновый запуск
  - `GET /mix/{mix_id}` — результат (структура Mix)
  - `GET /mix/{mix_id}/markdown` — Markdown подборки
- **Фоновые задачи:** `asyncio.create_task()` с lazy imports — тяжёлые зависимости (SpeechBrain, Whisper) загружаются только при первом запуске, не влияя на старт сервера.

#### structlog + Prometheus

- **Почему:** structlog — структурированные JSON-логи с correlation_id. Prometheus — latency, счётчики, error rate. Без этой пары диагностика отказов в production невозможна (NFR-4).
- **Формат лога:**
  ```json
  {"event": "[M-API][PIPELINE][DONE]", "level": "info", "timestamp": "...",
   "correlation_id": "a1b2c3d4", "duration_sec": 142.5, "vlm_percent": 5.2}
  ```
- **Метрики:**
  - `processing_duration_seconds` — гистограмма времени пайплайна
  - `vlm_calls_total` — счётчик VLM-вызовов
  - `scenes_total` — счётчик обработанных сцен
  - `jobs_total{status="pending|done|error"}` — счётчик job'ов

#### Оркестрация пайплайна

- **Почему asyncio:** ffmpeg, ASR, диаризация — блокирующие операции. `asyncio.create_subprocess_exec` позволяет не блокировать event loop и отменять pipeline через `asyncio.CancelledError`.
- **Почему subprocess:** ffmpeg и whisper.cpp — внешние бинарники. Python-обёртки (PyAV, whisper-python) добавляют оверхед и баги совместимости. Subprocess даёт полный контроль.
- **Lazy imports:** 8 зависимостей (SpeechBrain, Whisper, OCR, scene_analyzer и др.) импортируются внутри `_run_pipeline`, не в глобальной области. Это сокращает время старта сервера до <1 с.

#### LLMRouter — мультипровайдерный коннектор моделей

Единый интерфейс для всех LLM-вызовов, поддерживающий как локальные (Ollama), так и внешние OpenAI-совместимые API. Позволяет переключать модели между провайдерами без изменения кода — достаточно правки `config.yaml`.

```
LLMRouter.infer(prompt, role) / LLMRouter.embed(text, role)
  │
  ├── entries_for(role) → список провайдеров с приоритетом из config.yaml
  │     для каждого (свой per-provider Circuit Breaker):
  │        ollama → POST /api/generate (локально)
  │        openai → POST /v1/chat/completions (Yandex, Cloud.ru, OpenRouter и др.)
  │     первый успешный → результат; failure → следующий в списке (auto-fallback)
  │
  └── model_for(role) → модель из config.yaml
```

**Поддерживаемые провайдеры (уже в `config.yaml`):**

| Провайдер | Эндпоинт | Авторизация |
|---|---|---|
| `ollama` | `http://localhost:11434` | — |
| `yandex` (YandexGPT) | `https://llm.api.cloud.yandex.net/foundationModels/v1` | `Bearer ${YANDEX_API_KEY}` |
| `cloudru` | `https://api.cloud.ru/v1` | `Bearer ${CLOUDRU_API_KEY}` |
| `openrouter` | `https://openrouter.ai/api/v1` | `Bearer ${OPENROUTER_API_KEY}` |

Любой OpenAI-совместимый API (Sber GigaChat, YandexGPT, Cloud.ru, OpenRouter, и т.д.) можно добавить, прописав в `models.providers` новый блок с `type: openai`, `endpoint` и `api_key`.

**Пример — переключение text_model на YandexGPT:**

```yaml
models:
  providers:
    yandex:
      type: openai
      endpoint: "https://llm.api.cloud.yandex.net/foundationModels/v1"
      api_key: "${YANDEX_API_KEY}"
  routing:
    # каждая роль = список провайдеров с приоритетом (primary → fallback…)
    text_model:
      - { provider: "ollama",  model: "gemma4:e4b" }    # primary (локально)
      - { provider: "yandex",  model: "yandexgpt" }     # fallback при отказе
      - { provider: "openrouter", model: "openai/gpt-4o-mini" }
    embedding_model:
      - { provider: "ollama", model: "qwen3-embedding:0.6b" }
      - { provider: "yandex", model: "yandex-embed" }
```

Каждая роль (`text_model`, `vision_model`, `classifier_model`, `mixer_model`, `moderation_model`, `embedding_model`) настраивается независимо — можно комбинировать локальные и внешние модели в одном пайплайне.

---

## Архитектура (GRACE)

Девять изолированных Python-модулей (ниже на схеме) плюс M-EXTENSION (Chrome-расширение) и M-UI (React-дашборд) — всего 11 GRACE-модулей, каждый со своим MODULE_CONTRACT и semantic-блоками START/END. Модули коммуницируют через Pydantic-модели из `M-CORE`.

```
┌──────────────────────────────────────────────────────────────────┐
│  M-API (FastAPI) — 7 файлов, 10 тестов                          │
│  analyze + search + mix + metrics + health + pipeline           │
└──┬───────────────┬────────────────────────┬─────────────────────┘
   │               │                        │
┌──▼───────────┐ ┌─────────────────┐ ┌─▼───────────────┐  ┌─────▼────────────────┐
│ M-PASSPORT   │ │  M-MODERATOR    │ │ M-SEARCH        │  │  M-MIXER             │
│ 4 файла      │ │  3 файла        │ │ 3 файла         │  │  4 файла             │
│ 23 теста     │ │  4 теста        │ │ 8 тестов        │  │  8 тестов            │
│ build→moder. │ │  LLM-as-Judge   │ │ index→search    │  │  plan→compose→render │
│ validate     │ │  age_rating     │ │ ChromaDB        │  │  LLM-матчинг         │
└──┬──────┬────┘ └─────────────────┘ └──┬──────────────┘  └──────┬───────────────┘
   │      └──────┐                      │                         │
   └─────────────┼──────────────────────┼─────────────────────────┘
                 │                      │
┌───────────────────▼───────────────────────────────────────────┐
│  M-SEMANTIC — 4 файла, 12 тестов                              │
│  Gemma4:e4b (text) + Qwen3.5:9b (vision) + analyze_scenes    │
│  VLM Gatekeeper: ≤6% сегментов                                │
└──────┬───────────┬───────────────────────────────────────────┘
       │           │
┌──────▼────┐ ┌────▼──────────┐
│ M-AUDIO   │ │ M-VISION      │
│ 6 файлов  │ │ 4 файла       │
│ 60 тестов │ │ 28 тестов     │
│ Whisper   │ │ OCR, Genre,   │
│ SpeechBrain│ │ DomainRouter  │
│ ffmpeg    │ │ OCRBuffer     │
│ Fingerprint│ │               │
└───────────┘ └───────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│  M-CORE — 13 файлов, 51 тест                               │
│  Pydantic-схемы, Config, TimeoutManager, MemoryStore,        │
│  LLMRouter, Exceptions, logging_config, json_utils,          │
│  time_utils, Moderation schemas, embedding, метрики           │
└─────────────────────────────────────────────────────────────┘
```

Всего: 49 source-файлов, 41 test-файл, 90 файлов Python, 32 .grace артефакта, 45 UI-файлов (React + TypeScript), Chrome-расширение (MV3): 41 TS source + 21 test-файл.

---

## Отказоустойчивость

### TimeoutManager

Единый интерфейс для всех LLM-вызовов (`call_llm`):

```
call_llm(prompt, timeout_name, call_name, model, max_tokens)
  │
  ├── Circuit Breaker (CB) проверяет состояние
  │     └── OPEN → CircuitBreakerOpenError → немедленный fallback
  │
  ├── Retry × 3 (exponential backoff: 1 с → 2 с → 4 с, max 10 с)
  │     └── Все попытки исчерпаны → fallback chain
  │
  └── Fallback chain (конфигурируется в config.yaml):
        retry_same → shorten_prompt → skip_vision
```

### Circuit Breaker

| Параметр | Значение | Эффект |
|---|---|---|
| `failure_threshold` | 10 | После 10 последовательных ошибок — OPEN |
| `recovery_timeout_sec` | 60 | Через 60 с — HALF-OPEN (пробный запрос) |
| `half_open_max_requests` | 1 | В HALF-OPEN пропускается 1 запрос |

Состояния: `CLOSED` → `OPEN` (после 10 failures) → `HALF-OPEN` (через 60 с) → `CLOSED` (успех) / `OPEN` (снова failure).

### Таймауты по компонентам

| Компонент | Таймаут | Fallback |
|---|---|---|
| Whisper.cpp | 300 с | — (одна попытка) |
| SpeechBrain | 120 с | — (ошибка → пустой speaker) |
| Gemma4:e4b (pass1) | 180 с | retry → shorten_prompt → `fallback_used=llm_failed` |
| Qwen3.5:9b (VLM) | 600 с | retry → skip_vision |
| Genre classifier | 120 с | retry → keyword fallback |
| Qwen3.5:0.8b (frontmatter) | 180 с | retry → fallback frontmatter (unknown) |
| **Pipeline total** | **7200 с** | Обрыв → статус `error` |

### Поведение при отказе LLM

При отказе всех retry для Gemma4:e4b сегмент получает `fallback_used="llm_failed"`. Monetization tags не генерируются — ни rule-based, ни keyword-based. Пустой `monetization=[]`.

### Async subprocess (ffmpeg)

```python
async def _run_ffmpeg(cmd, timeout_sec, log):
    proc = await asyncio.create_subprocess_exec(*cmd, stdout=PIPE, stderr=PIPE)
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout_sec)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise AudioExtractionError(...)
```

Ключевое отличие от `subprocess.run(cmd, timeout=120)`:
- `asyncio.wait_for` можно отменить через `task.cancel()` — pipeline не зависает в `processing`
- При timeout процесс гарантированно убивается (`proc.kill()` + `await proc.wait()`)

---

## Тестирование

### Test suite: 205 pytest + 222 vitest, 0 failures

Покрытие тестов по модулям:

| Модуль | Тестов | Файлы |
|---|---|---|
| M-CORE | 51 | `test_schemas.py`, `test_timeout_manager.py`, `test_time_utils.py`, `test_json_utils.py`, `test_metrics.py`, `test_embedding.py`, `test_store.py`, `test_llm_router.py` |
| M-AUDIO | 60 | `test_pyav_reader.py`, `test_whisper_asr.py`, `test_diarization_speechbrain.py`, `test_timeline_merger.py`, `test_audio_fingerprinter.py` |
| M-VISION | 28 | `test_domain_router.py`, `test_rapid_ocr.py`, `test_ocr_buffer.py` |
| M-SEMANTIC | 12 | `test_llm_client.py`, `test_scene_analyzer.py` |
| M-PASSPORT | 23 | `test_frontmatter_generator.py`, `test_passport_builder.py`, `test_validator.py` |
| M-SEARCH | 8 | `test_indexer.py` (4), `test_searcher.py` (4) |
| M-MIXER | 8 | `test_stage_planner.py` (3), `test_mix_composer.py` (3), `test_mix_to_md.py` (2) |
| M-API | 10 | `test_endpoints.py` (4), `test_routes_search.py` (3), `test_routes_mix.py` (3) |
| M-MODERATOR | 4 | `test_moderator.py` (parse, invalid, empty, flag) |
| M-EXTENSION | 222 (vitest) | `chrome-extension/tests/`: `registry.test.ts`, `bindings.test.ts`, `data.test.ts`, `layout.test.ts`, `markers.test.ts`, `modes.test.ts`, `rutube.test.ts`, `scene-overlay.test.ts`, `game-offer.test.ts`, `game-offer-detect.test.ts`, `travel-offer.test.ts`, `travel-offer-detect.test.ts`, `merch-offer.test.ts`, `merch-offer-detect.test.ts`, `author-tools-generate.test.ts`, `author-tools-render.test.ts`, `author-tools-charts.test.ts`, `studio-autofill.test.ts`, `studio-mapping.test.ts`, `studio-render.test.ts`, `studio-selectors.test.ts`, `studio-referral.test.ts`, `studio-promotion.test.ts` |
| M-UI | 14 (vitest) | `ui/tests/api.test.ts` (9), `ui/tests/proxy.test.ts` (5) |
| Интеграция | 1 | `test_integration.py` |

### Методология

- **Изоляция:** внешние вызовы (Ollama, ffmpeg, Whisper, SpeechBrain) мокаются через `monkeypatch` + `AsyncMock` / `MagicMock`
- **Async тесты:** `@pytest.mark.asyncio` + `asyncio_mode=auto` (pytest-asyncio)
- **Файловый I/O:** временные файлы через `tmp_path` fixture (pytest built-in)
- **Таймауты:** `pytest-timeout` — 120 с на suite

### GRACE Verification

60 verification scenarios, 3 gate levels:

- **Module gate:** `ruff check src/ tests/` + `mypy src/` + `pytest tests/ --timeout=30`
- **Phase gate:** `pytest tests/ --timeout=60` + integration test (3600 с)
- **Release gate:** полный suite + VLM ratio check (<6%) — автоматизирован через `scripts/check_vlm_ratio.py`

```bash
# CI gate: проверка VLM ratio по логам
python scripts/check_vlm_ratio.py < pipeline.log   # exit 0 если <6%
python scripts/check_vlm_ratio.py pipeline.log     # из файла
python scripts/check_vlm_ratio.py < 0.05           # кастомный порог
```

### Тестовые видео

В `tests/fixtures/videos/` — 11 тестовых видео: 6 легаси (85–150 KB) + 5 синтезированных через TTS (`say -v Milena`) + ffmpeg:

| Видео | Длительность | Жанр | Особенность |
|------|-------------|------|-------------|
| `car_repair_guide.mp4` | 61 с | how_to | Сплошной фон, только голос |
| `tech_podcast.mp4` | 58 с | podcast | 2 спикера (pitch-shift) |
| `smartphone_review.mp4` | 37 с | review | Обзор техники |
| `diy_with_text.mp4` | 46 с | diy | OCR-оверлей через PIL+ffmpeg |
| `minecraft_stream.mp4` | 27 с | stream | Тёмный фон, гейминг |

Скрипт генерации: `scripts/generate_test_videos.sh`. Индексация тестовых треков: `scripts/index_test_tracks.py`. Для регенерации всех тестовых видео:
```bash
bash scripts/generate_test_videos.sh
```

Результат E2E-прогона на `diy_with_text`: паспорт `output/diy_with_text.md`, микс `mix_passport.md`, 0 VLM (OCR перекрыл), все 8 сцен проиндексированы в ChromaDB.

---

## Приватность и безопасность

- **Все вычисления локальные.** Никакие данные (видео, аудио, текст) не отправляются во внешние API. Whisper.cpp, Ollama, SpeechBrain, RapidOCR — всё запускается на машине, где развёрнут сервер.
- **Логи не содержат PII.** structlog-логи содержат только `correlation_id` (job_id), метаданные (длительность, количество сцен), тайминги. Сырые аудио/видео данные не логируются.
- **ФЗ-152 «О персональных данных».** Решение не зависит от персональных данных пользователей — все метки монетизации извлекаются из контента (видео + аудиодорожка), а не из профилей.
- **Обработка файлов.** Загруженные видео сохраняются в `/tmp/rutube-jobs/{job_id}` и удаляются при очистке temp-директории. I-frame — временные .jpg, удаляются после завершения всего пайплайна (нужны и для OCR, и для VLM).

---

## Мониторинг

### Логи (structlog JSON)

Каждый job логирует ключевые точки пайплайна:

```json
{"event": "[M-API][PIPELINE][START]", "level": "info", "correlation_id": "a1b2"}
{"event": "[M-AUDIO][PYAV][EXTRACT_DONE]", "path": "/tmp/rutube-audio/test.wav"}
{"event": "[M-AUDIO][WHISPER][DONE]", "segments": 45, "words": 320}
{"event": "[M-VISION][ROUTER][GENRE_DETECTED]", "genre": "how_to"}
{"event": "[M-SEMANTIC][SCENE][ALL_DONE]", "total": 45, "vlm_calls": 2, "vlm_percent": 4.4}
{"event": "[M-API][PIPELINE][DONE]", "duration_sec": 142.5, "scenes": 45, "vlm_pct": 5.2}
{"event": "[M-AUDIO][FINGERPRINT][DONE]", "music_matches": 2, "celebrity_hits": 1}
{"event": "[M-MODERATOR][ASSESS][DONE]", "verdict": "approved", "age_rating": "16+", "flags": 0}
```

81 log-маркер формата `[M-{DOMAIN}][{COMPONENT}][{EVENT}]` во всех source-файлах.

### Prometheus-метрики

| Метрика | Тип | Лейблы |
|---|---|---|---|
| `processing_duration_seconds` | Histogram | — |
| `vlm_calls_total` | Counter | — |
| `scenes_total` | Counter | — |
| `jobs_total` | Counter | `status` (pending/done/error) |
| `jobs_active` | Gauge | — |
| `json_errors_total` | Counter | — |
| `timeouts_total` | Counter | `operation` |
| `fallbacks_total` | Counter | `strategy` |
| `moderation_verdict` | Counter | `verdict` (approved/flagged/rejected) |
| `moderation_flags_count` | Counter | — |
| `moderation_age_rating` | Gauge | — |
| `fingerprint_matches_total` | Counter | — |
| `celebrity_hits_total` | Counter | — |

Endpoints:
- `GET /metrics` — Prometheus scrape endpoint
- `GET /health` — `{"status": "ok"}`

### GRACE Semantic Markup

72 пары `START_BLOCK`/`END_BLOCK` в 49 source-файлах. Каждый блок именован по модулю: `M-AUDIO/PYAV/EXTRACT_AUDIO`, `M-SEMANTIC/QWEN/ANALYZE_TEXT` и т. д. Используется для навигации LLM по коду без чтения всего файла.

---

## Веб-интерфейс (UI)

Полнофункциональный frontend на React 18 + TypeScript + Vite + TailwindCSS для визуализации всех возможностей пайплайна. Работает в двух режимах: **Real** (с бэкендом) и **Demo** (offline, с предзагруженными данными). Отдельный GRACE-модуль **M-UI** (`GD-011-M-UI.xml`) с собственным MODULE_CONTRACT в графе знаний и **14 vitest-тестами** (`ui/tests/api.test.ts`, `ui/tests/proxy.test.ts`) — покрывают DemoApiClient (офлайн-клиент) и HTTP-прокси без моков бэкенда.

### Страницы

| Страница | Маршрут | Назначение |
|---|---|---|
| **Панель управления** | `/` | История джобов, статусы, быстрый загруз видео |
| **Паспорт видео** | `/passport/:jobId` | Таймлайн сцен, монетизация, модерация, метрики, аудио-аналитика |
| **Поиск сцен** | `/search` | Семантический поиск с фильтром по жанру |
| **Подборка (Mix)** | `/mix/:mixId` | Структурированная подборка с этапами и сценами |

### Компоненты

- **Dashboard** — список обработанных видео со статусами, ключевыми метриками. Drag-and-drop загрузка нового видео.
- **Passport Viewer** — таймлайн с monetization-метками, модерация (age rating + flags), метрики пайплайна, музыкальные треки и celebrity recognition.
- **Search** — строка поиска с семантическими результатами, фильтрация по жанру, подсветка monetization-типов.
- **Mix Viewer** — пошаговое отображение видеоподборки с таймкодами и описаниями.
- **Moderation Panel** — вердикт + флаги + brand safety score с цветовой индикацией.
- **Monetization Summary** — сводка по всем типам меток с иконками и tooltip'ами.

### Demo Mode

При запуске без бэкенда UI автоматически использует `DemoApiClient` с 7 паспортами (кинообзор «Эхо Будущего», обзор техники, обзор iPhone от Wylsacom, DIY, кулинарный рецепт, обзор игры Atomic Heart, тревел-влог «Вьетнам: жизнь в Нячанге») и готовым миксом «как выбрать наушники». Переключение между Real/Demo — через контекстное меню в интерфейсе. Никаких зависимостей от API, Ollama, моделей.

### Установка UI

```bash
cd ui
npm install
npm run dev        # http://localhost:5173 (прокси на :8000)
```

Production-сборка:

```bash
cd ui
npm run build      # готовый билд в ui/dist/
```

---

## Chrome-расширение «RUTUBE Замеси» (MV3)

Отдельный продукт-слой (GRACE-модуль **M-EXTENSION**, change C-003): Vanilla TypeScript + Shadow DOM, работает в браузере Chrome на живой странице видео RUTUBE, без изменений Python-бэкенда и React-UI.

**До:** зритель не видит монетизационные возможности ролика — товары, интеграции, клипы живут только в паспорте за кулисами.  
**После:** на странице `rutube.ru/video/*` появляются кликабельные маркеры монетизаций на прогресс-баре, панель текущей сцены и сайдбар аналитики — в 4 режимах.

### Возможности

- **Маркеры монетизаций на прогресс-баре** — точки `AD_SLOT`/`ECOM_ITEM`/`CLIP_CANDIDATE` из паспорта позиционируются по времени сцен; клик перематывает видео (`currentTime + play`).
- **Панель текущей сцены** — по `timeupdate` показывает summary и монетизацию активной сцены поверх плеера.
- **4 режима:** «Зритель» (маркеры + сцена + CTA), «Аналитик» (4 блока: монетизации, модерация, аудио, метрики), «Симуляция» (анимированный разбор ASR → сцены → метки) и «Автор» (A/B-варианты заголовков/описаний + прогнозные метрики). Полноширинная модалка (`expand`) с таббаром всех 4 режимов.
- **Инструменты автора** (`authorTools/`) — генератор A/B-вариантов заголовков и описаний (детерминированный PRNG из паспорта + курируемые варианты для 7 известных паспортов), прогнозные метрики эффективности, SVG-графики retention/монетизации/почасовой активности (NFR-7, без сети).
- **Привязка паспорта к видео** — ручной выбор в попапе + автоподбор по keywords заголовка + регистрация по `video_id` в реестре; при отсутствии совпадений — дефолтный паспорт (`getDefaultPassport()`). В реестре 10 демо-паспортов, включая `atomic_heart_review` (game_review, boundVideoId `aceaa503bdb8c200278f94dd3deaf7f5`), `vietnam_nha_trang` (travel_vlog, boundVideoId `7130901c1c9147f239190def16eb741c`) и 3 вело-паспорта (`bike_dont_buy`/`bike_top_april`/`bike_mtb_80k`).
- **Микс-блок на странице поиска** (`bikeSearch/`) — на `/search/*` с вело-запросом встраивается карточка «Замеси: Велосипеды»: 3 видео-карточки со скриншотами (открытие в новой вкладке) + «Товары из подборки»; ниже степпер «Путь зрителя» — 3 ступени (Новичок/Продвинутый/Профи) с кликабельными тайм-кодами `?start=` из разных видео (NFR-7).
- **Игровой оффер-блок** (`gameOffer/`) — на игровых видео после `section[aria-label="информация о видео"]` встраивается карточка с обложкой игры и кнопками VK Play / VK Play Cloud / Yandex Play.
- **Тревел-оффер-блок** (`travelOffer/`) — на тревел-видео встраивается карточка «Билеты {Краснодар} → {направление}» (авиабилеты, туры, отели, экскурсии); направление извлекается из заголовка.
- **МЕРЧ-оффер-блок** (`merchOffer/`) — на видео с метками `ecom_item`/`artist_merch` встраивается карточка «товары из видео + мерч канала + магазины» (до 6 плиток товаров с иконками, чипы магазинов из карты `MERCH_STORE_BY_BRAND`); бренд — из `celebrity_voice` (для видео Wylsacom — мерч «Царские стёкла»).
- **AI-ассистент для редактора RUTUBE Studio** (`studio/`) — второй content-script на `studio.rutube.ru/*`: поллинг-детект модалки video-editor, автоподбор паспорта по video_id/заголовку и Shadow DOM-панель, которая **заполняет все поля публикации одним кликом** — заголовок (A/B), описание с тайм-кодами сцен, категория (domain_type → раздел RUTUBE), плейлисты, время публикации, 18+, комментарии. React-safe запись через нативный setter прототипа + `input`/`change` события. Сворачивание в пилюлю, перетаскивание с сохранением позиции, toast-фидбек.
- **Shadow DOM-изоляция** — каскад фолбэков селекторов плеера, ноль конфликтов с CSS RUTUBE, ноль layout-shift (NFR-6).
- **Privacy by design** — демо-данные локально, ноль внешних запросов в демо-режимах (NFR-7).

### Архитектура

```
rutube.ru/video/* (content-script, document_idle)
   │ parseVideoId(video_id)
   ▼
resolveBinding(videoId, title) ── manual (popup) / auto (keywords) / registry (video_id)
   │
   ▼
DataProvider.load(videoId) ── DemoDataProvider (7 локальных паспортов .json)
   │                          RealDataProvider (stub → future POST /analyze)
   ▼
mountHost() → Shadow DOM → ModesController
   ├─ viewer:      markers + sceneOverlay + CTA
   ├─ analyst:     sidebar (монетизации/модерация/аудио/метрики)
   ├─ simulation:  анимированный разбор → переход в analyst
   └─ author:      A/B-варианты заголовков + прогнозные метрики + SVG-графики
   └─ expand:      полноширинная модалка с таббаром всех 4 режимов

studio.rutube.ru/* (content-script, document_idle)
   │ poll(500ms): findStudioModal([data-testid="video-editor-layout"])
   ▼
captureStudioForm() → resolveStudioPassport(video_id, title) → buildStudioSuggestions()
   ▼
mountStudioPanel() → Shadow DOM «AI для редактора RUTUBE Studio»
   ├─ заполнение всех полей: заголовок A/B, описание+тайм-коды, категория, плейлисты,
   │                        время публикации, 18+, комментарии (React-safe setters)
   └─ сворачивание в пилюлю / перетаскивание / toast (позиция в localStorage)
```

Контракт `DataProvider` в `src/content/data/provider.ts` уже готов под реальный FastAPI: для живой аналитики достаточно реализовать `load(videoId)` как `POST {API}/analyze` — бэкенд и `ui/` не меняются.

### Установка и тесты

```bash
cd chrome-extension
npm install
npm run build   # dist/{content,popup,background,studio}.js + manifest.json
npm test        # vitest: 222 теста, 26 файлов
```

**Load unpacked:** `chrome://extensions` → «Режим разработчика» → «Загрузить распакованное» → `chrome-extension/dist/` → открыть [референсное видео](https://rutube.ru/video/2013f4eba6ade7b01582fb411f9e901a) и выбрать сценарий в попапе.

Content-script — 113 kB (gzip ~27 kB), единственное permission — `storage`.

---

## Установка

### Требования

- Python 3.13+
- Node.js 18+ (для Web UI и Chrome-расширения «RUTUBE Замеси»)
- [Ollama](https://ollama.com) с моделями:
  - `gemma4:e4b` (text analysis, stage planner)
  - `qwen3.5:9b` (vision)
  - `qwen3.5:0.8b` (genre classifier)
  - `qwen3-embedding:0.6b` (semantic search embeddings)
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) с моделью `large-v3`
- ffmpeg (7+)

### Установка

```bash
git clone <repo>
cd rutube-video-analyzer

# виртуальное окружение
python3 -m venv .venv
source .venv/bin/activate

# установка
pip install -e .
pip install -e ".[dev]"
```

### Конфигурация

`config.yaml` — все таймауты, ретраи, пути к моделям, жанры.

> **Note:** Если используете облачных провайдеров (YandexGPT, Cloud.ru, OpenRouter), создайте `.env` с API-ключами:
> ```bash
> export YANDEX_API_KEY="your-key"
> export CLOUDRU_API_KEY="your-key"
> export OPENROUTER_API_KEY="your-key"
> ```
> Переменные `${VAR}` в `config.yaml` подставляются автоматически.

Ключевые параметры:

```yaml
models:
  default_params:          # temperature 0.1, top_p 0.9, max_tokens 4096
    temperature: 0.1
    max_tokens: 4096
  providers:               # ollama (локально) + облачные OpenAI-совместимые
    ollama:
      type: ollama
      endpoint: "http://localhost:11434"
    yandex:                # type: openai → YandexGPT (YANDEX_API_KEY)
    cloudru:               # Cloud.ru (CLOUDRU_API_KEY)
    openrouter:            # OpenRouter (OPENROUTER_API_KEY)
  routing:                 # каждая роль = список провайдеров с приоритетом
    text_model:       [{ provider: ollama,   model: gemma4:e4b }, { provider: yandex, model: yandexgpt }]
    vision_model:     [{ provider: ollama,   model: qwen3.5:9b }, { provider: openrouter, model: openai/gpt-4o-mini }]
    classifier_model: [{ provider: ollama,   model: qwen3.5:0.8b }]
    mixer_model:      [{ provider: ollama,   model: gemma4:e4b }]
    moderation_model: [{ provider: ollama,   model: gemma4:e4b }]
    embedding_model:  [{ provider: ollama,   model: qwen3-embedding:0.6b }]
```

> Виртуальные параметры VLM (`vision_max_tokens: 8192`, `vision_max_image_bytes: 2097152`, `classifier_max_tokens: 8192`) считываются из `models.ollama.*` и имеют разумные дефолты в `src/core/config.py`, если блок не задан явно.

---

## Быстрый старт

```bash
uvicorn src.api.app:app --reload --port 8000
```

Загрузить видео:
```bash
curl -X POST -F "file=@video.mp4" http://localhost:8000/analyze
# → {"job_id": "a1b2c3d4"}
```

Проверить статус:
```bash
curl http://localhost:8000/analyze/a1b2c3d4
curl http://localhost:8000/analyze/a1b2c3d4/status
```

Получить .md паспорт:
```bash
curl http://localhost:8000/analyze/a1b2c3d4/markdown
```

Семантический поиск:
```bash
curl "http://localhost:8000/search/?q=ключ+на+13&top_k=5"
# → [{"video_id": "repair_guide_01", "scene_index": 1, "summary": "...", "score": 0.12}]
```

Создать видеоподборку (mix):
```bash
curl -X POST http://localhost:8000/mix/ \
  -H "Content-Type: application/json" \
  -d '{"query": "замена генератора на ВАЗ", "max_videos_per_stage": 3}'
# → {"mix_id": "a1b2c3d4"}
```

Получить подборку в Markdown:
```bash
curl http://localhost:8000/mix/a1b2c3d4/markdown
```

Prometheus метрики:
```bash
curl http://localhost:8000/metrics
```

Веб-интерфейс (требует запущенного бэкенда):
```bash
cd ui && npm install && npm run dev
# → http://localhost:5173 (Dashboard, Search, Mix, Passport Viewer)
```

По умолчанию UI запускается в **Demo Mode** — с предзагруженными данными, без бэкенда. Переключение в режим Real — через кнопку в интерфейсе.

Chrome-расширение «RUTUBE Замеси» (независимо от бэкенда):
```bash
cd chrome-extension && npm install && npm test   # vitest: 222 теста
npm run build    # dist/ → «Загрузить распакованное» в chrome://extensions
```

---

## API

### `POST /analyze`

Загружает видеофайл, создаёт job и запускает фоновый пайплайн.

- Request: `multipart/form-data`, поле `file`
- Response: `{"job_id": "str"}` (8 символов)
- Status: `pending`

### `GET /analyze/{job_id}`

Полный результат обработки.

```json
{
  "job_id": "str",
  "status": "pending|processing|done|error",
  "passport": { ... } | null,
  "metrics": {
    "video_duration_sec": 0.0,
    "processing_time_sec": 0.0,
    "total_scenes": 0,
    "vlm_calls": 0,
    "vlm_percent": 0.0,
    "ad_slots": 0,
    "ecom_items": 0,
    "clip_candidates": 0,
    "music_tracks": 0,
    "event_tickets": 0,
    "celebrity_hits": 0,
    "fingerprint_matches": 0,
    "fallbacks_used": 0,
        "moderation_verdict": "approved",
    "moderation_age_rating": "0+",
    "moderation_flags_count": 0
  },
  "error": "str | null"
}
```

### `GET /analyze/{job_id}/status`

Краткий статус (без passport).

### `GET /analyze/{job_id}/markdown`

Markdown-текст паспорта. Content-Type: `text/markdown`.

### `GET /health`

Healthcheck. Response: `{"status": "ok", "service": "rutube-video-analyzer"}`

### `GET /metrics`

Prometheus endpoint. Content-Type: `text/plain; version=0.0.4`.

---

### `GET /search`

Семантический поиск сцен по текстовому запросу. Позволяет найти все сцены с `AD_SLOT` для рекламного размещения, `ECOM_ITEM` для каталога товаров или `CLIP_CANDIDATE` для виральных клипов — без ручного пересмотра видео.

- Query params: `q` (str, обязательный), `top_k` (int, default 20), `genre` (str, опциональный фильтр)
- Response: `list[SearchResult]`, сортировка по убыванию косинусной близости

```json
[
  {
    "video_id": "repair_guide_01",
    "scene_index": 1,
    "start_sec": 15.0,
    "end_sec": 45.0,
    "summary": "Откручивание верхней гайки генератора",
    "speaker": "SPEAKER_00",
    "text": "документ чанка",
    "genre": "how_to",
    "monetization_types": ["ecom_item"],
    "score": 0.12
  }
]
```

### `POST /search/reindex`

Переиндексация всех `.md` паспортов из директории `passport.output_dir` в ChromaDB.

- Response: `{"status": "ok", "indexed": 5}`

---

### `POST /mix`

Создание структурированной видеоподборки (микса) по текстовому запросу. Каждая подборка — готовый монетизируемый плейлист: этапы со сценами, содержащими `AD_SLOT`, `ECOM_ITEM` или `CLIP_CANDIDATE`. Фоновый pipeline.

- Request body: `{"query": "str" (min 3 символа), "max_videos_per_stage": 3 (1-10)}`
- Response: `{"mix_id": "str"}`
- Статус: фоновый запуск (результат доступен через несколько секунд)

### `GET /mix/{mix_id}`

Результат подборки.

```json
{
  "mix_id": "a1b2c3d4",
  "query": "замена генератора",
  "stages": [
    {
      "title": "Подготовка",
      "description": "Собери инструменты",
      "scenes": [
        {
          "video_id": "repair_guide_01",
          "scene_index": 0,
          "start_sec": 0.0,
          "end_sec": 15.0,
          "summary": "Снятие клеммы аккумулятора",
          "speaker": "SPEAKER_00",
          "text": "Первым делом снимаем минусовую клемму"
        }
      ]
    }
  ],
  "total_duration_sec": 15.0
}
```

### `GET /mix/{mix_id}/markdown`

Markdown-текст подборки. Content-Type: `text/markdown`.

---

## Примеры результатов

### Пример 1: How-to (ремонт автомобиля)

> Упрощённая иллюстрация основных полей. Полная структура реального паспорта (модерация с evidence, word-таймкоды, аудио, мерч, события) — в [Примере 6](#пример-6-полный-реальный-паспорт--какой-iphone-выбрать-за-50-000--wylsacom).

Вход: 5-минутное видео «Замена генератора на ВАЗ-2110».  
Выход: паспорт с 4 сценами, 2 `ECOM_ITEM`, 1 `AD_SLOT`, 1 `CLIP_CANDIDATE`.

```markdown
---
video_id: "repair_guide_01"
domain_type: how_to
brand_safety_score: 95
target_audience: ["diy", "ремонт", "авто"]
seo_title: "Замена генератора на ВАЗ-2110 — пошаговая инструкция"
seo_tags: ["ремонт", "авто", "ВАЗ", "генератор"]
trending_cluster: "авторемонт"
auto_playlists: []
ad_targeting_keywords: ["генератор", "автозапчасти", "инструмент"]
---

# Таймлайн и монетизация

## [00:00 - 00:15] Снятие клеммы аккумулятора
* **Спикер:** SPEAKER_00
* **ASR Context:** "Первым делом снимаем минусовую клемму аккумулятора"

## [00:15 - 00:45] Откручивание верхней гайки генератора
* **Спикер:** SPEAKER_00
* **ASR Context:** "Берём рожковый ключ на 13 и откручиваем верхнюю гайку крепления"
* **[ECOM_ITEM]** — Поисковый запрос: "рожковый ключ на 13"
  * Уверенность: 85%

## [00:45 - 02:30] Демонтаж старого генератора
* **Спикер:** SPEAKER_00
* **ASR Context:** "Откручиваем нижний болт крепления и снимаем старый генератор"

## [02:30 - 04:00] Установка нового генератора
* **Спикер:** SPEAKER_00
* **ASR Context:** "Перед установкой проверьте совместимость по каталогу"
* **[ECOM_ITEM]** — Поисковый запрос: "генератор ВАЗ-2110"
  * Уверенность: 92%
* **[AD_SLOT]** — Таргетинг: "автозапчасти генератор"
  * Контекст: замена вышедшего из строя генератора
* **[CLIP_CANDIDATE: 00:15 - 00:45]**
  * Хук: Какой ключ нужен для генератора ВАЗ
  * Виральный потенциал: medium

---

```

### Пример 2: Подкаст / интервью

> Упрощённая иллюстрация. Полная структура реального паспорта — в [Примере 6](#пример-6-полный-реальный-паспорт--какой-iphone-выбрать-за-50-000--wylsacom).

Вход: 10-минутный выпуск подкаста «Технологии будущего».  
Выход: паспорт с 6 сценами, 2 `AD_SLOT` (контекстная реклама), без `ECOM_ITEM` и `CLIP_CANDIDATE`.  
VLM не вызывался — `vision_blocked=true` для жанра podcast.

```markdown
---
video_id: "tech_podcast_42"
domain_type: podcast
brand_safety_score: 100
target_audience: ["technology", "it", "startups"]
seo_title: "Технологии будущего — выпуск 42: нейросети в медицине"
seo_tags: ["подкаст", "технологии", "нейросети", "медицина"]
trending_cluster: "tech"
auto_playlists: []
ad_targeting_keywords: ["нейросети", "AI", "медицинские технологии"]
---

# Таймлайн и монетизация

## [00:00 - 01:30] Введение: о чём сегодня поговорим
* **Спикер:** SPEAKER_00
* **ASR Context:** "В этом выпуске разберём, как нейросети меняют диагностику заболеваний"

## [01:30 - 04:00] Интервью с главным врачом клиники
* **Спикер:** SPEAKER_01
* **ASR Context:** "Мы внедрили ИИ-диагностику в прошлом году и получили прирост точности на 30%"
* **[AD_SLOT]** — Таргетинг: "медицинские ИИ-решения"
  * Контекст: обсуждение практического использования AI в диагностике

## [04:00 - 06:30] Как обучают нейросеть на медицинских данных
* **Спикер:** SPEAKER_00
* **ASR Context:** "Основная проблема — размеченные данные. Их сбор занимает до 80% времени проекта"

## [06:30 - 08:00] Примеры из практики: успешные кейсы
* **Спикер:** SPEAKER_01
* **ASR Context:** "Один из наших проектов — ранняя диагностика рака лёгких по снимкам КТ"
* **[AD_SLOT]** — Таргетинг: "облачные решения для медицины"
  * Контекст: обсуждение ИТ-инфраструктуры для медицинских AI-продуктов

## [08:00 - 09:30] Ограничения и риски
* **Спикер:** SPEAKER_00
* **ASR Context:** "Регуляторика в медицине — один из главных тормозов внедрения AI"

## [09:30 - 10:00] Заключение и анонс следующего выпуска
* **Спикер:** SPEAKER_01
* **ASR Context:** "В следующем выпуске обсудим AI в образовании. Спасибо, что слушаете!"

---
```

---

### Пример 3: Результат семантического поиска

Поисковый запрос: `"рожковый ключ на 13"` — возвращает все сцены, где упоминается этот товар, с указанием монетизационного потенциала.

```json
[
  {
    "video_id": "repair_guide_01",
    "scene_index": 1,
    "start_sec": 15.0,
    "end_sec": 45.0,
    "summary": "Откручивание верхней гайки генератора",
    "speaker": "SPEAKER_00",
    "text": "Берём рожковый ключ на 13 и откручиваем верхнюю гайку крепления",
    "genre": "how_to",
    "monetization_types": ["ecom_item"],
    "score": 0.32
  },
  {
    "video_id": "garage_tips_07",
    "scene_index": 3,
    "start_sec": 120.0,
    "end_sec": 150.0,
    "summary": "Как выбрать рожковый ключ",
    "speaker": "SPEAKER_00",
    "text": "Рожковый ключ на 13 — самый ходовой размер в авторемонте",
    "genre": "how_to",
    "monetization_types": ["ecom_item", "ad_slot"],
    "score": 0.28
  }
]
```

Поле `monetization_types` позволяет сразу определить коммерческую ценность каждой сцены: `ecom_item` → товар для каталога, `ad_slot` → контекст для рекламы.

---

### Пример 4: Markdown-подборка Mixer

Запрос: `"замена генератора на ВАЗ"` → Mixer создал 3-этапную подборку, готовую к публикации.

```markdown
# Замена генератора на ВАЗ

## Этап 1: Подготовка и инструменты
*Источник: repair_guide_01 (00:00-00:15)*
> Первым делом снимаем минусовую клемму аккумулятора
* **[ECOM_ITEM]** — рожковый ключ на 13

## Этап 2: Демонтаж старого генератора
*Источник: repair_guide_01 (00:45-02:30)*
> Откручиваем нижний болт крепления и снимаем старый генератор
* **[AD_SLOT]** — контекст: запчасти для отечественных авто

## Этап 3: Установка нового генератора
*Источник: repair_guide_01 (02:30-04:00)*
> Перед установкой проверьте совместимость по каталогу
* **[ECOM_ITEM]** — генератор ВАЗ-2110
* **[AD_SLOT]** — таргетинг: автозапчасти генератор
```

Каждый этап — готовая монетизационная единица: товар (ECOM_ITEM) или рекламное место (AD_SLOT).

---

### Пример 5: Реальный E2E-паспорт (diy_with_text)

Видео `diy_with_text.mp4` (46 с, diy с OCR-слоем) → паспорт в `output/diy_with_text.md`:

```
Video: diy_with_text.mp4 (46.0s, diy)
Frontmatter:
  creator: RUTUBE Video Analyzer
  genre: diy
  speakers: 1
  language: ru
  duration_sec: 46.0
  moderation:
    age_rating: 0+
    verdict: approved
    categories_flagged: []
    flags_count: 0
    summary: "DIY content, no restricted material"

Scene breakdown (8 scenes):
  [scene_01] 00.0-06.4s — требуется клей ПВА
  [scene_02] 06.4-12.8s — нарезать ...
  [scene_03] 12.8-19.2s — намазываем ...
  [scene_04] 19.2-25.6s — кладём ...
  [scene_05] 25.6-32.0s — приклеиваем ...
  [scene_06] 32.0-38.4s — загибаем ...
  [scene_07] 38.4-44.8s — нужна фотография ...
  [scene_08] 44.8-50.0s — фоторамка ...

Monetization:
  AD_SLOT — 6 placements (супер клей, строительный магазин, зоотовары, канцелярия, фототовары, рынок подарков)
  ECOM_ITEM — 6 items (клей ПВА, фотобумага, картон, декор, фоторамка, подарочный набор)
  CLIP_CANDIDATE — 2 clips (финальный результат, подбор материалов)

VLM ratio: 0% — OCR на I-frame покрыл весь текст. 0 VLM calls из 8 сцен.
```

Mixer на запрос `"фоторамка из картона своими руками"` → 4 этапа, 7 сцен. Markdown в `mix_passport.md`. Статус проверяется через `GET /mix/{id}` → пока stages пустой — ещё не готов.

---

### Пример 6: Полный реальный паспорт — «Какой iPhone выбрать за 50 000 ₽» (Wylsacom)

Это примеры 1–2 в упрощённом виде не передают **полноту** паспорта. Реальный паспорт (`chrome-extension/src/data/passports/iphone_50k_wylsacom.json`, 985 c, 15 сцен) содержит **все шесть типов монетизации**, модерацию с флагами-доказательствами по тайм-кодам, по-словную транскрипцию, аудио-матчи и распознавание ведущего:

```json
{
  "frontmatter": {
    "video_id": "Rv_iphone_50k_wylsacom_001",
    "domain_type": "tech_review",
    "brand_safety_score": 84,
    "target_audience": ["покупатели смартфонов", "фанаты Apple", "гики", "подписчики Wylsacom"],
    "seo_title": "Какой iPhone выбрать за 50 000 рублей в 2026 — сравнение iPhone 15, 16e, 16 и 17e",
    "seo_tags": ["iPhone за 50000", "iPhone 16", "iPhone 17e", "дешёвый iPhone 2026", "Wylsacom"],
    "trending_cluster": "tech/gadgets/phones",
    "auto_playlists": [
      { "id": "iphone_2026", "order_index": 0, "reason": "прямое попадание в тематику iPhone 2026" },
      { "id": "best_of_tech", "order_index": 1, "reason": "детальный разбор четырёх актуальных моделей" }
    ],
    "ad_targeting_keywords": ["iPhone 15", "iPhone 16e", "iPhone 17e", "купить iPhone", "защитное стекло 3D", "iCloud Plus", "маркетплейс смартфоны"],
    "moderation": {
      "age_rating": "16+",
      "verdict": "approved",
      "categories_flagged": ["language", "scam_warning"],
      "flags": [
        { "category": "language", "severity": "medium", "timestamp_sec": 743,
          "evidence": "нецензурная лексика при обсуждении отсутствия MagSafe в iPhone 16e ('ублюдочное решение')" },
        { "category": "scam_warning", "severity": "medium", "timestamp_sec": 965,
          "evidence": "история про подделку iPhone 10R в корпусе iPhone Air за 25 000–26 000 ₽ на Авито" }
      ],
      "brand_safety_score": 84,
      "summary": "Видео допущено к рекламе. Есть нецензурная лексика (16+), защитное предупреждение о мошенниках. Контент без алкоголя и политики; партнёр bigbig.ru и мерч канала представлены позитивно."
    }
  },
  "timeline": [
    {
      "scene_summary": "Интро: самый дешёвый iPhone за 50 000 ₽; скриншот из Telegram с iPhone 17 Pro Max за 8 000 ₽ и предупреждение 'так делать не надо'",
      "start_sec": 0, "end_sec": 60,
      "monetization": [
        { "type": "clip_candidate", "search_query": "самый дешёвый iPhone 2026", "reason": "hook с интригой про цену", "confidence": 0.9,
          "hook": "iPhone 17 Pro Max за 8 000 рублей? Так делать не надо!", "time_range_start": 0, "time_range_end": 34, "virality_potential": "high" },
        { "type": "ad_slot", "search_query": null, "reason": "pre-roll в самом начале ролика", "confidence": 0.86 }
      ]
    },
    {
      "scene_summary": "Интегрированная реклама мерча: матовое 3D-стекло 'Царское стекло' от Wylsacom",
      "start_sec": 336, "end_sec": 400,
      "monetization": [
        { "type": "artist_merch", "search_query": "царское стекло Wylsacom 3D", "reason": "собственный мерч канала", "confidence": 0.98 },
        { "type": "ecom_item", "search_query": "3D стекло Дядя Валли iPhone 17 Pro", "reason": "прямая продажа товара", "confidence": 0.93 },
        { "type": "ad_slot", "search_query": null, "reason": "полноценный рекламный интеграционный блок мерча", "confidence": 0.88 }
      ]
    },
    {
      "scene_summary": "Анонс розыгрыша: совместно с bigbig.ru разыгрывают iPhone 16",
      "start_sec": 895, "end_sec": 940,
      "monetization": [
        { "type": "event_ticket", "search_query": "розыгрыш iPhone 16", "reason": "конкурс с призом — привлечение аудитории", "confidence": 0.92 },
        { "type": "ad_slot", "search_query": null, "reason": "партнёрский промо-блок bigbig.ru", "confidence": 0.85 }
      ]
    }
  ],
  "raw_timeline_segments": [
    { "speaker": "Ведущий", "start_sec": 0, "end_sec": 9,
      "text": "Народ, всем привет. С вами Wylsacom. Меня часто спрашивают, как купить самый дешёвый iPhone.",
      "word_timestamps": [
        { "word": "Народ,", "start_sec": 0, "end_sec": 1 },
        { "word": "всем", "start_sec": 1, "end_sec": 1.6 },
        { "word": "привет.", "start_sec": 1.6, "end_sec": 2.2 }
      ] }
  ],
  "audio_matches": [
    { "track_name": "Royalty-Free Background Beat", "artist": "Epidemic Sound", "confidence": 0.55, "genre": "Electronic / Lo-fi" },
    { "track_name": "Cinematic Outro Stinger", "artist": "Artlist", "confidence": 0.5, "genre": "Cinematic / Ambient" }
  ],
  "celebrity_voice": { "name": "Wylsacom (Валентин Петухов)", "profession": "техноблогер", "confidence": 0.96 }
}
```

**Что делает паспорт по-настоящему полным (в отличие от упрощённых примеров 1–2):**

- **Шесть типов монетизации на одной сцене** — `ecom_item`, `ad_slot`, `clip_candidate`, `artist_merch`, `event_ticket`, `music_track`; каждый с `search_query` (готовый запрос для партнёрской ссылки), `reason` и `confidence`. Итого по паспорту: 11 `ecom_item`, 4 `ad_slot`, 6 `clip_candidate`, 3 `artist_merch`, 1 `event_ticket`, 2 `music_track`.
- **Модерация с доказательствами** — возрастной рейтинг, вердикт, `categories_flagged`, и каждый флаг с `timestamp_sec` + дословным `evidence` из транскрипции («ублюдочное решение» на 743 с). Не просто «18+», а *почему* и *где именно*.
- **По-словная транскрипция** (`word_timestamps`) — каждое слово с тайм-кодом; из неё собираются готовые тайм-коды описания и точные цитаты для evidence.
- **Аудио-аналитика** — `audio_matches` (фоновая музыка с жанром и уверенностью) и `celebrity_voice` (распознан Wylsacom, 0.96) → привязка мерча и партнёрских магазинов к каналу.
- **Готовая SEO-обвязка** — `seo_title`, `seo_tags`, `trending_cluster`, `ad_targeting_keywords`, `auto_playlists` с причинами.

Именно эта многослойность превращает видео в **полноценный asset для монетизации**: расширение «Замеси» из него строит оффер-блоки, маркеры на плеере и A/B-заголовки, а AI-ассистент Studio — готовый черновик публикации.

---

## Интеграция с RUTUBE

RUTUBE Video Analyzer спроектирован как middleware между видеозагрузкой и рекомендательной системой RUTUBE:

```
Video Upload → [Analyzer] → .md passport (метрики монетизации)
                                  ↓
                    Semantic Search (VideoRAG) → programmatic AD placement
                                  ↓
                    Mixer (Замеси) → готовые плейлисты → рекомендации RUTUBE
                                  ↓
                    Moderation (LLM-as-Judge) → age_rating + content flags
```

Каждый выходной паспорт содержит `ad_targeting_keywords`, `seo_title`, `trending_cluster`, `brand_safety_score` — поля, готовые для передачи в RUTUBE API без дополнительной обработки.

---

## План развития

### ✅ Реализовано

1. ✅ **Семантический поиск (VideoRAG)** — ChromaDB + qwen3-embedding (реализовано)
2. ✅ **Mixer (Замеси)** — multi-video подборки через LLM (реализовано)
3. ✅ **Audio Fingerprinting** — музыкaльные треки + celebrity recognition (реализовано)
4. ✅ **LLM-as-Judge модерация** — 9 категорий флагов, age rating 0+–18+ (реализовано)
5. ✅ **Мультипровайдерный LLMRouter** — Ollama + YandexGPT + Cloud.ru + OpenRouter (реализовано)
6. ✅ **205 pytest + 222 vitest**, 60 verification scenarios, GRACE-верификация (реализовано)
7. ✅ **Web UI (React + Vite + TailwindCSS)** — панель управления, паспорт, поиск, миксы (реализовано)
8. ✅ **Demo Mode** — полная offline-демонстрация без бэкенда (реализовано)
9. ✅ **SSE / EventSource** — live-уведомления об изменении статуса (реализовано)
10. ✅ **Двойной формат экспорта: .md + .json** — паспорта сохраняются в обоих форматах (реализовано)
11. ✅ **Автоиндексация в ChromaDB** — паспорт индексируется сразу после сборки (реализовано)
12. ✅ **Строгий режим валидации** — `strict=True` для CI-гейтов (реализовано)
13. ✅ **FingerprintDB + index_track()** — персистентное хранилище аудиоотпечатков, CLI-индексация (реализовано)
14. ✅ **Chrome-расширение «RUTUBE Замеси»** — MV3 + Shadow DOM + Vitest (222 теста, 26 файлов, 10 демо-паспортов), GRACE-модуль M-EXTENSION, change C-003 (реализовано)
15. ✅ **LLM fallback chain** — приоритетный список провайдеров на каждую роль, автоматический fallback при отказе primary (реализовано)
16. ✅ **Инструменты автора (A/B-тестирование контента)** — 4-й режим расширения: генератор вариантов заголовков/описаний + прогнозные метрики + SVG-графики, полноширинная модалка (реализовано)
17. ✅ **Vitest-тесты M-UI** — 14 тестов для Web UI (DemoApiClient + HTTP-прокси), GRACE-верификация V-M-UI (реализовано)
18. ✅ **AI-ассистент для редактора RUTUBE Studio** — второй content-script расширения: автоподбор паспорта и автозаполнение всех полей публикации (заголовок A/B, описание с тайм-кодами, категория, плейлисты, время, 18+, комментарии) React-safe, 41 vitest-тест (реализовано)
19. ✅ **Реферальный блок монетизации в Studio** — товары из паспорта → партнёрские ссылки на Яндекс Маркет / AliExpress / Admitad (формат реальных API из ТЗ) + детерминированный прогноз дохода: 4 KPI, donut распределения, карточки товаров с табами магазинов, «Копировать все» / «Вставить блок в описание» / «Экспорт CSV» (12 vitest-тестов, реализовано)
20. ✅ **Продвижение видео в Studio** — вкладка «🚀 Продвижение»: из паспорта генерируются объявления для Яндекс Директ / VK Реклама / MyTarget (в формате их API), превью видеокреатива, варианты креативов, бюджет-слайдер с рекомендацией из паспорта и live-прогнозом, таргетинг-чипы, UTM, «Копировать все» / CSV / JSON / «Отправить (демо)» (12 vitest-тестов, реализовано)

### В разработке

21. **Интеграционное тестирование** — видео уже в `tests/fixtures/videos/` (diy_with_text, 46 с), запустить `pytest tests/test_integration.py --timeout=7200`
22. **GPU-акселерация** — Ollama через CUDA/Metal снижает стоимость до <$0.0025/ч (NFR-2)
23. **MLOps pipeline** — дообучение genre classifier на размеченных данных RUTUBE, CI/CD для тестов и развёртывания
24. **Событийные метрики** — интеграция с clickstream для A/B-теста влияния AD_SLOT/ECOM_ITEM на ARPU
25. **Бенчмарки производительности** — `.benchmarks/` директория готова, наполнение метриками времени и стоимости по каждому релизу
26. **Развёртывание API-эндпоинтов UI (`/api/v1/jobs`, `/api/v1/jobs/{id}/passport`, `/api/v1/jobs/{id}/metrics` и др.)** — сейчас RealApiClient спроектирован, но эндпоинты на бэкенде не реализованы. UI работает через DemoApiClient
27. **Редактор паспортов** — возможность ручного редактирования монетизационных меток через UI
28. **Реальный DataProvider расширения** — коннект `RealDataProvider` к FastAPI `/analyze` (контракт готов)

---

## Документы и материалы (для судей и заказчиков)

Сопутствующие материалы лежат рядом с проектом, в `../my/`:

- `../my/RUTUBE техническое задание от судей.md` — оригинальное ТЗ конкурса: 5 критериев оценивания (верифицированное влияние на метрики монетизации, юнит-экономика с P&L, воспроизводимость, чувствительные данные, production-готовность). Каждый критерий закрыт разделом выше.
- `../my/RUTUBE моя презентация проекта Замеси.md` — презентация проекта, сценарии использования.
- `../my/monetization-all-variants.md` — полный разбор вариантов монетизации и расчёты юнит-экономики (база таблиц «Экономическая эффективность»).
- `../my/Расчет затрат на Видео Паспорт на основе AI Studio.xlsx` — замеры стоимости генерации паспорта в Яндекс AI Studio (DeepSeek 4 Flash / Alisa AI, ~5.73 ₽/паспорт).
- `../my/weekly-review-*.md` — еженедельные обзоры прогресса (ретроспектива принятых архитектурных решений).

---

*GRACE 4-governed project: 32 `.grace` артефакта, 11 MODULE_CONTRACT, 72 semantic block pairs, 60 verification scenarios, 3 gate levels (module → phase → release). Код: `src/core/`, `src/api/`, `src/audio_engine/`, `src/vision_scanner/`, `src/semantic_analyzer/`, `src/passport_builder/`, `src/search/`, `src/mixer/`, `src/moderator/`, `chrome-extension/` (M-EXTENSION), `ui/` (M-UI). GRACE-артефакты: `.grace/context/`, `.grace/graph/`, `.grace/verification/`, `.grace/changes/`. Результаты: `output/diy_with_text.md`, `mix_passport.md`, `scripts/generate_test_videos.sh`.*

*Обновлено: 205 pytest + 222 vitest (M-EXTENSION) + 14 vitest (M-UI) = 441 тест, 10 демо-паспортов, режим «Автор» с A/B-тестированием контента, оффер-блоки (игры/тревел/мерч), AI-ассистент для редактора RUTUBE Studio, микс-блок «Велосипеды» на странице поиска + степпер «Путь зрителя», 3 вело-паспорта и промты для Яндекс AI Studio, сценарий Яндекс AI Studio в юнит-экономике (~$0.18/ч, ~0.26 ₽/мин).*
