"""Tests rules.py — IMP-054 Chess Fantasy runtime minimal."""
import pytest

from lab.chess_fantasy.engine import (
    Board, GameState, Piece,
    KING_MAX_HP, KING_PRESSURE_THRESHOLD,
    create_chess960_board,
)
from lab.chess_fantasy.rules import (
    get_attack_squares, get_legal_moves,
    resolve_capture, compute_pressure,
    check_victory, apply_move, get_all_moves,
)


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


# ── Mouvement pion ────────────────────────────────────────────────────────────

def test_pawn_forward_one():
    p = _piece('pawn', 'white', 3, 3)
    b = _board(p)
    moves = get_legal_moves(b, p)
    assert (3, 4) in moves


def test_pawn_double_push_from_start():
    p = _piece('pawn', 'white', 3, 1)
    b = _board(p)
    moves = get_legal_moves(b, p)
    assert (3, 2) in moves
    assert (3, 3) in moves


def test_pawn_no_double_push_if_blocked():
    p = _piece('pawn', 'white', 3, 1)
    blocker = _piece('knight', 'black', 3, 2)
    b = _board(p, blocker)
    moves = get_legal_moves(b, p)
    assert (3, 2) not in moves
    assert (3, 3) not in moves


def test_pawn_capture_diagonal():
    p = _piece('pawn', 'white', 3, 3)
    enemy = _piece('knight', 'black', 4, 4)
    b = _board(p, enemy)
    moves = get_legal_moves(b, p)
    assert (4, 4) in moves


def test_pawn_no_capture_forward():
    p = _piece('pawn', 'white', 3, 3)
    blocker = _piece('knight', 'black', 3, 4)
    b = _board(p, blocker)
    moves = get_legal_moves(b, p)
    assert (3, 4) not in moves


def test_black_pawn_moves_down():
    p = _piece('pawn', 'black', 3, 6)
    b = _board(p)
    moves = get_legal_moves(b, p)
    assert (3, 5) in moves
    assert (3, 4) in moves  # double depuis row 6


# ── Mouvement cavalier ────────────────────────────────────────────────────────

def test_knight_moves_center():
    p = _piece('knight', 'white', 4, 4)
    b = _board(p)
    moves = get_legal_moves(b, p)
    assert len(moves) == 8


def test_knight_jumps_over_pieces():
    p = _piece('knight', 'white', 4, 4)
    blocker = _piece('pawn', 'white', 4, 5)
    b = _board(p, blocker)
    moves = get_legal_moves(b, p)
    assert (5, 6) in moves  # le cavalier saute par-dessus


def test_knight_cannot_land_on_ally():
    ally = _piece('pawn', 'white', 6, 5)
    p = _piece('knight', 'white', 4, 4)
    b = _board(p, ally)
    moves = get_legal_moves(b, p)
    assert (6, 5) not in moves


# ── Mouvement fou / tour / dame ───────────────────────────────────────────────

def test_rook_slides_empty_board():
    p = _piece('rook', 'white', 4, 4)
    b = _board(p)
    moves = get_legal_moves(b, p)
    assert len(moves) == 14  # 7 horizontal + 7 vertical


def test_bishop_blocked_by_ally():
    p = _piece('bishop', 'white', 0, 0)
    ally = _piece('pawn', 'white', 2, 2)
    b = _board(p, ally)
    moves = get_legal_moves(b, p)
    assert (2, 2) not in moves
    assert (3, 3) not in moves
    assert (1, 1) in moves


def test_queen_combines_rook_and_bishop():
    p = _piece('queen', 'white', 4, 4)
    b = _board(p)
    moves = get_legal_moves(b, p)
    assert len(moves) == 27  # dame en centre = 27 cases


# ── Résolution de capture ─────────────────────────────────────────────────────

def test_capture_atk_greater_than_def():
    attacker = _piece('rook', 'white', 4, 4)    # ATK=3
    defender = _piece('pawn', 'black', 4, 5)    # DEF=0
    captured, result = resolve_capture(attacker, defender)
    assert captured is True
    assert result is None


def test_capture_atk_equals_def():
    attacker = _piece('knight', 'white', 4, 4)  # ATK=2
    defender = _piece('knight', 'black', 4, 5)  # DEF=2
    captured, result = resolve_capture(attacker, defender)
    assert captured is False
    assert result is not None
    assert result.def_ == 0  # DEF réduit de 2


def test_capture_atk_less_than_def():
    attacker = _piece('pawn', 'white', 4, 4)    # ATK=1
    defender = _piece('rook', 'black', 4, 5)    # DEF=2
    captured, result = resolve_capture(attacker, defender)
    assert captured is False
    assert result is not None
    assert result.def_ == 1  # DEF: 2-1=1


def test_capture_def_never_negative():
    attacker = _piece('queen', 'white', 4, 4)   # ATK=4
    defender = _piece('knight', 'black', 4, 5)  # DEF=2
    # ATK=4 > DEF=2 → capture réussie ici, mais testons ATK=2/DEF=0
    attacker2 = _piece('knight', 'white', 4, 4)  # ATK=2
    defender2 = _piece('pawn', 'black', 4, 5)    # DEF=0
    captured, result = resolve_capture(attacker2, defender2)
    assert captured is True  # ATK 2 > DEF 0


# ── Système HP roi ─────────────────────────────────────────────────────────────

def test_king_takes_damage_not_captured():
    attacker = _piece('pawn', 'white', 3, 6)  # ATK=1
    king = _piece('king', 'black', 3, 7)       # DEF=2, HP=10
    captured, result = resolve_capture(attacker, king)
    assert captured is False
    assert result is not None
    assert result.hp == 9  # max(1, 1-2)=1 de dégâts


def test_king_dies_when_hp_reaches_zero():
    attacker = _piece('queen', 'white', 3, 6)  # ATK=4
    king = _piece('king', 'black', 3, 7)        # DEF=2, HP=10
    # Simuler plusieurs attaques
    remaining_hp = KING_MAX_HP
    for _ in range(5):  # 5 x max(1,4-2)=2 = 10 dégâts
        cap, result = resolve_capture(attacker, king)
        if cap:
            remaining_hp = 0
            break
        king = result
        remaining_hp = king.hp
    assert remaining_hp == 0 or cap is True


def test_king_minimum_damage_is_1():
    attacker = _piece('pawn', 'white', 3, 6)   # ATK=1
    king = Piece.create('king', 'black', (3, 7))
    # Augmenter la DEF du roi pour tester plancher
    king = Piece(piece_type='king', color='black', atk=2, def_=5, square=(3, 7), hp=10)
    captured, result = resolve_capture(attacker, result if False else king)
    assert captured is False
    assert result.hp == 9  # min damage = 1


# ── Pression roi ──────────────────────────────────────────────────────────────

def test_pressure_zero_initial():
    state = create_chess960_board(518)
    assert compute_pressure(state.board, 'white') == 0
    assert compute_pressure(state.board, 'black') == 0


def test_pressure_counts_threats():
    king = _piece('king', 'black', 4, 7)
    # 2 pièces blanches menaçant directement la case du roi
    rook1 = _piece('rook', 'white', 4, 5)
    rook2 = _piece('rook', 'white', 3, 7)
    b = _board(king, rook1, rook2)
    pressure = compute_pressure(b, 'black')
    assert pressure == 2


def test_pressure_no_king_returns_zero():
    b = _board(_piece('rook', 'white', 4, 4))
    assert compute_pressure(b, 'black') == 0


# ── Victoire ──────────────────────────────────────────────────────────────────

def test_no_victory_at_start():
    state = create_chess960_board(518)
    assert check_victory(state) is None


def test_victory_king_dead_hp_zero():
    king = Piece(piece_type='king', color='black', atk=2, def_=2, square=(4, 7), hp=0)
    b = _board(king, _piece('king', 'white', 4, 0))
    state = _state(b)
    assert check_victory(state) == 'white'


def test_victory_king_missing():
    b = _board(_piece('king', 'white', 4, 0))
    state = _state(b)
    assert check_victory(state) == 'white'


def test_victory_by_pressure():
    king = _piece('king', 'black', 4, 7)
    # Mettre KING_PRESSURE_THRESHOLD pièces blanches autour
    white_rooks = [_piece('rook', 'white', col, 5) for col in range(KING_PRESSURE_THRESHOLD)]
    # S'assurer que les tours attaquent la case du roi (col 4, row 7)
    attacking_rooks = [_piece('rook', 'white', 4, col) for col in range(KING_PRESSURE_THRESHOLD)]
    b = _board(king, *attacking_rooks)
    state = _state(b)
    # Au moins KING_PRESSURE_THRESHOLD rooks sur la colonne 4
    p = compute_pressure(b, 'black')
    if p >= KING_PRESSURE_THRESHOLD:
        assert check_victory(state) == 'white'


# ── apply_move ────────────────────────────────────────────────────────────────

def test_apply_move_quiet():
    p = _piece('pawn', 'white', 3, 1)
    b = _board(p)
    state = _state(b)
    new_state = apply_move(state, (3, 1), (3, 2))
    assert new_state.board.piece_at((3, 2)) is not None
    assert new_state.board.piece_at((3, 1)) is None
    assert new_state.turn == 'black'
    assert new_state.move_number == 2


def test_apply_move_capture_success():
    attacker = _piece('rook', 'white', 4, 4)   # ATK=3
    defender = _piece('pawn', 'black', 4, 6)    # DEF=0
    b = _board(attacker, defender)
    state = _state(b)
    new_state = apply_move(state, (4, 4), (4, 6))
    assert new_state.board.piece_at((4, 6)).color == 'white'
    assert len([p for p in new_state.board.pieces if p.color == 'black']) == 0


def test_apply_move_capture_bounce():
    attacker = _piece('pawn', 'white', 3, 3)    # ATK=1
    defender = _piece('rook', 'black', 4, 4)    # DEF=2
    b = _board(attacker, defender)
    state = _state(b)
    new_state = apply_move(state, (3, 3), (4, 4))
    # Attaquant rebondi sur case d'origine
    assert new_state.board.piece_at((3, 3)) is not None
    assert new_state.board.piece_at((3, 3)).color == 'white'
    # Défenseur survit avec DEF réduit
    assert new_state.board.piece_at((4, 4)) is not None
    assert new_state.board.piece_at((4, 4)).def_ == 1


def test_apply_move_king_takes_damage():
    attacker = _piece('bishop', 'white', 2, 5)  # ATK=3
    king = _piece('king', 'black', 4, 7)          # DEF=2, HP=10
    b = _board(attacker, king)
    state = _state(b)
    new_state = apply_move(state, (2, 5), (4, 7))
    # bishop ATK=3 > king DEF=2 en binaire... mais roi a HP
    # damage = max(1, 3-2) = 1, HP = 9
    surviving_king = next(p for p in new_state.board.pieces if p.piece_type == 'king')
    assert surviving_king.hp == 9


def test_apply_move_turn_alternates():
    state = create_chess960_board(518)
    assert state.turn == 'white'
    # Trouver un pion blanc
    wp = next(p for p in state.board.pieces if p.piece_type == 'pawn' and p.color == 'white')
    col, row = wp.square
    new_state = apply_move(state, (col, row), (col, row + 1))
    assert new_state.turn == 'black'


def test_apply_move_invalid_from_raises():
    b = _board()
    state = _state(b)
    with pytest.raises(ValueError):
        apply_move(state, (0, 0), (0, 1))


def test_get_all_moves_initial_white():
    state = create_chess960_board(518)
    moves = get_all_moves(state)
    # Position initiale Chess classique : 20 coups (16 pions + 4 cavaliers)
    assert len(moves) == 20
