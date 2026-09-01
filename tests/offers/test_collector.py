from src.offers.collector import (
    bike_search_entries,
    collect_merch_offers,
    detect_game_offer,
    detect_travel_offer,
    game_cover_src,
    travel_cover_src,
)


def test_collect_merch():
    # [M-OFFERS][COLLECTOR][MERCH]
    passport = {
        "timeline": [
            {"monetization": [{"type": "ecom_item", "search_query": "товар A", "confidence": 0.9}]},
            {"monetization": [{"type": "ecom_item", "search_query": "товар B", "confidence": 0.8}]},
            {"monetization": [{"type": "ecom_item", "search_query": "товар A", "confidence": 0.9}]},
        ]
    }
    offers = collect_merch_offers(passport)
    assert len(offers) == 2  # dedup
    assert offers[0].confidence >= offers[1].confidence


def test_detect_travel():
    assert detect_travel_offer("travel_vlog", "") is True
    assert detect_travel_offer("review", "Путешествие в Нячанг") is True
    assert detect_travel_offer("review", "Обзор iPhone") is False


def test_detect_game():
    assert detect_game_offer("game_review", "") is True
    assert detect_game_offer("review", "Atomic Heart прохождение") is True
    assert detect_game_offer("review", "Обзор фильма") is False


def test_cover():
    assert travel_cover_src("Нячанг") is None
    assert game_cover_src("Atomic Heart") and "yandex.net" in game_cover_src("Atomic Heart")
    assert game_cover_src("Странная Игра X") is None


def test_bike():
    e = bike_search_entries("велосипед горный")
    assert len(e.videos) == 3
    assert len(e.products) == 2
    e2 = bike_search_entries("iphone")
    assert len(e2.videos) == 0
