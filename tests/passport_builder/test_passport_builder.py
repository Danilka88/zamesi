
import pytest

from src.core.schemas import (
    CelebrityVoice,
    MonetizationItem,
    MusicMatch,
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


def test_passport_to_markdown_includes_audio_and_celebrity():
    passport = Passport(
        frontmatter=PassportFrontmatter(video_id="audio_test", domain_type="game_review"),
        timeline=[],
        raw_timeline_segments=[],
        audio_matches=[
            MusicMatch(track_name="Sound of Silence", artist="Disturbed", confidence=0.93, genre="rock", year=2015),
            MusicMatch(track_name="Hurt", artist="Nine Inch Nails", confidence=0.81),
        ],
        celebrity_voice=CelebrityVoice(name="Дмитрий Нагиев", profession="актёр", confidence=0.87),
    )
    md = passport_to_markdown(passport)
    assert "# Музыка" in md
    assert "Disturbed — Sound of Silence" in md
    assert "уверенность: 93%" in md
    assert "Nine Inch Nails — Hurt" in md
    assert "# Знаменитость" in md
    assert "Дмитрий Нагиев" in md
    assert "актёр" in md


def test_passport_to_markdown_no_audio_celebrity():
    passport = Passport(
        frontmatter=PassportFrontmatter(video_id="plain", domain_type="how_to"),
        timeline=[],
        raw_timeline_segments=[],
    )
    md = passport_to_markdown(passport)
    assert "Треки не найдены" in md
    assert "Знаменитость не распознана" in md


def test_passport_roundtrip_audio_and_celebrity():
    passport = Passport(
        frontmatter=PassportFrontmatter(video_id="rt", domain_type="travel_vlog"),
        timeline=[],
        raw_timeline_segments=[],
        audio_matches=[MusicMatch(track_name="t", artist="a", confidence=0.7, genre="g", album="al", year=2020)],
        celebrity_voice=CelebrityVoice(name="n", profession="p", confidence=0.8),
    )
    dumped = passport.model_dump_json(indent=2)
    assert '"audio_matches"' in dumped
    assert '"celebrity_voice"' in dumped
    restored = Passport.model_validate_json(dumped)
    assert restored.audio_matches[0].artist == "a"
    assert restored.celebrity_voice.name == "n"


@pytest.mark.asyncio
async def test_build_passport_fills_scene_timing(monkeypatch, sample_timeline, sample_scenes):
    async def fake_frontmatter(*a, **kw):
        return PassportFrontmatter(video_id="timing", domain_type="how_to")

    monkeypatch.setattr("src.passport_builder.passport_builder.build_frontmatter", fake_frontmatter)
    passport = await build_passport("timing", sample_timeline, sample_scenes)
    assert passport.timeline[0].start_sec == 0.0
    assert passport.timeline[0].end_sec == 10.0
    assert passport.timeline[1].start_sec == 10.0
    assert passport.timeline[1].end_sec == 20.0


@pytest.mark.asyncio
async def test_build_passport_stores_audio_and_celebrity(monkeypatch, sample_timeline, sample_scenes):
    async def fake_frontmatter(*a, **kw):
        return PassportFrontmatter(video_id="audio", domain_type="game_review")

    monkeypatch.setattr("src.passport_builder.passport_builder.build_frontmatter", fake_frontmatter)
    passport = await build_passport(
        "audio",
        sample_timeline,
        sample_scenes,
        music_matches=[MusicMatch(track_name="t", artist="a", confidence=0.9)],
        celebrity_voice=CelebrityVoice(name="celeb", profession="", confidence=0.7),
    )
    assert len(passport.audio_matches) == 1
    assert passport.audio_matches[0].track_name == "t"
    assert passport.celebrity_voice.name == "celeb"
