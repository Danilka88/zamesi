import pytest
from httpx import ASGITransport, AsyncClient

from src.api.app import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.asyncio
async def test_create_mix(monkeypatch):
    async def mock_plan(*a, **kw):
        return [{"title": "Step 1", "description": "First"}, {"title": "Step 2", "description": "Second"}]

    async def mock_compose(*a, **kw):
        from src.core.schemas import Mix, MixStage
        return Mix(query="test", stages=[MixStage(title="Step 1", description="First", scenes=[])])

    monkeypatch.setattr("src.api.routes_mix.plan_stages", mock_plan)
    monkeypatch.setattr("src.api.routes_mix.compose_mix", mock_compose)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/mix/", json={"query": "test query"})
        assert resp.status_code == 200
        data = resp.json()
        assert "mix_id" in data


@pytest.mark.asyncio
async def test_get_mix_unknown():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/mix/nonexistent")
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_mix_markdown_unknown():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/mix/nonexistent/markdown")
        assert resp.status_code == 404
