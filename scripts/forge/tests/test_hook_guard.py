"""Oracle du garde de spawn Forge (hook dur, connecteur 2).

Un spawn de sous-agent portant le marqueur FORGE_DISPATCH:<etape>:<run_id> n'est
autorisé que si un dispatch validé correspondant existe dans l'audit. Sans
marqueur (spawn hors Forge) => toujours autorisé (le hook ne gêne pas le reste).
"""
import json

from forge.hook_guard import check_spawn


def test_non_forge_spawn_passe(tmp_path):
    allow, reason = check_spawn("Analyse ce fichier stp", audit_path=tmp_path / "a.jsonl")
    assert allow is True


def test_forge_spawn_sans_dispatch_bloque(tmp_path):
    audit = tmp_path / "a.jsonl"
    audit.write_text("", encoding="utf-8")
    allow, reason = check_spawn("... FORGE_DISPATCH:s4-archi:run1 ...", audit_path=audit)
    assert allow is False
    assert "s4-archi" in reason


def test_forge_spawn_avec_dispatch_valide_passe(tmp_path):
    audit = tmp_path / "a.jsonl"
    audit.write_text(json.dumps({"etape": "s4-archi", "run_id": "run1"}) + "\n", encoding="utf-8")
    allow, reason = check_spawn("cadre... FORGE_DISPATCH:s4-archi:run1 ...fin", audit_path=audit)
    assert allow is True


def test_forge_spawn_mauvais_run_bloque(tmp_path):
    audit = tmp_path / "a.jsonl"
    audit.write_text(json.dumps({"etape": "s4-archi", "run_id": "AUTRE"}) + "\n", encoding="utf-8")
    allow, reason = check_spawn("FORGE_DISPATCH:s4-archi:run1", audit_path=audit)
    assert allow is False
