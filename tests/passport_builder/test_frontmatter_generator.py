
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
