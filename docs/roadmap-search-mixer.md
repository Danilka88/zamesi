# RUTUBE Video Analyzer — Roadmap: Search + Mixer (Замеси)

Версия 1.0 — июль 2026

---

## Технологические решения

| Компонент | Выбор | Обоснование |
|-----------|-------|-------------|
| Vector DB | ChromaDB ≥1.5 | Apache 2.0, Rust core, `pip install`, embedded mode без сервера, 28.8k ⭐, production-ready. Наш масштаб (тыс. сцен) — оптимально. |
| Embedding model | `qwen3-embedding:0.6b` через Ollama `/api/embed` | Multilingual (русский!), 639MB, 1024-dim, MTEB 64.33. Альтернативы: nomic-embed-text (только English), gemma4:e4b (генеративная, не embedding). |
| Stage Planner | LLM-only на `gemma4:e4b` | Без шаблонов. Промпт → JSON. Проект доказал надёжность LLM. |
| Порядок | Phase 1 (Search) → Phase 2 (Mixer) | Search — фундамент. Mixer — надстройка. |

---

## Phase 1 — Semantic Search / VideoRAG

Каждый паспорт → сцены → embedding → ChromaDB. Поиск: запрос → embedding → top-K сцен.

### Новые типы в `src/core/schemas.py`

```python
class SearchResult(BaseModel):
    video_id: str
    scene_index: int
    start_sec: float
    end_sec: float
    summary: str
    speaker: str = ""
    text: str = ""
    genre: str = ""
    monetization_types: list[str] = []
    score: float = 0.0
```

### Новый модуль `src/search/`

#### `src/search/__init__.py`
- MODULE_CONTRACT: `M-SEARCH`
- MODULE_MAP с экспортами: `index_passport`, `search_scenes`, `reindex_all`
- START_BLOCK/END_BLOCK: вокруг импортов и списка экспортов

#### `src/search/indexer.py`
- START_BLOCK/END_BLOCK: `M-SEARCH/INDEXER/INDEX_PASSPORT`, `M-SEARCH/INDEXER/REINDEX`

```python
_client: chromadb.PersistentClient | None = None

def _get_client() -> chromadb.PersistentClient:
    """Lazy init ChromaDB client. Вызывается при первом index_passport."""
    global _client
    if _client is None:
        from src.config import config
        _client = chromadb.PersistentClient(path=config.search_chroma_path)
    return _client


def _embed_text(text: str) -> list[float]:
    """Вызвать Ollama /api/embed через httpx. TimeoutManager используется, 
    но circuit breaker НЕ применяется (embedding — быстрый одноразовый вызов,
    без цепочки fallback-ов)."""
    import httpx
    from src.config import config
    resp = httpx.post(
        f"{config.ollama_endpoint}/api/embed",
        json={"model": config.search_embedding_model, "input": text},
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json()["embeddings"][0]


def index_passport(passport: Passport, log=None) -> int:
    """
    Принимает Passport.
    Для каждой SceneAnalysisResult:
      1. Составить текст чанка:
         "{speaker}: {asr_text}\nSummary: {scene_summary}\nMonetization: {types}"
      2. _embed_text(chunk_text)
      3. collection.add(embeddings=[...], metadatas=[...], ids=[...], documents=[...])
    """
    client = _get_client()
    collection = client.get_or_create_collection(
        name=config.search_collection,
        metadata={"hnsw:space": "cosine"},
    )
    for i, scene in enumerate(passport.timeline):
        seg = passport.raw_timeline_segments[i] if i < len(passport.raw_timeline_segments) else None
        chunk_parts = []
        if seg and seg.speaker:
            chunk_parts.append(f"{seg.speaker}: {seg.text}")
        chunk_parts.append(f"Summary: {scene.scene_summary}")
        monet_types = [m.type for m in scene.monetization]
        if monet_types:
            chunk_parts.append(f"Monetization: {','.join(monet_types)}")
        chunk_text = "\n".join(chunk_parts)

        embedding = _embed_text(chunk_text)
        video_id = passport.frontmatter.video_id
        collection.add(
            embeddings=[embedding],
            metadatas=[{
                "video_id": video_id,
                "scene_index": i,
                "start_sec": seg.start_sec if seg else 0.0,
                "end_sec": seg.end_sec if seg else 0.0,
                "genre": passport.frontmatter.domain_type,
                "speaker": seg.speaker if seg else "",
                "monetization_types": ",".join(monet_types),
                "has_clip": scene.clip_candidate is not None,
                "summary": scene.scene_summary,
            }],
            ids=[f"{video_id}_scene_{i}"],
            documents=[chunk_text],
        )
        log.info("[M-SEARCH][INDEXER][SCENE_INDEXED]",
                 video_id=video_id, scene=i)
    log.info("[M-SEARCH][INDEXER][DONE]", scenes=len(passport.timeline))
    return len(passport.timeline)


def reindex_all(log=None) -> int:
    """Переиндексировать все .md паспорта из passport.output_dir (config.yaml) в ChromaDB.
    
    ㆍЧитает все .md файлы из директории
    ㆍПарсит frontmatter + timeline
    ㆍВызывает index_passport() для каждого
    ㆍЛоги: [M-SEARCH][INDEXER][REINDEX_START], [M-SEARCH][INDEXER][REINDEX_DONE]
    """
    from src.config import config as cfg
    output_dir = Path(cfg._get("passport", "output_dir", default="./output"))
    if not output_dir.exists():
        log.warning("[M-SEARCH][INDEXER][REINDEX_START]", path=str(output_dir), exists=False)
        return 0

    total = 0
    md_files = list(output_dir.glob("*.md"))
    log.info("[M-SEARCH][INDEXER][REINDEX_START]", files=len(md_files))
    for md_path in md_files:
        # парсинг .md → Passport (pyyaml + timeline)
        # вызов index_passport(...)
        total += 1
    log.info("[M-SEARCH][INDEXER][REINDEX_DONE]", total=total)
    return total
```

#### `src/search/searcher.py`
- START_BLOCK/END_BLOCK: `M-SEARCH/SEARCHER/SEARCH_SCENES`

```python
def search_scenes(query: str, top_k: int = 20, filter: dict | None = None, log=None) -> list[SearchResult]
```

Что делает:
1. Embedding запроса через Ollama `/api/embed`
2. `collection.query(query_embeddings=[embedding], n_results=top_k, where=filter)`
3. Вернуть `list[SearchResult]`, сортировка по убыванию `distance`
4. Логи: `[M-SEARCH][SEARCHER][QUERY]`, `[M-SEARCH][SEARCHER][RESULTS]`

#### `src/api/routes_search.py`
- START_BLOCK/END_BLOCK: `M-SEARCH/ROUTES/SEARCH` (search endpoint), `M-SEARCH/ROUTES/REINDEX` (reindex endpoint)
- Логи: `[M-SEARCH][ROUTES][SEARCH_QUERY]`, `[M-SEARCH][ROUTES][REINDEX_START]`, `[M-SEARCH][ROUTES][REINDEX_DONE]`

```python
from src.core.logging_config import get_logger
from src.search.indexer import reindex_all
from src.search.searcher import search_scenes

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/")
async def search(q: str = Query(...), top_k: int = 20, genre: str | None = None) -> list[SearchResult]:
    log = get_logger()
    log.info("[M-SEARCH][ROUTES][SEARCH_QUERY]", query=q)
    filter_dict = {"genre": genre} if genre else None
    results = search_scenes(q, top_k=top_k, filter=filter_dict, log=log)
    return results

@router.post("/reindex")
async def reindex() -> dict:
    log = get_logger()
    import asyncio
    total = await asyncio.to_thread(reindex_all, log=log)
    return {"status": "ok", "indexed": total}
```

### Интеграция в `passport_builder.py`

Добавить вызов `index_passport()` после `validate()` в `build_passport()`:

```python
try:
    from src.search.indexer import index_passport
    indexed = index_passport(passport, log=log)
    log.info("[M-PASSPORT][BUILDER][INDEXED]", scenes=indexed)
except ImportError:
    pass
except Exception as e:
    log.warning("[M-PASSPORT][BUILDER][INDEX_FAILED]", error=str(e))
```

---

## Phase 2 — Mixer (Замеси)

Запрос → LLM этапы → Semantic Search → LLM матчинг → Mix → Markdown.

### Новые типы в `src/core/schemas.py` (добавить к Phase 1)

```python
class Stage(BaseModel):
    title: str
    description: str

class MixSceneRef(BaseModel):
    video_id: str
    scene_index: int
    start_sec: float
    end_sec: float
    summary: str
    speaker: str = ""
    text: str = ""

class MixStage(BaseModel):
    title: str
    description: str
    scenes: list[MixSceneRef]

class Mix(BaseModel):
    mix_id: str
    query: str
    stages: list[MixStage]
    total_duration_sec: float = 0.0

class MixRequest(BaseModel):
    query: str = Field(min_length=3)
    max_videos_per_stage: int = Field(default=3, ge=1, le=10)
```

### Новый модуль `src/mixer/`

#### `src/mixer/__init__.py`
- MODULE_CONTRACT: `M-MIXER`
- MODULE_MAP: `plan_stages`, `compose_mix`, `mix_to_markdown`
- START_BLOCK/END_BLOCK: вокруг импортов и списка экспортов

#### `src/mixer/stage_planner.py`
- START_BLOCK/END_BLOCK: `M-MIXER/PLANNER/PLAN_STAGES`

```python
async def plan_stages(query: str, log=None) -> list[Stage]
```

Что делает:
1. Промпт к `gemma4:e4b`:

   > Разбей запрос пользователя на 3-5 последовательных этапов.
   > Для каждого дай `title` (2-4 слова) и `description` (1-2 предложения).
   > Формат: `[{"title":"...","description":"..."}]`
   > Запрос: "{query}"

2. Парсинг JSON через `extract_json_checked`
3. Валидация: минимум 2 этапа
4. Вернуть `list[Stage]`

#### `src/mixer/mix_composer.py`
- START_BLOCK/END_BLOCK: `M-MIXER/COMPOSER/COMPOSE_MIX`

```python
async def compose_mix(query: str, stages: list[Stage], max_videos_per_stage: int = 3, log=None) -> Mix
```

Для каждого этапа:
1. `search_scenes(stage.description, top_k=max * 2)`
2. Промпт к `gemma4:e4b`:

   > Определи, какие сцены подходят к этапу "{title}".
   > Сцены: `- [{video_id}] {summary} ({start}-{end})`
   > Ответ JSON: `{"matched_indices": [0, 2, 5]}`

3. Для подходящих сцен → `MixSceneRef`

Итог: `Mix` со всеми этапами.

#### `src/mixer/mix_to_md.py`
- START_BLOCK/END_BLOCK: `M-MIXER/MD/MIX_TO_MARKDOWN`

```python
def mix_to_markdown(mix: Mix) -> str
```

Формат:
```markdown
# Замеси: {query}

## Этап 1: {title}
{description}

### 📹 {video_id} — {summary} ({start}-{end})
*Контекст:* "{text[:300]}"
*Монетизация:* {types}

---

## Этап 2: ...
```

#### `src/api/routes_mix.py`
- START_BLOCK/END_BLOCK: `M-MIXER/ROUTES/CREATE_MIX`, `M-MIXER/ROUTES/RUN` (фоновый pipeline)
- Логи: `[M-MIXER][ROUTES][MIX_CREATED]`, `[M-MIXER][ROUTES][MIX_DONE]`, `[M-MIXER][ROUTES][MIX_FAILED]`

```python
import asyncio
import uuid
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
from src.core.logging_config import get_logger
from src.core.schemas import Mix, MixRequest

router = APIRouter(prefix="/mix", tags=["mix"])
_mixes: dict[str, Mix] = {}

@router.post("/")
async def create_mix(request: MixRequest) -> dict:
    mix_id = str(uuid.uuid4())[:8]
    log = get_logger(correlation_id=mix_id)
    log.info("[M-MIXER][ROUTES][MIX_CREATED]", query=request.query)
    asyncio.create_task(_run_mix(mix_id, request, log))
    return {"mix_id": mix_id}

@router.get("/{mix_id}")
async def get_mix(mix_id: str) -> Mix:
    mix = _mixes.get(mix_id)
    if not mix:
        raise HTTPException(status_code=404, detail="Mix not found")
    return mix

@router.get("/{mix_id}/markdown")
async def get_mix_markdown(mix_id: str) -> PlainTextResponse:
    mix = _mixes.get(mix_id)
    if not mix:
        raise HTTPException(status_code=404, detail="Mix not found")
    from src.mixer.mix_to_md import mix_to_markdown
    md = mix_to_markdown(mix)
    return PlainTextResponse(md, media_type="text/markdown")
```

In-memory хранилище `_mixes: dict[str, Mix] = {}` (как `_jobs` в `routes.py`).

#### `_run_mix` — фоновый pipeline микса (аналог `_run_pipeline`)

```python
# START_BLOCK: M-MIXER/ROUTES/RUN
async def _run_mix(mix_id: str, request: MixRequest, log) -> None:
    try:
        log.info("[M-MIXER][ROUTES][RUN_START]", query=request.query)

        stages = await plan_stages(request.query, log=log)
        log.info("[M-MIXER][ROUTES][STAGES_PLANNED]", count=len(stages))

        mix = await compose_mix(
            query=request.query,
            stages=stages,
            max_videos_per_stage=request.max_videos_per_stage,
            log=log,
        )
        mix.mix_id = mix_id
        _mixes[mix_id] = mix

        log.info("[M-MIXER][ROUTES][MIX_DONE]", mix_id=mix_id, stages=len(mix.stages))
    except Exception as e:
        log.error("[M-MIXER][ROUTES][MIX_FAILED]", error=str(e))
# END_BLOCK: M-MIXER/ROUTES/RUN
```

---

## Конфигурация

В `config.yaml` добавить:

```yaml
search:
  collection: "rutube_scenes"
  embedding_model: "qwen3-embedding:0.6b"
  top_k: 20
  chroma_path: "./data/chroma"

mixer:
  llm_model: "gemma4:e4b"
  max_videos_per_stage: 3
```

В `src/config.py` добавить:

```python
@property
def search_embedding_model(self) -> str:
    return self._get("search", "embedding_model", default="qwen3-embedding:0.6b")

@property
def search_top_k(self) -> int:
    return int(self._get("search", "top_k", default=20))

@property
def search_chroma_path(self) -> str:
    return self._get("search", "chroma_path", default="./data/chroma")

@property
def search_collection(self) -> str:
    return self._get("search", "collection", default="rutube_scenes")

@property
def mixer_llm_model(self) -> str:
    return self._get("mixer", "llm_model", default="gemma4:e4b")

@property
def mixer_max_videos_per_stage(self) -> int:
    return int(self._get("mixer", "max_videos_per_stage", default=3))
```

## Зависимости

`pyproject.toml`:

```toml
dependencies = [
    "chromadb>=1.5",
]
```

```bash
pip install chromadb>=1.5
ollama pull qwen3-embedding:0.6b
```

---

## Тесты

### Phase 1 — `tests/search/` + `tests/api/`

#### `tests/search/`

`test_indexer.py`:
- `test_index_passport_empty` — пустой паспорт → 0
- `test_index_passport_single` — 1 сцена → 1 чанк
- `test_index_passport_multiple` — N сцен → N чанков
- `test_embedding_call` — мок Ollama, формат запроса
- `test_reindex_all` — мок файловой системы с .md файлами

`test_searcher.py`:
- `test_search_empty` — пустой запрос
- `test_search_with_results` — мок ChromaDB
- `test_search_with_filter` — фильтр по genre
- `test_search_no_results` — ничего не найдено

#### `tests/api/` (добавить к существующим):
- `test_routes_search.py` — GET /search с моком searcher, POST /reindex с моком indexer

### Phase 2 — `tests/mixer/` + `tests/api/`

#### `tests/mixer/`

`test_stage_planner.py`:
- `test_plan_stages_basic` — how-to → 3-5 этапов
- `test_plan_stages_minimal` — короткий запрос → ≥2 этапов
- `test_plan_stages_llm_error` — ошибка LLM → fallback

`test_mix_composer.py`:
- `test_compose_mix_basic` — 2 этапа, мок search → корректный Mix
- `test_compose_mix_empty_stage` — для этапа ничего нет
- `test_compose_mix_match` — мок LLM матчинга

`test_mix_to_md.py`:
- `test_mix_to_md_basic` — Mix → Markdown
- `test_mix_to_md_empty_stages`

#### `tests/api/` (добавить к существующим):
- `test_routes_mix.py` — POST /mix создаёт mix_id, GET /mix/{id} возвращает Mix, GET /mix/{id}/markdown возвращает PlainText, 404 для неизвестного mix_id

---

## GRACE артефакты

### `docs/development-plan.xml`
- Phase-7: M-SEARCH (search/indexer + searcher + routes)
- Phase-8: M-MIXER (mixer/stage_planner + mix_composer + mix_to_md + routes)
- DF-005: Search Flow (passport → index → search)
- DF-006: Mix Flow (query → stages → search → compose → render)
- CrossLink: M-SEARCH → M-CORE, M-PASSPORT; M-MIXER → M-SEARCH, M-CORE

### `docs/knowledge-graph.xml`
- M-SEARCH:
  - Type: PROCESSOR
  - Source: `src/search/`
  - Test: `tests/search/`
  - Exports: `fn-index_passport`, `fn-search_scenes`, `fn-reindex_all`
  - CrossLinks: M-CORE (uses-types), M-PASSPORT (receives-passports-from), M-MIXER (feeds-into)
  - Verification ref: V-M-SEARCH
- M-MIXER:
  - Type: PROCESSOR
  - Source: `src/mixer/`
  - Test: `tests/mixer/`
  - Exports: `fn-plan_stages`, `fn-compose_mix`, `fn-mix_to_md`
  - CrossLinks: M-CORE (uses-types), M-SEARCH (receives-search-results-from), M-API (orchestrates)
  - Verification ref: V-M-MIXER

### `docs/verification-plan.xml`
- V-M-SEARCH:
  - Scenarios: S-M-SEARCH-1 (index_passport basic), S-M-SEARCH-2 (search with results), S-M-SEARCH-3 (search empty/filtered)
  - RequiredMarkers: `[M-SEARCH][*][*]`
- V-M-MIXER:
  - Scenarios: S-M-MIXER-1 (plan_stages basic), S-M-MIXER-2 (compose_mix basic), S-M-MIXER-3 (mix_to_md basic)
  - RequiredMarkers: `[M-MIXER][*][*]`

### `docs/technology.xml`
- В `<key-libraries>` добавить: ChromaDB v1.5+ (vector search)
- В `<ai-models>` добавить: qwen3-embedding:0.6b (Ollama, embedding), nomic-embed-text (альтернатива)

### `AGENTS.md`
- В раздел `@src` добавить: `src/search/indexer.py` (+описание), `src/search/searcher.py`, `src/mixer/stage_planner.py`, `src/mixer/mix_composer.py`, `src/mixer/mix_to_md.py`, `src/api/routes_search.py`, `src/api/routes_mix.py`
- В раздел `@tests` добавить: `tests/search/` (+описание), `tests/mixer/` (+описание)

---

## Порядок выполнения (22 шага)

| Шаг | Что делаем | Файлы |
|-----|-----------|-------|
| 1 | Добавить chromadb в pyproject.toml + pip install | `pyproject.toml` |
| 2 | Добавить типы в schemas.py | `src/core/schemas.py` |
| 3 | Создать src/search/__init__.py | `src/search/__init__.py` |
| 4 | Создать src/search/indexer.py | `src/search/indexer.py` |
| 5 | Создать src/search/searcher.py | `src/search/searcher.py` |
| 6 | Создать tests/search/test_indexer.py | `tests/search/test_indexer.py` (+ test_reindex_all) |
| 7 | Создать tests/search/test_searcher.py | `tests/search/test_searcher.py` |
| 8 | Создать tests/api/test_routes_search.py | `tests/api/test_routes_search.py` |
| 9 | Создать src/api/routes_search.py | `src/api/routes_search.py` |
| 10 | Подключить routes_search в app.py | `src/api/app.py` — `from src.api.routes_search import router as search_router; app.include_router(search_router)` |
| 11 | Добавить index_passport() в passport_builder.py | `src/passport_builder/passport_builder.py` |
| 12 | Добавить search: в config.yaml + config.py | `config.yaml`, `src/config.py` |
| 13 | Создать src/mixer/__init__.py | `src/mixer/__init__.py` |
| 14 | Создать src/mixer/stage_planner.py | `src/mixer/stage_planner.py` |
| 15 | Создать src/mixer/mix_composer.py | `src/mixer/mix_composer.py` |
| 16 | Создать src/mixer/mix_to_md.py | `src/mixer/mix_to_md.py` |
| 17 | Создать tests/mixer/*.py | 3 файла |
| 18 | Создать tests/api/test_routes_mix.py | `tests/api/test_routes_mix.py` |
| 19 | Создать src/api/routes_mix.py | `src/api/routes_mix.py` |
| 20 | Подключить routes_mix + config.yaml mixer | `app.py` — `from src.api.routes_mix import router as mix_router; app.include_router(mix_router)`; `config.yaml` — mixer: секция; `src/config.py` — mixer_* properties |
| 21 | Обновить GRACE артефакты | 5 файлов: development-plan.xml, knowledge-graph.xml, verification-plan.xml, technology.xml, AGENTS.md |
| 22 | Запустить все тесты | `pytest tests/ -q` |

---

## Метрики успеха

| Критерий | Цель |
|----------|------|
| Search latency (p99) | <500ms |
| Embedding latency (p99) | <200ms |
| Mix generation | <30s для 5 этапов |
| Test coverage | 100% pass, все code paths |
| Auto-index | Каждый новый паспорт автоматически индексируется |
