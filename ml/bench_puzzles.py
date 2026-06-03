"""Puzzle benchmark: measure solve rate of a PolicyValueNet model per level."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import chess
import torch

sys.path.insert(0, str(Path(__file__).parent))

from dataset_loader import fen_to_tensor
from model import PolicyValueNet
from move_vocab import try_move_to_index


def load_model(model_path: str, device: torch.device) -> PolicyValueNet:
    model = PolicyValueNet().to(device)
    state = torch.load(model_path, map_location=device, weights_only=True)
    model.load_state_dict(state)
    model.eval()
    return model


def predict_top1(model: PolicyValueNet, device: torch.device, fen: str, legal_ucis: list[str]) -> str | None:
    try:
        x = fen_to_tensor(fen)
    except Exception:
        return None
    x_tensor = torch.tensor(x, dtype=torch.float32, device=device).unsqueeze(0)
    with torch.no_grad():
        logits, _ = model(x_tensor)
    logits_np = logits[0].detach().cpu().numpy()

    best_move = None
    best_score = float("-inf")
    for uci in legal_ucis:
        idx = try_move_to_index(uci)
        if idx is None or idx >= len(logits_np):
            continue
        score = float(logits_np[idx])
        if score > best_score:
            best_score = score
            best_move = uci
    return best_move


def bench_level(model: PolicyValueNet, device: torch.device, path: Path) -> dict:
    total = 0
    solved = 0
    skipped = 0

    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            fen = row.get("fen", "")
            best_moves: list[str] = row.get("best_moves") or []
            if row.get("move"):
                best_moves = best_moves or [row["move"]]
            if not fen or not best_moves:
                skipped += 1
                continue

            try:
                board = chess.Board(fen)
                legal_ucis = [m.uci() for m in board.legal_moves]
            except Exception:
                skipped += 1
                continue

            pred = predict_top1(model, device, fen, legal_ucis)
            if pred is None:
                skipped += 1
                continue

            total += 1
            if pred in best_moves:
                solved += 1

    rate = solved / total if total > 0 else 0.0
    return {"total": total, "solved": solved, "skipped": skipped, "rate": rate}


def main() -> None:
    parser = argparse.ArgumentParser(description="Puzzle benchmark for PolicyValueNet")
    parser.add_argument("--model", required=True, help="Path to .pt model file")
    parser.add_argument("--levels", nargs="+", required=True, help="Paths to .jsonl puzzle files")
    parser.add_argument("--output", default=None, help="Optional JSON output path")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"device={device}  model={args.model}")
    model = load_model(args.model, device)

    results: dict[str, dict] = {}
    for level_path_str in args.levels:
        level_path = Path(level_path_str)
        label = level_path.stem
        print(f"\n--- {label} ({level_path}) ---")
        stats = bench_level(model, device, level_path)
        results[label] = stats
        print(f"  total={stats['total']}  solved={stats['solved']}  skipped={stats['skipped']}")
        print(f"  solve rate: {stats['rate']*100:.1f}%")

    print("\n=== SUMMARY ===")
    overall_total = sum(r["total"] for r in results.values())
    overall_solved = sum(r["solved"] for r in results.values())
    for label, stats in results.items():
        print(f"  {label:12s}  {stats['solved']:5d}/{stats['total']:5d}  {stats['rate']*100:5.1f}%")
    if overall_total > 0:
        print(f"  {'OVERALL':12s}  {overall_solved:5d}/{overall_total:5d}  {overall_solved/overall_total*100:5.1f}%")

    if args.output:
        out = {
            "model": args.model,
            "levels": results,
            "overall": {
                "total": overall_total,
                "solved": overall_solved,
                "rate": overall_solved / overall_total if overall_total > 0 else 0.0,
            },
        }
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
        print(f"\nResults saved -> {args.output}")


if __name__ == "__main__":
    main()
