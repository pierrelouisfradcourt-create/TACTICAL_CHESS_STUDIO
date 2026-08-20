"""factory_loop.py — orchestrateur de l'usine (IMP-188).

Pipeline : governor.check -> validate(ir_schema_v1) -> template_engine
           -> llm_logic_engine -> oracle_sim -> registry.

Invariants doctrinaux cables ici :
  - governor.check() AVANT toute action de lane (fail-closed).
  - PAS de promote au registry sans oracle PASS ('pas de promote sans vert').
  - Registry signe HMAC (STUDIO_HMAC_KEY), comme studio_meta.py.
  - Aucun git, aucun push : la couche ne fait qu'ecrire le registry local.
"""
from __future__ import annotations

import argparse
import hashlib
import hmac as hmac_lib
import importlib
import json
import logging
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from studio.factory import oracle_sim  # noqa: E402
from studio.factory.llm_logic_engine import LmCall, fill_logic  # noqa: E402
from studio.factory.template_engine import build_scaffold, load_ir  # noqa: E402

logger = logging.getLogger("studio.factory.factory_loop")

_SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "ir_schema_v1.json")
_REGISTRY_DIR = os.path.join(os.path.dirname(__file__), "registry")


class FactoryError(RuntimeError):
    """Echec non recuperable du pipeline."""


@dataclass
class FactoryRunResult:
    ir_name: str
    status: str                       # PROMOTED | BLOCKED_GOVERNOR | BLOCKED_ORACLE | ERROR
    oracle_status: str = ""           # PASS | FAIL | UNAVAILABLE | ""
    promoted: bool = False
    detail: str = ""
    logic_complete: bool = False
    metrics: dict[str, Any] = field(default_factory=dict)


def _governor_check(lane: str = "SAFE_AUTO") -> Any:
    """Importe governance/governor.py et evalue l'action. Fail-closed si
    l'import echoue."""
    try:
        governor = importlib.import_module("governance.governor")
    except Exception as exc:  # noqa: BLE001
        raise FactoryError(f"governor indisponible (fail-closed) : {exc}") from exc
    return governor.check({"lane": lane, "mission": "game_factory_build"})


def _validate_ir(ir: dict[str, Any]) -> None:
    """Valide l'IR contre ir_schema_v1.json (jsonschema Draft-07)."""
    try:
        import jsonschema  # noqa: PLC0415
    except ImportError as exc:
        raise FactoryError(f"jsonschema absent du venv : {exc}") from exc
    with open(_SCHEMA_PATH, "r", encoding="utf-8") as fh:
        schema = json.load(fh)
    validator = jsonschema.Draft7Validator(schema)
    errors = sorted(validator.iter_errors(ir), key=lambda e: list(e.path))
    if errors:
        msg = "; ".join(f"{list(e.path)}: {e.message}" for e in errors[:5])
        raise FactoryError(f"IR invalide contre ir_schema_v1 : {msg}")


def _sign_hmac(content: bytes, key: str) -> str:
    return hmac_lib.new(key.encode("utf-8"), content, hashlib.sha256).hexdigest()


def _promote_to_registry(
    entry: dict[str, Any],
    *,
    registry_dir: str,
    hmac_key: str | None,
) -> str:
    """Ajoute une entree au registry et resigne le fichier (HMAC). Retourne le
    chemin du registry."""
    os.makedirs(registry_dir, exist_ok=True)
    registry_path = os.path.join(registry_dir, "registry.json")

    registry: list[dict[str, Any]] = []
    if os.path.isfile(registry_path):
        with open(registry_path, "r", encoding="utf-8") as fh:
            try:
                registry = json.load(fh)
            except json.JSONDecodeError:
                logger.warning("registry corrompu, reinitialise")
                registry = []
    registry.append(entry)

    payload = json.dumps(registry, indent=2, ensure_ascii=False).encode("utf-8")
    with open(registry_path, "wb") as fh:
        fh.write(payload)

    key = hmac_key if hmac_key is not None else os.environ.get("STUDIO_HMAC_KEY", "")
    if key:
        sig = _sign_hmac(payload, key)
        with open(registry_path + ".hmac", "w", encoding="utf-8") as fh:
            fh.write(sig + "\n")
        logger.info("registry signe HMAC -> %s.hmac", registry_path)
    else:
        logger.warning("STUDIO_HMAC_KEY absente : registry non signe")
    return registry_path


def run_factory(
    ir_path: str,
    *,
    lm_call: LmCall | None = None,
    oracle: oracle_sim.OracleAdapter | None = None,
    registry_dir: str = _REGISTRY_DIR,
    hmac_key: str | None = None,
    now: str | None = None,
) -> FactoryRunResult:
    """Execute le pipeline complet pour un IR.

    Parameters
    ----------
    ir_path : str
        Chemin de l'IR (repo-relatif ou absolu).
    lm_call : callable, optionnel
        Client LLM injectable (tests). Defaut : proxy reel.
    oracle : OracleAdapter, optionnel
        Oracle injectable (tests). Defaut : selection auto (Godot sinon sim).
    registry_dir : str
        Dossier du registry (injectable pour tests).
    hmac_key : str, optionnel
        Cle HMAC ; defaut : env STUDIO_HMAC_KEY.
    now : str, optionnel
        Horodatage injecte (tests) ; defaut : datetime.now(UTC).
    """
    # 1. Gouvernance avant toute action.
    decision = _governor_check("SAFE_AUTO")
    if not decision.allowed:
        logger.error("governor BLOCK : %s", decision.reason)
        return FactoryRunResult("?", "BLOCKED_GOVERNOR", detail=decision.reason)

    # 2. Charge + valide l'IR.
    ir = load_ir(ir_path)
    _validate_ir(ir)
    ir_name = ir["meta"]["name"]
    logger.info("IR valide : %s v%s", ir_name, ir["meta"]["version"])

    # 3. Structure deterministe.
    scaffold = build_scaffold(ir)

    # 4. Logique (LLM, degradation gracieuse).
    enriched = fill_logic(scaffold, lm_call=lm_call)

    # 5. Oracle a code de sortie.
    result = oracle_sim.run_oracle(ir_path, oracle=oracle)
    logger.info("oracle %s -> %s : %s", result.adapter, result.status, result.detail)

    base = FactoryRunResult(
        ir_name=ir_name,
        status="",
        oracle_status=result.status,
        logic_complete=enriched["logic_complete"],
        metrics=result.metrics,
        detail=result.detail,
    )

    # 6. Promote UNIQUEMENT sur oracle vert.
    if not result.passed:
        base.status = "BLOCKED_ORACLE"
        base.promoted = False
        logger.warning("pas de promote : oracle %s (%s)", result.status, result.detail)
        return base

    entry = {
        "ir_name": ir_name,
        "ir_version": ir["meta"]["version"],
        "timestamp": now or datetime.now(timezone.utc).isoformat(),
        "oracle_adapter": result.adapter,
        "oracle_status": result.status,
        "oracle_metrics": result.metrics,
        "logic_complete": enriched["logic_complete"],
        "scaffold_sha256": hashlib.sha256(
            json.dumps(scaffold, sort_keys=True, ensure_ascii=False).encode("utf-8")
        ).hexdigest(),
    }
    registry_path = _promote_to_registry(entry, registry_dir=registry_dir, hmac_key=hmac_key)
    base.status = "PROMOTED"
    base.promoted = True
    base.detail = f"promu au registry {registry_path}"
    logger.info("PROMOTED : %s v%s", ir_name, ir["meta"]["version"])
    return base


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    parser = argparse.ArgumentParser(description="TCS game factory loop (IMP-188)")
    parser.add_argument(
        "--ir",
        default=os.path.join(_REPO_ROOT, "studio_core", "ir", "example_snake_game.json"),
        help="Chemin de l'IR (defaut : exemple snake jouable de studio_core)",
    )
    args = parser.parse_args()
    result = run_factory(args.ir)
    print(json.dumps({
        "ir_name": result.ir_name,
        "status": result.status,
        "oracle_status": result.oracle_status,
        "promoted": result.promoted,
        "logic_complete": result.logic_complete,
        "detail": result.detail,
        "metrics": result.metrics,
    }, indent=2, ensure_ascii=False))
    return 0 if result.status in ("PROMOTED", "BLOCKED_ORACLE") else 1


if __name__ == "__main__":
    raise SystemExit(main())
