"""IMP-160 — Governor déterministe : check(action) → ALLOW | BLOCK.

Couvre les 5 branches de la politique + le déterminisme.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))
import governor  # noqa: E402


@pytest.mark.parametrize(
    "action, expected, label",
    [
        ({"lane": "SAFE_AUTO"},                              governor.ALLOW, "safe_auto"),
        ({"lane": "FORBIDDEN"},                              governor.BLOCK, "forbidden"),
        ({"lane": "HUMAN_REQUIRED"},                         governor.BLOCK, "human_required"),
        ({"lane": "SAFE_AUTO", "mission": "training"},       governor.BLOCK, "forbidden_mission"),
        ({"lane": "AUDIT_REQUIRED"},                         governor.BLOCK, "audit_pending"),
    ],
)
def test_check_five_cases(action, expected, label):
    assert governor.check(action).verdict == expected, label


def test_audit_required_allowed_when_audit_passed():
    d = governor.check({"lane": "AUDIT_REQUIRED", "audit_passed": True})
    assert d.verdict == governor.ALLOW
    assert d.allowed is True


def test_unknown_lane_fail_closed():
    assert governor.check({"lane": "WAT"}).verdict == governor.BLOCK
    assert governor.check({}).verdict == governor.BLOCK


def test_non_dict_action_blocked():
    assert governor.check(None).verdict == governor.BLOCK  # type: ignore[arg-type]


def test_decision_is_truthy_and_carries_reason():
    allow = governor.check({"lane": "SAFE_AUTO"})
    block = governor.check({"lane": "FORBIDDEN"})
    assert bool(allow) is True
    assert bool(block) is False
    assert block.reason  # message non vide


def test_deterministic():
    action = {"lane": "AUDIT_REQUIRED", "mission": "benchmark"}
    first = governor.check(action)
    for _ in range(20):
        d = governor.check(action)
        assert (d.verdict, d.reason) == (first.verdict, first.reason)
