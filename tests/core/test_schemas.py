import pytest
from pydantic import ValidationError

from src.core.schemas import (
    ClipCandidate,
    MonetizationItem,
    PassportFrontmatter,
    SceneAnalysisResult,
)


def test_valid_frontmatter(capture_logs):
    fm = PassportFrontmatter(
        video_id="test_001",
        domain_type="how_to_repair",
        brand_safety_score=95,
        seo_title="Test",
    )
    assert fm.brand_safety_score == 95

    from src.core.logging_config import get_logger
    get_logger().info("[M-CORE][SCHEMAS][VALID_ENUM]")


def test_frontmatter_brand_safety_clamped():
    with pytest.raises(ValidationError):
        PassportFrontmatter(
            video_id="test",
            domain_type="test",
            brand_safety_score=150,
        )


def test_scene_result_with_monetization(capture_logs):
    sr = SceneAnalysisResult(
        action_is_clear=True,
        requires_vision=False,
        scene_summary="Test scene",
        monetization=[
            MonetizationItem(type="ecom_item", search_query="test product"),
        ],
    )
    assert len(sr.monetization) == 1
    assert sr.monetization[0].search_query == "test product"

    from src.core.logging_config import get_logger
    get_logger().info("[M-CORE][SCHEMAS][MONETIZATION]")


def test_scene_result_with_clip():
    sr = SceneAnalysisResult(
        action_is_clear=True,
        requires_vision=False,
        scene_summary="Clip scene",
        clip_candidate=ClipCandidate(
            hook="Amazing hook",
            time_range_start=10.0,
            time_range_end=30.0,
            virality_potential="high",
        ),
    )
    assert sr.clip_candidate is not None
    assert sr.clip_candidate.virality_potential == "high"
