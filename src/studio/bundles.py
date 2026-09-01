# START_BLOCK: M-STUDIO/BUNDLES/ALL

from src.studio.schemas import PromotionBundle, ReferralBundle, TrendItem, TrendsBundle


def _hash_seed(s: str) -> int:
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def _mulberry32(seed: int):
    def _next() -> float:
        nonlocal seed
        seed = (seed + 0x6D2B79F5) & 0xFFFFFFFF
        t = seed
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + ((t ^ (t >> 7)) * (t | 61) & 0xFFFFFFFF) & 0xFFFFFFFF)
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return _next


CURATED_TRENDS: dict[str, list[dict]] = {
    "bike_dont_buy": [
        {"term": "велосипед горный", "volume": 82000, "growth": 0.34, "competition": "high"},
        {"term": "как выбрать велосипед", "volume": 45000, "growth": 0.22, "competition": "medium"},
    ],
    "iphone_50k_wylsacom": [
        {"term": "iphone 15 обзор", "volume": 120000, "growth": 0.18, "competition": "high"},
    ],
}


def build_trends_bundle(query: str, video_id: str = "default") -> TrendsBundle:
    # [M-STUDIO][BUNDLES][TRENDS]
    key = query.lower().strip() or video_id
    curated = CURATED_TRENDS.get(key) or CURATED_TRENDS.get(video_id)
    if curated:
        trends = [
            TrendItem(term=c["term"], volume=c["volume"], growth=c["growth"],
                      competition=c["competition"], seasonality=[50 + i*3 for i in range(12)])
            for c in curated
        ]
    else:
        # fallback deterministic from hash
        rnd = _mulberry32(_hash_seed(key))
        trends = [
            TrendItem(term=query or "велосипед", volume=int(20000 + rnd()*50000),
                      growth=round(rnd()*0.4, 2), competition="medium",
                      seasonality=[40 + int(rnd()*20) for _ in range(12)])
        ]
    collabs = [{"channel": "ВелоБлог", "overlap": 0.42, "pitch": "Давай снимем коллаб"}]
    playlist = [{"title": "Гайд по выбору", "steps": 3}]
    return TrendsBundle(query=query, trends=trends, collabs=collabs, playlist=playlist)


def build_referral_bundle(video_id: str, offers_count: int = 3) -> ReferralBundle:
    # [M-STUDIO][BUNDLES][REFERRAL]
    rnd = _mulberry32(_hash_seed(video_id))
    shops = ["yandex_market", "aliexpress", "admitad"]
    links = []
    for i in range(offers_count):
        shop = shops[i % len(shops)]
        url_map = {
            "yandex_market": f"https://ya.cc/rz-{video_id[:6]}-{i}",
            "aliexpress": "https://s.click.aliexpress.com/e/_test",
            "admitad": "https://ad.admitad.com/g/test",
        }
        url = url_map[shop]
        links.append(  # type: ignore[arg-type]
            {"shop": shop, "url": url, "commission_bps": int(300 + rnd()*500)}
        )
    total = sum(int(100 + rnd()*900) for _ in links)
    return ReferralBundle(offers=links, total_potential_rub=float(total),  # type: ignore[arg-type]
                          links_count=len(links))


def build_promotion_bundle(platform: str = "yandex_direct", budget_rub: int = 5000) -> PromotionBundle:
    # [M-STUDIO][BUNDLES][PROMOTION]
    rnd = _mulberry32(_hash_seed(platform))
    forecast = int(budget_rub * (0.8 + rnd()*0.4))
    return PromotionBundle(platform=platform, budget_rub=budget_rub,
                           forecast_views=forecast,
                           campaign={"platform": platform, "budget": budget_rub})


def validate_autofill(payload: dict) -> dict:
    # [M-STUDIO][BUNDLES][AUTOFILL_VALIDATE]
    warnings: list[str] = []
    if not payload.get("title"):
        warnings.append("title required")
    if len(payload.get("title", "")) > 100:
        warnings.append("title too long")
    if not payload.get("category"):
        warnings.append("category missing")
    return {"ok": len(warnings) == 0, "warnings": warnings}


# END_BLOCK: M-STUDIO/BUNDLES/ALL
