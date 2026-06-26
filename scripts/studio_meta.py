#!/usr/bin/env python3
"""
studio_meta.py — Bilan tick du studio (P1 anchor)
Lit : IMPROVEMENT_LEDGER.yaml + MEMORY.md + rapports bench
Produit : lab/reports/studio_meta_latest.json (signé HMAC si STUDIO_HMAC_KEY)

Usage :
  python scripts/studio_meta.py
  python scripts/studio_meta.py --out lab/reports/studio_meta_latest.json
"""
import argparse
import hashlib
import hmac as hmac_lib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def load_ledger(path: Path) -> dict:
    try:
        import yaml
    except ImportError:
        print("[studio_meta] WARN: PyYAML absent — install avec pip install pyyaml", file=sys.stderr)
        return {}
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


# Classification établie en session 2026-06-25
# Source : conversation d'analyse + red team installation
IMP_OBSOLETES = {"IMP-B3", "IMP-D1", "IMP-D3", "IMP-F3", "IMP-F4"}
IMP_MIGRES    = {"IMP-B2", "IMP-C2", "IMP-C3", "IMP-E1", "IMP-E2", "IMP-E3", "IMP-E4"}
IMP_CRITICAL  = {"IMP-008"}   # seul vrai CRITICAL — dataset BROKEN, lane FORBIDDEN


def classify_imp(imp_id: str) -> str:
    if imp_id in IMP_OBSOLETES:
        return "OBSOLETE"
    if imp_id in IMP_MIGRES:
        return "MIGRE"
    if imp_id in IMP_CRITICAL:
        return "CRITICAL"
    return "VALIDE"


def ledger_summary(ledger: dict) -> dict:
    imps = ledger.get("improvements", [])
    by_status: dict[str, list[str]] = {}
    for imp in imps:
        status = imp.get("status", "UNKNOWN")
        by_status.setdefault(status, []).append(imp.get("id", "?"))

    open_ids = by_status.get("OPEN", [])

    classified: dict[str, list[str]] = {"CRITICAL": [], "VALIDE": [], "MIGRE": [], "OBSOLETE": []}
    for imp_id in open_ids:
        cat = classify_imp(imp_id)
        classified[cat].append(imp_id)

    # DEFERRED traité comme VALIDE (attend un autre IMP)
    for imp_id in by_status.get("DEFERRED", []):
        classified["VALIDE"].append(imp_id)

    return {
        "total": len(imps),
        "by_status": {k: len(v) for k, v in by_status.items()},
        "open_classified": {k: v for k, v in classified.items() if v},
        "last_updated": ledger.get("meta", {}).get("last_updated_session"),
    }


def load_memory(path: Path) -> dict:
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8")
    result: dict = {"raw": text}

    # ELO heuristic
    m = re.search(r"Heuristique\s*:\s*~?(\d+)\s*ELO", text)
    result["elo_heuristic"] = int(m.group(1)) if m else None
    m = re.search(r"Hybride\s*:\s*~?(\d+)\s*ELO", text)
    result["elo_hybrid"] = int(m.group(1)) if m else None
    m = re.search(r"Neural seul\s*:\s*~?(\d+)\s*ELO", text)
    result["elo_neural"] = int(m.group(1)) if m else None
    m = re.search(r"Objectif hybride\s*:\s*(.+)", text)
    result["elo_target"] = m.group(1).strip() if m else None

    # Stack flags
    result["dataset_broken"] = "dataset BROKEN" in text
    result["phi_not_started"] = "NOT_STARTED" in text
    result["phi_encoder_status"] = "NOT_STARTED" if "NOT_STARTED" in text else "UNKNOWN"

    return result


def load_report(path: Path) -> dict | None:
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return None


def load_pending_gates(path: Path) -> list[dict]:
    """Retourne les décisions PENDING depuis HUMANGATE_DECISION_LOG.yaml."""
    if not path.exists():
        return []
    try:
        import yaml
    except ImportError:
        return []
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    gates = []
    for d in data.get("decisions", []):
        if d.get("verdict") == "PENDING":
            src = d.get("source_state", {})
            gates.append({
                "gate_id":    d.get("decision_id", "?"),
                "title":      d.get("title", ""),
                "agent":      d.get("agent", d.get("zone", "unknown")),
                "created_at": src.get("created", d.get("approved_at", "")),
                "description": " | ".join(d.get("evidence_refs", [])) or None,
            })
    return gates


def elo_live_from_report(elo: dict | None) -> dict | None:
    """Extrait les valeurs ELO directement depuis elo_match_latest.json."""
    if not elo:
        return None
    ratings = elo.get("ratings", {})
    return {
        "hybrid":    ratings.get("hybrid"),
        "heuristic": ratings.get("heuristic"),
        "neural":    ratings.get("neural"),
        "delta":     elo.get("delta_hybrid_vs_heuristic"),
        "verdict":   elo.get("verdict"),
        "timestamp": elo.get("timestamp"),
    }


def sign_hmac(content: bytes, key: str) -> str:
    key_bytes = key.encode("utf-8")
    return hmac_lib.new(key_bytes, content, hashlib.sha256).hexdigest()


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description="Studio meta tick")
    parser.add_argument("--out", default="lab/reports/studio_meta_latest.json")
    args = parser.parse_args()

    ledger_path   = REPO_ROOT / "lab/chains/IMPROVEMENT_LEDGER.yaml"
    memory_path   = REPO_ROOT / "studio/openclaw-workspace/MEMORY.md"
    elo_report    = REPO_ROOT / "lab/reports/elo_match_latest.json"
    pzl_report    = REPO_ROOT / "lab/reports/lichess_eval_latest.json"
    gate_log_path = REPO_ROOT / "lab/chains/HUMANGATE_DECISION_LOG.yaml"

    ledger        = load_ledger(ledger_path)
    memory        = load_memory(memory_path)
    elo           = load_report(elo_report)
    puzzles       = load_report(pzl_report)
    pending_gates = load_pending_gates(gate_log_path)

    # Bilan
    ledger_summary_data = ledger_summary(ledger) if ledger else {}

    bilan = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ledger": ledger_summary_data,
        "memory": {k: v for k, v in memory.items() if k != "raw"},
        "elo_live": elo_live_from_report(elo),
        "pending_gates": pending_gates,
        "oracles": {
            "elo_match": {
                "available": elo is not None,
                "verdict": elo.get("verdict") if elo else None,
                "delta_hybrid_vs_heuristic": elo.get("delta_hybrid_vs_heuristic") if elo else None,
                "timestamp": elo.get("timestamp") if elo else None,
            },
            "lichess_eval": {
                "available": puzzles is not None,
                "verdict": puzzles.get("verdict") if puzzles else None,
                "levels": puzzles.get("levels") if puzzles else None,
                "timestamp": puzzles.get("timestamp") if puzzles else None,
            },
        },
        "blockers": [],
        "global_verdict": "UNKNOWN",
    }

    classified = ledger_summary_data.get("open_classified", {})

    # CRITICAL — seuls vrais bloqueurs
    for oid in classified.get("CRITICAL", []):
        bilan["blockers"].append(f"IMP-008: dataset BROKEN — lane FORBIDDEN, bloqueur ML/φ")

    # Oracles absents
    if not elo:
        bilan["blockers"].append("bench/elo_match.sh jamais lancé — verdict ELO absent")
    if not puzzles:
        bilan["blockers"].append("bench/lichess_eval.sh jamais lancé — verdict tactique absent")

    # φ pipeline (informatif, pas bloqueur du tick ELO/puzzle)
    if memory.get("phi_not_started"):
        bilan["blockers"].append("φ pipeline NOT_STARTED (encoder/clustering/LoRA) — P4, non bloquant P1")

    # INFO : IMPs migrés et obsolètes (pas des bloqueurs)
    bilan["imps_info"] = {
        "obsoletes": classified.get("OBSOLETE", []),
        "migres":    classified.get("MIGRE",    []),
        "valides":   classified.get("VALIDE",   []),
    }

    # Verdict global
    elo_ok  = elo  and elo.get("verdict")  == "PASS"
    pzl_ok  = puzzles and puzzles.get("verdict") == "PASS"
    if elo and puzzles:
        bilan["global_verdict"] = "PASS" if (elo_ok and pzl_ok) else "FAIL"
    elif bilan["blockers"]:
        bilan["global_verdict"] = "BLOCKED"

    # Écriture
    out_path = REPO_ROOT / args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    content_bytes = json.dumps(bilan, indent=2, ensure_ascii=False).encode("utf-8")

    # Signature HMAC
    hmac_key = os.environ.get("STUDIO_HMAC_KEY", "")
    if hmac_key:
        sig = sign_hmac(content_bytes, hmac_key)
        bilan["hmac_sha256"] = sig
        content_bytes = json.dumps(bilan, indent=2, ensure_ascii=False).encode("utf-8")
        print(f"[studio_meta] HMAC signé")
    else:
        print("[studio_meta] WARN: STUDIO_HMAC_KEY absent — bilan non signé", file=sys.stderr)

    out_path.write_bytes(content_bytes)

    # Résumé console
    print(f"[studio_meta] verdict={bilan['global_verdict']}")
    info = bilan.get("imps_info", {})
    print(f"[studio_meta] IMPs — CRITICAL:{len(classified.get('CRITICAL',[]))} "
          f"VALIDES:{len(info.get('valides',[]))} "
          f"MIGRES:{len(info.get('migres',[]))} (INFO) "
          f"OBSOLETES:{len(info.get('obsoletes',[]))} (ignorés)")
    for b in bilan["blockers"]:
        print(f"[studio_meta] BLOQUEUR: {b}")
    print(f"[studio_meta] → {out_path}")


if __name__ == "__main__":
    main()
