from fastapi.testclient import TestClient

from src.api.app import app

client = TestClient(app)


def test_detect():
    # [M-OFFERS][ROUTES][DETECT]
    r = client.post("/api/v1/offers/detect", json={"video_id": "test", "passport": {"timeline": []}})
    assert r.status_code == 200
    assert r.json()["video_id"] == "test"


def test_travel():
    r = client.get("/api/v1/offers/travel?destination=Нячанг")
    assert r.status_code == 200
    assert r.json()["destination"] == "Нячанг"
    assert len(r.json()["actions"]) == 4


def test_game():
    r = client.get("/api/v1/offers/game?title=Atomic Heart")
    assert r.status_code == 200
    assert r.json()["cover_src"] is not None


def test_bike_search():
    r = client.get("/api/v1/offers/bike-search?q=велосипед")
    assert r.status_code == 200
    assert len(r.json()["videos"]) == 3
