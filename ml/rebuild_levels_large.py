"""Rebuild level1/2/3.jsonl with large counts, rating-based, excluding holdout FENs."""
from __future__ import annotations

import argparse
import csv
import json
import random
from pathlib import Path

LEVELS = {
    "level1": (0, 999),
    "level2": (1000, 1499),
    "level3": (1500, 1999),
}


def load_fens(*paths: Path) -> set[str]:
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
                    fens.add(json.loads(line)["fen"])
                except Exception:
                    pass
    print(f"  Loaded {len(fens):,} FENs to exclude.")
    return fens


def build(csv_path: Path, exclude_fens: set[str], n_per_level: int, seed: int) -> dict[str, list[dict]]:
    rng = random.Random(seed)
    buckets: dict[str, list[dict]] = {k: [] for k in LEVELS}
    scanned = 0

    print(f"Scanning {csv_path.name} ({csv_path.stat().st_size // 1_000_000} MB)...")
    with csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            scanned += 1
            if scanned % 1_000_000 == 0:
                counts = {k: len(v) for k, v in buckets.items()}
                filled = all(len(v) >= n_per_level for v in buckets.values())
                print(f"  scanned={scanned:,}  {counts}")
                if filled:
                    print("  All buckets full — stopping early.")
                    break

            try:
                rating = int(row["Rating"])
            except (ValueError, KeyError):
                continue

            fen = row.get("FEN", "").strip()
            if not fen or fen in exclude_fens:
                continue

            moves_raw = row.get("Moves", "").strip().split()
            if not moves_raw:
                continue
            best_move = moves_raw[0]

            for level_name, (lo, hi) in LEVELS.items():
                if lo <= rating <= hi:
                    if len(buckets[level_name]) < n_per_level * 3:
                        buckets[level_name].append({
                            "fen": fen,
                            "best_moves": [best_move],
                            "lichess_rating": rating,
                            "lichess_themes": row.get("Themes", "").split(),
                        })
                    break

    print(f"Scan done: {scanned:,} rows. Candidates: { {k: len(v) for k, v in buckets.items()} }")

    sampled: dict[str, list[dict]] = {}
    for name, candidates in buckets.items():
        rng.shuffle(candidates)
        taken = candidates[:n_per_level]
        if len(taken) < n_per_level:
            print(f"WARNING: {name} only has {len(taken)} puzzles (wanted {n_per_level})")
        sampled[name] = taken
    return sampled


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--exclude-dir", required=True, help="Dir with holdout_level*.jsonl to exclude")
    parser.add_argument("--n", type=int, default=50000)
    parser.add_argument("--seed", type=int, default=123)
    args = parser.parse_args()

    exclude_dir = Path(args.exclude_dir)
    exclude_fens = load_fens(
        exclude_dir / "holdout_level1.jsonl",
        exclude_dir / "holdout_level2.jsonl",
        exclude_dir / "holdout_level3.jsonl",
    )

    sampled = build(Path(args.csv), exclude_fens, args.n, args.seed)

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    for level_name, records in sampled.items():
        out_path = out_dir / f"{level_name}.jsonl"
        with out_path.open("w", encoding="utf-8") as f:
            for rec in records:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        print(f"Saved {len(records):,} -> {out_path}")

    print("Done.")


if __name__ == "__main__":
    main()
