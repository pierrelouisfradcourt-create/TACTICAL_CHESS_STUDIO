"""Tests factory_loop — pipeline complet, gates, promote sur vert seul (IMP-188)."""
from __future__ import annotations

import json
import os

import pytest

from studio.factory import oracle_sim
from studio.factory.factory_loop import FactoryError, run_factory
from studio.factory.oracle_sim import UNAVAILABLE, OracleAdapter, OracleResult


def _fixed_lm(_: str) -> str:
    return "if condition: apply(effect)"


class _UnavailableOracle(OracleAdapter):
    name = "fake_unavailable"

    def available(self) -> bool:
        return False

    def run(self, ir_path: str) -> OracleResult:
        return OracleResult(UNAVAILABLE, self.name, "indisponible (test)")


def test_full_pipeline_promotes_on_green(tmp_path, snake_ir_path):
    res = run_factory(
        snake_ir_path,
        lm_call=_fixed_lm,
        oracle=oracle_sim.HeadlessSimOracle(sessions=6),
        registry_dir=str(tmp_path / "registry"),
        hmac_key="test-key",
        now="2026-06-27T00:00:00+00:00",
    )
    assert res.status == "PROMOTED"
    assert res.oracle_status == "PASS"
    assert res.promoted is True
    assert res.logic_complete is True

    registry_path = tmp_path / "registry" / "registry.json"
    assert registry_path.is_file()
    entries = json.loads(registry_path.read_text(encoding="utf-8"))
    assert entries[-1]["ir_name"] == "Snake Survivor Lite"
    assert entries[-1]["oracle_status"] == "PASS"
    # Signature HMAC ecrite car cle fournie.
    assert (tmp_path / "registry" / "registry.json.hmac").is_file()


def test_no_promote_when_oracle_unavailable(tmp_path, snake_ir_path):
    res = run_factory(
        snake_ir_path,
        lm_call=_fixed_lm,
        oracle=_UnavailableOracle(),
        registry_dir=str(tmp_path / "registry"),
        hmac_key="test-key",
    )
    assert res.status == "BLOCKED_ORACLE"
    assert res.promoted is False
    # Aucun registry ecrit : pas de promote sans vert.
    assert not (tmp_path / "registry" / "registry.json").exists()


def test_chess_like_ir_blocks_at_oracle(tmp_path, minimal_ir):
    """IR valide v1 mais non jouable : passe template+logique, bloque a l'oracle."""
    p = tmp_path / "toy.json"
    p.write_text(json.dumps(minimal_ir), encoding="utf-8")
    res = run_factory(
        str(p),
        lm_call=_fixed_lm,
        registry_dir=str(tmp_path / "registry"),
        hmac_key="test-key",
    )
    assert res.status == "BLOCKED_ORACLE"
    assert res.oracle_status == "UNAVAILABLE"
    assert res.promoted is False


def test_invalid_ir_rejected(tmp_path):
    bad = {"meta": {"name": "x"}, "entities": [], "rules": []}  # version manquante, vides
    p = tmp_path / "bad.json"
    p.write_text(json.dumps(bad), encoding="utf-8")
    with pytest.raises(FactoryError):
        run_factory(str(p), lm_call=_fixed_lm, registry_dir=str(tmp_path / "r"))


def test_registry_appends(tmp_path, snake_ir_path):
    reg = str(tmp_path / "registry")
    for _ in range(2):
        run_factory(
            snake_ir_path,
            lm_call=_fixed_lm,
            oracle=oracle_sim.HeadlessSimOracle(sessions=4),
            registry_dir=reg,
            hmac_key="k",
            now="2026-06-27T00:00:00+00:00",
        )
    with open(os.path.join(reg, "registry.json"), encoding="utf-8") as fh:
        entries = json.load(fh)
    assert len(entries) == 2
