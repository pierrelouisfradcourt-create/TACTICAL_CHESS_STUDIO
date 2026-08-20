#!/usr/bin/env python3
"""test_council_adapter.py — preuve etape 4 : adaptateur CouncilResult -> contrat v1.

Couvre :
  - transform : voices mappees par role (stance/availability -> verdict), model trace
  - fail-soft : voix indisponible/timeout -> verdict BLOCKED
  - proposed_items derives des RISQUES RED_TEAM (rationale, evidence_refs, lane AUDIT_REQUIRED)
  - hypotheses DIVERGENCE PAS transformees en items (v0)
  - fail-hard : risque nommant un fichier -> contrat REJETE (tension write-path, calibration 6a)
  - build_local_council_adapters : PAS de GEMINI_FLASH ; Claude adapter local
  - run_factory_council : runner injecte (OK), runner qui leve (degrade all-BLOCKED),
    et run REEL backends down (fail-soft, zero appel externe)
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

_HERE = Path(__file__).resolve().parent
REPO = _HERE.parents[1]
sys.path.insert(0, str(REPO / "scripts"))
sys.path.insert(0, str(REPO / "governance"))

import council  # noqa: E402
import council_contract as cc  # noqa: E402
from council import CouncilResult, CouncilRole, ModelId, ModelOpinion, Stance  # noqa: E402


def _op(role, model, stance, *, available=True, timed_out=False, risks=(), hypotheses=(),
        evidence_files=(), rationale="ok"):
    return ModelOpinion(model=model, role=role, stance=stance, rationale=rationale,
                        risks=tuple(risks), hypotheses=tuple(hypotheses),
                        evidence_files=tuple(evidence_files), available=available, timed_out=timed_out)


def _result(opinions, *, collapsed=False, distinct=2):
    return CouncilResult(task_id="IMP-TEST", generated_at="2026-07-06T12:00:00Z", plan_md="plan",
                         opinions=tuple(opinions), disagreements=(), divergences=(),
                         requires_humangate=False, collapsed=collapsed, distinct_models=distinct)


def _healthy():
    return _result([
        _op(CouncilRole.PLAN_REVIEW, ModelId.CLAUDE, Stance.APPROUVE, rationale="plan coherent"),
        _op(CouncilRole.RED_TEAM, ModelId.QWEN14B, Stance.APPROUVE,
            risks=["le parser ne gere pas la chaine vide", "pas de test sur input tronque"],
            evidence_files=["src/chess/fen.rs"]),
        _op(CouncilRole.DIVERGENCE, ModelId.QWEN14B, Stance.DIVERGENCE,
            hypotheses=["approche alternative par table de hachage"]),
    ])


# ── transform : mapping des voix ─────────────────────────────────────────────────

def test_healthy_result_is_valid_contract(tmp_path):
    c = cc.council_result_to_contract(_healthy(), session_id="s1", timestamp="t1")
    cc.validate_contract(c, journal_path=tmp_path / "j", proposals_path=tmp_path / "p")
    assert set(c["voices"]) == {"PLAN_REVIEW", "RED_TEAM", "DIVERGENCE"}
    assert c["voices"]["PLAN_REVIEW"]["verdict"] == "OK"
    assert c["voices"]["PLAN_REVIEW"]["model"] == "claude"
    assert c["voices"]["DIVERGENCE"]["model"] == "qwen2.5-14b"  # fallback Qwen, pas Gemini


@pytest.mark.parametrize("stance,expected", [
    (Stance.APPROUVE, "OK"), (Stance.BLOQUE, "BLOCKED"),
    (Stance.ESCALADE, "FAIL"), (Stance.DIVERGENCE, "OK"),
])
def test_stance_to_verdict(stance, expected):
    r = _result([_op(CouncilRole.PLAN_REVIEW, ModelId.CLAUDE, stance)])
    c = cc.council_result_to_contract(r, session_id="s", timestamp="t")
    assert c["voices"]["PLAN_REVIEW"]["verdict"] == expected


def test_unavailable_voice_is_blocked():
    r = _result([_op(CouncilRole.PLAN_REVIEW, ModelId.CLAUDE, Stance.ESCALADE,
                     available=False, rationale="role_unavailable")])
    c = cc.council_result_to_contract(r, session_id="s", timestamp="t")
    assert c["voices"]["PLAN_REVIEW"]["verdict"] == "BLOCKED"


def test_timed_out_voice_is_blocked():
    r = _result([_op(CouncilRole.RED_TEAM, ModelId.QWEN14B, Stance.APPROUVE, timed_out=True)])
    c = cc.council_result_to_contract(r, session_id="s", timestamp="t")
    assert c["voices"]["RED_TEAM"]["verdict"] == "BLOCKED"


def test_missing_role_is_blocked():
    r = _result([_op(CouncilRole.PLAN_REVIEW, ModelId.CLAUDE, Stance.APPROUVE)])  # pas de RED_TEAM/DIVERGENCE
    c = cc.council_result_to_contract(r, session_id="s", timestamp="t")
    assert c["voices"]["RED_TEAM"]["verdict"] == "BLOCKED"
    assert c["voices"]["DIVERGENCE"]["verdict"] == "BLOCKED"


# ── proposed_items depuis RED_TEAM.risks ─────────────────────────────────────────

def test_red_team_risks_become_items(tmp_path):
    c = cc.council_result_to_contract(_healthy(), session_id="s", timestamp="t")
    cc.validate_contract(c, journal_path=tmp_path / "j", proposals_path=tmp_path / "p")
    assert len(c["proposed_items"]) == 2
    it = c["proposed_items"][0]
    assert it["suggested_lane"] == "AUDIT_REQUIRED"          # plancher D1
    assert it["rationale"] == "le parser ne gere pas la chaine vide"
    assert it["evidence_refs"] == ["src/chess/fen.rs"]


def test_divergence_hypotheses_not_items():
    c = cc.council_result_to_contract(_healthy(), session_id="s", timestamp="t")
    # aucune hypothese ("approche alternative...") ne doit apparaitre en proposed_item
    assert all("hachage" not in it["rationale"] for it in c["proposed_items"])


def test_no_risks_no_items():
    r = _result([_op(CouncilRole.RED_TEAM, ModelId.QWEN14B, Stance.APPROUVE, risks=[])])
    c = cc.council_result_to_contract(r, session_id="s", timestamp="t")
    assert c["proposed_items"] == []


def test_unavailable_red_team_no_items():
    r = _result([_op(CouncilRole.RED_TEAM, ModelId.QWEN14B, Stance.ESCALADE,
                     available=False, risks=["x"])])
    c = cc.council_result_to_contract(r, session_id="s", timestamp="t")
    assert c["proposed_items"] == []


# ── option (a) ratifiee 2026-07-06 : un risque nommant un fichier PASSE (chemin descriptif) ─

def test_risk_naming_a_file_now_allowed(tmp_path):
    r = _result([_op(CouncilRole.RED_TEAM, ModelId.QWEN14B, Stance.APPROUVE,
                     risks=["search.rs manque un timeout dans la boucle"])])
    c = cc.council_result_to_contract(r, session_id="s", timestamp="t")
    # chemin de fichier nu = descriptif, pas executable -> le contrat est VALIDE.
    cc.validate_contract(c, journal_path=tmp_path / "j", proposals_path=tmp_path / "p")
    assert c["proposed_items"][0]["rationale"] == "search.rs manque un timeout dans la boucle"


def test_structured_dict_risk_normalized(tmp_path):
    # Qwen renvoie parfois des risques structures -> council.py les str()-ifie en dict-repr.
    # Le transform doit extraire un texte lisible (description), pas un dict-repr tronque.
    dict_repr = ("{'description': 'Absence de validation du schema JSON', "
                 "'severity': 'Critique', 'mitigation': 'valider avant insertion'}")
    r = _result([_op(CouncilRole.RED_TEAM, ModelId.QWEN14B, Stance.BLOQUE, risks=[dict_repr])])
    c = cc.council_result_to_contract(r, session_id="s", timestamp="t")
    cc.validate_contract(c, journal_path=tmp_path / "j", proposals_path=tmp_path / "p")
    it = c["proposed_items"][0]
    assert it["title"] == "Absence de validation du schema JSON"           # pas de dict-repr
    assert "Critique" in it["rationale"] and "valider avant insertion" in it["rationale"]
    assert "{'description'" not in it["title"] and "{'description'" not in it["rationale"]
    # la finding de la voix est aussi normalisee
    assert c["voices"]["RED_TEAM"]["findings"][0] == "Absence de validation du schema JSON"


def test_risk_with_command_verb_still_rejected(tmp_path):
    # un risque command-shaped (verbe mutation) reste rejete fail-hard.
    r = _result([_op(CouncilRole.RED_TEAM, ModelId.QWEN14B, Stance.APPROUVE,
                     risks=["il faut git reset --hard pour reproduire"])])
    c = cc.council_result_to_contract(r, session_id="s", timestamp="t")
    with pytest.raises(cc.CouncilContractError, match="write-path/command"):
        cc.validate_contract(c, journal_path=tmp_path / "j", proposals_path=tmp_path / "p")


# ── build_local_council_adapters : PAS de Gemini ─────────────────────────────────

def test_local_adapters_exclude_gemini():
    ads = cc.build_local_council_adapters()
    assert set(ads) == {ModelId.CLAUDE, ModelId.QWEN14B}
    assert ModelId.GEMINI_FLASH not in ads


def test_local_claude_adapter_is_local():
    ads = cc.build_local_council_adapters()
    assert "127.0.0.1" in ads[ModelId.CLAUDE]._base or "localhost" in ads[ModelId.CLAUDE]._base


# ── run_factory_council : orchestration fail-soft ────────────────────────────────

def test_run_factory_council_with_injected_runner(tmp_path):
    contract = cc.run_factory_council(
        "brief", "IMP-TEST", session_id="s", timestamp="t",
        adapters={}, runner=lambda task, ads: _healthy(),
        journal_path=tmp_path / "j", proposals_path=tmp_path / "p",
    )
    assert contract["voices"]["RED_TEAM"]["verdict"] == "OK"
    assert len(contract["proposed_items"]) == 2


def test_run_factory_council_failsoft_on_runner_error(tmp_path):
    def _boom(task, ads):
        raise RuntimeError("infra down")
    contract = cc.run_factory_council(
        "brief", "IMP-TEST", session_id="s", timestamp="t",
        adapters={}, runner=_boom,
        journal_path=tmp_path / "j", proposals_path=tmp_path / "p",
    )
    assert all(v["verdict"] == "BLOCKED" for v in contract["voices"].values())
    assert contract["proposed_items"] == []


def test_all_unavailable_result_is_all_blocked():
    """Deterministe (pas de reseau) : les 3 voix indisponibles -> contrat all-BLOCKED."""
    r = _result([
        _op(CouncilRole.PLAN_REVIEW, ModelId.CLAUDE, Stance.ESCALADE, available=False, rationale="role_unavailable"),
        _op(CouncilRole.RED_TEAM, ModelId.QWEN14B, Stance.ESCALADE, available=False, rationale="role_unavailable"),
        _op(CouncilRole.DIVERGENCE, ModelId.QWEN14B, Stance.ESCALADE, available=False, rationale="role_unavailable"),
    ], collapsed=True, distinct=0)
    c = cc.council_result_to_contract(r, session_id="s", timestamp="t")
    assert all(v["verdict"] == "BLOCKED" for v in c["voices"].values())
    assert c["proposed_items"] == []


def test_run_factory_council_real_run_no_crash(tmp_path):
    """Run REEL bout-en-bout : quel que soit l'etat des backends (up ou down), run_factory_council
    ne crashe jamais et renvoie un contrat SCHEMA-VALIDE. Aucun appel externe (Gemini jamais
    construit). N'assertionne PAS les verdicts (dependants de l'env)."""
    contract = cc.run_factory_council(
        "brief technique local", "IMP-TEST-LIVE", session_id="s", timestamp="t",
        journal_path=tmp_path / "j", proposals_path=tmp_path / "p",
    )
    cc.validate_contract(contract, journal_path=tmp_path / "j2", proposals_path=tmp_path / "p2")
    assert set(contract["voices"]) == {"PLAN_REVIEW", "RED_TEAM", "DIVERGENCE"}


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
