import pytest

from src.core.schemas import (
    Passport,
    PassportFrontmatter,
    SceneAnalysisResult,
    TimelineSegment,
)


@pytest.mark.asyncio
async def test_index_passport_empty():
    passport = Passport(
        frontmatter=PassportFrontmatter(video_id="empty", domain_type="how_to"),
        timeline=[],
    )
    from src.search.indexer import index_passport
    result = await index_passport(passport)
    assert result == 0


@pytest.mark.asyncio
async def test_index_passport_single(monkeypatch):
    async def mock_embed(*a, **kw):
        return [0.1] * 1024

    monkeypatch.setattr("src.search.indexer.embed_text", mock_embed)

    passport = Passport(
        frontmatter=PassportFrontmatter(video_id="test_001", domain_type="how_to"),
        timeline=[
            SceneAnalysisResult(
                action_is_clear=True, requires_vision=False,
                scene_summary="Test scene",
            ),
        ],
        raw_timeline_segments=[
            TimelineSegment(speaker="A", start_sec=0.0, end_sec=10.0, text="hello"),
        ],
    )
    from src.search.indexer import index_passport
    result = await index_passport(passport)
    assert result == 1


@pytest.mark.asyncio
async def test_index_passport_multiple(monkeypatch):
    async def mock_embed(*a, **kw):
        return [0.1] * 1024

    monkeypatch.setattr("src.search.indexer.embed_text", mock_embed)

    passport = Passport(
        frontmatter=PassportFrontmatter(video_id="test_002", domain_type="review"),
        timeline=[
            SceneAnalysisResult(
                action_is_clear=True, requires_vision=False,
                scene_summary=f"Scene {i}",
            )
            for i in range(5)
        ],
        raw_timeline_segments=[
            TimelineSegment(speaker="A", start_sec=float(i * 10), end_sec=float(i * 10 + 10), text="text")
            for i in range(5)
        ],
    )
    from src.search.indexer import index_passport
    result = await index_passport(passport)
    assert result == 5


@pytest.mark.asyncio
async def test_embedding_call(monkeypatch):
    called = []

    async def mock_embed(text, role="embedding_model"):
        called.append({"text": text, "role": role})
        return [0.1] * 1024

    monkeypatch.setattr("src.search.indexer.embed_text", mock_embed)

    from src.search.indexer import embed_text
    result = await embed_text("test text")
    assert len(result) == 1024
    assert len(called) == 1
    assert called[0]["text"] == "test text"
