"""Tests engine.py — IMP-054 Chess Fantasy runtime minimal."""
import json
import pytest

from lab.chess_fantasy.engine import (
    Piece, Board, GameState,
    PIECE_STATS, KING_MAX_HP,
    create_chess960_board, _chess960_back_rank,
)


# ── Piece ─────────────────────────────────────────────────────────────────────

def test_piece_create_pawn():
    p = Piece.create('pawn', 'white', (0, 1))
    assert p.piece_type == 'pawn'
    assert p.color == 'white'
    assert p.atk == PIECE_STATS['pawn']['atk']
    assert p.def_ == PIECE_STATS['pawn']['def_']
    assert p.hp is None


def test_piece_create_king_has_hp():
    k = Piece.create('king', 'black', (4, 7))
    assert k.hp == KING_MAX_HP
    assert k.atk == 2
    assert k.def_ == 2


def test_piece_regular_no_hp():
    for pt in ('pawn', 'knight', 'bishop', 'rook', 'queen'):
        p = Piece.create(pt, 'white')
        assert p.hp is None, f"{pt} ne devrait pas avoir de HP"


def test_piece_stats_all_types():
    expected = {
        'pawn':   (1, 0),
        'knight': (2, 2),
        'bishop': (3, 0),
        'rook':   (3, 2),
        'queen':  (4, 1),
        'king':   (2, 2),
    }
    for pt, (atk, def_) in expected.items():
        p = Piece.create(pt, 'white')
        assert p.atk == atk, f"{pt} ATK"
        assert p.def_ == def_, f"{pt} DEF"


def test_piece_to_dict_roundtrip():
    p = Piece.create('rook', 'black', (7, 7))
    d = p.to_dict()
    p2 = Piece.from_dict(d)
    assert p2.piece_type == 'rook'
    assert p2.color == 'black'
    assert p2.square == (7, 7)
    assert p2.hp is None


def test_piece_king_to_dict_roundtrip():
    k = Piece.create('king', 'white', (4, 0))
    d = k.to_dict()
    assert 'hp' in d
    assert d['hp'] == KING_MAX_HP
    k2 = Piece.from_dict(d)
    assert k2.hp == KING_MAX_HP


def test_piece_from_dict_no_hp_field():
    d = {'piece_type': 'pawn', 'color': 'white', 'atk': 1, 'def': 0, 'square': [3, 1]}
    p = Piece.from_dict(d)
    assert p.hp is None


def test_piece_square_none_serialization():
    p = Piece.create('queen', 'black', None)
    d = p.to_dict()
    assert d['square'] is None
    p2 = Piece.from_dict(d)
    assert p2.square is None


# ── Board ─────────────────────────────────────────────────────────────────────

def test_board_piece_at_finds_piece():
    p = Piece.create('knight', 'white', (1, 0))
    b = Board(size=8, pieces=[p])
    assert b.piece_at((1, 0)) is p


def test_board_piece_at_empty_square():
    b = Board(size=8, pieces=[])
    assert b.piece_at((3, 3)) is None


def test_board_exists_valid():
    b = Board(size=8, pieces=[])
    assert b.exists((0, 0))
    assert b.exists((7, 7))
    assert b.exists((4, 4))


def test_board_exists_out_of_bounds():
    b = Board(size=8, pieces=[])
    assert not b.exists((-1, 0))
    assert not b.exists((8, 0))
    assert not b.exists((0, 8))


def test_board_to_dict_roundtrip():
    pieces = [Piece.create('pawn', 'white', (col, 1)) for col in range(8)]
    b = Board(size=8, pieces=pieces)
    d = b.to_dict()
    b2 = Board.from_dict(d)
    assert b2.size == 8
    assert len(b2.pieces) == 8
    assert b2.pieces[0].piece_type == 'pawn'


# ── GameState ─────────────────────────────────────────────────────────────────

def test_gamestate_json_roundtrip():
    state = create_chess960_board(518)
    j = state.to_json()
    state2 = GameState.from_json(j)
    assert state2.chess960_id == 518
    assert state2.turn == 'white'
    assert state2.move_number == 1
    assert state2.winner is None
    assert len(state2.board.pieces) == 32


def test_gamestate_is_over_false():
    state = create_chess960_board(518)
    assert not state.is_over()


def test_gamestate_is_over_true():
    state = create_chess960_board(518)
    state.winner = 'white'
    assert state.is_over()


# ── Chess 960 board factory ───────────────────────────────────────────────────

def test_chess960_518_is_standard_position():
    back = _chess960_back_rank(518)
    # SP-ID 518 = position classique RNBQKBNR
    assert back[0] == 'rook'
    assert back[4] == 'king'
    assert back[7] == 'rook'
    assert back[3] == 'queen'
    assert back[1] == 'knight'
    assert back[6] == 'knight'
    assert back[2] == 'bishop'
    assert back[5] == 'bishop'


def test_chess960_board_has_32_pieces():
    state = create_chess960_board(518)
    assert len(state.board.pieces) == 32


def test_chess960_board_has_both_kings():
    state = create_chess960_board(518)
    kings = [p for p in state.board.pieces if p.piece_type == 'king']
    assert len(kings) == 2
    colors = {k.color for k in kings}
    assert colors == {'white', 'black'}


def test_chess960_board_kings_have_hp():
    state = create_chess960_board(518)
    for k in (p for p in state.board.pieces if p.piece_type == 'king'):
        assert k.hp == KING_MAX_HP


def test_chess960_board_has_16_pawns():
    state = create_chess960_board(518)
    pawns = [p for p in state.board.pieces if p.piece_type == 'pawn']
    assert len(pawns) == 16


def test_chess960_different_ids_give_different_positions():
    b1 = create_chess960_board(0)
    b2 = create_chess960_board(959)
    types1 = [p.piece_type for p in sorted(b1.board.pieces, key=lambda p: p.square or (0,0)) if p.color == 'white' and p.piece_type != 'pawn']
    types2 = [p.piece_type for p in sorted(b2.board.pieces, key=lambda p: p.square or (0,0)) if p.color == 'white' and p.piece_type != 'pawn']
    assert types1 != types2


def test_chess960_back_rank_king_between_rooks():
    for sp_id in (0, 100, 518, 750, 959):
        back = _chess960_back_rank(sp_id)
        assert len(back) == 8
        king_col = back.index('king')
        rook_cols = [i for i, p in enumerate(back) if p == 'rook']
        assert len(rook_cols) == 2
        # Le roi est entre les deux tours (gauche < roi < droite)
        assert rook_cols[0] < king_col < rook_cols[1]
