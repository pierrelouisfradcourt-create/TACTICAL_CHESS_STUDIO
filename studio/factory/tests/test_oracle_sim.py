"""Tests oracle_sim — oracle reel headless + seam Godot honnete (IMP-188)."""
from __future__ import annotations

from studio.factory.oracle_sim import (
    FAIL,
    PASS,
    UNAVAILABLE,
    GodotHeadlessOracle,
    HeadlessSimOracle,
    OracleResult,
    run_oracle,
)


def test_exit_code_mapping():
    assert OracleResult(PASS, "x").exit_code == 0
    assert OracleResult(FAIL, "x").exit_code == 1
    assert OracleResult(UNAVAILABLE, "x").exit_code == 2
    assert OracleResult(PASS, "x").passed is True
    assert OracleResult(FAIL, "x").passed is False


def test_headless_sim_oracle_passes_on_snake(snake_ir_path):
    """L'oracle reel tourne et passe sur l'IR snake (deterministe, seed fixe)."""
    res = HeadlessSimOracle(sessions=8).run(snake_ir_path)
    assert res.status == PASS, res.detail
    assert res.exit_code == 0
    assert res.metrics["sessions"] == 8
    assert res.metrics["violations"] == 0


def test_headless_sim_oracle_deterministic(snake_ir_path):
    a = HeadlessSimOracle(sessions=6, seed=42).run(snake_ir_path)
    b = HeadlessSimOracle(sessions=6, seed=42).run(snake_ir_path)
    assert a.metrics["avg_score"] == b.metrics["avg_score"]
    assert a.metrics["avg_survival"] == b.metrics["avg_survival"]


def test_headless_sim_unavailable_for_non_snake_ir(tmp_path, minimal_ir):
    import json
    p = tmp_path / "toy.json"
    p.write_text(json.dumps(minimal_ir), encoding="utf-8")
    res = HeadlessSimOracle().run(str(p))
    # IR valide mais non jouable par le runtime snake -> UNAVAILABLE, pas FAIL.
    assert res.status == UNAVAILABLE
    assert res.exit_code == 2


def test_godot_oracle_unavailable_today():
    """Aucun projet Godot : l'adapter se declare indisponible, jamais PASS."""
    godot = GodotHeadlessOracle(project_godot="", godot_bin=None)
    assert godot.available() is False
    res = godot.run("whatever.json")
    assert res.status == UNAVAILABLE
    assert res.exit_code == 2


def test_run_oracle_auto_selects_headless(snake_ir_path):
    res = run_oracle(snake_ir_path)
    assert res.adapter == "headless_sim"
    assert res.status == PASS
