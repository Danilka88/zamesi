from unittest.mock import patch

import pytest

from src.core.embedding import (
    embed_text,
    get_chroma_client,
)


def test_get_chroma_client_returns_singleton():
    c1 = get_chroma_client()
    c2 = get_chroma_client()
    assert c1 is c2


@pytest.mark.asyncio
async def test_embed_text_success():
    with patch("src.core.embedding.llm_router.embed") as mock_embed:
        mock_embed.return_value = [0.1, 0.2, 0.3]

        result = await embed_text("hello")
        assert result == [0.1, 0.2, 0.3]
        mock_embed.assert_called_once_with("hello", role="embedding_model")


@pytest.mark.asyncio
async def test_embed_text_http_error():
    with patch("src.core.embedding.llm_router.embed") as mock_embed:
        mock_embed.side_effect = Exception("HTTP 500")

        with pytest.raises(Exception, match="HTTP 500"):
            await embed_text("hello")
