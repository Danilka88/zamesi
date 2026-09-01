from fastapi.testclient import TestClient

from src.api.app import app

client = TestClient(app)


def test_trends_route():
    r = client.get("/api/v1/studio/trends?query=велосипед&video_id=bike_dont_buy")
    assert r.status_code == 200
    assert "trends" in r.json()


def test_referral_route():
    r = client.post("/api/v1/studio/referral/bundle", json={"video_id": "test", "offers_count": 2})
    assert r.status_code == 200
    assert r.json()["links_count"] == 2


def test_promotion_route():
    r = client.post("/api/v1/studio/promotion/bundle", json={"platform": "vk_ads", "budget_rub": 7000})
    assert r.status_code == 200
    assert r.json()["platform"] == "vk_ads"


def test_autofill_route():
    r = client.post("/api/v1/studio/autofill/validate", json={"title": "Тест", "category": "Обзор"})
    assert r.status_code == 200
    assert r.json()["ok"] is True
