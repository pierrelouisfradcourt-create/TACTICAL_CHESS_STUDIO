"""
dataset_builder_v3.py — Build training datasets A/B/C/D with draw-rate guardrail.

Datasets:
  A — teacher_tactical + teacher_solid + teacher_positional, no draws, no random
  B — all teacher_*, aaa_used_search=True & aaa_confidence>0.5, no draws
  C — pool_2400 random 500k sample (seed=42), no draws
  D — puzzles level1+2+3, no filter
"""

import argparse
import hashlib
import json
import random
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
POOL_DIR = ROOT / "lab" / "datasets" / "pool"

DRAW_RESULT = "1/2-1/2"
MAX_DRAW_RATE = 0.20

TEACHER_FILES = [
    ROOT / "lab" / "datasets" / "teacher_tactical.jsonl",
    ROOT / "lab" / "datasets" / "teacher_solid.jsonl",
    ROOT / "lab" / "datasets" / "teacher_positional.jsonl",
    ROOT / "lab" / "datasets" / "teacher_finisher.jsonl",
    ROOT / "lab" / "datasets" / "teacher_samples.jsonl",
]

TEACHER_A_FILES = [
    ROOT / "lab" / "datasets" / "teacher_tactical.jsonl",
    ROOT / "lab" / "datasets" / "teacher_solid.jsonl",
    ROOT / "lab" / "datasets" / "teacher_positional.jsonl",
]

PUZZLE_FILES = [
    ROOT / "lab" / "puzzles" / "level1.jsonl",
    ROOT / "lab" / "puzzles" / "level2.jsonl",
    ROOT / "lab" / "puzzles" / "level3.jsonl",
]


def iter_jsonl(path: Path):
    with path.open("r", encoding="utf-8") as fh:
        for raw in fh:
            raw = raw.strip()
            if raw:
                yield json.loads(raw)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def draw_rate_of(rows: list[dict[str, Any]]) -> float:
    if not rows:
        return 0.0
    draws = sum(1 for r in rows if r.get("result") == DRAW_RESULT)
    return draws / len(rows)


def write_dataset(rows: list[dict[str, Any]], out_path: Path, seed: int | None = None) -> dict:
    draw_rate = draw_rate_of(rows)
    if draw_rate > MAX_DRAW_RATE:
        print(
            f"  REFUSE: draw_rate={draw_rate:.3f} > {MAX_DRAW_RATE} — {out_path.name} NOT written.",
            file=sys.stderr,
        )
        sys.exit(1)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")

    checksum = sha256_file(out_path)
    manifest = {
        "dataset": out_path.name,
        "nb_lignes": len(rows),
        "draw_rate": round(draw_rate, 6),
        "checksum_sha256": checksum,
        "seed": seed,
        "date": datetime.now(timezone.utc).isoformat(),
    }
    manifest_path = out_path.with_suffix(".manifest.json")
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    return manifest


def build_a() -> dict:
    print("Building Dataset A — teacher rocky (tactical+solid+positional, no draws, no random)…")
    rows = []
    for path in TEACHER_A_FILES:
        for row in iter_jsonl(path):
            if row.get("result") == DRAW_RESULT:
                continue
            if row.get("decision_mode") == "random":
                continue
            rows.append(row)
    print(f"  {len(rows)} rows collected.")
    return write_dataset(rows, POOL_DIR / "dataset_a_rocky.jsonl")


def build_b() -> dict:
    print("Building Dataset B — quality teacher (search=True, confidence>0.5, no draws)…")
    rows = []
    for path in TEACHER_FILES:
        if not path.exists():
            print(f"  SKIP (not found): {path.name}", file=sys.stderr)
            continue
        for row in iter_jsonl(path):
            if row.get("result") == DRAW_RESULT:
                continue
            if not row.get("aaa_used_search"):
                continue
            conf = row.get("aaa_confidence")
            if conf is None or float(conf) <= 0.5:
                continue
            rows.append(row)
    print(f"  {len(rows)} rows collected.")
    return write_dataset(rows, POOL_DIR / "dataset_b_quality.jsonl")


def _reservoir_sample(path: Path, k: int, seed: int) -> list[dict[str, Any]]:
    """Reservoir sampling over a large JSONL file without loading it all in memory."""
    rng = random.Random(seed)
    reservoir: list[dict[str, Any]] = []
    for i, row in enumerate(iter_jsonl(path)):
        if i < k:
            reservoir.append(row)
        else:
            j = rng.randint(0, i)
            if j < k:
                reservoir[j] = row
        if (i + 1) % 5_000_000 == 0:
            print(f"    …scanned {i + 1:,} lines", flush=True)
    return reservoir


def build_c() -> dict:
    seed = 42
    sample_size = 500_000
    source = ROOT / "lab" / "datasets" / "pool" / "pool_2400.jsonl"
    print(f"Building Dataset C — pool_2400 sample {sample_size:,} (seed={seed})…")
    rows = _reservoir_sample(source, sample_size, seed)
    # filter draws after sampling
    rows = [r for r in rows if r.get("result") != DRAW_RESULT]
    print(f"  {len(rows)} rows after draw filter.")
    return write_dataset(rows, POOL_DIR / "dataset_c_elite.jsonl", seed=seed)


def build_d() -> dict:
    print("Building Dataset D — puzzles level1+2+3 (no filter)…")
    rows = []
    for path in PUZZLE_FILES:
        for row in iter_jsonl(path):
            rows.append(row)
    print(f"  {len(rows)} rows collected.")
    # Puzzles have no result field — draw_rate will be 0
    return write_dataset(rows, POOL_DIR / "dataset_d_puzzles.jsonl")


def main():
    parser = argparse.ArgumentParser(description="Build training datasets A/B/C/D")
    parser.add_argument(
        "datasets",
        nargs="*",
        choices=["a", "b", "c", "d"],
        help="Which datasets to build (default: all)",
    )
    args = parser.parse_args()
    targets = args.datasets or ["a", "b", "c", "d"]

    builders = {"a": build_a, "b": build_b, "c": build_c, "d": build_d}
    results = {}
    for key in targets:
        manifest = builders[key]()
        results[key] = manifest
        print(
            f"  OK — {manifest['nb_lignes']:,} lines, draw_rate={manifest['draw_rate']:.3f}, "
            f"sha256={manifest['checksum_sha256'][:16]}…"
        )

    print("\nSummary:")
    for key, m in results.items():
        print(
            f"  [{key.upper()}] {m['dataset']} — {m['nb_lignes']:,} lines, "
            f"draw={m['draw_rate']:.3f}, seed={m['seed']}"
        )


if __name__ == "__main__":
    main()
