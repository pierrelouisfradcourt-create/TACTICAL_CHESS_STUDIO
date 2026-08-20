"""
Chess Fantasy — règles de mouvement et résolution de combat (IMP-054)

Système de capture (CT V1 simplifié) :
  - Pièces régulières : ATK > DEF → capture ; ATK <= DEF → pièce survit, DEF -= ATK
  - Roi : dégâts = max(1, ATK_attaquant - DEF_roi), HP -= dégâts, HP=0 → mort
Victoire :
  - HP roi = 0  OU  pression roi >= KING_PRESSURE_THRESHOLD
"""
from __future__ import annotations
import copy
from typing import List, Optional, Tuple

from .engine import (
    Board, GameState, Piece, Square,
    KING_PRESSURE_THRESHOLD, Color,
)

Move = Tuple[Square, Square]


# ─── helpers internes ────────────────────────────────────────────────────────

def _slides(board: Board, piece: Piece,
            directions: List[Tuple[int, int]]) -> List[Square]:
    targets: List[Square] = []
    col, row = piece.square  # type: ignore[misc]
    for dc, dr in directions:
        c, r = col + dc, row + dr
        while board.exists((c, r)):
            occ = board.piece_at((c, r))
            if occ is None:
                targets.append((c, r))
            elif occ.color != piece.color:
                targets.append((c, r))
                break
            else:
                break
            c += dc
            r += dr
    return targets


# ─── API publique ─────────────────────────────────────────────────────────────

def get_attack_squares(board: Board, piece: Piece) -> List[Square]:
    """Cases qu'une pièce menace (pour calcul de pression / ligne de vue)."""
    if piece.square is None:
        return []
    col, row = piece.square

    if piece.piece_type == 'pawn':
        d = 1 if piece.color == 'white' else -1
        return [sq for sq in [(col - 1, row + d), (col + 1, row + d)]
                if board.exists(sq)]

    if piece.piece_type == 'knight':
        offs = [(-2,-1),(-2,1),(-1,-2),(-1,2),(1,-2),(1,2),(2,-1),(2,1)]
        return [(col+dc, row+dr) for dc,dr in offs if board.exists((col+dc,row+dr))]

    if piece.piece_type == 'bishop':
        return _slides(board, piece, [(-1,-1),(-1,1),(1,-1),(1,1)])

    if piece.piece_type == 'rook':
        return _slides(board, piece, [(0,1),(0,-1),(1,0),(-1,0)])

    if piece.piece_type == 'queen':
        dirs = [(-1,-1),(-1,1),(1,-1),(1,1),(0,1),(0,-1),(1,0),(-1,0)]
        return _slides(board, piece, dirs)

    if piece.piece_type == 'king':
        result = []
        for dc in (-1, 0, 1):
            for dr in (-1, 0, 1):
                if dc == 0 and dr == 0:
                    continue
                sq = (col + dc, row + dr)
                if board.exists(sq):
                    occ = board.piece_at(sq)
                    if occ is None or occ.color != piece.color:
                        result.append(sq)
        return result

    return []


def get_legal_moves(board: Board, piece: Piece) -> List[Square]:
    """Toutes les cases accessibles pour une pièce (mouvements + captures)."""
    if piece.square is None:
        return []
    col, row = piece.square

    if piece.piece_type == 'pawn':
        d = 1 if piece.color == 'white' else -1
        start_row = 1 if piece.color == 'white' else 6
        moves: List[Square] = []
        fwd = (col, row + d)
        if board.exists(fwd) and board.piece_at(fwd) is None:
            moves.append(fwd)
            fwd2 = (col, row + 2 * d)
            if row == start_row and board.exists(fwd2) and board.piece_at(fwd2) is None:
                moves.append(fwd2)
        for dc in (-1, 1):
            diag = (col + dc, row + d)
            if board.exists(diag):
                occ = board.piece_at(diag)
                if occ is not None and occ.color != piece.color:
                    moves.append(diag)
        return moves

    if piece.piece_type == 'knight':
        offs = [(-2,-1),(-2,1),(-1,-2),(-1,2),(1,-2),(1,2),(2,-1),(2,1)]
        return [
            (col+dc, row+dr) for dc,dr in offs
            if board.exists((col+dc, row+dr))
            and (board.piece_at((col+dc, row+dr)) is None
                 or board.piece_at((col+dc, row+dr)).color != piece.color)
        ]

    if piece.piece_type in ('bishop', 'rook', 'queen'):
        dirs = []
        if piece.piece_type in ('bishop', 'queen'):
            dirs += [(-1,-1),(-1,1),(1,-1),(1,1)]
        if piece.piece_type in ('rook', 'queen'):
            dirs += [(0,1),(0,-1),(1,0),(-1,0)]
        return _slides(board, piece, dirs)

    if piece.piece_type == 'king':
        return get_attack_squares(board, piece)

    return []


def resolve_capture(attacker: Piece,
                    defender: Piece) -> Tuple[bool, Optional[Piece]]:
    """
    Résout un combat ATK vs DEF.

    Pièces régulières :
      ATK > DEF  → capture réussie     (True,  None)
      ATK <= DEF → rebond, DEF réduit  (False, defender_modifié)

    Roi (HP system CT V1) :
      dégâts = max(1, ATK - DEF_roi)
      HP roi -= dégâts
      HP <= 0 → mort                   (True,  None)
      HP > 0  → roi blessé             (False, roi_modifié)
    """
    if defender.piece_type == 'king':
        damage = max(1, attacker.atk - defender.def_)
        new_hp = (defender.hp or 0) - damage
        if new_hp <= 0:
            return True, None
        updated = Piece(
            piece_type=defender.piece_type,
            color=defender.color,
            atk=defender.atk,
            def_=defender.def_,
            square=defender.square,
            hp=new_hp,
        )
        return False, updated

    # Pièce régulière — binaire
    if attacker.atk > defender.def_:
        return True, None
    new_def = max(0, defender.def_ - attacker.atk)
    updated = Piece(
        piece_type=defender.piece_type,
        color=defender.color,
        atk=defender.atk,
        def_=new_def,
        square=defender.square,
        hp=None,
    )
    return False, updated


def compute_pressure(board: Board, king_color: Color) -> int:
    """Nombre de pièces ennemies menaçant directement la case du roi."""
    king = next(
        (p for p in board.pieces
         if p.piece_type == 'king' and p.color == king_color and p.square is not None),
        None,
    )
    if king is None:
        return 0
    enemy = 'black' if king_color == 'white' else 'white'
    return sum(
        1 for p in board.pieces
        if p.color == enemy and p.square is not None
        and king.square in get_attack_squares(board, p)
    )


def check_victory(state: GameState) -> Optional[Color]:
    """
    Retourne la couleur gagnante si :
    - Le roi adverse n'est plus sur le plateau
    - Le roi adverse a HP <= 0
    - La pression sur le roi adverse >= KING_PRESSURE_THRESHOLD
    """
    for color in ('white', 'black'):
        enemy = 'black' if color == 'white' else 'white'
        king = next(
            (p for p in state.board.pieces
             if p.piece_type == 'king' and p.color == enemy),
            None,
        )
        if king is None:
            return color
        if king.hp is not None and king.hp <= 0:
            return color
        if compute_pressure(state.board, enemy) >= KING_PRESSURE_THRESHOLD:
            return color
    return None


def apply_move(state: GameState, from_sq: Square, to_sq: Square) -> GameState:
    """
    Applique un mouvement et retourne un nouveau GameState.
    Gère : mouvement silencieux, capture réussie, rebond (ATK <= DEF).
    """
    new_board = copy.deepcopy(state.board)
    attacker = new_board.piece_at(from_sq)
    if attacker is None:
        raise ValueError(f"Aucune pièce en {from_sq}")

    defender = new_board.piece_at(to_sq)

    # Retirer l'attaquant de sa case d'origine
    new_board.pieces = [p for p in new_board.pieces if p.square != from_sq]

    if defender is not None:
        captured, updated_defender = resolve_capture(attacker, defender)
        new_board.pieces = [p for p in new_board.pieces if p.square != to_sq]

        if captured:
            # L'attaquant prend la case
            moved = copy.deepcopy(attacker)
            moved.square = to_sq
            new_board.pieces.append(moved)
        else:
            # Rebond : l'attaquant revient sur sa case
            bounced = copy.deepcopy(attacker)
            bounced.square = from_sq
            new_board.pieces.append(bounced)
            if updated_defender is not None:
                new_board.pieces.append(updated_defender)
    else:
        # Mouvement silencieux
        moved = copy.deepcopy(attacker)
        moved.square = to_sq
        new_board.pieces.append(moved)

    next_turn: Color = 'black' if state.turn == 'white' else 'white'
    new_state = GameState(
        board=new_board,
        turn=next_turn,
        move_number=state.move_number + 1,
        chess960_id=state.chess960_id,
        winner=None,
    )
    new_state.winner = check_victory(new_state)
    return new_state


def get_all_moves(state: GameState) -> List[Move]:
    """Tous les mouvements légaux du joueur courant."""
    moves: List[Move] = []
    for piece in state.board.pieces:
        if piece.color == state.turn and piece.square is not None:
            for dest in get_legal_moves(state.board, piece):
                moves.append((piece.square, dest))
    return moves
