# START_BLOCK: M-OFFERS/COLLECTOR/DETECT
from src.offers.schemas import BikeSearchEntries, Offer, OfferDetectResult

MERCH_STORE_BY_BRAND: dict[str, list[str]] = {
    "wylsacom": ["Biggeek", "Царские стёкла", "Wildberries", "OZON", "Яндекс Маркет"],
    "default": ["Wildberries", "OZON", "Яндекс Маркет"],
}

BIKE_SEARCH_ENTRIES = [
    {"video_id": "1925a43e1c9147f239190def16eb741c", "title": "Какой велосипед не покупать", "domain": "Гайд"},
    {"video_id": "555c960c1c9147f239190def16eb741c", "title": "Велосипед за 50к — что выбрать", "domain": "Обзор"},
    {"video_id": "7acf946b1c9147f239190def16eb741c", "title": "ТОП-5 ошибок новичка", "domain": "Гайд"},
]

TRAVEL_KNOWN = ["Нячанг", "Дананг", "Фукуок", "Бали", "Сочи"]

GAME_COVER_MAP = {
    "atomic heart": "https://avatars.mds.yandex.net/get-entity_search/2384103/914417851/SUx182",
    "atomic": "https://avatars.mds.yandex.net/get-entity_search/2384103/914417851/SUx182",
}


def _hash_seed(s: str) -> int:
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def collect_merch_offers(passport: dict | None, brand: str = "default") -> list[Offer]:
    # [M-OFFERS][COLLECTOR][MERCH]
    if not passport:
        return []
    timeline = passport.get("timeline", []) if isinstance(passport, dict) else []
    offers: list[Offer] = []
    for idx, scene in enumerate(timeline):
        monet = scene.get("monetization", []) if isinstance(scene, dict) else []
        for m in monet:
            if m.get("type") in ("ecom_item", "artist_merch"):
                offers.append(Offer(
                    id=f"merch-{idx}-{len(offers)}",
                    type="merch",
                    title=m.get("search_query") or m.get("reason") or f"Товар {len(offers)+1}",
                    url="#",
                    shop=(MERCH_STORE_BY_BRAND.get(brand) or MERCH_STORE_BY_BRAND["default"])[0],
                    confidence=float(m.get("confidence") or 0.85),
                ))
                if len(offers) >= 6:
                    break
        if len(offers) >= 6:
            break
    # dedup by title
    seen: set[str] = set()
    uniq: list[Offer] = []
    for o in offers:
        if o.title not in seen:
            seen.add(o.title)
            uniq.append(o)
    uniq.sort(key=lambda x: x.confidence, reverse=True)
    return uniq  # [M-OFFERS][COLLECTOR][MERCH]


def detect_travel_offer(domain_type: str, title: str = "") -> bool:
    # [M-OFFERS][COLLECTOR][TRAVEL_DETECT]
    if domain_type == "travel_vlog":
        return True
    low = title.lower()
    return any(k in low for k in ["путешеств", "тревел", "отпуск", "нячанг", "вьетнам"])


def detect_game_offer(domain_type: str, title: str = "", tags: list[str] | None = None) -> bool:
    # [M-OFFERS][COLLECTOR][GAME_DETECT]
    if domain_type == "game_review":
        return True
    low = title.lower()
    if any(k in low for k in ["игра", "геймплей", "шутер", "atomic"]):
        return True
    if tags and any(t.lower() in ("видеоигры", "games") for t in tags):
        return True
    return False


def travel_cover_src(destination: str) -> str | None:
    # [M-OFFERS][COLLECTOR][TRAVEL_COVER]
    if destination.strip().lower() in ("нячанг", "nha trang"):
        return None
    return None


def game_cover_src(title: str) -> str | None:
    # [M-OFFERS][COLLECTOR][GAME_COVER]
    key = title.strip().lower()
    for k, v in GAME_COVER_MAP.items():
        if k in key:
            return v
    return None


def bike_search_entries(query: str = "") -> BikeSearchEntries:
    # [M-OFFERS][COLLECTOR][BIKE_ENTRIES]
    q = query.lower()
    is_bike = any(k in q for k in ["велосипед", "велик", "байк", "mtb", "bmx"])
    if not is_bike and query:
        return BikeSearchEntries(videos=[], products=[])
    products = [
        Offer(id="bike-p1", type="bike_product", title="Горный велосипед Stels",
              url="#", price="45 000 ₽", confidence=0.92),
        Offer(id="bike-p2", type="bike_product", title="Шлем защитный",
              url="#", price="3 200 ₽", confidence=0.88),
    ]
    return BikeSearchEntries(videos=BIKE_SEARCH_ENTRIES, products=products)


def detect_offers(video_id: str, passport: dict | None) -> OfferDetectResult:
    # [M-OFFERS][COLLECTOR][DETECT]
    if not passport:
        return OfferDetectResult(video_id=video_id, offers=[], monetizable=False)
    offers = collect_merch_offers(passport)
    front = passport.get("frontmatter", {}) if isinstance(passport, dict) else {}
    domain = front.get("domain_type", "") if isinstance(front, dict) else ""
    seo_title = front.get("seo_title", "") if isinstance(front, dict) else ""
    has_travel = detect_travel_offer(domain, seo_title)
    has_game = detect_game_offer(domain, "")
    monetizable = len(offers) > 0 or has_travel or has_game
    return OfferDetectResult(
        video_id=video_id,
        offers=offers,
        monetizable=monetizable,
        has_merch=len(offers) > 0,
        has_travel=has_travel,
        has_game=has_game,
    )


# END_BLOCK: M-OFFERS/COLLECTOR/DETECT
