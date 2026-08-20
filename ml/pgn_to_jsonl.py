"""
pgn_to_jsonl.py
Parse lichess_elite_2021-08.pgn + human_*.pgn → pool_2400.jsonl

Usage:
    python ml/pgn_to_jsonl.py
"""

import chess
import chess.pgn
import hashlib
import json
import os
import sys
from datetime import date
from pathlib import Path

DATASETS_DIR = Path("lab/datasets")
OUTPUT_DIR = DATASETS_DIR / "pool"
OUTPUT_JSONL = OUTPUT_DIR / "pool_2400.jsonl"
OUTPUT_MANIFEST = OUTPUT_DIR / "pool_manifest.json"

MOVE_START = 10
MOVE_END = 40
DRAW_RATE_GATE = 0.20


def source_for_file(pgn_path: Path) -> str:
    name = pgn_path.name
    if name.startswith("lichess_elite"):
        return "lichess_elite"
    return "human_patterns"


def collect_pgn_files() -> list[Path]:
    files = []
    elite = DATASETS_DIR / "lichess_elite_2021-08.pgn"
    if elite.exists():
        files.append(elite)
    files.extend(sorted(DATASETS_DIR.glob("human_*.pgn")))
    return files


def parse_games(pgn_path: Path) -> tuple[list[dict], int, int]:
    """Return (records, total_games, draw_count)."""
    source = source_for_file(pgn_path)
    records = []
    total = 0
    draws = 0

    with open(pgn_path, encoding="utf-8", errors="replace") as fh:
        while True:
            game = chess.pgn.read_game(fh)
            if game is None:
                break
            total += 1
            result = game.headers.get("Result", "*")
            if result not in ("1-0", "0-1"):
                draws += 1
                continue

            board = game.board()
            move_num = 0
            for move in game.mainline_moves():
                move_uci = move.uci()
                board.push(move)
                move_num += 1
                # move_num here is the half-move count (ply); convert to full moves
                full_move = board.fullmove_number
                if full_move < MOVE_START:
                    continue
                if full_move > MOVE_END:
                    break
                records.append({
                    "fen": board.fen(),
                    "move": move_uci,
                    "result": result,
                    "phase": "midgame",
                    "source": source,
                })

    return records, total, draws


def deduplicate(records: list[dict]) -> list[dict]:
    seen: set[int] = set()
    unique = []
    for rec in records:
        h = hash(rec["fen"])
        if h not in seen:
            seen.add(h)
            unique.append(rec)
    return unique


def sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    pgn_files = collect_pgn_files()
    if not pgn_files:
        print("ERROR: no PGN files found in", DATASETS_DIR)
        return 1

    all_records: list[dict] = []
    total_games = 0
    total_draws = 0

    for pgn_path in pgn_files:
        print(f"  parsing {pgn_path.name} …")
        recs, t, d = parse_games(pgn_path)
        all_records.extend(recs)
        total_games += t
        total_draws += d
        print(f"    → {t} games, {d} draws, {len(recs)} raw positions")

    draw_rate = total_draws / total_games if total_games else 0.0

    if draw_rate > DRAW_RATE_GATE:
        print(
            f"ERROR: draw_rate={draw_rate:.3f} exceeds gate {DRAW_RATE_GATE}. "
            "Output NOT written."
        )
        return 1

    unique = deduplicate(all_records)
    print(f"  deduplication: {len(all_records)} → {len(unique)} unique positions")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_JSONL, "w", encoding="utf-8") as fh:
        for rec in unique:
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")

    checksum = sha256_of_file(OUTPUT_JSONL)
    manifest = {
        "nb_lignes": len(unique),
        "draw_rate": round(draw_rate, 6),
        "checksum_sha256": checksum,
        "date": date.today().isoformat(),
        "source_files": [p.name for p in pgn_files],
        "total_games": total_games,
        "total_draws": total_draws,
    }
    with open(OUTPUT_MANIFEST, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print(f"  wrote {OUTPUT_JSONL}  ({len(unique)} lines)")
    print(f"  wrote {OUTPUT_MANIFEST}")
    print(f"  draw_rate={draw_rate:.4f}  checksum={checksum[:16]}…")
    return 0


if __name__ == "__main__":
    sys.exit(main())
