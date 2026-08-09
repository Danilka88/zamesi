# RUTUBE Замеси — Chrome-расширение

**Chrome MV3 (Vanilla TS + Shadow DOM):** [страница видео RUTUBE](https://rutube.ru/video/*) → **[демо-панели монетизаций, модерации, аудио и метрик](chrome-extension://popup.html)** прямо на плеере, без изменения Python-бэкенда и React-UI.

> Демо-слой анализатора видео «RUTUBE Замеси» (GRACE-модуль M-EXTENSION, change C-003).

---

**До:** зритель не видит монетизационные возможности ролика — интеграции, товары, клипы живут только в паспорте анализатора за кулисами SPA.

**После:** на живой странице `rutube.ru/video/2013f4eba6ade7b01582fb411f9e901a` появляются кликабельные маркеры монетизаций на прогресс-баре, панель текущей сцены, сайдбар аналитики и демо-CTA — в 4 режимах, из коробки.

---

## О продукте

- **Маркеры монетизаций на прогресс-баре** — точки AD_SLOT / ECOM_ITEM / CLIP_CANDIDATE из паспорта позиционируются по времени сцен; клик перематывает видео (`currentTime + play`).
- **Панель текущей сцены** — по `timeupdate` показывает summary и монетизацию активной сцены, как субтитры поверх плеера.
- **4 режима работы** — «Зритель» (маркеры + сцена + CTA), «Аналитик» (4 блока: монетизации, модерация, аудио, метрики), «Симуляция» (анимированный разбор ASR → сцены → метки), «Автор» (A/B-варианты заголовков).
- **Инструменты автора** — A/B-тестирование контента: генератор вариантов заголовков и описаний из паспорта (детерминированный PRNG + курируемая библиотека), прогнозные метрики эффективности, SVG-графики retention/монетизации/почасовой активности (NFR-7, без сети). Полноширинная модалка (`expand`) с таббаром всех 4 режимов.
- **Привязка паспорта к видео** — ручной выбор в попапе + автоподбор по ключевым словам заголовка («Какой iPhone выбрать за 50 000 рублей?» → `tech_review`) + регистрация по `video_id` в реестре; если ни одна привязка не сработала — автоматически применяется паспорт по умолчанию `iphone_50k_wylsacom` через `getDefaultPassport()` (демо-сценарий из коробки на любом видео).
- **Shadow DOM-изоляция** — стили панелей не конфликтуют с CSS RUTUBE, ноль layout-shift (NFR-6).
- **Игровой оффер-блок** — на видео о компьютерных играх (детект по `ya:ovs:category=Видеоигры`, хэштегам `#шутеры/#игра/#геймплей` или паспорту `game_review`) сразу после `section[aria-label="информация о видео"]` встраивается карточка с обложкой игры и кнопками «купить в VK Play / играть в облаке VK Play Cloud и Yandex Play» (демо-заглушки, NFR-7).
- **Тревел-оффер-блок** (`content/travelOffer/`) — на видео о путешествиях (детект по `ya:ovs:category` со значениями «Путешествия»/«Туризм», хэштегам `#путешествия/#тревел/#отпуск` или паспорту `travel_vlog`) встраивается карточка «Билеты {Краснодар} → {направление}» (авиабилеты, туры, отели, экскурсии); направление извлекается из заголовка видео.
- **МЕРЧ-оффер-блок** (`content/merchOffer/`) — на видео с метками товаров (`ecom_item`/`artist_merch`) встраивается карточка «товары из видео + мерч канала + магазины»: до 6 плиток товаров с иконками (`collectMerchProducts`), бренд из `celebrity_voice` (на видео Wylsacom — мерч «Царские стёкла»), чипы магазинов из карты `MERCH_STORE_BY_BRAND` (Biggeek, Царские стёкла, Wildberries, OZON, Яндекс Маркет). Реальный `video_id` `2013f4eba6ade7b01582fb411f9e901a` привязан к паспорту `iphone_50k_wylsacom`. Игры/тревел/мерч монтируются взаимоисключающе (первая успешная карточка выигрывает).
- **Privacy by design** — демо-данные хранятся локально, ноль внешних запросов в демо-режимах (NFR-7).
- **Готов к реальному провайдеру** — контракт `DataProvider` реализован заглушкой `RealDataProvider` (возвращает `not_implemented`), интерфейс готов под FastAPI `/analyze`.

## Схема работы

```
rutube.ru/video/* (content-script, document_idle)
   │ parseVideoId(video_id)
   ▼
resolveBinding(videoId, title) ── manual (popup) / auto (keywords) / registry (video_id)
   │
   ▼
DataProvider.load(videoId) ── DemoDataProvider (локальные паспорта)
   │                          RealDataProvider (stub → future POST /analyze)
   ▼
mountHost() → Shadow DOM → ModesController
   ├─ viewer:     markers + sceneOverlay + CTA
   ├─ analyst:    sidebar (монетизации/модерация/аудио/метрики)
   ├─ simulation: анимированный разбор → переход в analyst
   ├─ author:     A/B-варианты заголовков + метрики + SVG-графики
   └─ expand:     полноширинная модалка со всеми 4 режимами
```

## Технологический стек

| Компонент | Технология | Зачем |
|---|---|---|
| Манифест | Chrome Manifest V3 | `content_scripts`, `action` (popup), background service_worker; единственное permission — `storage` |
| Ядро | Vanilla TypeScript 5.x (strict) | Без фреймворков: лёгкий content-script (113 kB, gzip 27 kB) |
| Изоляция | Shadow DOM | Каскад фолбэков селекторов плеера (video / прогресс-бар / таймкод) |
| Сборка | Vite 6 (multi-entry) | IIFE content + popup + background за одну команду |
| Тесты | Vitest 2 + happy-dom | Юнит-тесты с имитацией DOM (клик → seek, режимы, Shadow-хост) |

## Установка и быстрый старт

```bash
cd chrome-extension
npm install
npm run build        # dist/{content,popup,background}.js + manifest.json + иконки
npm test             # vitest: 135 тестов
```

**Load unpacked (ручной smoke):**

1. Chrome → `chrome://extensions` → включить «Режим разработчика»
2. «Загрузить распакованное» → выбрать папку `chrome-extension/dist/`
3. Открыть референсное видео: <https://rutube.ru/video/2013f4eba6ade7b01582fb411f9e901a>
4. В попапе выбрать сценарий (или довериться автоподбору), переключить режим

> После `npm run build` + перезагрузки расширения в `chrome://extensions`
> обязательно перезагрузите вкладку RUTUBE (⌘R): обновление расширения не
> перезапускает уже внедрённый content script в открытой вкладке.

## API / Архитектура модулей

```
src/
├── content/
│   ├── index.ts            entry: детект, binding, монтаж, обработка сообщений popup
│   ├── shadow.ts           mountHost/unmountHost — Shadow DOM-хост
│   ├── rutube.ts           PlayerHandle, селекторы плеера + фолбэки, waitForPlayer/waitForMetaRow
│   ├── gameOffer/          игровой оффер-блок: detect / render / mount (NFR-7)
│   ├── travelOffer/        тревел-оффер-блок: detect / render / mount (NFR-7)
│   ├── merchOffer/         мерч-оффер-блок: detect / render / mount (NFR-7)
│   ├── authorTools/        инструменты автора: generate / render / charts (NFR-7)
│   ├── modes.ts            ModesController (viewer/analyst/simulation/author)
│   ├── data/
│   │   ├── provider.ts     interface DataProvider { isAvailable(); load(id) }
│   │   ├── demo.ts         DemoDataProvider + computeMetrics
│   │   ├── real-stub.ts    RealDataProvider (not_implemented, готов под /analyze)
│   │   └── bindings.ts     resolveBinding / matchByVideoId / matchByTitle
│   └── render/
│       ├── markers.ts      маркеры + seek
│       ├── sceneOverlay.ts панель текущей сцены
│       ├── cta.ts          демо-CTA (товар/билет/афиша/мерч)
│       ├── analystMode.ts  сайдбар аналитика
│       ├── simulationMode.ts анимация разбора
│       ├── viewerMode.ts   оркестрация режима зрителя
│       └── layout.ts       sceneStarts / fmtTime / fmtDur
├── data/
│   ├── types.ts            Passport, SceneAnalysisResult, MonetizationItem …
│   ├── labels.ts           метки монетизаций (цвет/иконка/тултип)
│   ├── registry.ts         реестр + привязка 7 демо-паспортов (video_id ↔ passport)
│   └── passports/          7 демо-паспортов (.json)
└── popup/                  выбор сценария + автоподбор (chrome.runtime messaging)
```

**Messaging popup ↔ content** (`chrome.runtime.onMessage`, тип `rz-set-binding`): ручной выбор в попапе перезапускает контроллер с новым паспортом поверх текущего хоста.

## Демо-паспорта

| id | Тип | Привязка |
|---|---|---|
| `tech_review` | обзор техники (наушники) | keywords (автоподбор по заголовку) |
| `iphone_50k_wylsacom` | обзор iPhone за 50 000 ₽ (Wylsacom, ~16:25) | video_id `2013f4eba6ade7b01582fb411f9e901a` + keywords + паспорт по умолчанию (`getDefaultPassport()`) |
| `movie_review` | кинообзор | keywords |
| `diy_frame` | DIY/мастер-класс | keywords |
| `cooking_dinner` | кулинария | keywords |
| `atomic_heart_review` | обзор игры Atomic Heart (StopGame, ~25:43) | video_id `aceaa503bdb8c200278f94dd3deaf7f5` + keywords |
| `vietnam_nha_trang` | тревел-влог «Вьетнам: жизнь в Нячанге» | video_id `7130901c1c9147f239190def16eb741c` + keywords |

## Тестирование

| Файл | Покрытие |
|---|---|
| `registry.test.ts` | валидация 7 паспортов под TS `Passport`, реестр, дефолтный паспорт |
| `bindings.test.ts` | автоподбор по заголовку, method=auto/manual |
| `data.test.ts` | DemoDataProvider / RealDataProvider-stub / computeMetrics |
| `layout.test.ts` | sceneStarts (монотонность), fmtTime/fmtDur |
| `markers.test.ts` | рендер `.rz-chip`, клик → `seekTo(startSec)` |
| `modes.test.ts` | Shadow-хост (идемпотентность), переключение режимов |
| `game-offer-detect.test.ts` | детект игровых видео + извлечение названия игры из заголовка |
| `game-offer.test.ts` | карточка оффера: вставка после meta-row, идемпотентность, демо-заглушки |
| `author-tools-generate.test.ts` | генерация A/B-вариантов заголовков/описаний, resolvePassportKey, projectVariantMetrics |
| `author-tools-render.test.ts` | рендер панели автора, чистка при unmount, wide-режим |
| `author-tools-charts.test.ts` | SVG-графики: retention, стек монетизаций, почасовые бары (детерминизм) |
| `scene-overlay.test.ts` | панель текущей сцены по `timeupdate` |
| `rutube.test.ts` | PlayerHandle: селекторы плеера + фолбэки, waitForPlayer/waitForMetaRow |
| `travel-offer-detect.test.ts` | детект тревел-видео + извлечение направления из заголовка |
| `travel-offer.test.ts` | карточка «билеты из Краснодара»: вставка после meta-row, идемпотентность |
| `merch-offer-detect.test.ts` | детект видео с товарами, `collectMerchProducts` (дедуп/сортировка/limit), `merchBrandFor` |
| `merch-offer.test.ts` | мерч-карточка: вставка после meta-row, товары/магазины, идемпотентность |

Проверка: `npm run typecheck && npm test` (135 тестов, зелёные).

## Подключение реального анализатора (FastAPI)

`RealDataProvider` — заглушка. Для живой аналитики реализовать `load(videoId)` в `src/content/data/real-stub.ts` как `POST {API}/analyze` с `video_id` (контракт уже в `provider.ts`). Python-бэкенд и `ui/` при этом не меняются.

## План развития

- ✅ A1–A3: spec/plan C-003, requirements (UC-7, NFR-6/7), graph (GD-010), technology
- ✅ P0–P8: скаффолд, порт данных, data-layer, инъекция, режимы, popup
- ✅ P9: vitest suite (135), dev-мок `dev/mocks/rutube-video.html`, сборка `dist/`
- ✅ Игровой оффер-блок: детект + демо-карточка после meta-row (NFR-7)
- ✅ Тревел-оффер-блок: карточка билетов + `vietnam_nha_trang` паспорт (NFR-7)
- ✅ МЕРЧ-оффер-блок: товары из паспорта + мерч канала + магазины (NFR-7)
- ✅ Инструменты автора: A/B-варианты заголовков/описаний + метрики + SVG-графики, полноширинная модалка (NFR-7)
- ⏳ Real-провайдер: коннект к FastAPI `/analyze`
- ⏳ Больше паспортов и keywords в реестре
