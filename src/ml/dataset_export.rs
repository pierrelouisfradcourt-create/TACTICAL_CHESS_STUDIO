import json
import math
from typing import List, Optional, Tuple

import numpy as np
import torch
from torch.utils.data import Dataset

from move_vocab import try_move_to_index


PIECE_TO_CHANNEL = {
    "P": 0,
    "N": 1,
    "B": 2,
    "R": 3,
    "Q": 4,
    "K": 5,
    "p": 6,
    "n": 7,
    "b": 8,
    "r": 9,
    "q": 10,
    "k": 11,
}

PIECE_VALUES = {
    "P": 1.0,
    "N": 3.0,
    "B": 3.0,
    "R": 5.0,
    "Q": 9.0,
    "K": 0.0,
    "p": 1.0,
    "n": 3.0,
    "b": 3.0,
    "r": 5.0,
    "q": 9.0,
    "k": 0.0,
}


def parse_fen_board(fen: str) -> Tuple[List[List[str]], str]:
    parts = fen.strip().split()
    if len(parts) < 2:
        raise ValueError(f"Invalid FEN: {fen}")

    board_part = parts[0]
    side_to_move = parts[1]

    ranks = board_part.split("/")
    if len(ranks) != 8:
        raise ValueError(f"Invalid FEN board: {fen}")

    board: List[List[str]] = []

    for rank in ranks:
        row: List[str] = []
        for ch in rank:
            if ch.isdigit():
                row.extend(["."] * int(ch))
            else:
                row.append(ch)

        if len(row) != 8:
            raise ValueError(f"Invalid FEN row width: {fen}")

        board.append(row)

    return board, side_to_move


def find_piece(board: List[List[str]], piece: str) -> Optional[Tuple[int, int]]:
    for r in range(8):
        for c in range(8):
            if board[r][c] == piece:
                return r, c
    return None


def compute_king_danger(board: List[List[str]], king_piece: str) -> float:
    king_pos = find_piece(board, king_piece)
    if king_pos is None:
        return 0.0

    kr, kc = king_pos
    enemy_is_upper = king_piece.islower()

    score = 0.0

    for r in range(8):
        for c in range(8):
            piece = board[r][c]
            if piece == ".":
                continue

            is_enemy = piece.isupper() if enemy_is_upper else piece.islower()
            if not is_enemy:
                continue

            dist = max(abs(r - kr), abs(c - kc))
            if dist <= 2:
                weight = PIECE_VALUES.get(piece, 0.0)
                proximity = 3 - dist  # dist 0->3, 1->2, 2->1
                score += weight * proximity

    # squash to [0,1]ish range
    return float(math.tanh(score / 8.0))


def fen_to_tensor(fen: str) -> np.ndarray:
    board, side_to_move = parse_fen_board(fen)

    # 12 piece planes
    # 1 side-to-move plane
    # 1 white king danger plane
    # 1 black king danger plane
    x = np.zeros((15, 8, 8), dtype=np.float32)

    for r in range(8):
        for c in range(8):
            piece = board[r][c]
            if piece == ".":
                continue

            channel = PIECE_TO_CHANNEL.get(piece)
            if channel is None:
                raise ValueError(f"Unknown piece in FEN: {piece}")

            x[channel, r, c] = 1.0

    # side to move
    if side_to_move == "w":
        x[12, :, :] = 1.0
    else:
        x[12, :, :] = 0.0

    white_king_danger = compute_king_danger(board, "K")
    black_king_danger = compute_king_danger(board, "k")

    x[13, :, :] = white_king_danger
    x[14, :, :] = black_king_danger

    return x


def result_to_value(result: str, player_to_move: int) -> float:
    if result == "1-0":
        return 1.0 if player_to_move == 1 else -1.0
    if result == "0-1":
        return -1.0 if player_to_move == 1 else 1.0
    if result == "1/2-1/2":
        return 0.0
    return 0.0


def eval_to_value(eval_pawns: float) -> float:
    # More stable teacher scaling
    return float(math.tanh(float(eval_pawns) / 3.0))


class TeacherDataset(Dataset):
    def __init__(self, path: str):
        self.samples: List[tuple] = []

        kept = 0
        skipped_uninteresting = 0
        skipped_unmapped = 0
        total = 0

        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

                total += 1

                try:
                    row = json.loads(line)
                except Exception:
                    continue

                fen = row.get("fen")
                best_move = row.get("best_move")

                if not fen or not best_move:
                    continue

                move_idx = try_move_to_index(best_move)
                if move_idx is None:
                    skipped_unmapped += 1
                    continue

                try:
                    x = fen_to_tensor(fen)
                except Exception:
                    continue

                y_policy = move_idx

                engine_eval = row.get("engine_eval", None)
                result = row.get("result", None)
                player_to_move = int(row.get("player_to_move", 1))

                if engine_eval is not None:
                    y_value = eval_to_value(engine_eval)
                elif result is not None:
                    y_value = result_to_value(result, player_to_move)
                else:
                    skipped_uninteresting += 1
                    continue

                self.samples.append(
                    (
                        torch.tensor(x, dtype=torch.float32),
                        torch.tensor(y_policy, dtype=torch.long),
                        torch.tensor([y_value], dtype=torch.float32),
                    )
                )
                kept += 1

        print(
            f"TeacherDataset loaded: kept={kept} total={total} "
            f"skipped_uninteresting={skipped_uninteresting} "
            f"skipped_unmapped={skipped_unmapped}"
        )

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        return self.samples[idx]