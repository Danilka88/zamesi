# MODULE_MAP: src/semantic_analyzer/
# MODULE_CONTRACT: M-SEMANTIC
# PURPOSE: SLM-анализ (gemma4:e4b), VLM Gatekeeper (qwen3.5:9b Vision), извлечение точек монетизации
# SCOPE: analyze_scenes, text/vision analysis, generate_frontmatter. SceneAnalysisResult, MonetizationItem.
# DEPENDS: M-CORE, M-VISION
# LINKS: .grace/graph/index.xml | .grace/context/requirements.xml | .grace/verification/index.xml
# START_BLOCK: M-SEMANTIC/INIT
from src.semantic_analyzer.qwen_client import analyze_text_segment, analyze_vision_segment, generate_frontmatter
from src.semantic_analyzer.scene_analyzer import analyze_scenes

__all__ = [
    "analyze_text_segment", "analyze_vision_segment", "generate_frontmatter",
    "analyze_scenes",
]
# END_BLOCK: M-SEMANTIC/INIT
