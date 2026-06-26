#!/usr/bin/env python3
"""
ingest_event.py — Event Backbone, point d'entrée unique.

Branche les outputs oracle → studioV2/control_plane/ (reducers existants).

Pipeline :
  oracle JSON
    → adapter  (executor_report_output)
    → derive_studio_state_delta.py  → StudioStateDelta
    → delta_to_snapshot()           → StudioStateSnapshot
    → update_studio_current_state.py --write
    → append lab/events.jsonl

Usage :
  python scripts/ingest_event.py --oracle elo_match    --report lab/reports/elo_match_latest.json
  python scripts/ingest_event.py --oracle lichess_eval --report lab/reports/lichess_eval_latest.json
  python scripts/ingest_event.py --oracle imp_closed   --report /path/to/imp_event.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
EVENT_LOG    = PROJECT_ROOT / "lab" / "events.jsonl"
STATE_PATH   = PROJECT_ROOT / ".studio_state" / "current_state.json"
DERIVE_PY    = PROJECT_ROOT / "scripts" / "studioV2" / "control_plane" / "derive_studio_state_delta.py"
UPDATE_PY    = PROJECT_ROOT / "scripts" / "studioV2" / "control_plane" / "update_studio_current_state.py"
SNAP_SCHEMA  = PROJECT_ROOT / "schemas" / "studio_state_snapshot.schema.json"
FORBIDDEN_MISSIONS = [
    "runtime_activation", "agent_activation", "dataset_generation",
    "dataset_reset", "training", "benchmark", "model_checkpoint_creation",
    "model_promotion", "latest_json_creation", "lab_runs_creation", "public_claim",
]


# ── Helpers ──────────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _hmac(payload: str) -> str:
    key = (os.environ.get("STUDIO_HMAC_KEY") or "studio-dev").encode()
    return hashlib.sha256(key + payload.encode()).hexdigest()


# ── Adapters oracle → executor_report_output ─────────────────────────────────

def adapt_elo_match(raw: dict[str, Any]) -> dict[str, Any]:
    verdict = raw.get("verdict", "UNKNOWN")
    delta   = float(raw.get("delta_hybrid_vs_heuristic", 0.0))
    ts      = raw.get("timestamp", _now())
    passed  = verdict == "PASS"
    surface = "TESTED" if passed else "BLOCKED"
    return {
        "record_type":      "executor_report_output",
        "contract_version": "V0",
        "task_id":          f"oracle:elo_match:{ts}",
        "commands_run":     [{"command": "bench/elo_match.sh", "result_status": surface}],
        "validation": {"commands": [{
            "command":       "elo_match.hybrid_vs_heuristic",
            "result_status": "PASS" if passed else "FAIL",
            "evidence":      f"delta={delta:.1f} threshold=20.0 verdict={verdict}",
        }]},
        "risks": [] if passed else [
            {"risk": f"ELO delta {delta:.1f} < 20.0 — hybrid n améliore pas l heuristique", "status": "BLOCKED"}
        ],
        "status_by_surface": {"active_runtime_code": "IMPLEMENTED", "inference": surface},
        "final_verdicts": {
            "software_verdict": {"inference": surface},
            "evidence_verdict": {"inference": surface},
            "claim_verdict":    {"inference": "NO_CLAIM_ALLOWED"},
        },
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "no_global_ready_verdict": True,
    }


def adapt_lichess_eval(raw: dict[str, Any]) -> dict[str, Any]:
    verdict = raw.get("verdict", "UNKNOWN")
    levels  = raw.get("levels", [])
    ts      = raw.get("timestamp", _now())
    passed  = verdict == "PASS"
    surface = "TESTED" if passed else "BLOCKED"
    return {
        "record_type":      "executor_report_output",
        "contract_version": "V0",
        "task_id":          f"oracle:lichess_eval:{ts}",
        "commands_run":     [{"command": "bench/lichess_eval.sh", "result_status": surface}],
        "validation": {"commands": [
            {
                "command":       f"lichess_eval.L{lv.get('level', '?')}",
                "result_status": "PASS" if lv.get("verdict") == "PASS" else "FAIL",
                "evidence":      f"{lv.get('solved_pct', 0):.1f}% / threshold {lv.get('threshold_pct', 0):.1f}%",
            }
            for lv in levels
        ]},
        "risks": [
            {"risk": f"lichess L{lv.get('level')} {lv.get('solved_pct', 0):.1f}% < {lv.get('threshold_pct', 0):.1f}%", "status": "BLOCKED"}
            for lv in levels if lv.get("verdict") == "FAIL"
        ],
        "status_by_surface": {"active_runtime_code": "IMPLEMENTED", "inference": surface},
        "final_verdicts": {
            "software_verdict": {"inference": surface},
            "evidence_verdict": {"inference": surface},
            "claim_verdict":    {"inference": "NO_CLAIM_ALLOWED"},
        },
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "no_global_ready_verdict": True,
    }


def adapt_imp_closed(raw: dict[str, Any]) -> dict[str, Any]:
    imp_id  = raw.get("id", "UNKNOWN")
    ts      = raw.get("closed_at", _now())
    oracle  = raw.get("oracle_verdict", "UNKNOWN")
    surface = "TESTED" if oracle in ("PASS", "GREEN") else "UNKNOWN"
    return {
        "record_type":      "executor_report_output",
        "contract_version": "V0",
        "task_id":          f"imp_closed:{imp_id}:{ts}",
        "commands_run":     [{"command": f"imp.close:{imp_id}", "result_status": surface}],
        "validation":       {"commands": [{"command": f"oracle:{imp_id}", "result_status": oracle}]},
        "risks":            [],
        "status_by_surface": {"tools_scripts": surface},
        "final_verdicts": {
            "software_verdict": {"tools_scripts": surface},
            "evidence_verdict": {"tools_scripts": surface},
            "claim_verdict":    {"tools_scripts": "NO_CLAIM_ALLOWED"},
        },
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "no_global_ready_verdict": True,
    }


ADAPTERS: dict[str, Any] = {
    "elo_match":    adapt_elo_match,
    "lichess_eval": adapt_lichess_eval,
    "imp_closed":   adapt_imp_closed,
}


# ── Delta → Snapshot (bridge entre les deux reducers existants) ───────────────

def delta_to_snapshot(delta: dict[str, Any]) -> dict[str, Any]:
    """Converts StudioStateDelta → StudioStateSnapshot (format attendu par update_studio_current_state.py)."""
    humangate_items = (
        [{"summary": "HumanGate required — oracle ingestion signal", "status": "BLOCKED"}]
        if delta.get("humangate_required") else []
    )
    return {
        "record_type":            "studio_state_snapshot",
        "contract_version":       "V0",
        "generated_at":           _now(),
        "source_delta_ids":       [delta["source_report_id"]],
        "proven_surfaces":        delta.get("proven_surfaces", []),
        "blocked_surfaces":       delta.get("blocked_surfaces", []),
        "open_blockers":          delta.get("blockers_opened", []),
        "open_risks":             delta.get("risks_created", []),
        "decision_debt":          delta.get("decision_debt_opened", []),
        "humangate_required_items": humangate_items,
        "next_best_mission":      delta.get("next_best_mission"),
        "forbidden_next_missions": FORBIDDEN_MISSIONS,
        "status_by_surface":      delta.get("status_by_surface", {}),
        "claim_posture":          "NO_CLAIM_ALLOWED",
        "no_global_ready_verdict": True,
    }


# ── Pipeline steps ────────────────────────────────────────────────────────────

def append_event_log(oracle: str, task_id: str) -> None:
    EVENT_LOG.parent.mkdir(parents=True, exist_ok=True)
    entry = {"ts": _now(), "type": oracle, "task_id": task_id}
    line  = json.dumps(entry, separators=(",", ":"), sort_keys=True)
    entry["hmac"] = _hmac(line)
    with EVENT_LOG.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, separators=(",", ":"), sort_keys=True) + "\n")


def run_derive_delta(adapted: dict[str, Any]) -> dict[str, Any] | None:
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as tmp:
        json.dump(adapted, tmp)
        tmp_path = tmp.name
    try:
        r = subprocess.run([sys.executable, str(DERIVE_PY), "--report", tmp_path],
                           capture_output=True, text=True, check=False)
        if r.returncode != 0:
            print(f"[backbone] derive_delta rc={r.returncode}: {r.stderr.strip()}", file=sys.stderr)
            return None
        return json.loads(r.stdout)
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def run_update_state(snapshot: dict[str, Any]) -> bool:
    snap_schema = str(SNAP_SCHEMA) if SNAP_SCHEMA.exists() else None
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as tmp:
        json.dump(snapshot, tmp)
        tmp_path = tmp.name
    try:
        cmd = [sys.executable, str(UPDATE_PY), "--snapshot", tmp_path, "--write", "--allow-overwrite"]
        if STATE_PATH.exists():
            cmd += ["--current", str(STATE_PATH)]
        if snap_schema:
            cmd += ["--snapshot-schema", snap_schema]
        r = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if r.returncode != 0:
            print(f"[backbone] update_state rc={r.returncode}: {r.stderr.strip()}", file=sys.stderr)
            return False
        return True
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def assert_causal_projection(delta: dict[str, Any]) -> bool:
    """Un event doit impacter au moins une projection — sinon il est sans effet."""
    return any(bool(delta.get(k)) for k in (
        "evidence_added", "blockers_opened", "risks_created",
        "proven_surfaces", "blocked_surfaces",
    ))


# ── Entry point ───────────────────────────────────────────────────────────────

def ingest_event(oracle: str, report_path: Path) -> int:
    raw     = json.loads(report_path.read_text(encoding="utf-8"))
    adapted = ADAPTERS[oracle](raw)

    append_event_log(oracle, adapted["task_id"])

    delta = run_derive_delta(adapted)
    if delta is None:
        return 2

    if not assert_causal_projection(delta):
        print(f"[backbone] causality violated: {adapted['task_id']} produced no projection", file=sys.stderr)
        return 3

    snapshot = delta_to_snapshot(delta)
    return 0 if run_update_state(snapshot) else 4


def main() -> int:
    p = argparse.ArgumentParser(description="Event Backbone — ingest oracle output into studioV2 reducers")
    p.add_argument("--oracle", required=True, choices=sorted(ADAPTERS))
    p.add_argument("--report", required=True, help="Path to oracle output JSON")
    args = p.parse_args()
    path = Path(args.report).resolve()
    if not path.exists():
        print(f"[backbone] report not found: {path}", file=sys.stderr)
        return 1
    return ingest_event(args.oracle, path)


if __name__ == "__main__":
    raise SystemExit(main())
