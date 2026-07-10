"""Oracle des connecteurs studio de Forge (ADR-002 §3, connecteurs 3/4/5/6).

Tous PROPOSE-ONLY : télémétrie + journal d'erreurs + propositions ledger/projet
écrivent UNIQUEMENT sous lab/forge_evidence ou lab/reports/forge_* — jamais dans
les mémoires de référence (IMPROVEMENT_LEDGER.yaml, studio_state/projects.json).
"""
import json
from pathlib import Path

from forge import studio_link as sl


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


def test_connecteurs_necrivent_aucune_memoire_de_reference():
    """Garde propose-only : le module ne référence jamais en écriture le ledger ni projects.json."""
    src = Path(__file__).resolve().parents[1].joinpath("studio_link.py").read_text(encoding="utf-8")
    assert "IMPROVEMENT_LEDGER" not in src
    assert "projects.json" not in src
    for interdit in ("subprocess", "Popen", "os.system"):
        assert interdit not in src
