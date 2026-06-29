"""phi_encoder — encodeur de positions chess vers un vecteur φ de dimension fixe.

IMP-132 (lane IA_APPRENTISSAGE).

Objectif
--------
Produire, à partir d'une position d'échecs, un vecteur φ (phi) de dimension
FIXE composé de scalaires tous normalisés dans [0, 1]. Ce vecteur est conçu
pour être COMPATIBLE avec le SearchTraceSchema du projet : chaque composante
correspond à un descripteur scalaire de position qui existe déjà (sous une
forme ou une autre) dans la structure `TeacherSample` / `SearchTraceSummary`
côté Rust (`src/simulation/teacher_uci_runner.rs`) :

    material_balance      -> φ[1]  (material_balance, normalisé [0,1])
    endgameish / phase    -> φ[3]  (endgame_indicator)
    opening_flag          -> φ[3]  (endgame_indicator, borne basse)
    capture/promotion     -> φ[5]  (tactical : capture_available || promotion_available)
    center_bias_flag      -> φ[6]  (center_control)

Le vecteur φ peut donc être concaténé / aligné avec un enregistrement
SearchTrace au niveau position : ce sont les mêmes concepts, exprimés comme
des scalaires bornés [0,1] (forme attendue pour des features ML).

Conventions reprises du reste de ml/ :
  - l'entrée "position" est une FEN string (cf. dataset_loader.fen_to_tensor,
    adaptive_dataset.phase_from_fen) ; un objet chess.Board est également
    accepté pour confort.
  - parsing via python-chess (`import chess`), comme adaptive_dataset.py.
  - validation à l'entrée : FEN invalide / type inattendu -> ValueError clair
    (même style que dataset_loader : `raise ValueError(f"Invalid FEN: ...")`).

Pur Python + numpy + python-chess. Aucun appel Rust, aucun I/O, aucun réseau,
aucun chargement de modèle.
"""

from __future__ import annotations

from typing import List, Union

import chess
import numpy as np

# --- Constantes ------------------------------------------------------------

# Valeurs matérielles (alignées sur ml/adaptive_dataset.PIECE_VALUES, roi = 0).
PIECE_VALUES = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
    chess.KING: 0,
}

# Matériel non-roi maximal sur l'échiquier (2 camps complets) :
#   8*1 + 2*3 + 2*3 + 2*5 + 1*9 = 39 par camp -> 78 au total.
MAX_NON_KING_MATERIAL = 78.0

# Cases centrales (pour le proxy de contrôle du centre / center_bias_flag).
CENTER_SQUARES = (chess.D4, chess.E4, chess.D5, chess.E5)

# Bornes de saturation (pour garder chaque composante dans [0, 1]).
MATERIAL_BALANCE_SAT = 10.0   # ±10 pions de déséquilibre -> saturation
MOBILITY_SAT = 40.0           # 40 coups légaux -> mobilité 1.0

# Noms ordonnés des composantes du vecteur φ. La dimension est len(...) = 9.
PHI_FEATURE_NAMES: List[str] = [
    "side_to_move",       # 0 : 1.0 = trait aux blancs, 0.0 = trait aux noirs
    "material_balance",   # 1 : 0.5 = équilibre, >0.5 = avantage blanc
    "material_total",     # 2 : matériel non-roi restant (proxy de phase brut)
    "endgame_indicator",  # 3 : 0.0 ouverture, 0.5 milieu, 1.0 finale
    "mobility",           # 4 : nb de coups légaux du camp au trait, normalisé
    "tactical",           # 5 : 1.0 si capture ou promotion dispo (tactical_flag)
    "center_control",     # 6 : fraction des cases centrales attaquées (center_bias)
    "king_safety",        # 7 : bouclier de pions devant le roi au trait
    "castling_rights",    # 8 : droits de roque restants / 4
]

PHI_DIM: int = len(PHI_FEATURE_NAMES)


# --- Helpers internes ------------------------------------------------------

def _coerce_board(position: Union[str, "chess.Board"]) -> chess.Board:
    """Normalise l'entrée en chess.Board ; lève ValueError/TypeError sinon.

    Accepte une FEN string (convention ml/) ou un chess.Board déjà construit.
    """
    if isinstance(position, chess.Board):
        return position
    if not isinstance(position, str):
        raise TypeError(
            f"position must be a FEN string or chess.Board, got {type(position).__name__}"
        )
    fen = position.strip()
    if not fen:
        raise ValueError("Invalid FEN: empty string")
    try:
        board = chess.Board(fen)
    except ValueError as exc:
        raise ValueError(f"Invalid FEN: {position!r} ({exc})") from exc
    return board


def _material_for(board: chess.Board, color: chess.Color) -> int:
    return sum(
        PIECE_VALUES[piece.piece_type]
        for piece in board.piece_map().values()
        if piece.color == color
    )


def _phase_indicator(board: chess.Board) -> float:
    """0.0 ouverture, 0.5 milieu, 1.0 finale (logique alignée phase_from_fen)."""
    fullmove = int(board.fullmove_number)
    non_king_pieces = sum(
        1 for piece in board.piece_map().values() if piece.piece_type != chess.KING
    )
    queens = len(board.pieces(chess.QUEEN, chess.WHITE)) + len(
        board.pieces(chess.QUEEN, chess.BLACK)
    )
    material_total = _material_for(board, chess.WHITE) + _material_for(board, chess.BLACK)

    # Pièces mineures non développées (proxy ouverture).
    home = {
        (chess.B1, chess.KNIGHT, chess.WHITE),
        (chess.G1, chess.KNIGHT, chess.WHITE),
        (chess.C1, chess.BISHOP, chess.WHITE),
        (chess.F1, chess.BISHOP, chess.WHITE),
        (chess.B8, chess.KNIGHT, chess.BLACK),
        (chess.G8, chess.KNIGHT, chess.BLACK),
        (chess.C8, chess.BISHOP, chess.BLACK),
        (chess.F8, chess.BISHOP, chess.BLACK),
    }
    undeveloped = sum(
        1
        for sq, ptype, color in home
        if board.piece_at(sq) == chess.Piece(ptype, color)
    )

    # Signal matériel fort : une finale reste une finale quel que soit le
    # numéro de coup (un KP vs K à fullmove 1 est une finale, pas une
    # ouverture). On le teste donc AVANT l'heuristique d'ouverture.
    if material_total <= 20 or non_king_pieces <= 10:
        return 1.0
    if fullmove <= 12 or undeveloped >= 3:
        return 0.0
    if queens == 0:
        return 1.0
    return 0.5


def _tactical_available(board: chess.Board) -> float:
    """1.0 si au moins un coup légal est une capture ou une promotion."""
    for move in board.legal_moves:
        if move.promotion is not None or board.is_capture(move):
            return 1.0
    return 0.0


def _center_control(board: chess.Board) -> float:
    """Fraction des 4 cases centrales attaquées par le camp au trait."""
    side = board.turn
    attacked = sum(1 for sq in CENTER_SQUARES if board.is_attacked_by(side, sq))
    return attacked / float(len(CENTER_SQUARES))


def _king_safety(board: chess.Board) -> float:
    """Bouclier de pions amis devant le roi au trait, normalisé [0,1].

    Compte les pions amis sur les 3 cases situées un rang devant le roi
    (colonnes roi-1, roi, roi+1). 0 pion -> 0.0 (roi exposé), 3 -> 1.0.
    """
    side = board.turn
    king_sq = board.king(side)
    if king_sq is None:  # position dégénérée (test/synthétique) : neutre.
        return 0.5

    file_idx = chess.square_file(king_sq)
    rank_idx = chess.square_rank(king_sq)
    forward = 1 if side == chess.WHITE else -1
    shield_rank = rank_idx + forward
    if shield_rank < 0 or shield_rank > 7:
        return 0.0  # roi sur la dernière rangée, pas de bouclier devant.

    shield = 0
    for df in (-1, 0, 1):
        f = file_idx + df
        if 0 <= f <= 7:
            sq = chess.square(f, shield_rank)
            piece = board.piece_at(sq)
            if piece is not None and piece.piece_type == chess.PAWN and piece.color == side:
                shield += 1
    return shield / 3.0


def _castling_rights(board: chess.Board) -> float:
    count = 0
    count += int(board.has_kingside_castling_rights(chess.WHITE))
    count += int(board.has_queenside_castling_rights(chess.WHITE))
    count += int(board.has_kingside_castling_rights(chess.BLACK))
    count += int(board.has_queenside_castling_rights(chess.BLACK))
    return count / 4.0


def _clamp01(value: float) -> float:
    return float(min(1.0, max(0.0, value)))


# --- API publique ----------------------------------------------------------

def encode(position: Union[str, "chess.Board"]) -> np.ndarray:
    """Encode une position en vecteur φ de dimension fixe PHI_DIM (=9).

    Args:
        position: FEN string (convention ml/) ou chess.Board.

    Returns:
        np.ndarray dtype float32, shape (PHI_DIM,), chaque composante dans [0,1].
        L'ordre des composantes suit PHI_FEATURE_NAMES.

    Raises:
        TypeError: si `position` n'est ni str ni chess.Board.
        ValueError: si la FEN est vide ou invalide.
    """
    board = _coerce_board(position)

    # 0 : trait
    side_to_move = 1.0 if board.turn == chess.WHITE else 0.0

    # 1 : équilibre matériel (0.5 = égal, >0.5 = blanc devant)
    diff = _material_for(board, chess.WHITE) - _material_for(board, chess.BLACK)
    material_balance = 0.5 + (
        max(-MATERIAL_BALANCE_SAT, min(MATERIAL_BALANCE_SAT, diff))
        / (2.0 * MATERIAL_BALANCE_SAT)
    )

    # 2 : matériel total non-roi restant (proxy de phase brut)
    material_total = (
        _material_for(board, chess.WHITE) + _material_for(board, chess.BLACK)
    ) / MAX_NON_KING_MATERIAL

    # 3 : indicateur de phase discret
    endgame_indicator = _phase_indicator(board)

    # 4 : mobilité du camp au trait
    mobility = board.legal_moves.count() / MOBILITY_SAT

    # 5 : tactique disponible
    tactical = _tactical_available(board)

    # 6 : contrôle du centre
    center_control = _center_control(board)

    # 7 : sécurité du roi au trait
    king_safety = _king_safety(board)

    # 8 : droits de roque restants
    castling_rights = _castling_rights(board)

    phi = np.array(
        [
            _clamp01(side_to_move),
            _clamp01(material_balance),
            _clamp01(material_total),
            _clamp01(endgame_indicator),
            _clamp01(mobility),
            _clamp01(tactical),
            _clamp01(center_control),
            _clamp01(king_safety),
            _clamp01(castling_rights),
        ],
        dtype=np.float32,
    )
    return phi


def feature_dict(position: Union[str, "chess.Board"]) -> dict:
    """Variante nommée : retourne {nom_feature: valeur} (debug / inspection)."""
    phi = encode(position)
    return {name: float(value) for name, value in zip(PHI_FEATURE_NAMES, phi)}


if __name__ == "__main__":  # démo manuelle, pas d'I/O fichier
    start = chess.STARTING_FEN
    print(f"PHI_DIM = {PHI_DIM}")
    print(f"features = {PHI_FEATURE_NAMES}")
    print("start position phi =", encode(start).tolist())
