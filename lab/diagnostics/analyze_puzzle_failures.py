#!/usr/bin/env python3
"""analyze_puzzle_failures.py — IMP-170.

Diagnostic des 50 premiers puzzles L2 échoués : identifie les patterns d'échec
(motif tactique, profondeur moyenne, fréquence par thème, raison dominante)
avant d'investir dans des données ciblées.

Entrée  : lab/reports/puzzle_score_level2.json  (champ `cases`, flag `failed`)
Sortie  : lab/reports/puzzle_analysis_L2.json

Oracle : fichier de sortie existe + JSON valide + n_failed_analyzed > 0.

Usage :
  python lab/diagnostics/analyze_puzzle_failures.py
  python lab/diagnostics/analyze_puzzle_failures.py --limit 50 --level 2
"""
from __future__ import annotations

import argparse
import json
import logging
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

PROJECT_ROOT = Path(__file__).resolve().parents[2]

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("analyze_puzzle_failures")


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _mean(values: List[float]) -> float:
    return round(sum(values) / len(values), 4) if values else 0.0


def load_failed_cases(score_path: Path, limit: int) -> List[Dict[str, Any]]:
    """Charge les `limit` premiers cas marqués failed dans l'ordre du rapport."""
    data = json.loads(score_path.read_text(encoding="utf-8"))
    cases = data.get("cases", [])
    failed = [c for c in cases if c.get("failed") is True]
    return failed[:limit]


def analyze(failed: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Agrège les patterns d'échec sur l'échantillon."""
    by_theme = Counter(c.get("theme", "unknown") for c in failed)
    by_reason = Counter(c.get("reason", "unknown") for c in failed)

    depths = [float(c["completed_depth"]) for c in failed if isinstance(c.get("completed_depth"), (int, float))]
    used_search = [c for c in failed if c.get("used_search") is True]
    illegal = [c for c in failed if c.get("selected_move_is_legal") is False]
    theme_invalid = [c for c in failed if c.get("selected_move_theme_valid") is False]

    # delta = score_after - score_before du point de vue du solveur (centipions).
    deltas = [float(c["delta"]) for c in failed if isinstance(c.get("delta"), (int, float))]

    n = len(failed)
    return {
        "n_failed_analyzed": n,
        "depth_avg": _mean(depths),
        "depth_min": min(depths) if depths else None,
        "depth_max": max(depths) if depths else None,
        "used_search_ratio": round(len(used_search) / n, 4) if n else 0.0,
        "illegal_selected_move_count": len(illegal),
        "selected_move_theme_invalid_count": len(theme_invalid),
        "delta_avg_cp": _mean(deltas),
        "frequency_by_theme": dict(by_theme.most_common()),
        "frequency_by_reason": dict(by_reason.most_common()),
        "dominant_theme": by_theme.most_common(1)[0][0] if by_theme else None,
        "dominant_reason": by_reason.most_common(1)[0][0] if by_reason else None,
        "sample_case_ids": [c.get("case_id") for c in failed[:10]],
    }


def build_report(level: int, limit: int, score_path: Path, analysis: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "schema_version": 1,
        "generated_at": _now(),
        "claim_posture": "NO_CLAIM_ALLOWED",
        "imp": "IMP-170",
        "level": level,
        "source_report": score_path.relative_to(PROJECT_ROOT).as_posix(),
        "limit_requested": limit,
        **analysis,
    }


def main() -> int:
    p = argparse.ArgumentParser(description="Diagnostic des échecs puzzles L2/L3")
    p.add_argument("--level", type=int, default=2, help="Niveau puzzle (défaut 2)")
    p.add_argument("--limit", type=int, default=50, help="Nombre de cas échoués à analyser (défaut 50)")
    args = p.parse_args()

    score_path = PROJECT_ROOT / "lab" / "reports" / f"puzzle_score_level{args.level}.json"
    out_path = PROJECT_ROOT / "lab" / "reports" / f"puzzle_analysis_L{args.level}.json"

    if not score_path.exists():
        log.error("Rapport source introuvable : %s", score_path)
        return 1

    failed = load_failed_cases(score_path, args.limit)
    if not failed:
        log.error("Aucun cas échoué trouvé dans %s", score_path)
        return 1

    analysis = analyze(failed)
    report = build_report(args.level, args.limit, score_path, analysis)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    log.info("Analysé %d échecs L%d → %s", analysis["n_failed_analyzed"], args.level,
             out_path.relative_to(PROJECT_ROOT).as_posix())
    log.info("dominant_theme=%s dominant_reason=%s depth_avg=%s used_search_ratio=%s",
             analysis["dominant_theme"], analysis["dominant_reason"],
             analysis["depth_avg"], analysis["used_search_ratio"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
