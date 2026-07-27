# MODULE_MAP: src/passport_builder/
# MODULE_CONTRACT: M-PASSPORT
# PURPOSE: YAML-frontmatter + Markdown-таймлайн с точками монетизации
# SCOPE: build_frontmatter, build_passport, passport_to_markdown, validate. Passport, PassportFrontmatter.
# DEPENDS: M-CORE, M-SEMANTIC, M-MODERATOR, M-SEARCH
# LINKS: .grace/graph/index.xml | .grace/context/requirements.xml | .grace/verification/index.xml
# START_BLOCK: M-PASSPORT/INIT
from src.passport_builder.frontmatter_generator import build_frontmatter
from src.passport_builder.passport_builder import build_passport, passport_to_markdown, save_passport_to_disk
from src.passport_builder.validator import validate

__all__ = [
    "build_frontmatter", "build_passport", "passport_to_markdown",
    "save_passport_to_disk", "validate",
]
# END_BLOCK: M-PASSPORT/INIT
