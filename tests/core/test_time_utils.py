
from src.core.time_utils import fmt_sec


def test_fmt_sec_zero():
    assert fmt_sec(0) == "00:00"


def test_fmt_sec_whole_minutes():
    assert fmt_sec(60) == "01:00"
    assert fmt_sec(300) == "05:00"


def test_fmt_sec_with_seconds():
    assert fmt_sec(61) == "01:01"
    assert fmt_sec(3661) == "61:01"


def test_fmt_sec_float():
    assert fmt_sec(90.7) == "01:30"


def test_fmt_sec_negative():
    assert fmt_sec(-5) == "-1:55"
