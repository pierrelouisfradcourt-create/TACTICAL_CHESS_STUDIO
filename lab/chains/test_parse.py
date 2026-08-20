"""
test_parse.py — Tests unitaires pour parse_json_safe()
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from lab.chains.run_chain import parse_json_safe


def test_clean_json():
    result = parse_json_safe('{"verdict": "PROCEED", "recommendation": "PROCEED"}')
    assert result["verdict"] == "PROCEED"

def test_json_with_backtick_fence():
    text = '```json\n{"verdict": "PROCEED", "recommendation": "PROCEED"}\n```'
    result = parse_json_safe(text)
    assert result["verdict"] == "PROCEED"

def test_json_with_text_around():
    text = 'Voici ma réponse :\n{"verdict": "HOLD"}\nMerci.'
    result = parse_json_safe(text)
    assert result["verdict"] == "HOLD"

def test_non_json_returns_hold():
    result = parse_json_safe("Ceci n'est pas du JSON.")
    assert result["verdict"] == "HOLD"
    assert result.get("claim_verdict") == "NO_CLAIM_ALLOWED"

def test_non_string_returns_hold():
    result = parse_json_safe(None)
    assert result["verdict"] == "HOLD"
