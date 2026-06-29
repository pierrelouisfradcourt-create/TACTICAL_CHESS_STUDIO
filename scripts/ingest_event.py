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
import hmac
import json
import os
import subprocess
import sys
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
EVENT_LOG    = PROJECT_ROOT / "lab" / "events.jsonl"

# IMP-154 — schema lock for events.jsonl.
# Every event carries an explicit `version`; any field outside this set is rejected
# on read so the schema cannot drift silently.
SCHEMA_VERSION = 1
ALLOWED_EVENT_FIELDS = frozenset({
    "ts", "type", "task_id", "version", "hmac",
    "imp_id", "oracle_id", "system_id",
})
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


class EventLogIntegrityError(Exception):
    """events.jsonl tampered / off-schema / HMAC mismatch — hard reject (IMP-192).

    L'intégrité repose sur STUDIO_HMAC_KEY : défense-en-profondeur, pas un secret
    anti-forge dès lors que la clé par défaut 'studio-dev' est utilisée.
    """


# ── Schema lock (IMP-154) ─────────────────────────────────────────────────────

def _validate_event_schema(entry: dict[str, Any], lineno: int | None = None) -> None:
    """Reject any event without a version field or carrying unknown fields.

    Raises ValueError so callers fail-fast both on write (before HMAC) and on read.
    """
    loc = f"events.jsonl:{lineno}: " if lineno is not None else ""
    if "version" not in entry:
        raise ValueError(f"{loc}event_missing_version: schema lock requires a 'version' field")
    unknown = set(entry) - ALLOWED_EVENT_FIELDS
    if unknown:
        raise ValueError(f"{loc}event_unknown_fields: {sorted(unknown)} not in event schema")


# ── Causal ID extraction ─────────────────────────────────────────────────────

def _extract_causal_id(task_id: str) -> dict[str, str]:
    """Extract imp_id / oracle_id / system_id from task_id. Raises if none found."""
    parts = task_id.split(":", 2)
    prefix = parts[0] if parts else ""
    if prefix == "oracle" and len(parts) >= 2:
        return {"oracle_id": parts[1]}
    if prefix == "imp_closed" and len(parts) >= 2:
        return {"imp_id": parts[1]}
    if prefix == "system" and len(parts) >= 2:
        return {"system_id": parts[1]}
    raise ValueError(
        f"event_missing_causal_id: task_id '{task_id}' has no imp_id/oracle_id/system_id — reject"
    )


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
    source_delta_id = delta.get("source_report_id", "UNKNOWN")
    source_task_id  = delta.get("source_task_id", "UNKNOWN")
    humangate_items = (
        [{
            "summary": "HumanGate required — oracle ingestion signal",
            "status": "BLOCKED",
            "source_delta_id": source_delta_id,
            "source_task_id": source_task_id,
        }]
        if delta.get("humangate_required") else []
    )

    def _inject_delta_id(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [{**item, "source_delta_id": source_delta_id} for item in items]

    return {
        "record_type":            "studio_state_snapshot",
        "contract_version":       "V0",
        "generated_at":           _now(),
        "source_delta_ids":       [source_task_id],
        "proven_surfaces":        delta.get("proven_surfaces", []),
        "blocked_surfaces":       delta.get("blocked_surfaces", []),
        "open_blockers":          _inject_delta_id(delta.get("blockers_opened", [])),
        "open_risks":             _inject_delta_id(delta.get("risks_created", [])),
        "decision_debt":          _inject_delta_id(delta.get("decision_debt_opened", [])),
        "humangate_required_items": humangate_items,
        "next_best_mission":      delta.get("next_best_mission"),
        "forbidden_next_missions": FORBIDDEN_MISSIONS,
        "status_by_surface":      delta.get("status_by_surface", {}),
        "claim_posture":          "NO_CLAIM_ALLOWED",
        "no_global_ready_verdict": True,
    }


# ── Pipeline steps ────────────────────────────────────────────────────────────

def verify_event_log(raise_on_fail: bool = False) -> bool:
    """HMAC-verify every line of events.jsonl. Fail-fast on first mismatch.

    IMP-192 — la comparaison HMAC est constante (`hmac.compare_digest`) pour ne pas
    fuiter de timing, et tout échec est un rejet dur.

    - `raise_on_fail=False` (défaut) : comportement historique — print stderr + `False`
      (rétro-compatible avec `if not verify_event_log(): ...`).
    - `raise_on_fail=True` : lève `EventLogIntegrityError` au premier échec (rejet dur).
    """
    def _fail(msg: str) -> bool:
        if raise_on_fail:
            raise EventLogIntegrityError(msg)
        print(f"[backbone] {msg}", file=sys.stderr)
        return False

    if not EVENT_LOG.exists():
        return True
    key = (os.environ.get("STUDIO_HMAC_KEY") or "studio-dev").encode()
    with EVENT_LOG.open("r", encoding="utf-8") as fh:
        for lineno, raw_line in enumerate(fh, 1):
            raw_line = raw_line.strip()
            if not raw_line:
                continue
            try:
                entry = json.loads(raw_line)
            except json.JSONDecodeError:
                return _fail(f"events.jsonl:{lineno}: invalid JSON")
            # IMP-154 — schema lock: reject missing version / unknown fields on read.
            try:
                _validate_event_schema(entry, lineno)
            except ValueError as exc:
                return _fail(str(exc))
            stored_hmac = entry.pop("hmac", None)
            if stored_hmac is None:
                return _fail(f"events.jsonl:{lineno}: missing HMAC")
            # IMP-192 / RT-192-2 — `hmac.compare_digest` lève TypeError sur non-str ou
            # str non-ASCII : on rejette explicitement AVANT, jamais de TypeError nu.
            if not (isinstance(stored_hmac, str) and stored_hmac.isascii()):
                return _fail(f"events.jsonl:{lineno}: HMAC malformed (non-ascii-str) — log tampered")
            payload = json.dumps(entry, separators=(",", ":"), sort_keys=True)
            expected = hashlib.sha256(key + payload.encode()).hexdigest()
            if not hmac.compare_digest(stored_hmac, expected):
                return _fail(f"events.jsonl:{lineno}: HMAC mismatch — log tampered")
    return True


def _is_already_ingested(task_id: str) -> bool:
    """IMP-155 — true if an event with this task_id is already logged.

    Idempotence key = task_id (carries the oracle's own timestamp), so re-ingesting
    the same report is a no-op and leaves the state untouched.
    """
    if not EVENT_LOG.exists():
        return False
    with EVENT_LOG.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                if json.loads(line).get("task_id") == task_id:
                    return True
            except json.JSONDecodeError:
                continue
    return False


def append_event_log(oracle: str, task_id: str) -> None:
    causal = _extract_causal_id(task_id)  # raises ValueError if no causal id
    EVENT_LOG.parent.mkdir(parents=True, exist_ok=True)
    entry = {"ts": _now(), "type": oracle, "task_id": task_id, "version": SCHEMA_VERSION, **causal}
    _validate_event_schema(entry)  # IMP-154 — fail before writing an off-schema event
    line  = json.dumps(entry, separators=(",", ":"), sort_keys=True)
    entry["hmac"] = _hmac(line)
    with EVENT_LOG.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, separators=(",", ":"), sort_keys=True) + "\n")


def migrate_event_log() -> int:
    """One-shot migration: stamp legacy events (pre-IMP-154) with version + re-sign.

    Rewrites EVENT_LOG atomically. Lines already carrying `version` are left intact.
    Returns the number of migrated lines, or -1 on failure (original left untouched).
    """
    if not EVENT_LOG.exists():
        return 0
    migrated = 0
    out_lines: list[str] = []
    with EVENT_LOG.open("r", encoding="utf-8") as fh:
        for lineno, raw_line in enumerate(fh, 1):
            raw_line = raw_line.strip()
            if not raw_line:
                continue
            try:
                entry = json.loads(raw_line)
            except json.JSONDecodeError:
                print(f"[migrate] events.jsonl:{lineno}: invalid JSON — abort", file=sys.stderr)
                return -1
            if "version" not in entry:
                entry.pop("hmac", None)
                entry["version"] = SCHEMA_VERSION
                payload = json.dumps(entry, separators=(",", ":"), sort_keys=True)
                entry["hmac"] = _hmac(payload)
                migrated += 1
            try:
                _validate_event_schema(entry, lineno)
            except ValueError as exc:
                print(f"[migrate] {exc} — abort", file=sys.stderr)
                return -1
            out_lines.append(json.dumps(entry, separators=(",", ":"), sort_keys=True))
    tmp = EVENT_LOG.with_suffix(".jsonl.tmp")
    tmp.write_text("\n".join(out_lines) + ("\n" if out_lines else ""), encoding="utf-8")
    tmp.replace(EVENT_LOG)
    return migrated


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


def run_update_state(snapshot: dict[str, Any], token: str) -> bool:
    snap_schema = str(SNAP_SCHEMA) if SNAP_SCHEMA.exists() else None
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as tmp:
        json.dump(snapshot, tmp)
        tmp_path = tmp.name
    try:
        cmd = [
            sys.executable, str(UPDATE_PY),
            "--snapshot", tmp_path,
            "--write", "--allow-overwrite",
            "--backbone-token", token,
        ]
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


def assert_projection_consistency() -> bool:
    """state(t) = f(events[0..t]): every applied_delta_id in current_state must trace to events.jsonl."""
    if not STATE_PATH.exists() or not EVENT_LOG.exists():
        return True
    state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    applied_ids = {str(d) for d in state.get("applied_delta_ids", []) if str(d).strip()}
    if not applied_ids:
        return True
    logged_task_ids: set[str] = set()
    with EVENT_LOG.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                logged_task_ids.add(json.loads(line).get("task_id", ""))
            except json.JSONDecodeError:
                continue
    missing = applied_ids - logged_task_ids
    if missing:
        print(
            f"[backbone] projection_violated: {len(missing)} applied_delta_id(s) absent from events.jsonl: {missing}",
            file=sys.stderr,
        )
        return False
    return True


# ── Entry point ───────────────────────────────────────────────────────────────

def ingest_event(oracle: str, report_path: Path) -> int:
    # Guard 3 — HMAC-verify log before any write (IMP-192: rejet dur = exception)
    try:
        verify_event_log(raise_on_fail=True)
    except EventLogIntegrityError as exc:
        print(f"[backbone] ABORT: events.jsonl integrity check failed: {exc}", file=sys.stderr)
        return 6

    raw     = json.loads(report_path.read_text(encoding="utf-8"))
    adapted = ADAPTERS[oracle](raw)

    # Guard — idempotence (IMP-155): same input → no-op, state untouched.
    if _is_already_ingested(adapted["task_id"]):
        print(f"[backbone] idempotent skip: {adapted['task_id']} already ingested", file=sys.stderr)
        return 0

    # Guard 4 — require imp_id / oracle_id / system_id (raises on missing)
    try:
        append_event_log(oracle, adapted["task_id"])
    except ValueError as exc:
        print(f"[backbone] ABORT: {exc}", file=sys.stderr)
        return 7

    delta = run_derive_delta(adapted)
    if delta is None:
        return 2

    if not assert_causal_projection(delta):
        print(f"[backbone] causality violated: {adapted['task_id']} produced no projection", file=sys.stderr)
        return 3

    snapshot = delta_to_snapshot(delta)
    # Guard 1 — token issued here; update_studio_current_state.py rejects writes without it
    token = str(uuid.uuid4())
    if not run_update_state(snapshot, token):
        return 4

    # Guard 5 — state(t) = f(events[0..t])
    if not assert_projection_consistency():
        print("[backbone] ABORT: projection consistency violated — state rolled back is not possible", file=sys.stderr)
        return 5

    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="Event Backbone — ingest oracle output into studioV2 reducers")
    p.add_argument("--oracle", choices=sorted(ADAPTERS))
    p.add_argument("--report", help="Path to oracle output JSON")
    p.add_argument("--migrate", action="store_true",
                   help="Stamp legacy events.jsonl lines with schema version + re-sign (IMP-154)")
    args = p.parse_args()
    if args.migrate:
        n = migrate_event_log()
        if n < 0:
            return 1
        print(f"[migrate] {n} legacy event(s) stamped to schema v{SCHEMA_VERSION}")
        return 0
    if not args.oracle or not args.report:
        p.error("--oracle and --report are required unless --migrate is given")
    path = Path(args.report).resolve()
    if not path.exists():
        print(f"[backbone] report not found: {path}", file=sys.stderr)
        return 1
    return ingest_event(args.oracle, path)


if __name__ == "__main__":
    raise SystemExit(main())
