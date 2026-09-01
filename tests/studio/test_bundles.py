from src.studio.bundles import build_promotion_bundle, build_referral_bundle, build_trends_bundle, validate_autofill


def test_trends():
    # [M-STUDIO][BUNDLES][TRENDS]
    b = build_trends_bundle("велосипед", "bike_dont_buy")
    assert len(b.trends) >= 1
    b2 = build_trends_bundle("неизвестный запрос", "unknown_id")
    assert len(b2.trends) == 1


def test_referral():
    b = build_referral_bundle("test123", 3)
    assert b.links_count == 3
    assert any("ya.cc/rz-" in link.url for link in b.offers)
    assert any("aliexpress.com" in link.url for link in b.offers)
    assert any("admitad.com" in link.url for link in b.offers)


def test_promotion():
    b = build_promotion_bundle("yandex_direct", 5000)
    assert b.platform == "yandex_direct"
    assert b.forecast_views > 0


def test_autofill():
    r1 = validate_autofill({"title": "", "category": ""})
    assert not r1["ok"] and len(r1["warnings"]) >= 1
    r2 = validate_autofill({"title": "Тест", "category": "Путешествия"})
    assert r2["ok"]
