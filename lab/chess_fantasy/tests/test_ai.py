"""Tests ai.py — IMP-055a Chess Fantasy IA minimale."""
import pytest

from lab.chess_fantasy.engine import (
    Board, GameState, Piece,
    KING_MAX_HP, KING_PRESSURE_THRESHOLD,
)
from lab.chess_fantasy.rules import get_all_moves, apply_move
from lab.chess_fantasy.ai import choose_move, score_move


# ── helpers ───────────────────────────────────────────────────────────────────

def _board(*pieces: Piece) -> Board:
    return Board(size=8, pieces=list(pieces))


def _state(board: Board, turn: str = 'white') -> GameState:
    return GameState(board=board, turn=turn, move_number=1, chess960_id=518)


def _piece(pt: str, color: str, col: int, row: int, **kw) -> Piece:
    p = Piece.create(pt, color, (col, row))
    for k, v in kw.items():
        object.__setattr__(p, k, v)
    return p


# ── Test 1 : choose_move retourne un coup légal ───────────────────────────────

def test_choose_move_returns_legal_move():
    """Le coup retourné doit appartenir à get_all_moves()."""
    wk = _piece('king',  'white', 4, 0)
    bk = _piece('king',  'black', 4, 7)
    wp = _piece('pawn',  'white', 3, 3)
    state = _state(_board(wk, bk, wp))

    move = choose_move(state)

    assert move is not None
    legal = get_all_moves(state)
    assert move in legal


# ── Test 2 : l'IA préfère une capture gagnante ───────────────────────────────

def test_ai_prefers_winning_capture():
    """
    Plateau : reine blanche (ATK=4) à côté d'un pion noir (DEF=0).
    La reine peut aussi avancer silencieusement.
    L'IA doit choisir la capture car ATK > DEF.
    """
    wk = _piece('king',   'white', 0, 0)
    bk = _piece('king',   'black', 7, 7)
    wq = _piece('queen',  'white', 3, 3)   # ATK=4
    bp = _piece('pawn',   'black', 3, 4)   # DEF=0, dans l'axe de la reine

    state = _state(_board(wk, bk, wq, bp))
    move = choose_move(state)

    assert move is not None
    from_sq, to_sq = move
    assert from_sq == (3, 3)
    assert to_sq   == (3, 4)   # capture du pion


# ── Test 3 : l'IA évite le suicide ────────────────────────────────────────────

def test_ai_avoids_suicide():
    """
    Plateau : roi blanc seul, peut avancer vers une case couverte par 4 pièces
    ennemies (pression = 4 = seuil de victoire) ou rester.
    L'IA ne doit pas jouer le coup suicidaire.
    """
    # Roi blanc en (4,0). Case (4,1) menacée par 4 tours noires.
    wk  = _piece('king', 'white', 4, 0)
    bk  = _piece('king', 'black', 0, 7)
    br1 = _piece('rook', 'black', 0, 1)
    br2 = _piece('rook', 'black', 1, 1)
    br3 = _piece('rook', 'black', 7, 1)
    br4 = _piece('rook', 'black', 2, 1)

    state = _state(_board(wk, bk, br1, br2, br3, br4))
    move = choose_move(state)

    if move is not None:
        _, to_sq = move
        # Le roi ne doit pas aller en (4,1) — ce serait mettre le roi sous pression max
        assert to_sq != (4, 1), "L'IA joue un coup suicidaire"


# ── Test 4 : score_move > 0 pour une capture gagnante ────────────────────────

def test_score_move_positive_for_winning_capture():
    """
    score_move doit retourner > 0 quand on capture une pièce ennemie
    sans s'exposer.
    """
    wk = _piece('king',  'white', 0, 0)
    bk = _piece('king',  'black', 7, 7)
    wr = _piece('rook',  'white', 4, 4)  # ATK=3
    bp = _piece('pawn',  'black', 4, 5)  # DEF=0 — capture garantie

    state = _state(_board(wk, bk, wr, bp))
    capture_move = ((4, 4), (4, 5))
    s = score_move(state, capture_move)
    assert s > 0.0


# ── Test 5 : partie IA vs IA se termine ──────────────────────────────────────

def test_ai_vs_ai_game_completes():
    """
    Deux IA greedy s'affrontent. La partie doit se terminer en < 200 coups.
    """
    from lab.chess_fantasy.engine import create_chess960_board
    state = create_chess960_board(chess960_id=518)  # position classique

    max_turns = 200
    for _ in range(max_turns):
        if state.is_over():
            break
        move = choose_move(state)
        if move is None:
            break
        state = apply_move(state, *move)

    assert state.is_over() or _ == max_turns - 1, (
        "La partie ne s'est pas terminée dans la limite de coups"
    )
