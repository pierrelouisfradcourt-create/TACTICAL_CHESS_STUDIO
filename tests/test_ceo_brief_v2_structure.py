"""IMP-051 — CEO Brief v2 : vérifie structure JSON 3 lanes + py_compile autopilot."""
import json
import py_compile
import pytest
from pathlib import Path

AUTOPILOT = Path(__file__).resolve().parents[1] / "autopilot.py"
ROADMAP   = Path(__file__).resolve().parents[1] / "00_STUDIO_CONTROL/00_MASTER_DOCS/01_ROADMAP.md"

CEO_BRIEF_V2_REQUIRED_LANES = {"rocky_moteur", "ia_apprentissage", "decisions_pendantes"}
CEO_BRIEF_V2_LANE_REQUIRED_KEYS = {"next_action", "recommendation"}


def test_autopilot_compiles():
    py_compile.compile(str(AUTOPILOT), doraise=True)


def test_ceo_brief_v2_structure_valid():
    """Un brief CEO v2 conforme doit avoir sprint_objective + 3 lanes avec clés obligatoires."""
    sample = {
        "sprint_objective": "Phase 2 — Chess Fantasy jouable, studio pilotable",
        "lanes": {
            "rocky_moteur":        {"next_action": "IMP-047 — dual-model router", "lane": "SAFE_AUTO", "risk": "low", "recommendation": "implémenter"},
            "ia_apprentissage":    {"next_action": "LoRA training réel",           "lane": "SAFE_AUTO", "risk": "medium", "recommendation": "fournir model-path"},
            "decisions_pendantes": {"next_action": "Chess 960 activation",         "lane": "AUDIT_REQUIRED", "blocker": None, "recommendation": "décider"},
        },
        "claim_verdict": "NO_CLAIM_ALLOWED",
    }
    _assert_brief_structure(sample)


def test_ceo_brief_v2_structure_rejects_missing_lane():
    sample = {
        "sprint_objective": "test",
        "lanes": {
            "rocky_moteur":     {"next_action": "x", "recommendation": "y"},
            "ia_apprentissage": {"next_action": "x", "recommendation": "y"},
            # decisions_pendantes manquant
        },
    }
    with pytest.raises(AssertionError):
        _assert_brief_structure(sample)


def test_ceo_brief_v2_structure_rejects_missing_sprint_objective():
    sample = {
        "lanes": {
            "rocky_moteur":        {"next_action": "x", "recommendation": "y"},
            "ia_apprentissage":    {"next_action": "x", "recommendation": "y"},
            "decisions_pendantes": {"next_action": "x", "recommendation": "y"},
        },
    }
    with pytest.raises(AssertionError):
        _assert_brief_structure(sample)


def _assert_brief_structure(brief: dict) -> None:
    assert "sprint_objective" in brief and brief["sprint_objective"], \
        "sprint_objective manquant ou vide"
    lanes = brief.get("lanes", {})
    missing = CEO_BRIEF_V2_REQUIRED_LANES - set(lanes.keys())
    assert not missing, f"Lanes manquantes : {missing}"
    for name in CEO_BRIEF_V2_REQUIRED_LANES:
        lane = lanes[name]
        missing_keys = CEO_BRIEF_V2_LANE_REQUIRED_KEYS - set(lane.keys())
        assert not missing_keys, f"Lane {name} — clés manquantes : {missing_keys}"


def test_extract_sprint_objective_from_roadmap():
    """_extract_sprint_objective retourne la phase avec IN_PROGRESS."""
    if not ROADMAP.exists():
        pytest.skip("01_ROADMAP.md absent")
    import importlib.util, sys
    spec = importlib.util.spec_from_file_location("autopilot", AUTOPILOT)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    roadmap_text = ROADMAP.read_text(encoding="utf-8")
    result = mod._extract_sprint_objective(roadmap_text)
    assert result and result != "Phase courante non déterminée", \
        f"Résultat inattendu : {result!r}"
    assert "Phase" in result, f"Doit contenir 'Phase' : {result!r}"
