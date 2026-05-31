"""
test_hg_queue.py — Tests pytest pour hg_queue.py
Couvre: chargement YAML, list, list --pending, source_state.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import hg_queue
import pytest

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False


@pytest.mark.skipif(not YAML_AVAILABLE, reason="pyyaml requis")
class TestHGQueue:

    def test_yaml_loads_valid(self):
        """Le fichier YAML existe, se charge sans erreur et a la bonne structure."""
        assert hg_queue.LOG_PATH.exists(), f"{hg_queue.LOG_PATH} introuvable"
        with open(hg_queue.LOG_PATH, encoding="utf-8") as f:
            data = yaml.safe_load(f)
        assert isinstance(data, dict), "Racine doit etre un dict"
        assert "decisions" in data, "Cle 'decisions' manquante"
        assert "meta" in data, "Cle 'meta' manquante"
        assert data["meta"]["claim_verdict"] == "NO_CLAIM_ALLOWED"

    def test_list_returns_all_decisions(self, capsys):
        """cmd_list(pending_only=False) affiche toutes les decisions."""
        hg_queue.cmd_list(pending_only=False)
        captured = capsys.readouterr()
        assert "decision(s)" in captured.out or "Aucune" in captured.out
        # Les 2 decisions seed doivent apparaitre
        assert "HGD-001" in captured.out
        assert "HGD-002" in captured.out

    def test_list_pending_filters_correctly(self, tmp_path, monkeypatch, capsys):
        """cmd_list(pending_only=True) ne retourne que les decisions PENDING."""
        test_data = {
            "meta": {"version": "v0", "claim_verdict": "NO_CLAIM_ALLOWED", "authority": "HumanGate"},
            "decisions": [
                {
                    "decision_id": "HGD-T01",
                    "title": "Decision approuvee",
                    "category": "improvement_close",
                    "zone": "lab/chains",
                    "verdict": "APPROVED",
                    "source_state": {k: "2026-05-31" for k in hg_queue.SOURCE_STATE_FIELDS},
                    "evidence_refs": [],
                    "blocked_actions": [],
                    "approved_by": "HumanGate",
                    "approved_at": "2026-05-31",
                },
                {
                    "decision_id": "HGD-T02",
                    "title": "Decision en attente",
                    "category": "routing_decision",
                    "zone": "lab/chains",
                    "verdict": "PENDING",
                    "source_state": {k: None for k in hg_queue.SOURCE_STATE_FIELDS},
                    "evidence_refs": [],
                    "blocked_actions": [],
                    "approved_by": "HumanGate",
                    "approved_at": "2026-05-31",
                },
            ],
        }
        test_log = tmp_path / "test_log.yaml"
        test_log.write_text(yaml.dump(test_data, allow_unicode=True), encoding="utf-8")
        monkeypatch.setattr(hg_queue, "LOG_PATH", test_log)

        hg_queue.cmd_list(pending_only=True)
        captured = capsys.readouterr()

        assert "HGD-T02" in captured.out, "La decision PENDING doit apparaitre"
        assert "HGD-T01" not in captured.out, "La decision APPROVED ne doit pas apparaitre"
        assert "1 decision(s) PENDING" in captured.out

    def test_list_pending_empty(self, tmp_path, monkeypatch, capsys):
        """cmd_list(pending_only=True) avec 0 PENDING affiche le message vide."""
        test_data = {
            "meta": {"version": "v0", "claim_verdict": "NO_CLAIM_ALLOWED", "authority": "HumanGate"},
            "decisions": [
                {
                    "decision_id": "HGD-T01",
                    "title": "Tout approuve",
                    "category": "improvement_close",
                    "zone": "lab",
                    "verdict": "APPROVED",
                    "source_state": {},
                    "evidence_refs": [],
                    "blocked_actions": [],
                    "approved_by": "HumanGate",
                    "approved_at": "2026-05-31",
                },
            ],
        }
        test_log = tmp_path / "test_log.yaml"
        test_log.write_text(yaml.dump(test_data), encoding="utf-8")
        monkeypatch.setattr(hg_queue, "LOG_PATH", test_log)

        hg_queue.cmd_list(pending_only=True)
        captured = capsys.readouterr()
        assert "Aucune" in captured.out

    def test_source_state_fields_present(self):
        """Chaque decision du log reel contient tous les champs source_state requis."""
        if not hg_queue.LOG_PATH.exists():
            pytest.skip("HUMANGATE_DECISION_LOG.yaml absent")
        with open(hg_queue.LOG_PATH, encoding="utf-8") as f:
            data = yaml.safe_load(f)
        for d in data.get("decisions", []):
            did = d.get("decision_id", "?")
            ss = d.get("source_state")
            assert isinstance(ss, dict), f"{did}: source_state doit etre un dict"
            for field in hg_queue.SOURCE_STATE_FIELDS:
                assert field in ss, f"{did}: source_state.{field} manquant"

    def test_load_log_missing_file(self, tmp_path, monkeypatch):
        """load_log() appelle sys.exit(1) si le fichier est absent."""
        monkeypatch.setattr(hg_queue, "LOG_PATH", tmp_path / "nonexistent.yaml")
        with pytest.raises(SystemExit) as exc_info:
            hg_queue.load_log()
        assert exc_info.value.code == 1

    def test_source_state_constants(self):
        """SOURCE_STATE_FIELDS contient exactement les 5 champs attendus."""
        expected = {"created", "registered", "loaded", "enforced", "evidenced"}
        assert set(hg_queue.SOURCE_STATE_FIELDS) == expected
