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
    DEDICATED_PROFILE_STEPS,
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

def test_profiles_are_subsets_of_order_or_explicitly_dedicated():
    """Un profil référence soit une étape de ORDER (chaîne canonique "full"), soit une
    étape listée dans DEDICATED_PROFILE_STEPS (hors ORDER par décision explicite, ex.
    s2.5-artbible — jamais dans "full", cf. commentaire dispatch.py). Aucune autre
    étape "mystère" : un typo dans un profil doit toujours être détecté."""
    allowed = set(ORDER) | set(DEDICATED_PROFILE_STEPS)
    for name, steps in PROFILES.items():
        assert set(steps).issubset(allowed), f"profil {name} référence une étape hors ORDER/DEDICATED_PROFILE_STEPS"


def test_dedicated_steps_never_leak_into_full():
    """Une étape dédiée (hors ORDER) ne doit JAMAIS se retrouver dans "full" — sinon
    la distinction "profil dédié" vs "chaîne canonique" n'a plus de sens (régression
    du 2026-07-14 : s2.5-artbible câblé dans un profil dédié `artbible`, PAS dans full)."""
    assert set(DEDICATED_PROFILE_STEPS).isdisjoint(set(ORDER))
    assert set(DEDICATED_PROFILE_STEPS).isdisjoint(set(order_for_profile("full")))


def test_artbible_profile_is_dedicated_and_standalone():
    assert order_for_profile("artbible") == ["s2.5-artbible"]
    assert "s2.5-artbible" not in order_for_profile("full")


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


def test_increment_profile_skips_s0_s1_s2_but_keeps_archi_and_wiremap():
    """Ratifié Pierre 2026-07-19 (FORGE_PLAN_PROPOSAL.md §5 R1) : un incrément sur un
    projet dont le corpus de bibles fait déjà foi saute charter/prisme/world-scan, mais
    REFAIT archi/wiremap (contrairement à `patch`) — c'est justement ce qu'un moteur
    multi-incréments doit re-prouver à chaque incrément (deps_interdites, wiremap à jour)."""
    steps = order_for_profile("increment")
    assert steps == [
        "s3-decompo", "s4-archi", "s5-wiremap", "s6-redteam-plan", "s9-build",
        "s10a-oracle-code", "s10b-oracle-archi", "s10c-oracle-wiremap",
        "s11-redteam-code", "s12-verdict",
    ]
    assert "s0-contrat" not in steps and "s1-prisme" not in steps and "s2-worldscan" not in steps
    assert "s10b-oracle-archi" in steps and "s10c-oracle-wiremap" in steps


def test_plan_chain_patch_profile_plans_only_its_steps(tmp_path):
    plan = plan_chain(run_id="p", profile="patch", audit_path=tmp_path / "a.jsonl")
    assert [p.etape for p in plan] == order_for_profile("patch")
    for p in plan:
        assert p.model


def test_plan_chain_artbible_profile_resolves_a_real_runtime(tmp_path):
    """Preuve de câblage bout-en-bout du profil dédié artbible (2026-07-14) : le
    contrat charge, se valide, et le registry résout un runtime réel (pas un stub)."""
    plan = plan_chain(run_id="ab", profile="artbible", audit_path=tmp_path / "a.jsonl")
    assert [p.etape for p in plan] == ["s2.5-artbible"]
    assert plan[0].model == "claude-opus-4-8"
    assert plan[0].provider == "claude-local"


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
