from pydantic import BaseModel, Field

# START_BLOCK: M-OFFERS/SCHEMAS/ALL


class Offer(BaseModel):
    id: str
    type: str = Field(description="merch|travel|game|bike_product|ecom_item")
    title: str
    url: str = "#"
    price: str | None = None
    cover_src: str | None = None
    shop: str | None = None
    confidence: float = 0.0


class OfferDetectResult(BaseModel):
    video_id: str
    offers: list[Offer] = []
    monetizable: bool = False
    has_merch: bool = False
    has_travel: bool = False
    has_game: bool = False


class BikeSearchEntries(BaseModel):
    videos: list[dict] = []
    products: list[Offer] = []


class TravelOfferResponse(BaseModel):
    destination: str
    actions: list[Offer] = []
    cover_src: str | None = None


class GameOfferResponse(BaseModel):
    title: str
    actions: list[Offer] = []
    cover_src: str | None = None


# END_BLOCK: M-OFFERS/SCHEMAS/ALL
