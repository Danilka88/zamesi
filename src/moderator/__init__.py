# MODULE_MAP: src/moderator/
# MODULE_CONTRACT: M-MODERATOR
# PURPOSE: LLM-based content moderation assessment using collected video data
# SCOPE: assess_moderation. gemma4:e4b as judge for age rating, violations, verdict.
# DEPENDS: M-CORE
# LINKS: .grace/graph/index.xml | .grace/context/requirements.xml | .grace/verification/index.xml
# START_BLOCK: M-MODERATOR/INIT
from src.moderator.moderator import assess_moderation

__all__ = ["assess_moderation"]
# END_BLOCK: M-MODERATOR/INIT
