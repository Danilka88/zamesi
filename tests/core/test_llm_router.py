from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.core.exceptions import ConfigError


@pytest.fixture
def mock_config():
    with patch("src.core.llm_router.config") as cfg:
        cfg.providers = {
            "ollama": {"type": "ollama", "endpoint": "http://ollama:11434"},
            "yandex": {"type": "openai", "endpoint": "https://yandex.api/v1", "api_key": "test-key"},
            "openrouter": {"type": "openai", "endpoint": "https://openrouter.ai/v1", "api_key": "or-key"},
        }
        cfg.routing = {
            "text_model":       [{"provider": "ollama", "model": "gemma4:e4b"}],
            "vision_model":     [{"provider": "ollama", "model": "qwen3.5:9b"}],
            "classifier_model": [{"provider": "ollama", "model": "qwen3.5:0.8b"}],
            "embedding_model":  [{"provider": "yandex", "model": "yandex-embed"}],
        }
        cfg.ollama_temperature = 0.1
        cfg.ollama_max_tokens = 4096
        yield cfg


@pytest.fixture
def mock_config_fallback():
    with patch("src.core.llm_router.config") as cfg:
        cfg.providers = {
            "ollama":     {"type": "ollama", "endpoint": "http://ollama:11434"},
            "yandex":     {"type": "openai", "endpoint": "https://yandex.api/v1", "api_key": "test-key"},
            "openrouter": {"type": "openai", "endpoint": "https://openrouter.ai/v1", "api_key": "or-key"},
        }
        cfg.routing = {
            "text_model": [
                {"provider": "ollama", "model": "gemma4:e4b"},
                {"provider": "yandex", "model": "yandexgpt"},
                {"provider": "openrouter", "model": "openai/gpt-4o-mini"},
            ],
        }
        cfg.ollama_temperature = 0.1
        cfg.ollama_max_tokens = 4096
        yield cfg


@pytest.mark.asyncio
async def test_provider_for_found(mock_config):
    from src.core.llm_router import LLMRouter

    router = LLMRouter()
    prov = router.provider_for("text_model")
    assert prov["type"] == "ollama"
    assert prov["endpoint"] == "http://ollama:11434"


@pytest.mark.asyncio
async def test_provider_for_missing(mock_config):
    from src.core.llm_router import LLMRouter

    router = LLMRouter()
    with pytest.raises(ConfigError, match="Provider 'bogus' for role 'text_model' not configured"):
        mock_config.routing["text_model"] = [{"provider": "bogus", "model": "x"}]
        router.provider_for("text_model")


@pytest.mark.asyncio
async def test_model_for(mock_config):
    from src.core.llm_router import LLMRouter

    router = LLMRouter()
    assert router.model_for("text_model") == "gemma4:e4b"
    assert router.model_for("embedding_model") == "yandex-embed"


@pytest.mark.asyncio
async def test_infer_ollama_text(mock_config):
    fake_resp = MagicMock()
    fake_resp.json.return_value = {"response": '{"ok": true}'}

    from src.core.llm_router import LLMRouter

    router = LLMRouter()
    router._client = AsyncMock()
    router._client.post = AsyncMock(return_value=fake_resp)

    result = await router.infer(prompt="hello", role="text_model")

    assert result == '{"ok": true}'
    call_kwargs = router._client.post.call_args
    assert call_kwargs[0][0] == "http://ollama:11434/api/generate"
    assert call_kwargs[1]["json"]["model"] == "gemma4:e4b"
    assert call_kwargs[1]["json"]["prompt"] == "hello"


@pytest.mark.asyncio
async def test_infer_ollama_vision(mock_config):
    fake_resp = MagicMock()
    fake_resp.json.return_value = {"response": '{"description": "image description"}'}

    from src.core.llm_router import LLMRouter

    router = LLMRouter()
    router._client = AsyncMock()
    router._client.post = AsyncMock(return_value=fake_resp)

    result = await router.infer(prompt="describe", role="vision_model", image_base64="abc123")

    assert result == '{"description": "image description"}'
    call_json = router._client.post.call_args[1]["json"]
    assert "images" in call_json
    assert call_json["images"] == ["abc123"]


@pytest.mark.asyncio
async def test_infer_openai_text(mock_config):
    fake_resp = MagicMock()
    fake_resp.json.return_value = {"choices": [{"message": {"content": "hello from yandex"}}]}

    mock_config.routing["text_model"] = [{"provider": "yandex", "model": "yandexgpt"}]

    from src.core.llm_router import LLMRouter

    router = LLMRouter()
    router._client = AsyncMock()
    router._client.post = AsyncMock(return_value=fake_resp)

    result = await router.infer(prompt="hi", role="text_model")

    assert result == "hello from yandex"
    call = router._client.post.call_args
    assert "yandex.api" in call[0][0]
    assert "Authorization" in call[1]["headers"]
    assert call[1]["json"]["model"] == "yandexgpt"


@pytest.mark.asyncio
async def test_embed_ollama(mock_config):
    fake_resp = MagicMock()
    fake_resp.json.return_value = {"embeddings": [[0.1, 0.2, 0.3]]}

    mock_config.routing["embedding_model"] = [{"provider": "ollama", "model": "qwen-embed"}]

    from src.core.llm_router import LLMRouter

    router = LLMRouter()
    router._client = AsyncMock()
    router._client.post = AsyncMock(return_value=fake_resp)

    result = await router.embed("test text", role="embedding_model")

    assert result == [0.1, 0.2, 0.3]
    call = router._client.post.call_args
    assert call[0][0] == "http://ollama:11434/api/embed"
    assert call[1]["json"]["model"] == "qwen-embed"


@pytest.mark.asyncio
async def test_embed_openai(mock_config):
    fake_resp = MagicMock()
    fake_resp.json.return_value = {"data": [{"embedding": [0.4, 0.5, 0.6]}]}

    from src.core.llm_router import LLMRouter

    router = LLMRouter()
    router._client = AsyncMock()
    router._client.post = AsyncMock(return_value=fake_resp)

    result = await router.embed("test text", role="embedding_model")

    assert result == [0.4, 0.5, 0.6]
    call = router._client.post.call_args
    assert "yandex.api" in call[0][0]
    assert call[1]["json"]["model"] == "yandex-embed"


@pytest.mark.asyncio
async def test_infer_unknown_provider(mock_config):
    mock_config.routing["text_model"] = [{"provider": "bogus", "model": "x"}]
    mock_config.providers["bogus"] = {"type": "unknown"}

    from src.core.llm_router import LLMRouter

    router = LLMRouter()
    with pytest.raises(ConfigError, match="Unknown provider type 'unknown' for 'bogus'"):
        await router.infer(prompt="hi", role="text_model")


# === Fallback chain tests ===

@pytest.mark.asyncio
async def test_infer_fallback_success(mock_config_fallback):
    """Primary ollama fails → yandex fallback succeeds."""
    from src.core.llm_router import LLMRouter

    router = LLMRouter()
    router._client = AsyncMock()

    fail_resp = MagicMock()
    fail_resp.json.side_effect = Exception("ollama down")

    ok_resp = MagicMock()
    ok_resp.json.return_value = {"choices": [{"message": {"content": "yandex response"}}]}

    router._client.post = AsyncMock(side_effect=[fail_resp, ok_resp])

    result = await router.infer(prompt="test", role="text_model")

    assert result == "yandex response"
    assert router._client.post.call_count == 2


@pytest.mark.asyncio
async def test_infer_all_providers_fail(mock_config_fallback):
    """All providers fail → ConfigError."""
    from src.core.llm_router import LLMRouter

    router = LLMRouter()
    router._client = AsyncMock()
    fail_resp = MagicMock()
    fail_resp.json.side_effect = Exception("all down")
    router._client.post.return_value = fail_resp

    with pytest.raises(ConfigError, match="All providers failed for role 'text_model'"):
        await router.infer(prompt="test", role="text_model")


@pytest.mark.asyncio
async def test_infer_unconfigured_provider_skipped(mock_config_fallback):
    """Provider in routing but missing from providers config → skipped."""
    mock_config_fallback.routing["text_model"] = [
        {"provider": "nonexistent", "model": "x"},
        {"provider": "yandex", "model": "yandexgpt"},
    ]

    from src.core.llm_router import LLMRouter

    router = LLMRouter()
    router._client = AsyncMock()
    ok_resp = MagicMock()
    ok_resp.json.return_value = {"choices": [{"message": {"content": "ok"}}]}
    router._client.post.return_value = ok_resp

    result = await router.infer(prompt="test", role="text_model")

    assert result == "ok"
    assert "yandex.api" in router._client.post.call_args[0][0]


@pytest.mark.asyncio
async def test_infer_circuit_breaker_skips_open(mock_config_fallback):
    """Provider with open CB is skipped, next provider is tried."""
    from src.core.llm_router import LLMRouter

    router = LLMRouter()
    router._client = AsyncMock()

    cb = router._provider_cb("ollama")
    # Force CB to open
    for _ in range(20):
        try:
            await cb.acall(lambda: (_ for _ in ()).throw(Exception("fail")), None)
        except Exception:
            pass

    ok_resp = MagicMock()
    ok_resp.json.return_value = {"choices": [{"message": {"content": "fallback ok"}}]}
    router._client.post.return_value = ok_resp

    result = await router.infer(prompt="test", role="text_model")

    assert result == "fallback ok"
    # Only yandex was called (ollama was skipped by CB)
    assert "yandex.api" in router._client.post.call_args[0][0]


@pytest.mark.asyncio
async def test_infer_unknown_provider_type_skipped(mock_config_fallback):
    """Provider with unsupported type is skipped, next one tried."""
    mock_config_fallback.providers["ollama"] = {"type": "custom", "endpoint": "http://ollama:11434"}

    from src.core.llm_router import LLMRouter

    router = LLMRouter()
    router._client = AsyncMock()
    ok_resp = MagicMock()
    ok_resp.json.return_value = {"choices": [{"message": {"content": "yandex ok"}}]}
    router._client.post.return_value = ok_resp

    result = await router.infer(prompt="test", role="text_model")

    assert result == "yandex ok"
    assert "yandex.api" in router._client.post.call_args[0][0]
