from src.core.schemas import Mix, MixSceneRef, MixStage
from src.mixer.mix_to_md import mix_to_markdown


def test_mix_to_md_basic():
    mix = Mix(
        query="test query",
        stages=[
            MixStage(
                title="Step 1",
                description="First step",
                scenes=[
                    MixSceneRef(
                        video_id="v1", scene_index=0,
                        start_sec=0.0, end_sec=10.0,
                        summary="Intro", speaker="A", text="hello world",
                    ),
                ],
            ),
        ],
        total_duration_sec=10.0,
    )
    md = mix_to_markdown(mix)
    assert "# Замеси: test query" in md
    assert "## Этап 1: Step 1" in md
    assert "### v1 — Intro (00:00-00:10)" in md
    assert "hello world" in md


def test_mix_to_md_empty_stages():
    mix = Mix(
        query="empty",
        stages=[],
    )
    md = mix_to_markdown(mix)
    assert "# Замеси: empty" in md
