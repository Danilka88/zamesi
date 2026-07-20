from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.core.embedding import (
    embed_text,
    get_async_http,
    get_chroma_client,
)


def test_get_chroma_client_returns_singleton():
    c1 = get_chroma_client()
    c2 = get_chroma_client()
    assert c1 is c2


def test_get_async_http_returns_singleton():
    h1 = get_async_http()
    h2 = get_async_http()
    assert h1 is h2


@pytest.mark.asyncio
async def test_embed_text_success():
    fake_resp = MagicMock()
    fake_resp.json.return_value = {"embeddings": [[0.1, 0.2, 0.3]]}

    with patch("src.core.embedding.get_async_http") as mock_get_http:
        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=fake_resp)
        mock_get_http.return_value = mock_http

        result = await embed_text("hello")
        assert result == [0.1, 0.2, 0.3]


@pytest.mark.asyncio
async def test_embed_text_http_error():
    fake_resp = MagicMock()
    fake_resp.raise_for_status.side_effect = Exception("HTTP 500")

    with patch("src.core.embedding.get_async_http") as mock_get_http:
        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=fake_resp)
        mock_get_http.return_value = mock_http

        with pytest.raises(Exception, match="HTTP 500"):
            await embed_text("hello")
