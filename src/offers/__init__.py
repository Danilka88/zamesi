# MODULE_MAP: src/offers/
# MODULE_CONTRACT: M-OFFERS
# PURPOSE: Офферы монетизации (merch/travel/game/bike) — детерминированная генерация без LLM, аддитивно к M-PASSPORT
# SCOPE: Offer, OfferDetectResult, BikeSearchEntries, детект/генерация офферов по паспорту
# DEPENDS: M-CORE
# LINKS: .grace/graph/GD-012-M-OFFERS.xml | .grace/verification/VD-M-OFFERS.xml
# START_BLOCK: M-OFFERS/INIT
from src.offers.collector import (
    bike_search_entries,
    collect_merch_offers,
    detect_game_offer,
    detect_travel_offer,
    game_cover_src,
    travel_cover_src,
)
from src.offers.schemas import BikeSearchEntries, Offer, OfferDetectResult

__all__ = [
    "Offer",
    "OfferDetectResult",
    "BikeSearchEntries",
    "collect_merch_offers",
    "detect_travel_offer",
    "detect_game_offer",
    "travel_cover_src",
    "game_cover_src",
    "bike_search_entries",
]
# END_BLOCK: M-OFFERS/INIT
