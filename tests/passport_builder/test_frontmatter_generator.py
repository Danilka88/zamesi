
import pytest

from src.core.schemas import PassportFrontmatter
from src.passport_builder.frontmatter_generator import build_frontmatter


@pytest.mark.asyncio
async def test_build_frontmatter_success(monkeypatch):
    async def fake_generate(*a, **kw):
        return (
            '{"domain_type": "how_to", "brand_safety_score": 85, '
            '"target_audience": ["diy"], "seo_title": "Test video", '
            '"seo_tags": ["ремонт"], "trending_cluster": "", '
            '"auto_playlists": [], "ad_targeting_keywords": ["инструмент"]}'
        )

    monkeypatch.setattr("src.passport_builder.frontmatter_generator.generate_frontmatter", fake_generate)
    fm = await build_frontmatter("vid_001", "транскрипт видео")
    assert isinstance(fm, PassportFrontmatter)
    assert fm.video_id == "vid_001"
    assert fm.domain_type == "how_to"
    assert fm.brand_safety_score == 85
    assert fm.seo_title == "Test video"
    assert fm.ad_targeting_keywords == ["инструмент"]


@pytest.mark.asyncio
async def test_build_frontmatter_llm_failure_fallback(monkeypatch):
    async def failing(*a, **kw):
        msg = "LLM down"
        raise RuntimeError(msg)

    monkeypatch.setattr("src.passport_builder.frontmatter_generator.generate_frontmatter", failing)
    fm = await build_frontmatter("vid_002", "транскрипт")
    assert fm.video_id == "vid_002"
    assert fm.domain_type == "unknown"
    assert fm.seo_title == "транскрипт"


@pytest.mark.asyncio
async def test_build_frontmatter_empty_transcript(monkeypatch):
    async def fake(*a, **kw):
        return '{"domain_type": "unknown", "brand_safety_score": 100, "seo_title": ""}'

    monkeypatch.setattr("src.passport_builder.frontmatter_generator.generate_frontmatter", fake)
    fm = await build_frontmatter("vid_003", "")
    assert fm.domain_type == "unknown"
    assert fm.seo_title == ""


@pytest.mark.asyncio
async def test_build_frontmatter_brand_safety_clamped(monkeypatch):
    async def fake(*a, **kw):
        return '{"domain_type": "test", "brand_safety_score": 999, "seo_title": "test"}'

    monkeypatch.setattr("src.passport_builder.frontmatter_generator.generate_frontmatter", fake)
    fm = await build_frontmatter("vid_004", "текст")
    assert fm.brand_safety_score == 100


@pytest.mark.asyncio
async def test_build_frontmatter_passes_genre_hint(monkeypatch):
    captured = {}

    async def fake_generate(full_transcript, genre="", log=None):
        captured["genre"] = genre
        captured["transcript"] = full_transcript
        return '{"domain_type": "travel_vlog", "brand_safety_score": 90, "seo_title": "Вьетнам"}'

    monkeypatch.setattr("src.passport_builder.frontmatter_generator.generate_frontmatter", fake_generate)
    fm = await build_frontmatter("vid_005", "текст про Нячанг", genre="travel_vlog")
    assert captured["genre"] == "travel_vlog"
    assert captured["transcript"] == "текст про Нячанг"
    assert fm.domain_type == "travel_vlog"


@pytest.mark.asyncio
async def test_build_frontmatter_domain_from_llm_not_genre(monkeypatch):
    async def fake_generate(full_transcript, genre="", log=None):
        return '{"domain_type": "game_review", "brand_safety_score": 80, "seo_title": "Обзор Atomic Heart"}'

    monkeypatch.setattr("src.passport_builder.frontmatter_generator.generate_frontmatter", fake_generate)
    fm = await build_frontmatter("vid_006", "геймплей", genre="how_to")
    assert fm.domain_type == "game_review"
