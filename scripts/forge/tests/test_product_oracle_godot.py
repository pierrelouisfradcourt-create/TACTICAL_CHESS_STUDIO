"""Couverture RED/GREEN du fournisseur GODOT (`forge.product_oracle_godot`) —
pendant du fournisseur WEB (`forge.product_oracle`, NON modifié, couvert par
`test_product_oracle.py`). Ces tests n'invoquent JAMAIS un vrai binaire Godot :
`binary_resolver`/`runner` sont injectés (même patron que
`test_driver_product_oracle.py` pour `mutation_runner`) — le binaire est
actuellement ABSENT de ce poste (`godot.config.json` pointe un chemin qui
n'existe plus, 2026-07-29).
"""
import json

from forge.product_oracle_godot import (
    GPU_WINDOW_REQUIRED_VOLETS,
    discover_oracle_files,
    has_godot_capacity,
    run_godot_product_oracle,
)


def _oracle_gd(root, name, *, marker=True):
    """Dépose un faux fichier `.gd` d'oracle sous `<root>/07_TESTS/oracle/`."""
    oracle_dir = root / "07_TESTS" / "oracle"
    oracle_dir.mkdir(parents=True, exist_ok=True)
    body = f'# Sortie : "FORGE_ORACLE {name} {{json}}"\nextends SceneTree\n' if marker else "extends SceneTree\n"
    (oracle_dir / f"{name}.gd").write_text(body, encoding="utf-8")
    return oracle_dir / f"{name}.gd"


# --- discover_oracle_files / has_godot_capacity (condition (b), correction ①) -------


def test_discover_oracle_files_ne_retient_que_les_fichiers_avec_marqueur(tmp_path):
    _oracle_gd(tmp_path, "core_boot")
    _oracle_gd(tmp_path, "sans_marqueur", marker=False)
    found = discover_oracle_files(tmp_path)
    names = sorted(p.stem for p in found)
    assert names == ["core_boot"]


def test_discover_oracle_files_vide_si_dossier_absent(tmp_path):
    assert discover_oracle_files(tmp_path / "inexistant") == []
    assert has_godot_capacity(tmp_path / "inexistant") is False


def test_has_godot_capacity_vrai_si_au_moins_un_oracle(tmp_path):
    _oracle_gd(tmp_path, "core_boot")
    assert has_godot_capacity(tmp_path) is True


def test_discover_oracle_files_ordre_deterministe(tmp_path):
    _oracle_gd(tmp_path, "zeta")
    _oracle_gd(tmp_path, "alpha")
    found = discover_oracle_files(tmp_path)
    assert [p.stem for p in found] == ["alpha", "zeta"]


# --- binaire introuvable => TOUS les volets NOT_MEASURED, motivés -------------------


def test_binaire_absent_rend_tous_les_volets_not_measured_motives(tmp_path):
    _oracle_gd(tmp_path, "core_boot")
    _oracle_gd(tmp_path, "core_exit")

    def resolver_absent():
        raise FileNotFoundError("binaire Godot non configuré (poste sans installation)")

    out = run_godot_product_oracle(tmp_path, binary_resolver=resolver_absent)
    assert set(out.keys()) == {"core_boot", "core_exit"}
    for volet in out.values():
        assert volet["status"] == "NOT_MEASURED"
        assert volet["passed"] is False
        assert "binaire" in volet["reason"].lower() or "godot" in volet["reason"].lower()


def test_aucun_oracle_decouvert_rend_mapping_vide_sans_appeler_le_resolver(tmp_path):
    calls = []

    def resolver(*_a, **_kw):
        calls.append(1)
        return "fake_bin"

    out = run_godot_product_oracle(tmp_path, binary_resolver=resolver)
    assert out == {}
    assert calls == []  # pas d'oracle => jamais besoin de résoudre le binaire


# --- core_render_frame : TOUJOURS NOT_MEASURED en l'absence de fenêtre GPU ----------


def test_core_render_frame_toujours_not_measured_meme_binaire_present(tmp_path):
    _oracle_gd(tmp_path, "core_render_frame")
    calls = []

    def runner(binary, game_dir, script, *, timeout_s):
        calls.append(script)
        return {"returncode": 0, "stdout": "", "stderr": ""}

    out = run_godot_product_oracle(
        tmp_path, binary_resolver=lambda: "fake_bin", runner=runner)
    assert out["core_render_frame"]["status"] == "NOT_MEASURED"
    assert "GPU" in out["core_render_frame"]["reason"]
    assert calls == []  # jamais lancé en headless en espérant un vert
    assert "core_render_frame" in GPU_WINDOW_REQUIRED_VOLETS


# --- oracle vert / rouge (parsing de la ligne FORGE_ORACLE) -------------------------


def _stdout_for(name, ok, fails=None):
    payload = {"ok": ok, "fails": fails or []}
    return f"some godot boot noise\nFORGE_ORACLE {name} {json.dumps(payload)}\n"


def test_oracle_vert_rend_le_volet_ok(tmp_path):
    _oracle_gd(tmp_path, "core_boot")

    def runner(binary, game_dir, script, *, timeout_s):
        return {"returncode": 0, "stdout": _stdout_for("core_boot", True), "stderr": ""}

    out = run_godot_product_oracle(
        tmp_path, binary_resolver=lambda: "fake_bin", runner=runner)
    assert out["core_boot"]["status"] == "OK"
    assert out["core_boot"]["passed"] is True
    assert out["core_boot"]["fails"] == []


def test_oracle_rouge_rend_le_volet_fail(tmp_path):
    _oracle_gd(tmp_path, "core_boot")

    def runner(binary, game_dir, script, *, timeout_s):
        return {
            "returncode": 1,
            "stdout": _stdout_for("core_boot", False, ["statut initial != EN_COURS"]),
            "stderr": "",
        }

    out = run_godot_product_oracle(
        tmp_path, binary_resolver=lambda: "fake_bin", runner=runner)
    assert out["core_boot"]["status"] == "FAIL"
    assert out["core_boot"]["passed"] is False
    assert out["core_boot"]["fails"] == ["statut initial != EN_COURS"]


# --- robustesse : sortie illisible / JSON invalide / timeout / exception -----------


def test_sortie_illisible_rend_not_measured(tmp_path):
    _oracle_gd(tmp_path, "core_boot")

    def runner(binary, game_dir, script, *, timeout_s):
        return {"returncode": 1, "stdout": "boom, no forge oracle line here", "stderr": "trace"}

    out = run_godot_product_oracle(
        tmp_path, binary_resolver=lambda: "fake_bin", runner=runner)
    assert out["core_boot"]["status"] == "NOT_MEASURED"
    assert out["core_boot"]["passed"] is False


def test_json_invalide_rend_not_measured(tmp_path):
    _oracle_gd(tmp_path, "core_boot")

    def runner(binary, game_dir, script, *, timeout_s):
        return {"returncode": 0, "stdout": "FORGE_ORACLE core_boot {not-json", "stderr": ""}

    out = run_godot_product_oracle(
        tmp_path, binary_resolver=lambda: "fake_bin", runner=runner)
    assert out["core_boot"]["status"] == "NOT_MEASURED"


def test_timeout_rend_not_measured(tmp_path):
    _oracle_gd(tmp_path, "core_boot")

    def runner(binary, game_dir, script, *, timeout_s):
        return {"ok": None, "timeout": True, "returncode": None, "stdout": "", "stderr": ""}

    out = run_godot_product_oracle(
        tmp_path, binary_resolver=lambda: "fake_bin", runner=runner)
    assert out["core_boot"]["status"] == "NOT_MEASURED"
    assert "timeout" in out["core_boot"]["reason"].lower()


def test_exception_du_runner_ne_remonte_jamais(tmp_path):
    _oracle_gd(tmp_path, "core_boot")

    def boom(binary, game_dir, script, *, timeout_s):
        raise RuntimeError("panne fabriquée")

    out = run_godot_product_oracle(
        tmp_path, binary_resolver=lambda: "fake_bin", runner=boom)
    assert out["core_boot"]["status"] == "NOT_MEASURED"
    assert "panne fabriquée" in out["core_boot"]["reason"]


def test_champ_ok_absent_ou_non_booleen_rend_not_measured(tmp_path):
    _oracle_gd(tmp_path, "core_boot")

    def runner(binary, game_dir, script, *, timeout_s):
        return {"returncode": 0, "stdout": 'FORGE_ORACLE core_boot {"fails": []}', "stderr": ""}

    out = run_godot_product_oracle(
        tmp_path, binary_resolver=lambda: "fake_bin", runner=runner)
    assert out["core_boot"]["status"] == "NOT_MEASURED"
