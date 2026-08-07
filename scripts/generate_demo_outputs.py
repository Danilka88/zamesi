#!/usr/bin/env python3
"""Генерация артефактов output/ для 7 demo-паспортов расширения.

Читает demo-паспорты из chrome-extension/src/data/passports/, коэрсит их в канонический
бэкенд-контракт Passport (audio_matches/celebrity_voice сохраняются, тайминги сцен
дозаполняются из raw_timeline_segments) и пишет output/{video_id}.json + .md через
save_passport_to_disk — как если бы паспорта реализовала сама система.

Запуск: python scripts/generate_demo_outputs.py
"""
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# config.yaml использует относительные пути (./output) — работаем из корня репозитория.
os.chdir(REPO_ROOT)


def _normalize_audio_matches(data):
    """Demo-данные содержат album: null — приводим к str-контракту MusicMatch."""
    for m in data.get("audio_matches", []):
        if m.get("album") is None:
            m["album"] = ""
    return data


def _fill_scene_timing(passport):
    """Дозаполнить start_sec/end_sec сцен из raw_timeline_segments по индексу."""
    for i, scene in enumerate(passport.timeline):
        if i < len(passport.raw_timeline_segments):
            seg = passport.raw_timeline_segments[i]
            if scene.start_sec is None:
                scene.start_sec = seg.start_sec
            if scene.end_sec is None:
                scene.end_sec = seg.end_sec
    return passport


def main() -> int:
    import json

    from src.core.config import config
    from src.core.schemas import Passport
    from src.passport_builder.passport_builder import save_passport_to_disk
    from src.passport_builder.validator import validate

    config.load()

    passports_dir = REPO_ROOT / "chrome-extension" / "src" / "data" / "passports"
    files = sorted(passports_dir.glob("*.json"))
    if not files:
        print(f"no demo passports found in {passports_dir}")
        return 1

    for f in files:
        data = json.loads(f.read_text(encoding="utf-8"))
        _normalize_audio_matches(data)
        passport = Passport.model_validate(data)
        _fill_scene_timing(passport)
        errors = validate(passport)
        if errors:
            print(f"[{passport.frontmatter.video_id}] validation errors: {errors}")
        save_passport_to_disk(passport)
        print(f"[OK] {passport.frontmatter.video_id} -> output/{passport.frontmatter.video_id}.{{json,md}}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
