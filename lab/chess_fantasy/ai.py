"""
Chess Fantasy — IA greedy V1 (IMP-055a)

Stratégie : profondeur 1, maximise captures gagnantes (ATK > DEF)
            et minimise la pression sur son propre roi.
"""
from __future__ import annotations
from typing import Optional

from .engine import GameState
from .rules import (
    apply_move, compute_pressure, get_all_moves,
    resolve_capture, Move,
)

# Valeur relative des pièces pour prioriser les captures
_PIECE_VALUE: dict[str, float] = {
    'pawn':   1.0,
    'knight': 3.0,
    'bishop': 3.0,
    'rook':   5.0,
    'queen':  9.0,
    'king':   100.0,
}


def score_move(state: GameState, move: Move) -> float:
    """
    Évalue un coup pour le joueur courant.
    Score positif = bon. Composantes :
      +piece_value  si capture gagnante (ATK > DEF / HP roi)
      -2 × pression propre après le coup (évite de s'exposer)
    """
    from_sq, to_sq = move
    attacker = state.board.piece_at(from_sq)
    defender = state.board.piece_at(to_sq)

    score = 0.0

    if attacker is not None and defender is not None:
        captured, _ = resolve_capture(attacker, defender)
        if captured:
            score += _PIECE_VALUE.get(defender.piece_type, 1.0)

    new_state = apply_move(state, from_sq, to_sq)
    own_pressure = compute_pressure(new_state.board, state.turn)
    score -= own_pressure * 2.0

    return score


def choose_move(state: GameState) -> Optional[Move]:
    """
    Retourne le meilleur coup légal pour le joueur courant,
    ou None si aucun coup n'est disponible (état terminal).
    """
    if state.is_over():
        return None
    moves = get_all_moves(state)
    if not moves:
        return None
    return max(moves, key=lambda m: score_move(state, m))
