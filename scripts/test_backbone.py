#!/usr/bin/env python3
"""
test_backbone.py — Smoke test self-contained du backbone d'événements Python.

Injecte un oracle MOCK (elo_match PASS fictif), lance l'ingestion via
scripts/ingest_event.py, et vérifie que :
  - ingest_event.py retourne 0
  - lab/events.jsonl gagne exactement 1 ligne
  - .studio_state/current_state.json existe et a changé
    (mtime avancé OU le nouveau task_id présent dans applied_delta_ids)

Oracle d'exécution : le code de sortie de ce script.
  exit 0  → backbone OK
  exit !=0 → backbone FAIL (stderr capturé + assertion échouée affichés)

Ne modifie PAS le backbone, le ledger, ni aucune zone protégée.
Aucun fichier temporaire ne survit (cleanup en finally).

Usage :
  .venv312/Scripts/python.exe scripts/test_backbone.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

# ── Chemins repo-relatifs (résolus depuis __file__) ───────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[1]
INGEST_PY    = PROJECT_ROOT / "scripts" / "ingest_event.py"
EVENT_LOG    = PROJECT_ROOT / "lab" / "events.jsonl"
STATE_PATH   = PROJECT_ROOT / ".studio_state" / "current_state.json"

INGEST_TIMEOUT_S = 120  # ingest lance des sous-process (derive + update) → marge


def _now_z() -> str:
    """Timestamp UTC ISO8601 avec microsecondes → task_id unique (pas de collision)."""
    return (
        datetime.now(timezone.utc)
        .isoformat(timespec="microseconds")
        .replace("+00:00", "Z")
    )


def _line_count(path: Path) -> int:
    """Nombre de lignes non vides d'un fichier (0 si absent)."""
    if not path.exists():
        return 0
    count = 0
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                count += 1
    return count


def _state_signature(path: Path) -> tuple[float, frozenset[str]]:
    """(mtime, applied_delta_ids) du state — ('absent' → (0.0, frozenset()))."""
    if not path.exists():
        return (0.0, frozenset())
    mtime = path.stat().st_mtime
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        ids = frozenset(str(d) for d in data.get("applied_delta_ids", []))
    except (json.JSONDecodeError, OSError):
        ids = frozenset()
    return (mtime, ids)


def main() -> int:
    # Garde : le point d'entrée du backbone doit exister.
    if not INGEST_PY.exists():
        print(f"[test_backbone] FAIL: ingest script introuvable: {INGEST_PY}", file=sys.stderr)
        return 1

    # 1) Construire le rapport oracle MOCK (elo_match PASS, delta >= 20.0, ts unique).
    ts = _now_z()
    mock_report = {
        "verdict": "PASS",
        "delta_hybrid_vs_heuristic": 42.0,  # >= 20.0 → produit une surface prouvée
        "timestamp": ts,
        "_mock": True,
        "_source": "scripts/test_backbone.py",
    }
    expected_task_id = f"oracle:elo_match:{ts}"

    # 2) Snapshot pré-run.
    pre_lines = _line_count(EVENT_LOG)
    pre_mtime, pre_ids = _state_signature(STATE_PATH)
    print(f"[test_backbone] PRE : events.jsonl lines = {pre_lines}")
    print(f"[test_backbone] PRE : state exists = {STATE_PATH.exists()}  applied_ids = {len(pre_ids)}")
    print(f"[test_backbone] task_id attendu = {expected_task_id}")

    tmp_path: Path | None = None
    try:
        # Écrire le mock dans un tempfile (nettoyé en finally).
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", prefix="mock_elo_match_",
            delete=False, encoding="utf-8",
        ) as tmp:
            json.dump(mock_report, tmp)
            tmp_path = Path(tmp.name)

        # 3) Lancer le backbone via subprocess (même interpréteur = venv courant).
        cmd = [
            sys.executable, str(INGEST_PY),
            "--oracle", "elo_match",
            "--report", str(tmp_path),
        ]
        print(f"[test_backbone] RUN : {' '.join(cmd)}")
        try:
            proc = subprocess.run(
                cmd, capture_output=True, text=True,
                timeout=INGEST_TIMEOUT_S, check=False,
                cwd=str(PROJECT_ROOT),
            )
        except subprocess.TimeoutExpired as exc:
            print(f"[test_backbone] FAIL: ingest timeout après {INGEST_TIMEOUT_S}s", file=sys.stderr)
            if exc.stderr:
                err = exc.stderr.decode() if isinstance(exc.stderr, bytes) else exc.stderr
                print(err, file=sys.stderr)
            return 2

        if proc.stdout.strip():
            print(f"[test_backbone] ingest stdout:\n{proc.stdout.rstrip()}")
        rc = proc.returncode

        # 4) Snapshot post-run.
        post_lines = _line_count(EVENT_LOG)
        post_mtime, post_ids = _state_signature(STATE_PATH)
        print(f"[test_backbone] POST: ingest returncode = {rc}")
        print(f"[test_backbone] POST: events.jsonl lines = {post_lines} (avant {pre_lines})")
        print(f"[test_backbone] POST: state exists = {STATE_PATH.exists()}  applied_ids = {len(post_ids)}")

        # 5) Assertions.
        failures: list[str] = []

        if rc != 0:
            failures.append(f"ingest returncode == {rc} (attendu 0)")

        if post_lines != pre_lines + 1:
            failures.append(
                f"events.jsonl: {post_lines} lignes (attendu {pre_lines + 1}, soit +1)"
            )

        if not STATE_PATH.exists():
            failures.append("current_state.json absent après le run")
        else:
            mtime_advanced = post_mtime > pre_mtime
            task_id_applied = expected_task_id in post_ids
            if not (mtime_advanced or task_id_applied):
                failures.append(
                    "current_state.json inchangé (mtime non avancé ET task_id absent "
                    "de applied_delta_ids)"
                )

        if failures:
            print("[test_backbone] FAIL — assertions échouées:", file=sys.stderr)
            for f in failures:
                print(f"  - {f}", file=sys.stderr)
            if proc.stderr.strip():
                print("[test_backbone] ingest stderr:", file=sys.stderr)
                print(proc.stderr.rstrip(), file=sys.stderr)
            return 3

        # 6) Succès.
        print("[test_backbone] OK — toutes les assertions passent:")
        print(f"  - ingest exit 0")
        print(f"  - events.jsonl: {pre_lines} -> {post_lines} (+1)")
        print(f"  - state mis à jour (mtime avancé={post_mtime > pre_mtime}, "
              f"task_id appliqué={expected_task_id in post_ids})")
        return 0

    finally:
        # 7) Cleanup tempfile — aucun fichier temporaire ne survit.
        if tmp_path is not None and tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError as exc:
                print(f"[test_backbone] WARN: cleanup tempfile échoué: {exc}", file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())
