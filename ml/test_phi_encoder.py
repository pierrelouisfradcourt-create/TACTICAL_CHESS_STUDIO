"""Tests pour ml/phi_encoder.py (IMP-132).

Hermétique : pas de réseau, pas de chargement de modèle, pas d'I/O fichier.
"""

import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent))

from phi_encoder import PHI_DIM, PHI_FEATURE_NAMES, encode, feature_dict

# Positions de test (FEN) -----------------------------------------------------
# Position initiale standard.
INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
# Position tactique : milieu de partie style italienne, captures disponibles.
TACTICAL_FEN = "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4"
# Position finale : roi + pion contre roi (finale élémentaire).
ENDGAME_FEN = "8/8/8/4k3/8/4K3/4P3/8 w - - 0 1"


def _assert_valid_phi(phi):
    assert isinstance(phi, np.ndarray), "encode doit retourner un np.ndarray"
    assert phi.dtype == np.float32
    assert phi.ndim == 1
    assert phi.shape == (PHI_DIM,), f"dimension fixe attendue {PHI_DIM}, got {phi.shape}"
    assert PHI_DIM >= 7, "le vecteur φ doit comporter au moins 7 scalaires"
    assert np.all(np.isfinite(phi)), "aucune valeur NaN/inf autorisée"
    assert float(phi.min()) >= 0.0, "toutes les composantes doivent être >= 0"
    assert float(phi.max()) <= 1.0, "toutes les composantes doivent être <= 1"


# Les 3 cas requis par le charter ---------------------------------------------

def test_initial_position():
    phi = encode(INITIAL_FEN)
    _assert_valid_phi(phi)
    feats = feature_dict(INITIAL_FEN)
    # Trait aux blancs, équilibre matériel parfait, tous les roques dispo.
    assert feats["side_to_move"] == 1.0
    assert feats["material_balance"] == pytest.approx(0.5)
    assert feats["castling_rights"] == pytest.approx(1.0)
    assert feats["endgame_indicator"] == 0.0  # ouverture


def test_tactical_position():
    phi = encode(TACTICAL_FEN)
    _assert_valid_phi(phi)
    feats = feature_dict(TACTICAL_FEN)
    # Des captures sont disponibles (exd5/exf5...) -> flag tactique actif.
    assert feats["tactical"] == 1.0


def test_endgame_position():
    phi = encode(ENDGAME_FEN)
    _assert_valid_phi(phi)
    feats = feature_dict(ENDGAME_FEN)
    # Très peu de matériel -> indicateur de finale au maximum.
    assert feats["endgame_indicator"] == 1.0
    # Avantage matériel blanc (un pion de plus).
    assert feats["material_balance"] > 0.5


# Robustesse / dimension fixe -------------------------------------------------

def test_fixed_dimension_across_positions():
    shapes = {encode(f).shape for f in (INITIAL_FEN, TACTICAL_FEN, ENDGAME_FEN)}
    assert shapes == {(PHI_DIM,)}, "la dimension doit être identique pour toute position"


def test_accepts_chess_board_object():
    import chess

    board = chess.Board(INITIAL_FEN)
    phi = encode(board)
    _assert_valid_phi(phi)
    # Doit donner le même résultat que la FEN équivalente.
    np.testing.assert_array_equal(phi, encode(INITIAL_FEN))


def test_checkmate_position_no_legal_moves():
    # Mat du berger : aucun coup légal -> mobilité 0, tactique 0, pas d'erreur.
    mate_fen = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"
    phi = encode(mate_fen)
    _assert_valid_phi(phi)
    feats = feature_dict(mate_fen)
    assert feats["mobility"] == 0.0
    assert feats["tactical"] == 0.0


def test_feature_names_match_dim():
    assert len(PHI_FEATURE_NAMES) == PHI_DIM


# Cas limites / entrées invalides ---------------------------------------------

def test_empty_string_raises():
    with pytest.raises(ValueError):
        encode("")
    with pytest.raises(ValueError):
        encode("   ")


def test_invalid_fen_raises():
    with pytest.raises(ValueError):
        encode("not a real fen")
    with pytest.raises(ValueError):
        encode("8/8/8/8/8/8/8/8 w - - 0 1 garbage extra zzz")


def test_wrong_type_raises():
    with pytest.raises(TypeError):
        encode(12345)
    with pytest.raises(TypeError):
        encode(None)
