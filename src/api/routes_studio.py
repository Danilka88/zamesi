from fastapi import APIRouter, Query

from src.studio.bundles import build_promotion_bundle, build_referral_bundle, build_trends_bundle, validate_autofill
from src.studio.schemas import AutofillValidateResponse, PromotionBundle, ReferralBundle, TrendsBundle

# MODULE_MAP: src/api/
# MODULE_CONTRACT: M-STUDIO (via M-API)
# PURPOSE: Studio API — trends/referral/promotion/autofill
# START_BLOCK: M-STUDIO/ROUTES/ALL

router = APIRouter(prefix="/api/v1/studio", tags=["studio"])


@router.get("/trends", response_model=TrendsBundle)
async def trends(query: str = Query(default="велосипед"), video_id: str = Query(default="default")):
    # [M-STUDIO][ROUTES][TRENDS]
    return build_trends_bundle(query, video_id)


@router.post("/referral/bundle", response_model=ReferralBundle)
async def referral_bundle(payload: dict):
    # [M-STUDIO][ROUTES][REFERRAL]
    video_id = payload.get("video_id", "default")
    offers_count = int(payload.get("offers_count", 3))
    return build_referral_bundle(video_id, offers_count)


@router.post("/promotion/bundle", response_model=PromotionBundle)
async def promotion_bundle(payload: dict):
    # [M-STUDIO][ROUTES][PROMOTION]
    platform = payload.get("platform", "yandex_direct")
    budget = int(payload.get("budget_rub", 5000))
    return build_promotion_bundle(platform, budget)


@router.post("/autofill/validate", response_model=AutofillValidateResponse)
async def autofill_validate(payload: dict):
    # [M-STUDIO][ROUTES][AUTOFILL_VALIDATE]
    res = validate_autofill(payload)
    return AutofillValidateResponse(ok=res["ok"], warnings=res["warnings"])


@router.get("/health")
async def studio_health():
    # [M-STUDIO][ROUTES][HEALTH]
    return {"status": "ok", "module": "studio"}


# END_BLOCK: M-STUDIO/ROUTES/ALL
