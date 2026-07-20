import pytest

from src.search.searcher import search_scenes


@pytest.mark.asyncio
async def test_search_empty(monkeypatch):
    async def mock_embed(*a, **kw):
        return [0.0] * 1024

    def mock_query(*a, **kw):
        return {"ids": [[]], "distances": [[]], "metadatas": [[]], "documents": [[]]}

    monkeypatch.setattr("src.search.searcher.embed_text", mock_embed)
    monkeypatch.setattr("src.search.searcher.get_chroma_client", lambda: FakeClient(mock_query))

    results = await search_scenes("", top_k=5)
    assert isinstance(results, list)


@pytest.mark.asyncio
async def test_search_no_results(monkeypatch):
    async def mock_embed(*a, **kw):
        return [0.0] * 1024

    def mock_query(*a, **kw):
        return {"ids": [[]], "distances": [[]], "metadatas": [[]], "documents": [[]]}

    monkeypatch.setattr("src.search.searcher.embed_text", mock_embed)
    monkeypatch.setattr("src.search.searcher.get_chroma_client", lambda: FakeClient(mock_query))

    results = await search_scenes("nothing", top_k=5)
    assert results == []


@pytest.mark.asyncio
async def test_search_with_results(monkeypatch):
    async def mock_embed(*a, **kw):
        return [0.0] * 1024

    def mock_query(*a, **kw):
        return {
            "ids": [["vid1_scene_0", "vid1_scene_1"]],
            "distances": [[0.1, 0.2]],
            "metadatas": [[
                {"video_id": "vid1", "scene_index": "0",
                 "summary": "First", "genre": "how_to",
                 "monetization_types": ""},
                {"video_id": "vid1", "scene_index": "1",
                 "summary": "Second", "genre": "how_to",
                 "monetization_types": "ad_slot"},
            ]],
            "documents": [["doc0", "doc1"]],
        }

    monkeypatch.setattr("src.search.searcher.embed_text", mock_embed)
    monkeypatch.setattr("src.search.searcher.get_chroma_client", lambda: FakeClient(mock_query))

    results = await search_scenes("test", top_k=5)
    assert len(results) == 2
    assert results[0].video_id == "vid1"
    assert results[0].scene_index == 0


@pytest.mark.asyncio
async def test_search_with_filter(monkeypatch):
    async def mock_embed(*a, **kw):
        return [0.0] * 1024

    captured_filter = []

    def mock_query(*a, **kw):
        captured_filter.append(kw.get("where"))
        return {"ids": [[]], "distances": [[]], "metadatas": [[]], "documents": [[]]}

    monkeypatch.setattr("src.search.searcher.embed_text", mock_embed)
    monkeypatch.setattr("src.search.searcher.get_chroma_client", lambda: FakeClient(mock_query))

    await search_scenes("test", top_k=5, filter={"genre": "how_to"})
    assert len(captured_filter) == 1
    assert captured_filter[0] == {"genre": "how_to"}


class FakeClient:
    def __init__(self, query_fn):
        self._query_fn = query_fn

    def get_or_create_collection(self, **kw):
        return FakeCollection(self._query_fn)


class FakeCollection:
    def __init__(self, query_fn):
        self._query_fn = query_fn

    def query(self, **kw):
        return self._query_fn(**kw)
