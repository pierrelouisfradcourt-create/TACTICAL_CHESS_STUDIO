"""
studio_core/main.py — Game Factory CLI entry point.

Usage:
  python main.py --sim N          Run N headless Snake sessions (regression oracle)
  python main.py --manifest chess Print the chess manifest summary
  python main.py --validate chess Validate chess manifest and exit 0/1
"""

from __future__ import annotations

import argparse
import json
import sys
import os

_here = os.path.dirname(os.path.abspath(__file__))
if _here not in sys.path:
    sys.path.insert(0, _here)


def _cmd_sim(n: int) -> None:
    from sim.headless_sim import run_simulation
    run_simulation(n=n)


def _cmd_manifest(game: str) -> None:
    if game == "chess":
        from factory.manifest import generate_chess_manifest
        m = generate_chess_manifest()
        print(f"\n{'═'*60}")
        print(f"  {m['meta']['name']}  v{m['meta']['version']}")
        print(f"{'═'*60}")
        print(f"  Board         : {m['meta']['board']['width']}×{m['meta']['board']['height']}")
        print(f"  FEN start     : {m['meta']['fen_start']}")
        print(f"  Pieces        : {len(m['pieces'])}  ({len({p['type'] for p in m['pieces']})} types × 2 colours)")
        print(f"  Rules         : {len(m['rules'])}")
        print(f"  Win conds     : {len(m['win_conditions'])}")
        print(f"  Draw conds    : {len(m['draw_conditions'])}")
        print(f"\n  Pieces:")
        for p in m["pieces"]:
            print(f"    {p['fen_symbol']}  {p['id']:<20}  {p['value_centipawns']:>5} cp  {p['initial_squares']}")
        print(f"\n  Rules:")
        for r in m["rules"]:
            print(f"    [{r['category']:<4}]  {r['rule']}")
        print(f"{'═'*60}\n")
    else:
        print(f"Unknown game: {game}", file=sys.stderr)
        sys.exit(1)


def _cmd_validate(game: str) -> None:
    if game == "chess":
        from factory.manifest import generate_chess_manifest
        try:
            m = generate_chess_manifest()
            print(f"OK  chess manifest valid — {len(m['pieces'])} pieces, {len(m['rules'])} rules")
            sys.exit(0)
        except Exception as exc:
            print(f"FAIL  {exc}", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"Unknown game: {game}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Studio Core — Game Factory CLI")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--sim",      type=int,   metavar="N",    help="Run N headless Snake sessions")
    group.add_argument("--manifest", type=str,   metavar="GAME", help="Print manifest summary")
    group.add_argument("--validate", type=str,   metavar="GAME", help="Validate manifest, exit 0/1")
    args = parser.parse_args()

    if args.sim is not None:
        _cmd_sim(args.sim)
    elif args.manifest:
        _cmd_manifest(args.manifest)
    elif args.validate:
        _cmd_validate(args.validate)


if __name__ == "__main__":
    main()
