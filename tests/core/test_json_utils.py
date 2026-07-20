import pytest

from src.core.json_utils import extract_json


def test_extract_json_object():
    raw = '{"a": 1}'
    assert extract_json(raw) == '{"a": 1}'


def test_extract_json_array():
    raw = '[1, 2, 3]'
    assert extract_json(raw) == '[1, 2, 3]'


def test_extract_json_with_backticks():
    raw = "```json\n{\"key\": \"val\"}\n```"
    assert extract_json(raw) == '{"key": "val"}'


def test_extract_json_with_noise():
    raw = "Here is the result:\n{\"a\": 1}\nEnd."
    assert extract_json(raw) == '{"a": 1}'


def test_extract_json_array_with_noise():
    raw = "Response: [1, 2] done"
    assert extract_json(raw) == "[1, 2]"


def test_extract_json_text_after_brackets():
    raw = '{"a": 1} extra text'
    assert extract_json(raw) == '{"a": 1}'


def test_extract_json_no_json_raises():
    with pytest.raises(ValueError):
        extract_json("just text without json")


def test_extract_json_empty_raises():
    with pytest.raises(ValueError):
        extract_json("")
