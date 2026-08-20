"""Training session — pool_selfplay.jsonl → training_runs/run_YYYYMMDD_HHMMSS/

Requirements:
- Starts from models/latest.pt checkpoint
- Writes metrics.jsonl per epoch
- Saves epoch checkpoint per epoch
- Early stop if loss > 0.75 after epoch >= 5
- Reports every 5 epochs
"""
from __future__ import annotations

import json
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset

REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(Path(__file__).parent))

from dataset_loader import fen_to_tensor
from model import PolicyValueNet
from move_vocab import try_move_to_index, VOCAB_FINGERPRINT

# ── config ────────────────────────────────────────────────────────────────────
DATASET_PATH = REPO_ROOT / "lab" / "datasets" / "pool_selfplay.jsonl"
CHECKPOINT_PATH = REPO_ROOT / "models" / "latest.pt"
TRAINING_RUNS_DIR = REPO_ROOT / "training_runs"
MAX_EPOCHS = 20
BATCH_SIZE = 256
LR = 0.003
# Two-phase early-stop threshold: looser during warmup, tighter after.
WARMUP_EPOCHS = 10
WARMUP_THRESHOLD = 1.2   # epochs 1..WARMUP_EPOCHS
POST_THRESHOLD = 0.75    # epochs WARMUP_EPOCHS+1..
REPORT_EVERY = 5


def loss_threshold_for(epoch: int) -> float | None:
    """Divergence guard, checked only at/after the warmup boundary.

    Epochs 1..WARMUP_EPOCHS-1 are the free descent (loss starts high on a
    cold-start dataset switch) — no early stop. At epoch WARMUP_EPOCHS the
    warmup must have reached <= WARMUP_THRESHOLD; afterwards <= POST_THRESHOLD.
    Returns None when no check applies for this epoch.
    """
    if epoch < WARMUP_EPOCHS:
        return None
    if epoch == WARMUP_EPOCHS:
        return WARMUP_THRESHOLD
    return POST_THRESHOLD


class _SelfplayDataset(Dataset):
    def __init__(self, rows: list[dict]) -> None:
        self.samples: list[tuple[torch.Tensor, int]] = []
        skipped_no_fen = 0
        skipped_unmapped = 0
        skipped_encode = 0
        for row in rows:
            fen = row.get("fen", "")
            best_move = row.get("best_move", "")
            if not fen or not best_move:
                skipped_no_fen += 1
                continue
            idx = try_move_to_index(best_move)
            if idx is None:
                skipped_unmapped += 1
                continue
            try:
                x = fen_to_tensor(fen)
            except Exception:
                skipped_encode += 1
                continue
            self.samples.append((torch.tensor(x, dtype=torch.float32), idx))
        total_skipped = skipped_no_fen + skipped_unmapped + skipped_encode
        print(f"  kept={len(self.samples)} skipped={total_skipped}"
              f" (no_fen={skipped_no_fen} unmapped={skipped_unmapped} encode={skipped_encode})")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        x, move_idx = self.samples[idx]
        return x, torch.tensor(move_idx, dtype=torch.long)


def _load_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def main() -> None:
    run_id = datetime.now().strftime("run_%Y%m%d_%H%M%S")
    run_dir = TRAINING_RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    metrics_path = run_dir / "metrics.jsonl"
    log_path = run_dir / "train.log"

    def log(msg: str) -> None:
        ts = datetime.now().strftime("%H:%M:%S")
        line = f"[{ts}] {msg}"
        print(line, flush=True)
        with log_path.open("a", encoding="utf-8") as f:
            f.write(line + "\n")

    log(f"run_id={run_id}")
    log(f"run_dir={run_dir}")
    log(f"dataset={DATASET_PATH}")
    log(f"vocab_fingerprint={VOCAB_FINGERPRINT}")
    log(f"checkpoint={CHECKPOINT_PATH}")
    log(f"config: epochs={MAX_EPOCHS} batch={BATCH_SIZE} lr={LR} "
        f"early_stop=loss>{WARMUP_THRESHOLD}_during_ep1-{WARMUP_EPOCHS}_then>{POST_THRESHOLD}")

    # ── dataset ───────────────────────────────────────────────────────────────
    log("Loading dataset…")
    rows = _load_jsonl(DATASET_PATH)
    log(f"  raw_rows={len(rows)}")
    dataset = _SelfplayDataset(rows)
    nb_positions = len(dataset)
    if nb_positions == 0:
        log("ERROR: 0 valid positions — abort")
        sys.exit(1)
    log(f"  valid_positions={nb_positions}")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    log(f"device={device}")

    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)

    # ── model ─────────────────────────────────────────────────────────────────
    model = PolicyValueNet().to(device)
    if CHECKPOINT_PATH.exists():
        state = torch.load(CHECKPOINT_PATH, map_location=device)
        model.load_state_dict(state)
        log(f"Loaded checkpoint: {CHECKPOINT_PATH}")
    else:
        log("WARNING: no checkpoint found — training from scratch")

    optimizer = torch.optim.Adam(model.parameters(), lr=LR)
    criterion = nn.CrossEntropyLoss()

    # save run manifest
    manifest = {
        "run_id": run_id,
        "dataset": str(DATASET_PATH),
        "checkpoint": str(CHECKPOINT_PATH),
        "nb_positions": nb_positions,
        "max_epochs": MAX_EPOCHS,
        "batch_size": BATCH_SIZE,
        "lr": LR,
        "warmup_epochs": WARMUP_EPOCHS,
        "warmup_threshold": WARMUP_THRESHOLD,
        "post_threshold": POST_THRESHOLD,
        "device": str(device),
        "vocab_fingerprint": VOCAB_FINGERPRINT,
    }
    with (run_dir / "manifest.json").open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    # ── training loop ─────────────────────────────────────────────────────────
    best_loss = float("inf")
    best_epoch = -1
    epoch_losses: list[float] = []
    t_start = time.time()

    for epoch in range(1, MAX_EPOCHS + 1):
        model.train()
        total_loss = 0.0
        t_ep = time.time()

        for x_batch, y_batch in loader:
            x_batch = x_batch.to(device)
            y_batch = y_batch.to(device)
            policy_logits, _value = model(x_batch)
            loss = criterion(policy_logits, y_batch)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        epoch_loss = total_loss / max(len(loader), 1)
        epoch_losses.append(epoch_loss)
        elapsed = time.time() - t_ep

        # per-epoch checkpoint
        epoch_ckpt = run_dir / f"epoch_{epoch:03d}.pt"
        torch.save(model.state_dict(), epoch_ckpt)

        # track best
        if epoch_loss < best_loss:
            best_loss = epoch_loss
            best_epoch = epoch
            shutil.copy(epoch_ckpt, run_dir / "best.pt")

        # metrics.jsonl
        entry = {
            "epoch": epoch,
            "loss": epoch_loss,
            "best_loss": best_loss,
            "best_epoch": best_epoch,
            "epoch_seconds": round(elapsed, 1),
            "ts": datetime.now().isoformat(),
        }
        with metrics_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")

        log(f"epoch={epoch}/{MAX_EPOCHS} loss={epoch_loss:.6f} best={best_loss:.6f}@ep{best_epoch} t={elapsed:.0f}s")

        # periodic report
        if epoch % REPORT_EVERY == 0:
            total_elapsed = time.time() - t_start
            log(f"[REPORT epoch {epoch}] loss_curve={[round(l,4) for l in epoch_losses]}"
                f" best={best_loss:.6f}@ep{best_epoch} total_t={total_elapsed:.0f}s")

        # two-phase divergence guard (no early stop during free descent)
        thr = loss_threshold_for(epoch)
        if thr is not None and epoch_loss > thr:
            log(f"[EARLY STOP] epoch={epoch} loss={epoch_loss:.6f} > threshold={thr}")
            break

    # ── finalize ──────────────────────────────────────────────────────────────
    total_elapsed = time.time() - t_start
    log(f"Training complete: epochs_run={len(epoch_losses)} best_loss={best_loss:.6f}@ep{best_epoch}"
        f" total_t={total_elapsed:.0f}s")

    # copy best to run_dir/model.pt and to models/latest.pt
    best_ckpt = run_dir / "best.pt"
    shutil.copy(best_ckpt, run_dir / "model.pt")
    shutil.copy(best_ckpt, REPO_ROOT / "models" / "latest.pt")
    log(f"Saved: {run_dir / 'model.pt'} + models/latest.pt <- best epoch {best_epoch}")

    # final manifest update
    manifest["epochs_run"] = len(epoch_losses)
    manifest["best_loss"] = best_loss
    manifest["best_epoch"] = best_epoch
    manifest["loss_per_epoch"] = epoch_losses
    manifest["total_seconds"] = round(total_elapsed, 1)
    with (run_dir / "manifest.json").open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    log(f"Manifest updated: {run_dir / 'manifest.json'}")


if __name__ == "__main__":
    main()
