from prometheus_client import Counter

from src.core.metrics import fallbacks_total, json_errors_total, timeouts_total


def test_json_errors_counter_exists():
    assert isinstance(json_errors_total, Counter)


def test_timeouts_total_inc():
    timeouts_total.labels(operation="whisper").inc()
    assert timeouts_total.labels(operation="whisper")._value.get() >= 1


def test_fallbacks_total_inc():
    fallbacks_total.labels(strategy="vlm").inc()
    assert fallbacks_total.labels(strategy="vlm")._value.get() >= 1
