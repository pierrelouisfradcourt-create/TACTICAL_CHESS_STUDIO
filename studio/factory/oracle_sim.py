"""oracle_sim.py — oracle deterministe a code de sortie (IMP-188).

Strategie actee : l'oracle reel d'aujourd'hui est la simulation headless
Python de studio_core (`studio_core/sim/headless_sim.py`), qui TOURNE
vraiment et est rendue deterministe par un seed fixe. L'oracle Godot
headless (cible doctrinale 'build Godot exit 0') n'a aucun runtime
existant : il est expose comme adapter honnete qui se declare UNAVAILABLE
tant qu'aucun projet/binaire Godot n'existe.

Contrat OracleResult.status : PASS | FAIL | UNAVAILABLE.
Codes de sortie CLI : 0 = PASS, 1 = FAIL, 2 = UNAVAILABLE.

Aucun LLM ici. Un oracle qui consulte un LLM ne serait pas un oracle.
"""
from __future__ import annotations

import importlib
import json
import logging
import os
import random
import shutil
import sys
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("studio.factory.oracle_sim")

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_STUDIO_CORE = os.path.join(_REPO_ROOT, "studio_core")

PASS = "PASS"
FAIL = "FAIL"
UNAVAILABLE = "UNAVAILABLE"

_EXIT = {PASS: 0, FAIL: 1, UNAVAILABLE: 2}

# Outcomes legitimes d'une session du runtime snake.
_VALID_OUTCOMES = frozenset({"death", "timeout"})


@dataclass
class OracleResult:
    status: str                                  # PASS | FAIL | UNAVAILABLE
    adapter: str
    detail: str = ""
    metrics: dict[str, Any] = field(default_factory=dict)

    @property
    def passed(self) -> bool:
        return self.status == PASS

    @property
    def exit_code(self) -> int:
        return _EXIT.get(self.status, 1)


class OracleAdapter(ABC):
    """Interface commune des oracles. `run` ne doit jamais lever : il encode
    l'echec dans un OracleResult (FAIL ou UNAVAILABLE)."""

    name: str = "abstract"

    @abstractmethod
    def available(self) -> bool:
        ...

    @abstractmethod
    def run(self, ir_path: str) -> OracleResult:
        ...


def _import_headless_sim():
    """Importe studio_core/sim/headless_sim en cablant les chemins requis.

    headless_sim insere lui-meme studio_core et studio_core/runtime sur le
    path ; il suffit d'exposer studio_core/sim pour pouvoir l'importer.
    """
    for p in (_STUDIO_CORE, os.path.join(_STUDIO_CORE, "sim"),
              os.path.join(_STUDIO_CORE, "runtime")):
        if p not in sys.path:
            sys.path.insert(0, p)
    return importlib.import_module("headless_sim")


class HeadlessSimOracle(OracleAdapter):
    """Oracle reel : execute N sessions seedees du runtime studio_core et
    verifie des invariants durs. Deterministe (seed fixe)."""

    name = "headless_sim"

    def __init__(self, sessions: int = 20, seed: int = 1729) -> None:
        self.sessions = sessions
        self.seed = seed

    def available(self) -> bool:
        return os.path.isfile(os.path.join(_STUDIO_CORE, "sim", "headless_sim.py"))

    def supports(self, ir: dict[str, Any]) -> bool:
        """L'IR est-il jouable par le runtime snake ? (entites requises)."""
        try:
            ids = {e["id"] for e in ir.get("entities", [])}
        except (TypeError, KeyError):
            return False
        return {"player_snake", "enemy", "orb", "arena"}.issubset(ids)

    def run(self, ir_path: str) -> OracleResult:
        if not self.available():
            return OracleResult(UNAVAILABLE, self.name,
                                "studio_core/sim/headless_sim.py introuvable")
        try:
            with open(os.path.abspath(ir_path), "r", encoding="utf-8") as fh:
                config = json.load(fh)
        except (OSError, json.JSONDecodeError) as exc:
            return OracleResult(FAIL, self.name, f"IR illisible : {exc}")

        if not self.supports(config):
            return OracleResult(
                UNAVAILABLE, self.name,
                "IR non jouable par le runtime snake (aucun oracle runtime pour ce type)",
            )

        try:
            headless = _import_headless_sim()
        except Exception as exc:  # noqa: BLE001
            return OracleResult(UNAVAILABLE, self.name,
                                f"import headless_sim impossible : {exc}")

        # Determinisme : seed du module random global partage par le runtime.
        random.seed(self.seed)

        duration = float(config["meta"]["session_duration"])
        tolerance = duration * 1.05
        results: list[dict[str, Any]] = []
        try:
            for _ in range(self.sessions):
                results.append(headless.run_single_session(config))
        except Exception as exc:  # noqa: BLE001 — un crash runtime = FAIL franc
            return OracleResult(FAIL, self.name, f"crash runtime : {exc}",
                                {"sessions_ran": len(results)})

        violations: list[str] = []
        for i, r in enumerate(results):
            if r["score"] < 0:
                violations.append(f"session {i}: score negatif {r['score']}")
            if not (0.0 < r["survival_time"] <= tolerance):
                violations.append(
                    f"session {i}: survie {r['survival_time']:.2f}s hors borne (0, {tolerance:.1f}]")
            if r["outcome"] not in _VALID_OUTCOMES:
                violations.append(f"session {i}: outcome inconnu '{r['outcome']}'")

        metrics = {
            "sessions": len(results),
            "seed": self.seed,
            "avg_score": sum(r["score"] for r in results) / len(results),
            "avg_survival": sum(r["survival_time"] for r in results) / len(results),
            "violations": len(violations),
        }
        if violations:
            return OracleResult(FAIL, self.name,
                                "; ".join(violations[:5]), metrics)
        return OracleResult(PASS, self.name,
                            f"{len(results)} sessions valides (seed {self.seed})", metrics)


class GodotHeadlessOracle(OracleAdapter):
    """Seam Godot headless — cible doctrinale, runtime inexistant aujourd'hui.

    `available()` est vrai uniquement si un binaire Godot ET un project.godot
    sont presents. Tant que ce n'est pas le cas, `run` retourne UNAVAILABLE
    (jamais un faux PASS). C'est le point de branchement futur, pas un stub
    qui ment.
    """

    name = "godot_headless"

    def __init__(self, project_godot: str | None = None,
                 godot_bin: str | None = None) -> None:
        self.godot_bin = godot_bin or os.environ.get("GODOT_BIN") or shutil.which("godot")
        self.project_godot = project_godot or os.environ.get("TCS_GODOT_PROJECT", "")

    def available(self) -> bool:
        return bool(
            self.godot_bin
            and self.project_godot
            and os.path.isfile(self.project_godot)
        )

    def run(self, ir_path: str) -> OracleResult:
        if not self.available():
            return OracleResult(
                UNAVAILABLE, self.name,
                "Godot headless indisponible (binaire ou project.godot manquant) "
                "— seam non encore cable",
            )
        # Branchement futur : `<godot_bin> --headless --quit --path <proj>`,
        # exit 0 attendu. Volontairement non implemente tant qu'aucun projet
        # Godot n'existe : pas de surface affichee non cablee.
        return OracleResult(
            UNAVAILABLE, self.name,
            "execution Godot headless non implementee (aucun projet a piloter)",
        )


def get_oracle() -> OracleAdapter:
    """Selectionne l'oracle : Godot s'il est reellement disponible, sinon le
    headless sim Python (l'oracle reel d'aujourd'hui)."""
    godot = GodotHeadlessOracle()
    if godot.available():
        logger.info("oracle selectionne : godot_headless")
        return godot
    logger.info("oracle selectionne : headless_sim (Godot indisponible)")
    return HeadlessSimOracle()


def run_oracle(ir_path: str, oracle: OracleAdapter | None = None) -> OracleResult:
    return (oracle or get_oracle()).run(ir_path)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    if len(sys.argv) < 2:
        print("usage: python oracle_sim.py <ir_path.json>")
        raise SystemExit(2)
    result = run_oracle(sys.argv[1])
    print(json.dumps({
        "status": result.status,
        "adapter": result.adapter,
        "detail": result.detail,
        "metrics": result.metrics,
    }, indent=2, ensure_ascii=False))
    raise SystemExit(result.exit_code)
