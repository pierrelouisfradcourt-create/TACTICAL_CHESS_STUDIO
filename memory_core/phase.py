from __future__ import annotations

from typing import List


PIECE_VALUES = {
    "p": 1.0,
    "n": 3.0,
    "b": 3.0,
    "r": 5.0,
    "q": 9.0,
    "k": 0.0,
}


def _board_from_fen(fen: str) -> List[List[str]]:
    parts = fen.strip().split()
    if len(parts) < 2:
        raise ValueError(f"Invalid FEN: {fen}")

    ranks = parts[0].split("/")
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
    return board


def _non_king_material(board: List[List[str]]) -> float:
    total = 0.0
    for row in board:
        for piece in row:
            if piece == ".":
                continue
            total += PIECE_VALUES.get(piece.lower(), 0.0)
    return total


def _major_minor_piece_count(board: List[List[str]]) -> int:
    count = 0
    for row in board:
        for piece in row:
            if piece == ".":
                continue
            if piece.lower() != "k":
                count += 1
    return count


def detect_phase(fen: str) -> str:
    board = _board_from_fen(fen)
    non_king_material = _non_king_material(board)
    piece_count = _major_minor_piece_count(board)

    if non_king_material <= 14.0 or piece_count <= 6:
        return "endgame"

    if non_king_material >= 50.0 and piece_count >= 12:
        return "opening"

    return "middlegame"
