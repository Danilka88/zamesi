import pytest
from httpx import ASGITransport, AsyncClient

from src.api.app import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.asyncio
async def test_search_endpoint_no_query(monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/search/")
        assert resp.status_code == 422


@pytest.mark.asyncio
async def test_search_endpoint_with_query(monkeypatch):
    def mock_search(*a, **kw):
        return []

    monkeypatch.setattr("src.api.routes_search.search_scenes", mock_search)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/search/", params={"q": "test query"})
        assert resp.status_code == 200
        assert resp.json() == []


@pytest.mark.asyncio
async def test_reindex_endpoint(monkeypatch):
    def mock_reindex(*a, **kw):
        return 5

    monkeypatch.setattr("src.api.routes_search.reindex_all", mock_reindex)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/search/reindex")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["indexed"] == 5
