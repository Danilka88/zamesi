import pytest

from src.core.schemas import Stage


@pytest.mark.asyncio
async def test_compose_mix_basic(monkeypatch):
    def mock_search(*a, **kw):
        from src.core.schemas import SearchResult
        return [SearchResult(
            video_id="v1", scene_index=0,
            start_sec=0.0, end_sec=10.0,
            summary="Test scene", speaker="A", text="hello",
        )]

    async def mock_call_ollama(*a, **kw):
        return '{"matched_indices": [0]}'

    monkeypatch.setattr("src.mixer.mix_composer.search_scenes", mock_search)
    monkeypatch.setattr("src.mixer.mix_composer.timeout_manager.call_ollama", mock_call_ollama)

    from src.mixer.mix_composer import compose_mix
    stages = [Stage(title="Step 1", description="First step")]
    result = await compose_mix("test query", stages, log=None)
    assert result.query == "test query"
    assert len(result.stages) == 1
    assert len(result.stages[0].scenes) == 1
    assert result.stages[0].scenes[0].video_id == "v1"


@pytest.mark.asyncio
async def test_compose_mix_empty_stage(monkeypatch):
    def mock_search(*a, **kw):
        return []

    monkeypatch.setattr("src.mixer.mix_composer.search_scenes", mock_search)

    from src.mixer.mix_composer import compose_mix
    stages = [Stage(title="Empty", description="No content")]
    result = await compose_mix("empty", stages, log=None)
    assert len(result.stages) == 1
    assert result.stages[0].scenes == []


@pytest.mark.asyncio
async def test_compose_mix_match(monkeypatch):
    def mock_search(*a, **kw):
        from src.core.schemas import SearchResult
        return [
            SearchResult(video_id="v1", scene_index=0, start_sec=0.0, end_sec=10.0, summary="A"),
            SearchResult(video_id="v2", scene_index=1, start_sec=10.0, end_sec=20.0, summary="B"),
        ]

    async def mock_call_ollama(*a, **kw):
        return '{"matched_indices": [1]}'

    monkeypatch.setattr("src.mixer.mix_composer.search_scenes", mock_search)
    monkeypatch.setattr("src.mixer.mix_composer.timeout_manager.call_ollama", mock_call_ollama)

    from src.mixer.mix_composer import compose_mix
    stages = [Stage(title="Match", description="Pick one")]
    result = await compose_mix("match", stages, log=None)
    assert len(result.stages[0].scenes) == 1
    assert result.stages[0].scenes[0].video_id == "v2"
