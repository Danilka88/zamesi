# GRACE Project: RUTUBE Video Analyzer

AI-пайплайн: видео → .md паспорт с точками монетизации (AD_SLOT, ECOM_ITEM, CLIP_CANDIDATE) для RUTUBE. Audio-First + Inquisitive SLM + VLM Gatekeeper (≤6% VLM calls).

## Domain Keywords
video-analysis, monetization, e-commerce, ASR, OCR, Russian-language, VLM-gatekeeper, Qwen, Whisper, RUTUBE

## GRACE Principles
- Contract-first development
- Semantic markup for LLM navigation
- Knowledge graph as single source of truth
- Verification-driven development

## Available Skills
- `grace-init` — Bootstrap project structure
- `grace-plan` — Design module architecture
- `grace-verification` — Build tests and evidence
- `grace-execute` — Execute plan step by step
- `grace-refactor` — Safe refactoring
- `grace-fix` — Debug via semantic navigation
- `grace-refresh` — Sync artifacts with code
- `grace-reviewer` — Integrity checks
- `grace-status` — Project health
- `grace-ask` — Q&A over project artifacts

## Project References

### @docs
- `docs/requirements.xml` — Use cases and NFR
- `docs/technology.xml` — Technology stack
- `docs/development-plan.xml` — Phases, modules, data flows
- `docs/knowledge-graph.xml` — Module exports, types, cross-links
- `docs/verification-plan.xml` — Test scenarios, gates, TCO validation
- `docs/operational-packets.xml` — Execution templates

### @src
- `src/core/schemas.py` — All Pydantic contracts (JobStatus, TimelineSegment, Passport, etc.)
- `src/core/timeout_manager.py` — Timeout, retry, circuit breaker, fallback chain
- `src/core/exceptions.py` — 13 custom exception types
- `src/core/logging_config.py` — structlog config with correlation_id
- `src/config.py` — YAML config loader
- `src/audio_engine/pyav_reader.py` — Audio + I-frame extraction
- `src/audio_engine/whisper_asr.py` — Whisper.cpp ASR
- `src/audio_engine/pyannote_diarization.py` — Speaker diarization
- `src/audio_engine/timeline_merger.py` — ASR + diarization merge
- `src/vision_scanner/rapid_ocr.py` — OCR on I-frames
- `src/vision_scanner/domain_router.py` — Genre classification, VLM gate
- `src/vision_scanner/ocr_buffer.py` — OCR dedup buffer ±5s
- `src/semantic_analyzer/qwen_client.py` — Ollama API calls
- `src/semantic_analyzer/prompt_templates.py` — All LLM prompts
- `src/vision_scanner/genre_classifier.py` — LLM-driven genre classification
- `src/semantic_analyzer/scene_analyzer.py` — Pass 1 + Pass 2, VLM Gatekeeper
- `src/passport_builder/frontmatter_generator.py` — YAML frontmatter
- `src/passport_builder/validator.py` — .md structure validation
- `src/passport_builder/passport_builder.py` — Full passport assembly
- `src/api/app.py` — FastAPI app
- `src/api/routes.py` — POST/GET endpoints
- `src/api/routes_search.py` — GET /search, POST /search/reindex
- `src/api/routes_mix.py` — POST /mix, GET /mix/{id}, GET /mix/{id}/markdown
- `src/api/metrics.py` — Prometheus metrics
- `src/search/indexer.py` — ChromaDB embedding indexing (index_passport, reindex_all)
- `src/search/searcher.py` — Semantic search (search_scenes)
- `src/mixer/stage_planner.py` — LLM stage planning for mix (plan_stages)
- `src/mixer/mix_composer.py` — Search + LLM match → Mix (compose_mix)
- `src/mixer/mix_to_md.py` — Mix → Markdown render (mix_to_markdown)

### @tests
- `tests/core/` — Pydantic validation, timeout manager, circuit breaker
- `tests/audio_engine/` — ASR (whisper), diarization (pyannote), ffmpeg (pyav), timeline merger
- `tests/vision_scanner/` — Domain router, OCR (rapid_ocr), OCR buffer, genre classifier
- `tests/semantic_analyzer/` — Qwen client (text/vision/frontmatter), scene analyzer, VLM gatekeeper
- `tests/passport_builder/` — Frontmatter generator, passport builder, validator
- `tests/api/` — Health, endpoints, metrics, search routes, mix routes
- `tests/search/` — Indexer (empty/single/multiple/embedding), Searcher (empty/results/filter/no-results)
- `tests/mixer/` — Stage planner (basic/minimal/llm-error), Mix composer (basic/empty/match), Mix to MD (basic/empty)
- `tests/integration.py` — Full pipeline e2e (requires demo video)

## Config
`config.yaml` — Timeouts, retries, model paths, circuit breaker params
