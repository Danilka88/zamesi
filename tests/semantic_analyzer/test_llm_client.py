import pytest

from src.core.exceptions import JSONParseError


@pytest.mark.asyncio
async def test_analyze_text_segment_returns_json(mock_ollama_response, sample_transcript_text):
    from src.semantic_analyzer.llm_client import analyze_text_segment

    result = await analyze_text_segment(
        genre="how_to",
        asr_text=sample_transcript_text,
        ocr_text="",
    )
    assert '"action_is_clear": true' in result
    assert '"scene_summary": "test"' in result


@pytest.mark.asyncio
async def test_analyze_text_segment_passes_genre_and_ocr(mock_ollama_response, sample_podcast_text):
    from src.semantic_analyzer.llm_client import analyze_text_segment

    result = await analyze_text_segment(
        genre="podcast",
        asr_text=sample_podcast_text,
        ocr_text="Логотип на экране",
    )
    assert result


@pytest.mark.asyncio
async def test_analyze_vision_segment(mock_ollama_response, tmp_path):
    from src.semantic_analyzer.llm_client import analyze_vision_segment

    img = tmp_path / "frame.jpg"
    img.write_bytes(b"fake-image-data")

    result = await analyze_vision_segment(
        asr_text="Тестовый текст",
        image_path=str(img),
    )
    assert result == '{"action_is_clear": true, "requires_vision": false, "scene_summary": "test", "monetization": []}'


@pytest.mark.asyncio
async def test_generate_frontmatter(mock_ollama_response):
    from src.semantic_analyzer.llm_client import generate_frontmatter

    result = await generate_frontmatter("Полный транскрипт видео")
    assert result


def test_extract_json_checked_raises_on_empty():
    from src.semantic_analyzer.llm_client import _extract_json_checked

    with pytest.raises(JSONParseError, match="No JSON"):
        _extract_json_checked("")


def test_extract_json_checked_raises_on_gibberish():
    from src.semantic_analyzer.llm_client import _extract_json_checked

    with pytest.raises(JSONParseError):
        _extract_json_checked("просто текст без json")


def test_extract_json_checked_strips_fences():
    from src.semantic_analyzer.llm_client import _extract_json_checked

    raw = '```json\n{"key": "value"}\n```'
    result = _extract_json_checked(raw)
    assert result == '{"key": "value"}'
