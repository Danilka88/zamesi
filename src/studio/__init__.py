# MODULE_MAP: src/studio/
# MODULE_CONTRACT: M-STUDIO
# PURPOSE: RUTUBE Studio — тренды, рефералка, продвижение, автозаполнение (аддитивно, детерминировано)
# SCOPE: TrendsBundle, ReferralBundle, PromotionBundle, детерминированная генерация без сети
# DEPENDS: M-CORE
# LINKS: .grace/graph/GD-013-M-STUDIO.xml | .grace/verification/VD-M-STUDIO.xml
# START_BLOCK: M-STUDIO/INIT
from src.studio.bundles import (
    build_promotion_bundle,
    build_referral_bundle,
    build_trends_bundle,
    validate_autofill,
)

__all__ = [
    "build_trends_bundle",
    "build_referral_bundle",
    "build_promotion_bundle",
    "validate_autofill",
]
# END_BLOCK: M-STUDIO/INIT
