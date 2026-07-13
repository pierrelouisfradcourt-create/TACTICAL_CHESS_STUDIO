"""Oracle des connecteurs studio de Forge (ADR-002 §3, connecteurs 3/4/5/6).

Tous PROPOSE-ONLY : télémétrie + journal d'erreurs + propositions ledger/projet
écrivent UNIQUEMENT sous lab/forge_evidence ou lab/reports/forge_* — jamais dans
les mémoires de référence (IMPROVEMENT_LEDGER.yaml, studio_state/projects.json).
"""
import json
from pathlib import Path

from forge import studio_link as sl


def test_global_lesson_reaches_every_project(tmp_path):
    """#4b : une leçon GLOBALE circule vers TOUT projet (ferme le silo par projet)."""
    j = tmp_path / "journal.jsonl"
    sl.record_error("r1", "s10a", "bug spécifique à collect_runner", "collect_runner", journal_path=j)
    sl.record_global_lesson("s10a", "l'oracle DOIT tester la solvabilité", journal_path=j)
    # un AUTRE projet doit voir la leçon globale (mais pas l'erreur spécifique de l'autre)
    pm = sl.premortem("survival_arena", journal_path=j)
    assert any("solvabilité" in x for x in pm), "la leçon globale doit atteindre survival_arena"
    assert not any("spécifique à collect_runner" in x for x in pm)
    # le projet d'origine voit les deux
    pm2 = sl.premortem("collect_runner", journal_path=j)
    assert any("solvabilité" in x for x in pm2)
    assert any("spécifique à collect_runner" in x for x in pm2)


def test_telemetry_records_and_aggregates(tmp_path):
    t = tmp_path / "tel.jsonl"
    sl.record_telemetry("run1", "s0-contrat", "claude-opus-4-8", tokens=1200, duration_s=3.0, telemetry_path=t)
    sl.record_telemetry("run1", "s4-archi", "claude-opus-4-8", tokens=800, duration_s=2.0, telemetry_path=t)
    cost = sl.run_cost("run1", telemetry_path=t)
    assert cost["calls"] == 2
    assert cost["total_tokens"] == 2000
    assert cost["total_duration_s"] == 5.0


def test_error_journal_feeds_premortem(tmp_path):
    j = tmp_path / "err.jsonl"
    sl.record_error("leviathan-1", "s9-build", "oracle rouge : 2 tests échouent", project="leviathan", journal_path=j)
    sl.record_error("other-1", "s4-archi", "cycle de deps détecté", project="autre", journal_path=j)
    pm = sl.premortem("leviathan", journal_path=j)
    assert any("oracle rouge" in x for x in pm)
    assert all("cycle de deps" not in x for x in pm)  # projet différent filtré


def test_propose_ledger_entry_is_audit_required_and_no_claim(tmp_path):
    p = tmp_path / "ledger_prop.jsonl"
    verdict = {"software_verdict": "OK", "evidence_verdict": "MECHANICAL_VALIDATION_ONLY",
               "claim_verdict": "NO_CLAIM_ALLOWED"}
    rec = sl.propose_ledger_entry("leviathan-1", "leviathan", verdict, proposals_path=p)
    assert rec["lane"] == "AUDIT_REQUIRED"
    assert rec["status"] == "PROPOSED"
    assert rec["claim_verdict"] == "NO_CLAIM_ALLOWED"
    on_disk = json.loads(p.read_text(encoding="utf-8").strip())
    assert on_disk["run_id"] == "leviathan-1"


def test_propose_project_record(tmp_path):
    p = tmp_path / "proj_prop.jsonl"
    rec = sl.propose_project_record("leviathan", stage="build", folder="games/leviathan", proposals_path=p)
    assert rec["status"] == "PROPOSED"
    assert rec["project"] == "leviathan"
    assert p.read_text(encoding="utf-8").strip()


# --- Tier 2.5 étape 2 : observabilité du pool de builders -------------------------

def test_record_builder_run_and_pool_stats(tmp_path):
    b = tmp_path / "builder_runs.jsonl"
    # 1er essai (haiku) échoue, pool retry (même tier) réussit — le pool sauve la tâche.
    sl.record_builder_run("run1", tier="haiku", builder_id="claude-haiku-4-5-20251001",
                          strategy="tier_attempt", duration_s=2.0, oracle_result="FAIL",
                          retry_number=0, tokens=500, cost_usd=0.01, telemetry_path=b)
    sl.record_builder_run("run1", tier="haiku", builder_id="claude-haiku-4-5-20251001",
                          strategy="pool_retry", duration_s=2.5, oracle_result="OK",
                          retry_number=1, tokens=520, cost_usd=0.012, telemetry_path=b)
    stats = sl.pool_stats("run1", telemetry_path=b)
    assert stats["attempts"] == 2
    assert stats["pool_saves"] == 1
    assert abs(stats["escalations_avoided_cost_usd"] - 0.012) < 1e-9
    assert stats["by_builder"]["claude-haiku-4-5-20251001"] == {"FAIL": 1, "OK": 1}


def test_pool_stats_pool_retry_qui_echoue_aussi_ne_compte_pas_comme_sauve(tmp_path):
    b = tmp_path / "builder_runs.jsonl"
    sl.record_builder_run("run1", tier="haiku", builder_id="haiku", strategy="tier_attempt",
                          duration_s=1.0, oracle_result="FAIL", retry_number=0,
                          tokens=1, cost_usd=0.001, telemetry_path=b)
    sl.record_builder_run("run1", tier="haiku", builder_id="haiku", strategy="pool_retry",
                          duration_s=1.0, oracle_result="FAIL", retry_number=1,
                          tokens=1, cost_usd=0.001, telemetry_path=b)
    stats = sl.pool_stats("run1", telemetry_path=b)
    assert stats["pool_saves"] == 0
    assert stats["escalations_avoided_cost_usd"] == 0.0


def test_pool_stats_filtre_par_run_id(tmp_path):
    b = tmp_path / "builder_runs.jsonl"
    sl.record_builder_run("run1", tier="haiku", builder_id="haiku", strategy="tier_attempt",
                          duration_s=1.0, oracle_result="OK", retry_number=0,
                          tokens=1, cost_usd=0.0, telemetry_path=b)
    sl.record_builder_run("run2", tier="opus", builder_id="opus", strategy="tier_attempt",
                          duration_s=1.0, oracle_result="OK", retry_number=0,
                          tokens=1, cost_usd=0.0, telemetry_path=b)
    assert sl.pool_stats("run1", telemetry_path=b)["attempts"] == 1
    assert sl.pool_stats("run2", telemetry_path=b)["attempts"] == 1


def test_connecteurs_necrivent_aucune_memoire_de_reference():
    """Garde propose-only : le module ne référence jamais en écriture le ledger ni projects.json."""
    src = Path(__file__).resolve().parents[1].joinpath("studio_link.py").read_text(encoding="utf-8")
    assert "IMPROVEMENT_LEDGER" not in src
    assert "projects.json" not in src
    for interdit in ("subprocess", "Popen", "os.system"):
        assert interdit not in src
