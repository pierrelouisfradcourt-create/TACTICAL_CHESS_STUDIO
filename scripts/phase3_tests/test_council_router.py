#!/usr/bin/env python3
"""test_council_router.py — preuve etape 5 : routeur contrat -> ledger (single-writer).

CONTRAINTE FERME : aucun test n'ecrit le ledger canonique. Tout passe par un ledger TEMPORAIRE
(tmp_path) charge via kaizen_loop.load_ledger et ecrit via kaizen_loop.cmd_add (guarded_write).

Couvre :
  - route_contract PUR : D1 (SAFE_AUTO/AUDIT_REQUIRED -> AUDIT_REQUIRED), HUMAN_REQUIRED -> arret net,
    dedup naif (ledger + intra-lot)
  - apply_contract sur ledger TEMP : items ecrits OPEN + source=council + lane AUDIT_REQUIRED
  - D1 negatif (6c) : suggested SAFE_AUTO -> atterrit AUDIT_REQUIRED
  - HUMAN_REQUIRED : aucune ecriture
  - dry_run : aucune ecriture
  - dedup : titre deja au ledger -> saute
  - cablage kaizen_autoloop.run_council_factory sur ledger TEMP + runner injecte
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest
import yaml

_HERE = Path(__file__).resolve().parent
REPO = _HERE.parents[1]
for p in (REPO / "scripts", REPO / "governance", REPO / "lab" / "chains"):
    sys.path.insert(0, str(p))

import council_router as cr  # noqa: E402
import kaizen_loop  # noqa: E402


def _item(title, lane="AUDIT_REQUIRED", rationale="parce que", refs=None):
    return {"title": title, "rationale": rationale, "suggested_lane": lane,
            "evidence_refs": refs or []}


def _contract(items):
    return {"schema_version": "1", "session_id": "s", "timestamp": "t",
            "voices": {}, "proposed_items": items, "claim_verdict": "NO_CLAIM_ALLOWED"}


def _temp_ledger(tmp_path, improvements=None):
    p = tmp_path / "ledger.yaml"
    p.write_text(yaml.dump({"improvements": improvements or []}, allow_unicode=True), encoding="utf-8")
    return p


def _read(p):
    return yaml.safe_load(Path(p).read_text(encoding="utf-8"))["improvements"]


# ── route_contract PUR ───────────────────────────────────────────────────────────

def test_d1_safe_auto_forced_to_audit_required():
    res = cr.route_contract(_contract([_item("x", "SAFE_AUTO")]), set())
    assert len(res.accepted) == 1
    assert res.decisions[0].final_lane == "AUDIT_REQUIRED"    # D1 : jamais SAFE_AUTO


def test_audit_required_stays_audit_required():
    res = cr.route_contract(_contract([_item("x", "AUDIT_REQUIRED")]), set())
    assert res.decisions[0].final_lane == "AUDIT_REQUIRED"


def test_human_required_is_skipped_no_lane():
    res = cr.route_contract(_contract([_item("x", "HUMAN_REQUIRED")]), set())
    assert res.accepted == [] and len(res.skipped_human) == 1
    assert res.decisions[0].final_lane is None


def test_dedup_against_existing_titles():
    res = cr.route_contract(_contract([_item("deja la")]), existing_titles={"deja la"})
    assert res.accepted == [] and len(res.skipped_duplicate) == 1


def test_dedup_within_batch():
    res = cr.route_contract(_contract([_item("meme"), _item("meme")]), set())
    assert len(res.accepted) == 1 and len(res.skipped_duplicate) == 1


# ── apply_contract sur ledger TEMPORAIRE (jamais canonique) ──────────────────────

def test_apply_writes_to_temp_ledger(tmp_path):
    ledger = _temp_ledger(tmp_path)
    result, new_ids = cr.apply_contract(_contract([_item("Ajouter un test input vide")]),
                                        ledger_path=ledger)
    assert len(new_ids) == 1
    imps = _read(ledger)
    assert len(imps) == 1
    imp = imps[0]
    assert imp["lane"] == "AUDIT_REQUIRED"          # D1
    assert imp["source"] == "council"               # D2 origine
    assert imp["status"] == "OPEN"                  # D2 statut initial
    assert imp["type"] == "council-proposed"
    assert "origin=council" in imp["notes"]


def test_d1_negative_safe_auto_lands_audit_required(tmp_path):
    ledger = _temp_ledger(tmp_path)
    cr.apply_contract(_contract([_item("item suggere safe_auto", "SAFE_AUTO")]), ledger_path=ledger)
    imps = _read(ledger)
    assert len(imps) == 1
    assert imps[0]["lane"] == "AUDIT_REQUIRED"      # 6c : SAFE_AUTO suggere -> AUDIT_REQUIRED ecrit


def test_human_required_writes_nothing(tmp_path):
    ledger = _temp_ledger(tmp_path)
    result, new_ids = cr.apply_contract(_contract([_item("humain", "HUMAN_REQUIRED")]),
                                        ledger_path=ledger)
    assert new_ids == [] and _read(ledger) == []


def test_dry_run_writes_nothing(tmp_path):
    ledger = _temp_ledger(tmp_path)
    result, new_ids = cr.apply_contract(_contract([_item("x")]), ledger_path=ledger, dry_run=True)
    assert new_ids == [] and _read(ledger) == []
    assert len(result.accepted) == 1               # route quand meme (decision calculee)


def test_dedup_existing_ledger_title_not_rewritten(tmp_path):
    ledger = _temp_ledger(tmp_path, improvements=[{
        "id": "IMP-042", "title": "risque connu", "status": "OPEN", "lane": "AUDIT_REQUIRED",
        "source": "manual", "impact": "MEDIUM", "effort": "MEDIUM",
    }])
    result, new_ids = cr.apply_contract(_contract([_item("risque connu"), _item("nouveau risque")]),
                                        ledger_path=ledger)
    imps = _read(ledger)
    assert len(imps) == 2                           # 1 existant + 1 nouveau (le doublon saute)
    assert len(result.skipped_duplicate) == 1 and len(new_ids) == 1


def test_multiple_items_sequential_ids(tmp_path):
    ledger = _temp_ledger(tmp_path)
    _, new_ids = cr.apply_contract(_contract([_item("a"), _item("b"), _item("c")]), ledger_path=ledger)
    assert len(new_ids) == 3 and len(_read(ledger)) == 3


# ── cablage kaizen_autoloop.run_council_factory (ledger TEMP + runner injecte) ───

def test_kaizen_autoloop_wiring_temp_ledger(tmp_path):
    import kaizen_autoloop
    from council import CouncilResult, CouncilRole, ModelId, ModelOpinion, Stance
    charter = tmp_path / "charter.md"
    charter.write_text("# charter test\nPlan: faire X.\n", encoding="utf-8")
    ledger = _temp_ledger(tmp_path)

    def _fake_runner(task, adapters):
        return CouncilResult(
            task_id="IMP-TEST", generated_at="2026-07-06T00:00:00Z", plan_md="plan",
            opinions=(
                ModelOpinion(model=ModelId.CLAUDE, role=CouncilRole.PLAN_REVIEW, stance=Stance.APPROUVE, rationale="ok"),
                ModelOpinion(model=ModelId.QWEN14B, role=CouncilRole.RED_TEAM, stance=Stance.APPROUVE,
                             rationale="ok", risks=("pas de test sur input vide",)),
                ModelOpinion(model=ModelId.QWEN14B, role=CouncilRole.DIVERGENCE, stance=Stance.DIVERGENCE, rationale="ok"),
            ),
            disagreements=(), divergences=(), requires_humangate=False, collapsed=False, distinct_models=2)

    contract, result, new_ids = kaizen_autoloop.run_council_factory(
        {"id": "IMP-TEST"}, str(charter), ledger_path=ledger, runner=_fake_runner)
    assert contract["voices"]["RED_TEAM"]["verdict"] == "OK"
    assert len(new_ids) == 1
    imps = _read(ledger)
    assert imps[0]["source"] == "council" and imps[0]["lane"] == "AUDIT_REQUIRED"


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
