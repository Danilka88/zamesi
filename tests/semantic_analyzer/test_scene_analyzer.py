import pytest

from src.core.schemas import TimelineSegment


def _make_segment(text: str, start: float = 0.0, end: float = 10.0, speaker: str = "speaker_0") -> TimelineSegment:
    return TimelineSegment(speaker=speaker, start_sec=start, end_sec=end, text=text)


async def _fake_text_pass(**kwargs):
    return '{"action_is_clear": true, "requires_vision": false, "scene_summary": "mocked", "monetization": []}'


async def _fake_text_pass_with_vision(**kwargs):
    return '{"action_is_clear": true, "requires_vision": true, "scene_summary": "needs vision", "monetization": []}'


async def _fake_vision_pass(**kwargs):
    return "На изображении показан процесс ремонта"


@pytest.mark.asyncio
async def test_analyze_scenes_basic(monkeypatch):
    import src.semantic_analyzer.scene_analyzer as sa

    monkeypatch.setattr(sa, "analyze_text_segment", _fake_text_pass)

    timeline = [_make_segment("Шаг первый")]
    results, vlm_calls = await sa.analyze_scenes(
        timeline=timeline,
        genre="how_to",
        vision_blocked=True,
        ocr_buffer=type("FakeOCR", (), {"check": lambda self, ts: "текст на экране"})(),
        iframe_map={},
    )

    assert len(results) == 1
    assert results[0].action_is_clear is True
    assert results[0].scene_summary == "mocked"
    assert vlm_calls == 0


@pytest.mark.asyncio
async def test_analyze_scenes_empty_timeline(monkeypatch):
    import src.semantic_analyzer.scene_analyzer as sa

    monkeypatch.setattr(sa, "analyze_text_segment", _fake_text_pass)

    results, vlm_calls = await sa.analyze_scenes(
        timeline=[],
        genre="how_to",
        vision_blocked=True,
        ocr_buffer=type("FakeOCR", (), {"check": lambda self, ts: ""})(),
        iframe_map={},
    )
    assert results == []
    assert vlm_calls == 0


@pytest.mark.asyncio
async def test_analyze_scenes_llm_error_triggers_fallback(monkeypatch):
    import src.semantic_analyzer.scene_analyzer as sa

    async def failing_pass(**kwargs):
        msg = "LLM failure"
        raise ValueError(msg)

    monkeypatch.setattr(sa, "analyze_text_segment", failing_pass)

    timeline = [_make_segment("Тест")]
    results, vlm_calls = await sa.analyze_scenes(
        timeline=timeline,
        genre="how_to",
        vision_blocked=True,
        ocr_buffer=type("FakeOCR", (), {"check": lambda self, ts: ""})(),
        iframe_map={},
    )

    assert len(results) == 1
    assert results[0].fallback_used == "llm_failed"
    assert results[0].monetization == []
    assert results[0].scene_summary == "Тест"


@pytest.mark.asyncio
async def test_analyze_scenes_vision_gate(monkeypatch):
    import src.semantic_analyzer.scene_analyzer as sa

    monkeypatch.setattr(sa, "analyze_text_segment", _fake_text_pass_with_vision)
    monkeypatch.setattr(sa, "analyze_vision_segment", _fake_vision_pass)

    timeline = [_make_segment("Нужна картинка")]
    results, vlm_calls = await sa.analyze_scenes(
        timeline=timeline,
        genre="how_to",
        vision_blocked=False,
        ocr_buffer=type("FakeOCR", (), {"check": lambda self, ts: ""})(),
        iframe_map={5.0: "/fake/path.jpg"},
    )

    assert len(results) == 1
    assert vlm_calls == 1
    assert "[Видео:" in results[0].scene_summary


@pytest.mark.asyncio
async def test_analyze_scenes_vision_blocked_suppresses_vlm(monkeypatch):
    import src.semantic_analyzer.scene_analyzer as sa

    monkeypatch.setattr(sa, "analyze_text_segment", _fake_text_pass_with_vision)
    monkeypatch.setattr(sa, "analyze_vision_segment", _fake_vision_pass)

    timeline = [_make_segment("Нужна картинка")]
    results, vlm_calls = await sa.analyze_scenes(
        timeline=timeline,
        genre="podcast",
        vision_blocked=True,
        ocr_buffer=type("FakeOCR", (), {"check": lambda self, ts: ""})(),
        iframe_map={5.0: "/fake/path.jpg"},
    )

    assert vlm_calls == 0
    assert "[Видео:" not in results[0].scene_summary
