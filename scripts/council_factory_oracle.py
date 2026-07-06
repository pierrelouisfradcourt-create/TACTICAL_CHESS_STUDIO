#!/usr/bin/env python3
"""council_factory_oracle.py — oracle consolide du chantier Council->Factory (etape 6).

Un SEUL point d'entree qui enchaine toutes les gates du chantier et sort 0 (tout vert) / 1 (>=1 rouge) :
  1. contract  : tests du validateur v1 (structure + garde write-path)
  2. adapter   : tests du transform CouncilResult -> contrat + orchestration fail-soft
  3. router    : tests du routeur -> ledger (D1/D2, dedup, single-writer via kaizen_loop)
  4. corpus    : rejeu offline des sorties Qwen REELLES gelees (fixtures)
  5. guard     : garde AST single-writer (aucun bypass du ledger hors guarded_write)
  6. regress   : IMP-198 (council), IMP-194 + IMP-205 (single-writer) — non-regression

Aucune ecriture du ledger CANONIQUE : les tests ciblent des ledgers temporaires (tmp_path).
Ce run consolide est concu pour etre le premier citoyen de la future CI (etape-0 du plan de migration).

Usage :
  .venv312/Scripts/python.exe scripts/council_factory_oracle.py           # tout, exit 0/1
  .venv312/Scripts/python.exe scripts/council_factory_oracle.py --json     # sortie machine

claim_verdict: NO_CLAIM_ALLOWED
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
REPO = _HERE.parent
PHASE3 = "scripts/phase3_tests"

# (nom_gate, argv pytest OU marqueur guard). Ordre = ordre d'affichage.
_PYTEST_GATES: list[tuple[str, list[str]]] = [
    ("contract", [f"{PHASE3}/test_council_contract.py"]),
    ("adapter",  [f"{PHASE3}/test_council_adapter.py"]),
    ("router",   [f"{PHASE3}/test_council_router.py"]),
    ("corpus",   [f"{PHASE3}/test_council_corpus.py"]),
    ("cockpit",  [f"{PHASE3}/test_council_cockpit.py"]),
    ("regress",  ["scripts/phase2_tests/test_imp198_council.py",
                  "scripts/phase0_tests/test_imp194_single_writer.py",
                  "scripts/phase2_tests/test_imp205_single_writer_complete.py"]),
]


def _run(argv: list[str]) -> tuple[int, str]:
    """Lance une commande (meme interpreteur), renvoie (returncode, sortie condensee)."""
    proc = subprocess.run([sys.executable, *argv], cwd=str(REPO),
                          capture_output=True, text=True, encoding="utf-8", errors="replace")
    tail = (proc.stdout or "").strip().splitlines()[-1:] or [""]
    return proc.returncode, tail[0]


def run_oracle() -> tuple[bool, list[dict]]:
    results: list[dict] = []
    for name, targets in _PYTEST_GATES:
        rc, last = _run(["-m", "pytest", "-q", *targets])
        results.append({"gate": name, "ok": rc == 0, "detail": last})
    rc, last = _run(["scripts/grep_guard_ledger.py"])
    results.append({"gate": "guard", "ok": rc == 0, "detail": last})
    all_ok = all(r["ok"] for r in results)
    return all_ok, results


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Oracle consolide Council->Factory (etape 6).")
    ap.add_argument("--json", action="store_true", help="Sortie JSON machine")
    args = ap.parse_args(argv)

    all_ok, results = run_oracle()

    if args.json:
        print(json.dumps({"ok": all_ok, "gates": results}, ensure_ascii=False, indent=2))
    else:
        for _stream in (sys.stdout, sys.stderr):
            _reconf = getattr(_stream, "reconfigure", None)
            if _reconf is not None:
                try:
                    _reconf(encoding="utf-8")
                except (ValueError, OSError):
                    pass
        for r in results:
            mark = "[OK]" if r["ok"] else "[X]"
            print(f"  {mark} {r['gate']:9s} {r['detail']}")
        print(f"\n{'[OK]' if all_ok else '[X]'} council-factory oracle : "
              f"{sum(r['ok'] for r in results)}/{len(results)} gates vertes")
        print("claim_verdict: NO_CLAIM_ALLOWED")

    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
