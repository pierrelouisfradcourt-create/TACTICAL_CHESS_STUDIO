from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset

sys.path.insert(0, str(Path(__file__).parent))

from dataset_loader import eval_to_value, fen_to_tensor
from model import PolicyValueNet
from move_vocab import try_move_to_index


class _MaiaDataset(Dataset):
    def __init__(self, rows: list[dict]) -> None:
        self.samples: list[tuple[torch.Tensor, int]] = []
        skipped = 0
        for row in rows:
            fen = row.get("fen", "")
            if row.get("best_move"):
                best_move = row["best_move"]
            elif isinstance(row.get("best_moves"), list) and row["best_moves"]:
                best_move = row["best_moves"][0]
            elif row.get("move"):
                best_move = row["move"]
            else:
                best_move = ""
            if not fen or not best_move:
                skipped += 1
                continue
            move_idx = try_move_to_index(best_move)
            if move_idx is None:
                skipped += 1
                continue
            try:
                x = fen_to_tensor(fen)
            except Exception:
                skipped += 1
                continue
            self.samples.append((torch.tensor(x, dtype=torch.float32), move_idx))
        print(f"  kept={len(self.samples)} skipped={skipped}")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        x, move_idx = self.samples[idx]
        return x, torch.tensor(move_idx, dtype=torch.long)


_RESULT_LABEL: dict[str, float] = {"1-0": 1.0, "0-1": 0.0, "1/2-1/2": 0.5}


class _ResultDataset(Dataset):
    def __init__(self, rows: list[dict]) -> None:
        self.samples: list[tuple[torch.Tensor, torch.Tensor]] = []
        skipped = 0
        for row in rows:
            fen = row.get("fen", "")
            label = _RESULT_LABEL.get(row.get("result", ""))
            if not fen or label is None:
                skipped += 1
                continue
            try:
                x = fen_to_tensor(fen)
            except Exception:
                skipped += 1
                continue
            self.samples.append((
                torch.tensor(x, dtype=torch.float32),
                torch.tensor([label], dtype=torch.float32),
            ))
        print(f"  kept={len(self.samples)} skipped={skipped}")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        return self.samples[idx]


class _ValueDataset(Dataset):
    def __init__(self, rows: list[dict]) -> None:
        self.samples: list[tuple[torch.Tensor, torch.Tensor]] = []
        skipped = 0
        for row in rows:
            fen = row.get("fen", "")
            engine_eval = row.get("engine_eval")
            if not fen or engine_eval is None:
                skipped += 1
                continue
            try:
                x = fen_to_tensor(fen)
                y = eval_to_value(float(engine_eval))
            except Exception:
                skipped += 1
                continue
            self.samples.append((
                torch.tensor(x, dtype=torch.float32),
                torch.tensor([y], dtype=torch.float32),
            ))
        print(f"  kept={len(self.samples)} skipped={skipped}")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        return self.samples[idx]


def _load_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def train(args: argparse.Namespace) -> None:
    dataset_path = Path(args.dataset)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path = output_path.parent / (output_path.stem + "_manifest.json")

    print(f"Loading dataset: {dataset_path}")
    rows = _load_jsonl(dataset_path)
    print(f"  raw rows: {len(rows)}")

    if args.method == "maia":
        dataset: Dataset = _MaiaDataset(rows)
        criterion: nn.Module = nn.CrossEntropyLoss()
    elif args.method == "result":
        dataset = _ResultDataset(rows)
        criterion = nn.MSELoss()
    else:
        dataset = _ValueDataset(rows)
        criterion = nn.MSELoss()

    nb_positions = len(dataset)
    if nb_positions == 0:
        raise ValueError("Dataset is empty after filtering — cannot train.")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"device={device} method={args.method} positions={nb_positions} "
          f"epochs={args.epochs} batch={args.batch} lr={args.lr} "
          f"dropout={args.dropout} weight_decay={args.weight_decay}")

    loader = DataLoader(dataset, batch_size=args.batch, shuffle=True)
    model = PolicyValueNet(dropout=args.dropout).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)

    epoch_losses: list[float] = []
    consecutive_worse = 0
    best_loss = float("inf")
    best_state: dict | None = None

    for epoch in range(1, args.epochs + 1):
        model.train()
        total_loss = 0.0

        for x_batch, y_batch in loader:
            x_batch = x_batch.to(device)
            y_batch = y_batch.to(device)

            policy_logits, value_pred = model(x_batch)

            if args.method == "maia":
                loss = criterion(policy_logits, y_batch)
            else:
                loss = criterion(value_pred.squeeze(1), y_batch.squeeze(1))

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        epoch_loss = total_loss / max(len(loader), 1)
        epoch_losses.append(epoch_loss)
        print(f"epoch={epoch}/{args.epochs} loss={epoch_loss:.6f}")

        if epoch_loss < best_loss:
            best_loss = epoch_loss
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

        if len(epoch_losses) >= 2 and epoch_loss > epoch_losses[-2]:
            consecutive_worse += 1
        else:
            consecutive_worse = 0

        if consecutive_worse >= 3:
            print(f"Early stopping at epoch {epoch} (loss rose 3 consecutive epochs)")
            break

    if best_state is not None:
        model.load_state_dict(best_state)
    torch.save(model.state_dict(), output_path)
    print(f"Model saved -> {output_path}")

    manifest = {
        "loss_per_epoch": epoch_losses,
        "lr": args.lr,
        "dropout": args.dropout,
        "weight_decay": args.weight_decay,
        "dataset": str(dataset_path.resolve()),
        "nb_positions": nb_positions,
        "date": date.today().isoformat(),
        "method": args.method,
        "epochs_run": len(epoch_losses),
        "best_loss": best_loss,
    }
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Manifest saved -> {manifest_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train PolicyValueNet (maia or value method)")
    parser.add_argument("--dataset", required=True, help="Path to .jsonl dataset")
    parser.add_argument("--output", required=True, help="Output .pt path")
    parser.add_argument("--method", choices=["maia", "value", "result"], default="maia",
                        help="maia=cross-entropy on best_move  value=MSE on engine_eval  result=MSE on game result")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch", type=int, default=256)
    parser.add_argument("--lr", type=float, default=0.003)
    parser.add_argument("--dropout", type=float, default=0.0)
    parser.add_argument("--weight_decay", type=float, default=0.0)
    args = parser.parse_args()
    train(args)


if __name__ == "__main__":
    main()
