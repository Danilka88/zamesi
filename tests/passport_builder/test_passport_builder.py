
import pytest

from src.core.schemas import (
    MonetizationItem,
    Passport,
    PassportFrontmatter,
    SceneAnalysisResult,
    TimelineSegment,
)
from src.passport_builder.passport_builder import _escape_yaml_value, build_passport, passport_to_markdown


@pytest.fixture
def sample_timeline() -> list[TimelineSegment]:
    return [
        TimelineSegment(speaker="speaker_0", start_sec=0.0, end_sec=10.0, text="Шаг первый"),
        TimelineSegment(speaker="speaker_0", start_sec=10.0, end_sec=20.0, text="Шаг второй"),
    ]


@pytest.fixture
def sample_scenes() -> list[SceneAnalysisResult]:
    return [
        SceneAnalysisResult(
            action_is_clear=True,
            requires_vision=False,
            scene_summary="Начало ремонта",
            monetization=[MonetizationItem(type="ecom_item", search_query="ключ на 13")],
        ),
        SceneAnalysisResult(
            action_is_clear=True,
            requires_vision=False,
            scene_summary="Финал",
            monetization=[MonetizationItem(type="ad_slot", search_query="инструменты", reason="контекст")],
            clip_candidate=None,
        ),
    ]


@pytest.mark.asyncio
async def test_build_passport_success(monkeypatch, sample_timeline, sample_scenes):
    async def fake_frontmatter(*a, **kw):
        return PassportFrontmatter(video_id="test", domain_type="how_to")

    monkeypatch.setattr("src.passport_builder.passport_builder.build_frontmatter", fake_frontmatter)
    passport = await build_passport("test_video", sample_timeline, sample_scenes)
    assert isinstance(passport, Passport)
    assert passport.frontmatter.video_id == "test"
    assert len(passport.timeline) == 2
    assert len(passport.raw_timeline_segments) == 2


@pytest.mark.asyncio
async def test_build_passport_empty_timeline(monkeypatch):
    async def fake_frontmatter(*a, **kw):
        return PassportFrontmatter(video_id="empty", domain_type="unknown")

    monkeypatch.setattr("src.passport_builder.passport_builder.build_frontmatter", fake_frontmatter)
    passport = await build_passport("empty", [], [])
    assert passport.timeline == []


def test_passport_to_markdown(sample_timeline, sample_scenes):
    passport = Passport(
        frontmatter=PassportFrontmatter(video_id="test", domain_type="how_to", seo_title="Test Video"),
        timeline=sample_scenes,
        raw_timeline_segments=sample_timeline,
    )
    md = passport_to_markdown(passport)
    assert "video_id: \"test\"" in md
    assert "domain_type: how_to" in md
    assert "ECOM_ITEM" in md
    assert "AD_SLOT" in md
    assert "00:00" in md


def test_passport_to_markdown_no_segments():
    scene = SceneAnalysisResult(
        action_is_clear=True,
        requires_vision=False,
        scene_summary="Тестовая сцена",
    )
    passport = Passport(
        frontmatter=PassportFrontmatter(video_id="no_seg", domain_type="test"),
        timeline=[scene],
        raw_timeline_segments=[],
    )
    md = passport_to_markdown(passport)
    assert "Тестовая сцена" in md
    assert "video_id: \"no_seg\"" in md


def test_passport_to_markdown_escape_yaml():
    assert _escape_yaml_value(r'hello"world') == r'hello\"world'
    assert _escape_yaml_value("line1\nline2") == r"line1\nline2"
    assert _escape_yaml_value("col1\tcol2") == r"col1\tcol2"
    assert _escape_yaml_value("normal text") == "normal text"


def test_passport_to_markdown_escape_special_chars():
    passport = Passport(
        frontmatter=PassportFrontmatter(
            video_id="test",
            domain_type="test",
            seo_title="Tab\there\nnewline\"quote",
        ),
        timeline=[],
        raw_timeline_segments=[],
    )
    md = passport_to_markdown(passport)
    assert "Tab\\there" in md
    assert "newline\\" in md
    assert '\\"quote' in md


def test_passport_to_markdown_monetization_items():
    scenes = [
        SceneAnalysisResult(
            action_is_clear=True,
            requires_vision=False,
            scene_summary="Сцена",
            monetization=[
                MonetizationItem(type="ecom_item", search_query="товар", confidence=0.85),
                MonetizationItem(type="ad_slot", search_query="таргет", reason="подходит"),
            ],
        ),
    ]
    seg = TimelineSegment(speaker="spk", start_sec=0.0, end_sec=10.0, text="текст")
    passport = Passport(
        frontmatter=PassportFrontmatter(video_id="mtest", domain_type="test"),
        timeline=scenes,
        raw_timeline_segments=[seg],
    )
    md = passport_to_markdown(passport)
    assert "ECOM_ITEM" in md
    assert "AD_SLOT" in md
    assert "Уверенность: 85%" in md
    assert "Таргетинг" in md
