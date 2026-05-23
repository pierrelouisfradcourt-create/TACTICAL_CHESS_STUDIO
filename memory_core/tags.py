from __future__ import annotations

from typing import List


def extract_tags(fen: str) -> List[str]:
    tags: List[str] = []
    board = fen.split()[0] if fen.strip() else ""
    white = sum(1 for c in board if c.isupper())
    black = sum(1 for c in board if c.islower())
    diff = white - black
    if diff >= 2:
        tags.append("material_up")
    elif diff <= -2:
        tags.append("material_down")
    if "P" in board or "p" in board:
        tags.append("passed_pawn")
    if "r" not in board.lower():
        tags.append("closed_center")
    return tags
