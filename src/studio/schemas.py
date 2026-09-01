from pydantic import BaseModel, Field

# START_BLOCK: M-STUDIO/SCHEMAS/ALL


class TrendItem(BaseModel):
    term: str
    volume: int
    growth: float
    competition: str = Field(description="low|medium|high")
    seasonality: list[int] = []


class TrendsBundle(BaseModel):
    query: str = ""
    trends: list[TrendItem] = []
    collabs: list[dict] = []
    playlist: list[dict] = []


class ReferralLink(BaseModel):
    shop: str
    url: str
    commission_bps: int = 0


class ReferralBundle(BaseModel):
    offers: list[ReferralLink] = []
    total_potential_rub: float = 0.0
    links_count: int = 0


class PromotionBundle(BaseModel):
    platform: str
    budget_rub: int = 0
    forecast_views: int = 0
    campaign: dict = {}


class AutofillValidateResponse(BaseModel):
    ok: bool = True
    warnings: list[str] = []


# END_BLOCK: M-STUDIO/SCHEMAS/ALL
