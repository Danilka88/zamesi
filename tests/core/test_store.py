import time

import pytest

from src.core.store import MemoryStore


def test_set_and_get():
    store: MemoryStore[str] = MemoryStore()
    store.set("a", "hello")
    assert store.get("a") == "hello"


def test_get_missing():
    store: MemoryStore[str] = MemoryStore()
    assert store.get("missing") is None


def test_getitem_setitem():
    store: MemoryStore[int] = MemoryStore()
    store["k"] = 42
    assert store["k"] == 42


def test_getitem_missing_raises():
    store: MemoryStore[int] = MemoryStore()
    with pytest.raises(KeyError):
        _ = store["missing"]


def test_remove():
    store: MemoryStore[str] = MemoryStore()
    store.set("a", "hello")
    store.remove("a")
    assert store.get("a") is None


def test_remove_missing():
    store: MemoryStore[str] = MemoryStore()
    store.remove("missing")
    assert True


def test_cleanup_expired():
    store: MemoryStore[str] = MemoryStore(ttl_sec=0)
    store.set("a", "hello")
    time.sleep(0.01)
    cleaned = store.cleanup()
    assert cleaned >= 1
    assert store.get("a") is None


def test_cleanup_fresh():
    store: MemoryStore[str] = MemoryStore(ttl_sec=3600)
    store.set("a", "hello")
    assert store.cleanup() == 0
    assert store.get("a") == "hello"


def test_overwrite():
    store: MemoryStore[str] = MemoryStore()
    store.set("a", "first")
    store.set("a", "second")
    assert store.get("a") == "second"


def test_cleanup_partial():
    store: MemoryStore[str] = MemoryStore(ttl_sec=0.02)
    store.set("a", "old")
    time.sleep(0.03)
    store.set("b", "fresh")
    cleaned = store.cleanup()
    assert cleaned == 1
    assert store.get("a") is None
    assert store.get("b") == "fresh"
