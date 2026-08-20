#!/usr/bin/env python3
"""bootstrap_state.py — IMP-156.

Initialise .studio_state/current_state.json (genesis) si absent, puis valide
contre schemas/studio_current_state.schema.json.

Idempotent :
  - state présent  → ne clobbe rien, valide l'existant, exit 0 si valide.
  - state absent    → écrit un genesis minimal conforme au schema, exit 0.
  - state invalide  → exit 1 (drift / corruption), n'écrase JAMAIS un fichier existant.

Le genesis amorce le pipeline Event Backbone : il n'autorise aucune activation,
training, benchmark, promotion ou claim (claim_posture=NO_CLAIM_ALLOWED).

Usage :
  python scripts/bootstrap_state.py            # bootstrap + validation
  python scripts/bootstrap_state.py --force     # réécrit le genesis même si présent (gate explicite)
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
STATE_PATH = PROJECT_ROOT / ".studio_state" / "current_state.json"
SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_current_state.schema.json"

# Aligné sur ingest_event.FORBIDDEN_MISSIONS — aucune surface active n'est autorisée au genesis.
FORBIDDEN_MISSIONS = [
    "runtime_activation", "agent_activation", "dataset_generation",
    "dataset_reset", "training", "benchmark", "model_checkpoint_creation",
    "model_promotion", "latest_json_creation", "lab_runs_creation", "public_claim",
]

_SURFACES = [
    "active_runtime_code", "tests", "tools_scripts", "artifacts_runtime_outputs",
    "canonical_docs", "roadmap_docs_only", "inference",
]

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("bootstrap_state")


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def genesis_state() -> dict:
    """Construit un StudioCurrentState genesis conforme au schema (minItems respectés)."""
    now = _now()
    snapshot_id = "genesis:bootstrap"
    return {
        "record_type": "studio_current_state",
        "contract_version": "V0",
        "updated_at": now,
        "source_snapshot_ids": [snapshot_id],
        "applied_delta_ids": [],
        "proven_surfaces": [],
        "blocked_surfaces": [],
        "open_blockers": [],
        "open_risks": [],
        "decision_debt": [],
        "humangate_required_items": [],
        "next_best_mission": None,
        "forbidden_next_missions": FORBIDDEN_MISSIONS,
        "status_by_surface": {surface: "UNKNOWN" for surface in _SURFACES},
        "state_history": [
            {
                "source_snapshot_id": snapshot_id,
                "source_snapshot_generated_at": now,
                "applied_at": now,
                "applied_delta_ids": [],
                "mode": "EXPLICIT_WRITE",
            }
        ],
        "claim_posture": "NO_CLAIM_ALLOWED",
        "no_global_ready_verdict": True,
    }


def validate_state(state: dict) -> None:
    """Valide contre le schema jsonschema si dispo, sinon fallback required-keys. Lève en cas de drift."""
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    try:
        import jsonschema
    except ImportError:
        missing = [k for k in schema.get("required", []) if k not in state]
        if missing:
            raise ValueError(f"schema drift (fallback): clés manquantes {missing}")
        return
    jsonschema.validate(state, schema)


def bootstrap(force: bool = False) -> int:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)

    if STATE_PATH.exists() and not force:
        try:
            existing = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            log.error("PRÉSENT mais JSON invalide: %s — aucune réécriture (gate Pierre requise)", exc)
            return 1
        try:
            validate_state(existing)
        except Exception as exc:  # jsonschema.ValidationError ou ValueError
            log.error("PRÉSENT mais schema drift: %s — aucune réécriture (gate Pierre requise)", exc)
            return 1
        log.info("OK: %s déjà présent et valide — no-op", STATE_PATH)
        return 0

    state = genesis_state()
    try:
        validate_state(state)
    except Exception as exc:
        log.error("genesis invalide (bug interne): %s", exc)
        return 1

    STATE_PATH.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    log.info("ÉCRIT genesis: %s (force=%s)", STATE_PATH, force)
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="Bootstrap studio_state genesis + validation schema")
    p.add_argument("--force", action="store_true", help="Réécrit le genesis même si présent (gate explicite)")
    args = p.parse_args()
    return bootstrap(force=args.force)


if __name__ == "__main__":
    raise SystemExit(main())
