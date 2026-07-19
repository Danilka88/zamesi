import pytest

from src.core.schemas import Passport, PassportFrontmatter, SceneAnalysisResult
from src.passport_builder.validator import validate


def test_valid_passport():
    fm = PassportFrontmatter(video_id="test_001", domain_type="how_to")
    sr = SceneAnalysisResult(
        action_is_clear=True,
        requires_vision=False,
        scene_summary="Test scene [00:10 - 01:00]",
    )
    passport = Passport(frontmatter=fm, timeline=[sr])
    errors = validate(passport)
    assert len(errors) == 0


def test_missing_video_id():
    fm = PassportFrontmatter(video_id="", domain_type="test")
    passport = Passport(frontmatter=fm, timeline=[])
    errors = validate(passport)
    assert any("video_id" in e for e in errors)


def test_invalid_brand_safety():
    with pytest.raises(Exception):
        PassportFrontmatter(video_id="t", domain_type="t", brand_safety_score=150)


def test_ecom_without_search_query():
    from src.core.schemas import MonetizationItem
    fm = PassportFrontmatter(video_id="t", domain_type="t")
    sr = SceneAnalysisResult(
        action_is_clear=True,
        requires_vision=False,
        scene_summary="test",
        monetization=[MonetizationItem(type="ecom_item", search_query="")],
    )
    passport = Passport(frontmatter=fm, timeline=[sr])
    errors = validate(passport)
    assert any("ECOM_ITEM" in e for e in errors)
