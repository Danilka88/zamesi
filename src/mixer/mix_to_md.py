from src.core.schemas import Mix
from src.core.time_utils import fmt_sec


# START_BLOCK: M-MIXER/MD/MIX_TO_MARKDOWN
def mix_to_markdown(mix: Mix) -> str:
    lines: list[str] = []
    lines.append(f"# Замеси: {mix.query}")
    lines.append("")

    for i, stage in enumerate(mix.stages, 1):
        lines.append(f"## Этап {i}: {stage.title}")
        lines.append(stage.description)
        lines.append("")

        for scene in stage.scenes:
            ts = f"{fmt_sec(scene.start_sec)}-{fmt_sec(scene.end_sec)}"
            lines.append(f"### {scene.video_id} — {scene.summary} ({ts})")
            if scene.text:
                lines.append(f"*Контекст:* \"{scene.text[:300]}\"")
            if scene.speaker:
                lines.append(f"*Спикер:* {scene.speaker}")
            lines.append("")

        lines.append("---")
        lines.append("")

    return "\n".join(lines)


# END_BLOCK: M-MIXER/MD/MIX_TO_MARKDOWN
