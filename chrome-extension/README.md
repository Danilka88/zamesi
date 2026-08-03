# RUTUBE Замеси — Chrome-расширение

**Chrome MV3 (Vanilla TS + Shadow DOM):** [страница видео RUTUBE](https://rutube.ru/video/*) → **[демо-панели монетизаций, модерации, аудио и метрик](chrome-extension://popup.html)** прямо на плеере, без изменения Python-бэкенда и React-UI.

> Демо-слой анализатора видео «RUTUBE Замеси» (GRACE-модуль M-EXTENSION, change C-003).

---

**До:** зритель не видит монетизационные возможности ролика — интеграции, товары, клипы живут только в паспорте анализатора за кулисами SPA.

**После:** на живой странице `rutube.ru/video/2013f4eba6ade7b01582fb411f9e901a` появляются кликабельные маркеры монетизаций на прогресс-баре, панель текущей сцены, сайдбар аналитики и демо-CTA — в 3 режимах, из коробки.

---

## О продукте

- **Маркеры монетизаций на прогресс-баре** — точки AD_SLOT / ECOM_ITEM / CLIP_CANDIDATE из паспорта позиционируются по времени сцен; клик перематывает видео (`currentTime + play`).
- **Панель текущей сцены** — по `timeupdate` показывает summary и монетизацию активной сцены, как субтитры поверх плеера.
- **3 режима работы** — «Зритель» (маркеры + сцена + CTA), «Аналитик» (4 блока: монетизации, модерация, аудио, метрики), «Симуляция» (анимированный разбор ASR → сцены → метки).
- **Привязка паспорта к видео** — ручной выбор в попапе + автоподбор по ключевым словам заголовка («Какой iPhone выбрать за 50 000 рублей?» → `tech_review`) + регистрация по `video_id` в реестре.
- **Shadow DOM-изоляция** — стили панелей не конфликтуют с CSS RUTUBE, ноль layout-shift (NFR-6).
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
   └─ simulation: анимированный разбор → переход в analyst
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
npm test             # vitest: 22 теста
```

**Load unpacked (ручной smoke):**

1. Chrome → `chrome://extensions` → включить «Режим разработчика»
2. «Загрузить распакованное» → выбрать папку `chrome-extension/dist/`
3. Открыть референсное видео: <https://rutube.ru/video/2013f4eba6ade7b01582fb411f9e901a>
4. В попапе выбрать сценарий (или довериться автоподбору), переключить режим

## API / Архитектура модулей

```
src/
├── content/
│   ├── index.ts            entry: детект, binding, монтаж, обработка сообщений popup
│   ├── shadow.ts           mountHost/unmountHost — Shadow DOM-хост
│   ├── rutube.ts           PlayerHandle, селекторы плеера + фолбэки, waitForPlayer
│   ├── modes.ts            ModesController (viewer/analyst/simulation)
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
│   ├── registry.ts         реестр + привязка tech_review ↔ video_id
│   └── passports/          4 демо-паспорта (.json)
└── popup/                  выбор сценария + автоподбор (chrome.runtime messaging)
```

**Messaging popup ↔ content** (`chrome.runtime.onMessage`, тип `rz-set-binding`): ручной выбор в попапе перезапускает контроллер с новым паспортом поверх текущего хоста.

## Демо-паспорта

| id | Тип | Привязка |
|---|---|---|
| `tech_review` | обзор техники (iPhone) | video_id `2013f4eba6ade7b01582fb411f9e901a` + keywords |
| `movie_review` | кинообзор | keywords |
| `diy_frame` | DIY/мастер-класс | keywords |
| `cooking_dinner` | кулинария | keywords |

## Тестирование

| Файл | Покрытие |
|---|---|
| `registry.test.ts` | валидация 4 паспортов под TS `Passport`, реестр |
| `bindings.test.ts` | автоподбор по заголовку, method=auto/manual |
| `data.test.ts` | DemoDataProvider / RealDataProvider-stub / computeMetrics |
| `layout.test.ts` | sceneStarts (монотонность), fmtTime/fmtDur |
| `markers.test.ts` | рендер `.rz-chip`, клик → `seekTo(startSec)` |
| `modes.test.ts` | Shadow-хост (идемпотентность), переключение режимов |

Проверка: `npm run typecheck && npm test` (22 теста, зелёные).

## Подключение реального анализатора (FastAPI)

`RealDataProvider` — заглушка. Для живой аналитики реализовать `load(videoId)` в `src/content/data/real-stub.ts` как `POST {API}/analyze` с `video_id` (контракт уже в `provider.ts`). Python-бэкенд и `ui/` при этом не меняются.

## План развития

- ✅ A1–A3: spec/plan C-003, requirements (UC-7, NFR-6/7), graph (GD-010), technology
- ✅ P0–P8: скаффолд, порт данных, data-layer, инъекция, режимы, popup
- ✅ P9: vitest suite (22), dev-мок `dev/mocks/rutube-video.html`, сборка `dist/`
- ⏳ Real-провайдер: коннект к FastAPI `/analyze`
- ⏳ Больше паспортов и keywords в реестре
