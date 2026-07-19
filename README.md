# RUTUBE Video Analyzer

AI pipeline: **video → .md passport** с AD_SLOT, ECOM_ITEM, CLIP_CANDIDATE.

## Требования

- Python 3.13+
- [Ollama](https://ollama.com) с моделями `gemma4:e4b` (текст) и `qwen3.5:9b` (vision)
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) с моделью `large-v3`
- ffmpeg

## Установка

```bash
pip install -e .
pip install -e ".[dev]"
```

## Конфигурация

`config.yaml` — все таймауты, ретраи, пути к моделям.

## Запуск

```bash
uvicorn src.api.app:app --reload --port 8000
```

Отправить видео:
```bash
curl -X POST -F "file=@video.mp4" http://localhost:8000/analyze
```

Получить результат:
```bash
curl http://localhost:8000/analyze/{job_id}
```

Получить Markdown:
```bash
curl http://localhost:8000/analyze/{job_id}/markdown
```

Метрики Prometheus:
```bash
curl http://localhost:8000/metrics
```

## Тестирование

```bash
pytest
```

## Архитектура

```
[MP4] → PyAV → Whisper.cpp (ASR) → PyAnnote (диаризация) → OCR
                                                               │
                                          Gemma4:e4b (текст) ←─┤
                                               │                │
                                    (непонятно + VLM триггер?)  │
                                               │                │
                                    Qwen3.5:9b (+I-frame) ←────┘
                                               │
                                         .md паспорт
```

Трёхуровневый VLM Gatekeeper:
1. **DomainRouter** — жанровая блокировка (подкасты/лекции — VLM off)
2. **Monetization Filter** — только коммерческие сцены
3. **OCR-дедупликация** — если текст на экране, VLM не нужен
