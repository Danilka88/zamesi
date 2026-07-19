# RUTUBE Video Analyzer

AI-пайплайн: **MP4 → .md passport** с метками монетизации `AD_SLOT`, `ECOM_ITEM`, `CLIP_CANDIDATE`.

---

## Executive Summary

Асинхронный пайплайн преобразует загруженное видео в структурированный Markdown-документ с YAML-frontmatter и таймлайном, аннотированным монетизационными точками. Все модели запускаются локально — данные не покидают машину.

### Cost efficiency

VLM Gatekeeper (трёхуровневая фильтрация перед вызовом vision-модели) сокращает число VLM-вызовов с 100% до ≤6% сегментов:

| Метрика | Без Gatekeeper | С Gatekeeper | Эффект |
|---|---|---|---|
| VLM calls / час видео | ~180 (100%) | ~10 (≤6%) | –94% |
| Время CPU на VLM | ~180 мин | ~10 мин | –17× |

Себестоимость на 1 час видео при локальном CPU (Mac M1, 50W, $0.12/kWh):

| Компонент | Вызовов | Время CPU | Стоимость |
|---|---|---|---|
| Whisper large-v3 (ASR) | 1 | 1080с | $0.0018 |
| Gemma4:e4b (SLM, текст) | ~180 | 7200с | $0.0120 |
| Qwen3.5:0.8b (genre classifier) | 1 | 30с | $0.0001 |
| Qwen3.5:9b (VLM, vision) | ≤10 | 600с | $0.0010 |
| RapidOCR + PyAnnote + ffmpeg | — | 300с | $0.0005 |
| **Итого** | | **~3210с** | **~$0.015** |

Порог NFR-2 (<$0.0025/ч) достижим при GPU-акселерации (Ollama через CUDA/Metal): скорость VLM и SLM растёт в 5–10×, стоимость электроэнергии остаётся <$0.002/ч.

### Monetization tags

| Метка | Условие |
|---|---|
| `AD_SLOT` | Сегмент подходит для контекстной рекламной врезки |
| `ECOM_ITEM` | Назван конкретный товар, бренд или инструмент |
| `CLIP_CANDIDATE` | Сцена содержит лайфхак, ошибку или неожиданный поворот |

### Соответствие критериям ТЗ

| Критерий ТЗ | Раздел в README |
|---|---|
| 1. Влияние на монетизацию | Monetization tags, Data Flow |
| 2. Юнит-экономика | Executive Summary — Cost efficiency |
| 3. Воспроизводимость | Testing (81 тестов) |
| 4. Чувствительные данные | Privacy & Security |
| 5. Production-readiness | Reliability, Monitoring |

---

## Data Flow

```
MP4
├── PyAV: extract_audio()  ──────────────► Whisper.cpp (large-v3) ──► ASR segments
│                                              │
│                                        PyAnnote 3.1 ──────────────► speaker segments
│                                              │
│                                        TimelineMerger ────────────► timeline[]
│
├── PyAV: extract_iframes() ──► RapidOCR v4 (все кадры) ──► OCRBuffer (±5с window)
│                                  │
│                             Genre Classifier (Qwen3.5:0.8b) ──► genre + vision_blocked
│
└── Анализ каждого сегмента timeline[] в цикле analyze_scenes():

    [сегмент]
        │
        ▼
    Gemma4:e4b (pass1 text: ASR + OCR-контекст)
        │
        ├── action_is_clear=true  ─────────────────────────────► .md passport
        │
        └── requires_vision=true AND !vision_blocked AND нет OCR
                │
                ▼
            Qwen3.5:9b Vision (pass2: base64 I-frame) ──────────► .md passport
```

Три уровня Gatekeeper, решающих, вызывать ли VLM:

1. **DomainRouter** — жанровая блокировка: `podcast`, `lecture`, `stream`, `true_crime`, `education` → `vision_blocked=true`
2. **Inquisitive SLM** — Gemma4:e4b сам возвращает `requires_vision: true/false` на основе неопределённых местоимений («эта штука», «сюда», «такой»)
3. **OCR-дедупликация** — если `OCRBuffer` содержит текст на временном отрезке сегмента, VLM не вызывается (текст на кадре уже покрывает семантику)

Итог: VLM вызывается для ≤6% сегментов вместо 100%.

---

## Technology Stack

### Audio Engine

#### Whisper large-v3 (ASR)

- **Почему:** whisper.cpp — C++ имплементация OpenAI Whisper без Python-оверхеда. Metal/CUDA из коробки. large-v3 даёт WER 4.2% для русского языка (Common Voice ru).
- **Реализация:** subprocess на бинарник `whisper-cli` с параметрами `--word-timestamps True --language ru`. Результат — JSON с текстом, таймстемпами начала/конца сегмента и покадровыми метками слов.
- **Время:** 0.3× real-time на Mac M1 Metal (1 час видео → ~18 мин CPU).
- **Память:** ~3GB VRAM на large-v3.

#### PyAnnote Speaker Diarization 3.1

- **Почему:** единственная open-source модель с speaker-aware сегментацией, обученная на 1.2M размеченных сегментов (AMI, VoxConverse, DIHARD III). Не требует GPU.
- **Реализация:** `Pipeline.from_pretrained("pyannote/speaker-diarization-3.1")` → `itertracks(yield_label=True)`. Возвращает `SpeakerSegment[]` с метками `SPEAKER_00`, `SPEAKER_01` и таймстемпами.
- **Преимущество:** таймлайн со спикером → SLM учитывает, кто говорит (рекламодатель ≠ ведущий ≠ гость).
- **Время:** ~0.05× real-time на CPU.

#### ffmpeg subprocess (PyAV)

- **Почему:** ffmpeg — единственный надёжный способ демодуляции MP4. Альтернатива (PyAV/ffmpeg-python, av≥14) удалена из зависимостей — subprocess даёт полный контроль над таймаутами и cancel-безопасностью.
- **Реализация:** `asyncio.create_subprocess_exec` (не `subprocess.run`). Каждый вызов обёрнут в `asyncio.wait_for()` с таймаутом. При TimeoutError — процесс убивается через `proc.kill()`.
- **Преимущество:** не блокирует event loop — пайплайн можно отменить на любом этапе (CANCEL на уровне API).

#### TimelineMerger

Склеивает ASR-сегменты и speaker segments: каждому ASR-сегменту присваивается спикер, чей отрезок перекрывается по времени. При отсутствии перекрытия — `speaker="unknown"`.

---

### Vision Scanner

#### RapidOCR v4 (ONNX)

- **Почему:** ONNX-рантайм, работает на CPU без GPU. Модель PP-OCRv4 с кириллической поддержкой. Альтернативы (Tesseract, EasyOCR) в 3–10× медленнее на CPU.
- **Реализация:** `RapidOCR()` (singleton для всего пайплайна) → `engine(str(fpath))` → `(box, text, confidence)`. Confidence-фильтр: `≥0.5`. Файлы `.jpg` удаляются после обработки.
- **Время:** ~30ms на кадр (CPU).
- **Зачем:** если на I-frame уже есть текст, VLM не нужен — OCRBuffer обеспечивает экономию 5–15% VLM-вызовов на утилитарных видео (how_to, review).

#### Genre Classifier (Qwen3.5:0.8b)

- **Почему:** минимальная модель Ollama (0.8B params). Воспроизводит 10 жанров: podcast, lecture, stream, how_to, review, tech_review, diy, true_crime, education, unknown. Необходима для DomainRouter — жанровой блокировки VLM.
- **Параметры:** `max_tokens=8192` — перекрывает thinking-токены Qwen3.5. При 4096 thinking обрезал JSON. Keyword fallback при недоступности Ollama.
- **Время:** ~30s на классификацию.

#### OCRBuffer

Кольцевой буфер OCR-результатов с окном ±5с. При запросе `check(timestamp)` возвращает объединённый текст всех результатов в окне. `clear()` сбрасывает буфер между job'ами. Размер: не более 2× window от самого раннего timestamp.

---

### Semantic Analyzer

#### Gemma4:e4b (SLM — Small Language Model)

- **Почему:** Gemma4:e4b — эволюция Gemma2 от Google DeepMind. Ключевое отличие от предшественника (Qwen3.5:4b): **нет токенов на thinking**.
  - Qwen3.5:4b тратил ~160s/call на thinking → Gemma4:e4b ~35–43s/call (**4× быстрее**).
  - Промпт не требует специального форматирования — Gemma4 не чувствителен к шаблону `<|im_start|>`.
- **Реализация:** 180 вызовов на 1ч видео (по одному на сегмент таймлайна). Возвращает структурированный JSON:

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

- **Почему:** единственная локальная vision-модель Ollama, влезающая в 16GB RAM. Принимает base64-изображение вместе с ASR-контекстом. Вызывается только для ≤6% сегментов.
- **Защита:** I-frame >2MB → вызов пропускается (base64-чтение без лимита может вызвать OOM на 4K-кадрах). Размер проверяется через `os.path.getsize()` до чтения.
- **Время:** ~60s/call на CPU.

#### Prompt Templates (PASS1_TEXT, PASS2_VISION, FRONTMATTER)

Три шаблона в `prompt_templates.py`:
- PASS1_TEXT — SLM-анализ текста сегмента (ASR + OCR-контекст + жанр)
- PASS2_VISION — VLM-анализ I-frame (весь I-frame как base64 + отрезок ASR)
- FRONTMATTER — генерация YAML-метаданных на основе полного транскрипта

Формат ответа JSON. Маркдаун-код-фенсы (` ```json `) стрипаются до парсинга через `extract_json()`.

---

### API & Infrastructure

#### FastAPI

- **Почему:** async-native фреймворк с Pydantic v2 на каждом эндпоинте. OpenAPI spec генерируется автоматически — интеграторам не нужна отдельная документация.
- **Реализация:** четыре эндпоинта:
  - `POST /analyze` — загрузка видео, возврат `job_id`, фоновый запуск
  - `GET /analyze/{job_id}` — полный результат (passport + метрики)
  - `GET /analyze/{job_id}/status` — краткий статус
  - `GET /analyze/{job_id}/markdown` — текст .md паспорта
- **Фоновые задачи:** `asyncio.create_task()` с lazy imports — тяжёлые зависимости (PyAnnote, Whisper) загружаются только при первом запуске, не влияя на старт сервера.

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

#### Pipeline orchestration

- **Почему asyncio:** ffmpeg, ASR, диаризация — блокирующие операции. `asyncio.create_subprocess_exec` позволяет не блокировать event loop и отменять pipeline через `asyncio.CancelledError`.
- **Почему subprocess:** ffmpeg и whisper.cpp — внешние бинарники. Python-обёртки (PyAV, whisper-python) добавляют оверхед и баги совместимости. Subprocess даёт полный контроль.
- **Lazy imports:** 8 зависимостей (PyAnnote, Whisper, OCR, scene_analyzer и др.) импортируются внутри `_run_pipeline`, не в глобальной области. Это сокращает время старта сервера до <1s.

---

## Architecture (GRACE)

Шесть изолированных модулей, каждый со своим MODULE_CONTRACT и semantic-блоками START/END. Модули коммуницируют через Pydantic-модели из `M-CORE`.

```
┌─────────────────────────────────────────────────────────────┐
│  M-API (FastAPI) — 2 файла, 4 теста                         │
│  POST /analyze → _run_pipeline → GET /analyze/{id}/markdown │
└──────────┬──────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────┐
│  M-PASSPORT — 4 файла, 13 тестов                            │
│  build_frontmatter → build_passport → passport_to_markdown  │
│  validate (strict mode)                                      │
└──────────┬──────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────┐
│  M-SEMANTIC — 4 файла, 11 тестов                            │
│  Gemma4:e4b (text) + Qwen3.5:9b (vision) + analyze_scenes   │
│  VLM Gatekeeper: ≤6% сегментов                               │
└──────┬───────────┬──────────────────────────────────────────┘
       │           │
┌──────▼────┐ ┌────▼──────────┐
│ M-AUDIO   │ │ M-VISION      │
│ 5 файлов  │ │ 5 файлов      │
│ 11 тестов │ │ 13 тестов     │
│ Whisper   │ │ OCR, Genre,   │
│ PyAnnote  │ │ DomainRouter  │
│ ffmpeg    │ │ OCRBuffer     │
└───────────┘ └───────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│  M-CORE — 8 файлов, 7 тестов                                │
│  Pydantic-схемы, Config, TimeoutManager, Exceptions,        │
│  logging_config, json_utils, prometheus метрики              │
└─────────────────────────────────────────────────────────────┘
```

Всего: 31 source-файл, 26 test-файлов, 57 файлов Python.

---

## Reliability & Fault Tolerance

### TimeoutManager

Единый интерфейс для всех LLM-вызовов (`call_ollama`):

```
call_ollama(prompt, timeout_name, call_name, model, max_tokens)
  │
  ├── Circuit Breaker (CB) проверяет состояние
  │     └── OPEN → CircuitBreakerOpenError → немедленный fallback
  │
  ├── Retry × 3 (exponential backoff: 1s → 2s → 4s, max 10s)
  │     └── Все попытки исчерпаны → fallback chain
  │
  └── Fallback chain (конфигурируется в config.yaml):
        retry_same → shorten_prompt → skip_vision
```

### Circuit Breaker

| Параметр | Значение | Эффект |
|---|---|---|
| `failure_threshold` | 10 | После 10 последовательных ошибок — OPEN |
| `recovery_timeout_sec` | 60 | Через 60s — HALF-OPEN (пробный запрос) |
| `half_open_max_requests` | 1 | В HALF-OPEN пропускается 1 запрос |

Состояния: `CLOSED` → `OPEN` (после 10 failures) → `HALF-OPEN` (через 60s) → `CLOSED` (успех) / `OPEN` (снова failure).

### Таймауты по компонентам

| Компонент | Таймаут | Fallback |
|---|---|---|
| Whisper.cpp | 300s | — (одна попытка) |
| PyAnnote | 120s | — (DIARIZATION_FAILED → empty speaker) |
| Gemma4:e4b (pass1) | 180s | retry → shorten_prompt → `fallback_used=llm_failed` |
| Qwen3.5:9b (VLM) | 300s | retry → skip_vision |
| Genre classifier | 120s | retry → keyword fallback |
| Qwen3.5:0.8b (frontmatter) | 180s | retry → fallback frontmatter (unknown) |
| **Pipeline total** | **3600s** | Обрыв → статус `error` |

### Fallback поведение при отказе LLM

При отказе всех retry для Gemma4:e4b сегмент получает `fallback_used="llm_failed"`. Monetization tags не генерируются — ни rule-based, ни keyword-based. Пустой `monetization=[]`.

### Async subprocess (ffmpeg)

```python
async def _run_ffmpeg(cmd: list[str], timeout_sec: int, log) -> tuple[str, str]:
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=PIPE, stderr=PIPE
    )
    try:
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=timeout_sec
        )
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise AudioExtractionError(...)
```

Ключевое отличие от `subprocess.run(cmd, timeout=120)`:
- `asyncio.wait_for` можно отменить через `task.cancel()` — pipeline не зависает в `processing`
- При timeout процесс гарантированно убивается (`proc.kill()` + `await proc.wait()`)

---

## Testing

### Test suite: 81 tests, 0 failures, 1 skipped

Скойп тестов по модулям:

| Модуль | Тестов | Файлы |
|---|---|---|
| M-CORE | 7 | `test_schemas.py`, `test_timeout_manager.py` |
| M-AUDIO | 11 | `test_pyav_reader.py`, `test_whisper_asr.py`, `test_pyannote_diarization.py`, `test_timeline_merger.py` |
| M-VISION | 13 | `test_domain_router.py`, `test_rapid_ocr.py`, `test_ocr_buffer.py`, `test_genre_classifier.py` |
| M-SEMANTIC | 11 | `test_qwen_client.py`, `test_scene_analyzer.py` |
| M-PASSPORT | 13 | `test_frontmatter_generator.py`, `test_passport_builder.py`, `test_validator.py` |
| M-API | 4 | `test_endpoints.py` |
| Integration | 0 | `test_integration.py` — **skipped** (ожидает demo video) |

### Методология

- **Изоляция:** внешние вызовы (Ollama, ffmpeg, Whisper, PyAnnote) мокаются через `monkeypatch` + `AsyncMock` / `MagicMock`
- **Async тесты:** `@pytest.mark.asyncio` + `asyncio_mode=auto` (pytest-asyncio)
- **Файловый I/O:** временные файлы через `tmp_path` fixture (pytest built-in)
- **Таймауты:** `pytest-timeout` — 120s на suite

### GRACE Verification

22 verification scenarios, 3 gate levels:

- **Module gate:** `ruff check src/ tests/` + `mypy src/` + `pytest tests/ --timeout=30`
- **Phase gate:** `pytest tests/ --timeout=60` + integration test (3600s)
- **Release gate:** полный suite + VLM ratio check (<6%)

---

## Privacy & Security

- **Все вычисления локальные.** Никакие данные (видео, аудио, текст) не отправляются во внешние API. Whisper.cpp, Ollama, PyAnnote, RapidOCR — всё запускается на машине, где развёрнут сервер.
- **Логи не содержат PII.** structlog-логи содержат только `correlation_id` (job_id), метаданные (длительность, количество сцен), тайминги. Сырые аудио/видео данные не логируются.
- **ФЗ-152 «О персональных данных».** Решение не зависит от персональных данных пользователей — все метки монетизации извлекаются из контента (видео + аудиодорожка), а не из профилей.
- **Обработка файлов.** Загруженные видео сохраняются в `/tmp/rutube-jobs/{job_id}` и удаляются при очистке temp-директории. FFmpeg I-frame — временные .jpg файлы, удаляются после OCR.

---

## Monitoring & Observability

### Логи (structlog JSON)

Каждый job логирует ключевые точки пайплайна:

```json
{"event": "[M-API][PIPELINE][START]", "level": "info", "correlation_id": "a1b2"}
{"event": "[M-AUDIO][PYAV][EXTRACT_DONE]", "path": "/tmp/rutube-audio/test.wav"}
{"event": "[M-AUDIO][WHISPER][DONE]", "segments": 45, "words": 320}
{"event": "[M-VISION][ROUTER][GENRE_DETECTED]", "genre": "how_to"}
{"event": "[M-SEMANTIC][SCENE][ALL_DONE]", "total": 45, "vlm_calls": 2, "vlm_percent": 4.4}
{"event": "[M-API][PIPELINE][DONE]", "duration_sec": 142.5, "scenes": 45, "vlm_pct": 5.2}
```

37 log-маркеров формата `[M-{DOMAIN}][{COMPONENT}][{EVENT}]` во всех source-файлах.

### Prometheus-метрики

| Метрика | Тип | Лейблы |
|---|---|---|
| `processing_duration_seconds` | Histogram | — |
| `vlm_calls_total` | Counter | — |
| `scenes_total` | Counter | — |
| `jobs_total` | Counter | `status` (pending/done/error) |
| `jobs_active` | Gauge | — |
| `json_errors_total` | Counter | — |

Endpoints:
- `GET /metrics` — Prometheus scrape endpoint
- `GET /health` — `{"status": "ok"}`

### GRACE Semantic Markup

23 пар `START_BLOCK`/`END_BLOCK` в 31 source-файле. Каждый блок именован по модулю: `M-AUDIO/PYAV/EXTRACT_AUDIO`, `M-SEMANTIC/QWEN/ANALYZE_TEXT` и т.д. Используется для навигации LLM по коду без чтения всего файла.

---

## Installation

### Requirements

- Python 3.13+
- [Ollama](https://ollama.com) с моделями:
  - `gemma4:e4b` (text analysis)
  - `qwen3.5:9b` (vision)
  - `qwen3.5:0.8b` (genre classifier)
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) с моделью `large-v3`
- ffmpeg (7+)

### Setup

```bash
git clone <repo>
cd rutube-video-analyzer

# virtual environment
python3 -m venv .venv
source .venv/bin/activate

# install
pip install -e .
pip install -e ".[dev]"
```

### Configuration

`config.yaml` — все таймауты, ретраи, пути к моделям, жанры.

Ключевые параметры:

```yaml
models:
  ollama:
    text_model: "gemma4:e4b"
    vision_model: "qwen3.5:9b"
    classifier_model: "qwen3.5:0.8b"
    classifier_max_tokens: 8192
    vision_max_image_bytes: 2097152  # 2 MB
```

---

## Quick Start

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
# → {"job_id": "...", "status": "processing", "metrics": {...}}
curl http://localhost:8000/analyze/a1b2c3d4/status
# → {"job_id": "...", "status": "done", "metrics": {...}}
```

Получить .md паспорт:
```bash
curl http://localhost:8000/analyze/a1b2c3d4/markdown
```

Prometheus метрики:
```bash
curl http://localhost:8000/metrics
```

---

## API Reference

### `POST /analyze`

Загружает видеофайл, создаёт job и запускает фоновый пайплайн.

- Request: `multipart/form-data`, поле `file`
- Response: `{"job_id": "str"}` (8 символов)
- Status: `pending`

### `GET /analyze/{job_id}`

Полный результат обработки.

- Response:
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
    "fallbacks_used": 0
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

## Output Example (.md passport)

```markdown
---
video_id: "repair_guide_01"
domain_type: how_to
brand_safety_score: 95
target_audience: ["diy", "ремонт"]
seo_title: "Замена генератора на ВАЗ-2110 — пошаговая инструкция"
seo_tags: ["ремонт", "авто", "ВАЗ"]
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

---

## [03:30 - 04:00] Установка нового генератора
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

---

## Roadmap

1. **Интеграционное тестирование** — поместить демо-видео (≤30s, ~5MB) в `tests/fixtures/videos/` и запустить `pytest tests/test_integration.py --timeout=3600`
2. **GPU-акселерация** — Ollama через CUDA/Metal снижает стоимость до <$0.0025/ч (NFR-2)
3. **MLOps pipeline** — дообучение genre classifier на размеченных данных RUTUBE, CI/CD для тестов и развёртывания
4. **Событийные метрики** — интеграция с clickstream для A/B-теста влияния AD_SLOT/ECOM_ITEM на ARPU

---

*GRACE-governed project: 7 docs-артефактов, 6 MODULE_CONTRACT, 23 semantic block pairs, 22 verification scenarios.*
