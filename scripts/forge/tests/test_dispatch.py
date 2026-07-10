"""Oracle du dispatch gouverné Forge.

`prepare_dispatch` charge le contrat d'une étape, le valide, fabrique le payload
borné et TRACE un enregistrement d'audit — sans jamais spawner. `plan_chain`
fait le dry-run de toute la chaîne (preuve de câblage bout-en-bout).
"""
import json
from pathlib import Path

import pytest

import pytest

from forge.dispatch import (
    DETERMINISTIC,
    ORDER,
    PROFILES,
    order_for_profile,
    plan_chain,
    prepare_dispatch,
)


def test_order_covers_the_agent_steps():
    assert len(ORDER) == 13
    assert set(DETERMINISTIC).issubset(set(ORDER))


# --- profils de chaîne (full / patch / review) --------------------------------

def test_profiles_are_subsets_of_order():
    for name, steps in PROFILES.items():
        assert set(steps).issubset(set(ORDER)), f"profil {name} référence une étape hors ORDER"


def test_patch_profile_is_the_short_fix_chain():
    assert order_for_profile("patch") == [
        "s9-build", "s10a-oracle-code", "s11-redteam-code", "s12-verdict",
    ]


def test_micro_profile_is_proportional_to_trivial_tasks():
    """#4a : profil micro pour un one-liner — pas de red-team ni de design."""
    assert order_for_profile("micro") == ["s9-build", "s10a-oracle-code", "s12-verdict"]
    assert "s6-redteam-plan" not in order_for_profile("micro")


def test_full_profile_is_the_whole_chain():
    assert order_for_profile("full") == list(ORDER)


def test_unknown_profile_raises():
    with pytest.raises(ValueError):
        order_for_profile("mysteryyy")


def test_plan_chain_patch_profile_plans_only_its_steps(tmp_path):
    plan = plan_chain(run_id="p", profile="patch", audit_path=tmp_path / "a.jsonl")
    assert [p.etape for p in plan] == order_for_profile("patch")
    for p in plan:
        assert p.model


def test_prepare_dispatch_returns_payload_and_audits(tmp_path):
    audit = tmp_path / "audit.jsonl"
    payload = prepare_dispatch("s4-archi", run_id="t1", audit_path=audit)
    assert payload.model  # runtime résolu
    line = audit.read_text(encoding="utf-8").strip()
    rec = json.loads(line)
    assert rec["etape"] == "s4-archi"
    assert rec["run_id"] == "t1"
    assert rec["model"] == payload.model
    assert rec["capability_role"] == "architect"


def test_plan_chain_dryrun_covers_whole_chain(tmp_path):
    audit = tmp_path / "audit.jsonl"
    plan = plan_chain(run_id="dry", audit_path=audit)
    assert len(plan) == 13
    for p in plan:
        assert p.model  # chaque étape a un runtime résolu
    # audit : une ligne par étape
    assert len(audit.read_text(encoding="utf-8").strip().splitlines()) == 13


def test_deterministic_steps_plan_as_non_llm(tmp_path):
    audit = tmp_path / "audit.jsonl"
    plan = {p.etape: p for p in plan_chain(run_id="d", audit_path=audit)}
    for cid in DETERMINISTIC:
        assert plan[cid].model == "non-llm"


def test_unknown_step_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        prepare_dispatch("s99-inexistant", run_id="x", audit_path=tmp_path / "a.jsonl")


def test_dispatch_module_ne_spawn_pas():
    """Le dispatch gouverné TRACE et prépare — le spawn appartient au skill /forge."""
    source = Path(__file__).resolve().parents[1].joinpath("dispatch.py").read_text(encoding="utf-8")
    for interdit in ("subprocess", "Popen", "os.system"):
        assert interdit not in source, f"spawn interdit détecté : {interdit}"
