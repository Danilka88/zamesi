from fastapi import APIRouter, Query

from src.offers.collector import bike_search_entries, detect_offers, game_cover_src, travel_cover_src
from src.offers.schemas import BikeSearchEntries, GameOfferResponse, OfferDetectResult, TravelOfferResponse

# MODULE_MAP: src/api/
# MODULE_CONTRACT: M-OFFERS (via M-API)
# PURPOSE: Offers API — merch/travel/game/bike
# START_BLOCK: M-OFFERS/ROUTES/ALL

router = APIRouter(prefix="/api/v1/offers", tags=["offers"])


@router.post("/detect", response_model=OfferDetectResult)
async def detect(payload: dict):
    # [M-OFFERS][ROUTES][DETECT]
    video_id = payload.get("video_id", "unknown")
    passport = payload.get("passport")
    return detect_offers(video_id, passport)


@router.get("/merch")
async def merch(brand: str = Query(default="default"), video_id: str = "demo"):
    # [M-OFFERS][ROUTES][MERCH]
    from src.offers.collector import collect_merch_offers
    return collect_merch_offers({"timeline": []}, brand)


@router.get("/travel", response_model=TravelOfferResponse)
async def travel(destination: str = Query(default="Нячанг")):
    # [M-OFFERS][ROUTES][TRAVEL]
    from src.offers.schemas import Offer
    actions = [
        Offer(id="t1", type="travel", title=f"Билеты Краснодар → {destination}", url="#", confidence=0.9),
        Offer(id="t2", type="travel", title="Туры", url="#", confidence=0.85),
        Offer(id="t3", type="travel", title="Отели", url="#", confidence=0.8),
        Offer(id="t4", type="travel", title="Экскурсии", url="#", confidence=0.82),
    ]
    return TravelOfferResponse(destination=destination, actions=actions, cover_src=travel_cover_src(destination))


@router.get("/game", response_model=GameOfferResponse)
async def game(title: str = Query(default="Atomic Heart")):
    # [M-OFFERS][ROUTES][GAME]
    from src.offers.schemas import Offer
    actions = [
        Offer(id="g1", type="game", title="Купить в VK Play", url="#", confidence=0.9),
        Offer(id="g2", type="game", title="VK Play Cloud", url="#", confidence=0.88),
        Offer(id="g3", type="game", title="Yandex Play", url="#", confidence=0.85),
        Offer(id="g4", type="game", title="Обзор", url="#", confidence=0.8),
    ]
    return GameOfferResponse(title=title, actions=actions, cover_src=game_cover_src(title))


@router.get("/bike-search", response_model=BikeSearchEntries)
async def bike_search(q: str = Query(default="велосипед")):
    # [M-OFFERS][ROUTES][BIKE_SEARCH]
    return bike_search_entries(q)


# END_BLOCK: M-OFFERS/ROUTES/ALL
