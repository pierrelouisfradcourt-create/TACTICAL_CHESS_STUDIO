"""Build hold-out puzzle sets from lichess_db_puzzle.csv, excluding training FENs."""
from __future__ import annotations

import argparse
import csv
import json
import random
import sys
from pathlib import Path


LEVELS = {
    "level1": (0, 999),
    "level2": (1000, 1499),
    "level3": (1500, 1999),
}


def load_existing_fens(*paths: Path) -> set[str]:
    fens: set[str] = set()
    for p in paths:
        if not p.exists():
            continue
        with p.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                    fen = row.get("fen", "").strip()
                    if fen:
                        fens.add(fen)
                except Exception:
                    pass
    return fens


def build_holdout(
    csv_path: Path,
    exclude_fens: set[str],
    n_per_level: int,
    seed: int,
) -> dict[str, list[dict]]:
    rng = random.Random(seed)
    buckets: dict[str, list[dict]] = {k: [] for k in LEVELS}

    print(f"Scanning {csv_path} ({csv_path.stat().st_size // 1_000_000} MB)…")
    scanned = 0

    with csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            scanned += 1
            if scanned % 500_000 == 0:
                counts = {k: len(v) for k, v in buckets.items()}
                print(f"  scanned={scanned:,}  buckets={counts}")

            try:
                rating = int(row["Rating"])
            except (ValueError, KeyError):
                continue

            fen = row.get("FEN", "").strip()
            if not fen or fen in exclude_fens:
                continue

            moves_raw = row.get("Moves", "").strip()
            if not moves_raw:
                continue
            best_move = moves_raw.split()[0].strip()
            if not best_move:
                continue

            puzzle_id = row.get("PuzzleId", "").strip()
            themes = row.get("Themes", "").strip()
            theme_list = themes.split() if themes else []

            record = {
                "case_id": f"lichess_{puzzle_id}",
                "fen": fen,
                "best_moves": [best_move],
                "lichess_rating": rating,
                "lichess_themes": theme_list,
            }

            for level_name, (lo, hi) in LEVELS.items():
                if lo <= rating <= hi:
                    buckets[level_name].append(record)
                    break

    print(f"Scan complete: {scanned:,} rows read.")
    for k, v in buckets.items():
        print(f"  {k}: {len(v):,} candidates")

    sampled: dict[str, list[dict]] = {}
    for level_name, candidates in buckets.items():
        if len(candidates) < n_per_level:
            print(f"WARNING: only {len(candidates)} candidates for {level_name}, need {n_per_level}")
        rng.shuffle(candidates)
        sampled[level_name] = candidates[:n_per_level]

    return sampled


def save_holdout(sampled: dict[str, list[dict]], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for level_name, records in sampled.items():
        out_path = output_dir / f"holdout_{level_name}.jsonl"
        with out_path.open("w", encoding="utf-8") as f:
            for rec in records:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        print(f"Saved {len(records)} puzzles -> {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="Path to lichess_db_puzzle.csv")
    parser.add_argument("--training-dir", required=True, help="Dir with level1/2/3.jsonl to exclude")
    parser.add_argument("--output-dir", required=True, help="Output dir for holdout files")
    parser.add_argument("--n", type=int, default=1000, help="Puzzles per level")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    training_dir = Path(args.training_dir)
    exclude_fens = load_existing_fens(
        training_dir / "level1.jsonl",
        training_dir / "level2.jsonl",
        training_dir / "level3.jsonl",
    )
    print(f"Excluding {len(exclude_fens):,} FENs from training sets.")

    sampled = build_holdout(
        csv_path=Path(args.csv),
        exclude_fens=exclude_fens,
        n_per_level=args.n,
        seed=args.seed,
    )

    save_holdout(sampled, Path(args.output_dir))
    print("Done.")


if __name__ == "__main__":
    main()
