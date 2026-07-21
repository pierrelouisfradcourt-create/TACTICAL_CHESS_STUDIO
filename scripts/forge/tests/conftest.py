import sys
from pathlib import Path

import pytest

# scripts/forge/tests/conftest.py -> parents[2] == scripts/  (so `forge` is importable)
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))


# --- ajout minimal de fixture (P2 solvabilité, 2026-07-14) -------------------------
# La garde check_solvability_wired (gating s10a pour un JEU, miroir de la garde e2e)
# exige solvability.mjs câblé dans run-oracle.mjs. Les mini-jeux fabriqués par les
# helpers `_game_dir` des tests driver ANTÉRIEURS (test_driver_mutation.py,
# test_verify_run_mutation.py) n'en avaient pas — comme les fixtures des jeux réels
# (games/breakout, collect_runner) en ont un, ce complément aligne les mini-jeux de
# test sur la réalité SANS toucher aucune assertion existante (exception fixture
# déclarée). Les nouveaux tests qui veulent un jeu SANS solvabilité utilisent leurs
# propres helpers (nom différent de `_game_dir`), jamais couverts par ce shim.


@pytest.fixture(autouse=True)
def _complete_game_fixture_solvability(request, monkeypatch):
    """Complète les helpers `_game_dir` hérités avec un harnais de solvabilité câblé."""
    original = getattr(request.module, "_game_dir", None)
    if original is None:
        return

    def _avec_solvabilite(tmp_path):
        g = original(tmp_path)
        solv = g / "solvability.mjs"
        if not solv.exists():
            # `won` CALCULÉ (pas un littéral) : depuis le renfort R1
            # (check_harness_no_hardcoded_flags, câblé au driver s10a), un flag de
            # succès écrit en dur rougirait ce fixture lui-même — même exigence
            # qu'un vrai harnais.
            solv.write_text(
                "const moves = [1];\nconst bot = { won: moves.length > 0 };\n"
                "if (!bot.won) process.exit(1);\n",
                encoding="utf-8")
            runner = g / "run-oracle.mjs"
            if runner.exists():
                runner.write_text(
                    runner.read_text(encoding="utf-8")
                    + 'spawn("node", ["solvability.mjs"]);\n',
                    encoding="utf-8")
        return g

    monkeypatch.setattr(request.module, "_game_dir", _avec_solvabilite)
