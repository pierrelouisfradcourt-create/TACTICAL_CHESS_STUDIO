"""
Chess Fantasy — runtime minimal (IMP-054)
Modèle : Crown Tactics V1 (ATK/DEF) — source TACTICAL_CHESS_RECOVERY.docx
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import json
import random

Color = str       # 'white' | 'black'
PieceType = str   # 'pawn'|'knight'|'bishop'|'rook'|'queen'|'king'
Square = Tuple[int, int]  # (col, row) 0-indexed, col=0 is a-file, row=0 is rank 1

# Stats par type de pièce — source CT V1 (TACTICAL_CHESS_RECOVERY.docx §4)
PIECE_STATS: Dict[str, Dict] = {
    'pawn':   {'atk': 1, 'def_': 0},
    'knight': {'atk': 2, 'def_': 2},
    'bishop': {'atk': 3, 'def_': 0},
    'rook':   {'atk': 3, 'def_': 2},
    'queen':  {'atk': 4, 'def_': 1},
    'king':   {'atk': 2, 'def_': 2},
}

KING_MAX_HP = 10
KING_PRESSURE_THRESHOLD = 4  # roi hybride — CT V1 §3.2


@dataclass
class Piece:
    piece_type: PieceType
    color: Color
    atk: int
    def_: int
    square: Optional[Square]
    hp: Optional[int] = None  # uniquement pour le roi

    @classmethod
    def create(cls, piece_type: PieceType, color: Color,
               square: Optional[Square] = None) -> 'Piece':
        s = PIECE_STATS[piece_type]
        return cls(
            piece_type=piece_type,
            color=color,
            atk=s['atk'],
            def_=s['def_'],
            square=square,
            hp=KING_MAX_HP if piece_type == 'king' else None,
        )

    def to_dict(self) -> dict:
        d: dict = {
            'piece_type': self.piece_type,
            'color': self.color,
            'atk': self.atk,
            'def': self.def_,
            'square': list(self.square) if self.square else None,
        }
        if self.hp is not None:
            d['hp'] = self.hp
        return d

    @classmethod
    def from_dict(cls, d: dict) -> 'Piece':
        return cls(
            piece_type=d['piece_type'],
            color=d['color'],
            atk=d['atk'],
            def_=d['def'],
            square=tuple(d['square']) if d['square'] else None,
            hp=d.get('hp'),
        )


@dataclass
class Board:
    size: int
    pieces: List[Piece]

    def piece_at(self, sq: Square) -> Optional[Piece]:
        for p in self.pieces:
            if p.square == sq:
                return p
        return None

    def exists(self, sq: Square) -> bool:
        col, row = sq
        return 0 <= col < self.size and 0 <= row < self.size

    def to_dict(self) -> dict:
        return {'size': self.size, 'pieces': [p.to_dict() for p in self.pieces]}

    @classmethod
    def from_dict(cls, d: dict) -> 'Board':
        return cls(size=d['size'], pieces=[Piece.from_dict(p) for p in d['pieces']])


@dataclass
class GameState:
    board: Board
    turn: Color
    move_number: int
    chess960_id: int
    winner: Optional[Color] = None

    def is_over(self) -> bool:
        return self.winner is not None

    def to_dict(self) -> dict:
        return {
            'board': self.board.to_dict(),
            'turn': self.turn,
            'move_number': self.move_number,
            'chess960_id': self.chess960_id,
            'winner': self.winner,
        }

    @classmethod
    def from_dict(cls, d: dict) -> 'GameState':
        return cls(
            board=Board.from_dict(d['board']),
            turn=d['turn'],
            move_number=d['move_number'],
            chess960_id=d['chess960_id'],
            winner=d.get('winner'),
        )

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)

    @classmethod
    def from_json(cls, s: str) -> 'GameState':
        return cls.from_dict(json.loads(s))


def _chess960_back_rank(sp_id: int) -> List[str]:
    """Algo SP-ID officiel Chess 960 — retourne liste 8 types pour rangée arrière."""
    pieces: List[Optional[str]] = [None] * 8
    n = sp_id

    # Fous : 4*4 = 16 combinaisons
    pieces[(n % 4) * 2 + 1] = 'bishop'   # case blanche (col impaire)
    n //= 4
    pieces[(n % 4) * 2] = 'bishop'        # case noire (col paire)
    n //= 4

    # Dame : 6 cases restantes
    empty = [i for i in range(8) if pieces[i] is None]
    pieces[empty[n % 6]] = 'queen'
    n //= 6

    # Cavaliers : C(5,2) = 10 combinaisons
    empty = [i for i in range(8) if pieces[i] is None]
    combos = [(0,1),(0,2),(0,3),(0,4),(1,2),(1,3),(1,4),(2,3),(2,4),(3,4)]
    k1, k2 = combos[n % 10]
    pieces[empty[k1]] = 'knight'
    pieces[empty[k2]] = 'knight'

    # 3 cases restantes : Tour-Roi-Tour (toujours dans cet ordre)
    empty = [i for i in range(8) if pieces[i] is None]
    pieces[empty[0]] = 'rook'
    pieces[empty[1]] = 'king'
    pieces[empty[2]] = 'rook'

    return pieces  # type: ignore[return-value]


def create_chess960_board(chess960_id: Optional[int] = None) -> GameState:
    """Crée un GameState initial Chess 960. SP-ID 518 = position classique."""
    if chess960_id is None:
        chess960_id = random.randint(0, 959)

    back_rank = _chess960_back_rank(chess960_id)
    board_pieces: List[Piece] = []

    for col, pt in enumerate(back_rank):
        board_pieces.append(Piece.create(pt, 'white', (col, 0)))
        board_pieces.append(Piece.create(pt, 'black', (col, 7)))

    for col in range(8):
        board_pieces.append(Piece.create('pawn', 'white', (col, 1)))
        board_pieces.append(Piece.create('pawn', 'black', (col, 6)))

    return GameState(
        board=Board(size=8, pieces=board_pieces),
        turn='white',
        move_number=1,
        chess960_id=chess960_id,
    )
