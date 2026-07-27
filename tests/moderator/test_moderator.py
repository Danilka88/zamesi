
from src.moderator.moderator import _parse_report


def test_parse_report_empty():
    report = _parse_report({})
    assert report.age_rating == "0+"
    assert report.verdict == "approved"
    assert report.flags == []


def test_parse_report_full():
    data = {
        "age_rating": "16+",
        "verdict": "flagged",
        "categories_flagged": ["profanity"],
        "brand_safety_score": 50,
        "flags": [
            {
                "category": "profanity",
                "severity": "medium",
                "timestamp_sec": 42.5,
                "evidence": "example quote",
            }
        ],
        "summary": "Содержит ненормативную лексику",
    }
    report = _parse_report(data)
    assert report.age_rating == "16+"
    assert report.verdict == "flagged"
    assert len(report.flags) == 1
    assert report.flags[0].category == "profanity"
    assert report.flags[0].severity == "medium"
    assert report.flags[0].timestamp_sec == 42.5
    assert report.flags[0].evidence == "example quote"
    assert report.brand_safety_score == 50
    assert report.summary == "Содержит ненормативную лексику"


def test_parse_report_invalid_values():
    data = {
        "age_rating": "xxx",
        "verdict": "invalid",
        "flags": [
            {"category": "test", "severity": "unknown", "timestamp_sec": None, "evidence": None}
        ],
    }
    report = _parse_report(data)
    assert report.age_rating == "0+"
    assert report.verdict == "approved"
    assert report.flags[0].severity == "low"


def test_parse_report_flag_without_timestamp():
    data = {
        "flags": [
            {"category": "violence", "severity": "high"},
        ],
    }
    report = _parse_report(data)
    assert len(report.flags) == 1
    assert report.flags[0].category == "violence"
    assert report.flags[0].timestamp_sec is None
