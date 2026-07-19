import pytest


@pytest.mark.asyncio
async def test_plan_stages_basic(monkeypatch):
    async def mock_call_ollama(*a, **kw):
        return (
            '[{"title":"Подготовка","description":"Собери инструменты"},'
            '{"title":"Основная работа","description":"Выполни задачу"},'
            '{"title":"Финал","description":"Заверши и проверь"}]'
        )

    monkeypatch.setattr("src.mixer.stage_planner.timeout_manager.call_ollama", mock_call_ollama)

    from src.mixer.stage_planner import plan_stages
    stages = await plan_stages("как сделать ремонт")
    assert len(stages) == 3
    assert stages[0]["title"] == "Подготовка"


@pytest.mark.asyncio
async def test_plan_stages_minimal(monkeypatch):
    async def mock_call_ollama(*a, **kw):
        return '[{"title":"Шаг 1","description":"Первый шаг"},{"title":"Шаг 2","description":"Второй шаг"}]'

    monkeypatch.setattr("src.mixer.stage_planner.timeout_manager.call_ollama", mock_call_ollama)

    from src.mixer.stage_planner import plan_stages
    stages = await plan_stages("тест")
    assert len(stages) >= 2


@pytest.mark.asyncio
async def test_plan_stages_llm_error(monkeypatch):
    async def mock_call_ollama(*a, **kw):
        return "invalid json"

    monkeypatch.setattr("src.mixer.stage_planner.timeout_manager.call_ollama", mock_call_ollama)

    from src.mixer.stage_planner import plan_stages
    with pytest.raises((ValueError, Exception)):
        await plan_stages("тест")
