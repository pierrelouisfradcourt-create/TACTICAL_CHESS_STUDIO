"""
studio_core/factory/manifest.py
Game manifest generator for Chess — IMP-118.

generate_chess_manifest() returns a complete, JSON-serialisable manifest:
  - 12 piece definitions (6 types × 2 colours)
  - 11 rules (move + meta-rules)
  - 8×8 board descriptor
  - FEN starting position
  - win / draw conditions
  - godot_setup hook
"""

from __future__ import annotations

from typing import Any


# ── Board ─────────────────────────────────────────────────────────────────────

_BOARD: dict[str, Any] = {
    "type":               "grid",
    "width":              8,
    "height":             8,
    "squares":            64,
    "coordinate_system":  "algebraic",   # a1 … h8
    "rank_labels":        ["1", "2", "3", "4", "5", "6", "7", "8"],
    "file_labels":        ["a", "b", "c", "d", "e", "f", "g", "h"],
    "dark_color":         "#b58863",
    "light_color":        "#f0d9b5",
    "orientation_white":  "bottom",      # White plays from rank 1
}

_FEN_START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


# ── Pieces — 12 definitions (6 types × 2 colours) ────────────────────────────

def _piece(
    pid: str,
    piece_type: str,
    color: str,
    fen_symbol: str,
    unicode_symbol: str,
    value_cp: int,
    move_pattern: str,
    initial_squares: list[str],
    count: int,
) -> dict[str, Any]:
    return {
        "id":               pid,
        "type":             piece_type,
        "color":            color,
        "fen_symbol":       fen_symbol,
        "unicode_symbol":   unicode_symbol,
        "value_centipawns": value_cp,
        "move_pattern":     move_pattern,
        "initial_squares":  initial_squares,
        "count_per_color":  count,
        "promotes_to":      (
            ["queen", "rook", "bishop", "knight"]
            if piece_type == "pawn" else []
        ),
    }


_PIECES: list[dict[str, Any]] = [
    # ── White ────────────────────────────────────────────────────────────────
    _piece("white_pawn",   "pawn",   "white", "P", "♙", 100,
           "Advances 1 square forward; 2 from start rank; captures diagonally.",
           ["a2","b2","c2","d2","e2","f2","g2","h2"], 8),

    _piece("white_rook",   "rook",   "white", "R", "♖", 500,
           "Slides any number of squares along ranks or files.",
           ["a1","h1"], 2),

    _piece("white_knight", "knight", "white", "N", "♘", 320,
           "Jumps in an L-shape: 2 squares along one axis + 1 along the other. Leaps over pieces.",
           ["b1","g1"], 2),

    _piece("white_bishop", "bishop", "white", "B", "♗", 330,
           "Slides any number of squares diagonally. Each bishop stays on one colour.",
           ["c1","f1"], 2),

    _piece("white_queen",  "queen",  "white", "Q", "♕", 900,
           "Slides any number of squares along ranks, files, or diagonals.",
           ["d1"], 1),

    _piece("white_king",   "king",   "white", "K", "♔", 20000,
           "Moves exactly 1 square in any direction. May castle once per game.",
           ["e1"], 1),

    # ── Black ────────────────────────────────────────────────────────────────
    _piece("black_pawn",   "pawn",   "black", "p", "♟", 100,
           "Advances 1 square forward (toward rank 1); 2 from start rank; captures diagonally.",
           ["a7","b7","c7","d7","e7","f7","g7","h7"], 8),

    _piece("black_rook",   "rook",   "black", "r", "♜", 500,
           "Slides any number of squares along ranks or files.",
           ["a8","h8"], 2),

    _piece("black_knight", "knight", "black", "n", "♞", 320,
           "Jumps in an L-shape: 2 squares along one axis + 1 along the other. Leaps over pieces.",
           ["b8","g8"], 2),

    _piece("black_bishop", "bishop", "black", "b", "♝", 330,
           "Slides any number of squares diagonally. Each bishop stays on one colour.",
           ["c8","f8"], 2),

    _piece("black_queen",  "queen",  "black", "q", "♛", 900,
           "Slides any number of squares along ranks, files, or diagonals.",
           ["d8"], 1),

    _piece("black_king",   "king",   "black", "k", "♚", 20000,
           "Moves exactly 1 square in any direction. May castle once per game.",
           ["e8"], 1),
]


# ── Rules — 11 declarations ───────────────────────────────────────────────────

_RULES: list[dict[str, Any]] = [
    {
        "rule":      "pawn_advance_single",
        "category":  "move",
        "condition": "Pawn faces an empty square directly in front.",
        "effect":    "Pawn moves forward 1 square. No capture.",
        "parameters": {"direction": "forward_1"},
    },
    {
        "rule":      "pawn_advance_double",
        "category":  "move",
        "condition": "Pawn is on its start rank (rank 2 white / rank 7 black) and both squares ahead are empty.",
        "effect":    "Pawn moves forward 2 squares. Sets en-passant target square.",
        "parameters": {"direction": "forward_2", "requires_start_rank": True},
    },
    {
        "rule":      "pawn_capture_diagonal",
        "category":  "move",
        "condition": "An enemy piece occupies the square diagonally in front of the pawn.",
        "effect":    "Pawn moves diagonally and captures the enemy piece.",
        "parameters": {"direction": "diagonal_forward", "must_capture": True},
    },
    {
        "rule":      "en_passant",
        "category":  "move",
        "condition": (
            "Pawn is on rank 5 (white) or rank 4 (black). "
            "An enemy pawn just advanced 2 squares to a square adjacent to this pawn "
            "(en-passant target square is set in FEN)."
        ),
        "effect":    "Pawn captures the enemy pawn en passant; enemy pawn is removed from its current square.",
        "parameters": {"target_source": "fen_ep_square", "removes_captured_from": "adjacent_square"},
    },
    {
        "rule":      "pawn_promotion",
        "category":  "move",
        "condition": "Pawn reaches the opponent's back rank (rank 8 white / rank 1 black).",
        "effect":    "Pawn is replaced by a queen, rook, bishop, or knight of the same colour (player's choice).",
        "parameters": {"promotion_choices": ["queen", "rook", "bishop", "knight"]},
    },
    {
        "rule":      "castling_kingside",
        "category":  "move",
        "condition": (
            "King and h-file rook have not moved. "
            "Squares f1–g1 (white) or f8–g8 (black) are empty. "
            "King is not in check and does not pass through or land on an attacked square."
        ),
        "effect":    "King moves from e-file to g-file; rook moves from h-file to f-file.",
        "parameters": {"king_to": "g", "rook_from": "h", "rook_to": "f", "side": "kingside"},
    },
    {
        "rule":      "castling_queenside",
        "category":  "move",
        "condition": (
            "King and a-file rook have not moved. "
            "Squares b1–d1 (white) or b8–d8 (black) are empty. "
            "King is not in check and does not pass through or land on an attacked square."
        ),
        "effect":    "King moves from e-file to c-file; rook moves from a-file to d-file.",
        "parameters": {"king_to": "c", "rook_from": "a", "rook_to": "d", "side": "queenside"},
    },
    {
        "rule":      "check_constraint",
        "category":  "meta",
        "condition": "Any candidate move would leave the moving side's king on an attacked square.",
        "effect":    "That move is illegal and must be filtered from the legal-move list.",
        "parameters": {"applies_to": "all_moves", "priority": "highest"},
    },
    {
        "rule":      "fifty_move_rule",
        "category":  "meta",
        "condition": "50 full moves (100 half-moves) have elapsed with no pawn advance and no capture.",
        "effect":    "Either player may claim a draw. Halfmove clock tracked in FEN field 5.",
        "parameters": {"halfmove_threshold": 100, "claimable": True},
    },
    {
        "rule":      "threefold_repetition",
        "category":  "meta",
        "condition": (
            "The same position (same side to move, same castling rights, same en-passant target) "
            "has appeared 3 times in the game history."
        ),
        "effect":    "Either player may claim a draw.",
        "parameters": {"repeat_count": 3, "claimable": True, "hash_method": "zobrist"},
    },
    {
        "rule":      "stalemate",
        "category":  "meta",
        "condition": "The side to move has no legal moves and is not in check.",
        "effect":    "The game is immediately drawn (stalemate).",
        "parameters": {"automatic": True, "requires_claim": False},
    },
]


# ── Win conditions ────────────────────────────────────────────────────────────

_WIN_CONDITIONS: list[dict[str, Any]] = [
    {
        "id":          "checkmate",
        "description": "The opponent's king is in check and has no legal move to escape.",
        "trigger":     "no_legal_moves AND king_in_check",
        "winner":      "side_delivering_check",
        "automatic":   True,
    },
    {
        "id":          "resignation",
        "description": "A player resigns voluntarily.",
        "trigger":     "player_action",
        "winner":      "opponent",
        "automatic":   False,
    },
    {
        "id":          "timeout",
        "description": "A player's clock reaches zero (when time controls are active).",
        "trigger":     "clock_zero AND opponent_has_sufficient_material",
        "winner":      "opponent",
        "automatic":   True,
        "requires":    "time_control",
    },
]


# ── Draw conditions ───────────────────────────────────────────────────────────

_DRAW_CONDITIONS: list[dict[str, Any]] = [
    {
        "id":          "stalemate",
        "description": "No legal moves for the side to move; king is not in check.",
        "trigger":     "no_legal_moves AND NOT king_in_check",
        "automatic":   True,
        "source_rule": "stalemate",
    },
    {
        "id":          "fifty_move_rule",
        "description": "50 moves without pawn advance or capture.",
        "trigger":     "halfmove_clock >= 100",
        "automatic":   False,
        "claimable":   True,
        "source_rule": "fifty_move_rule",
    },
    {
        "id":          "threefold_repetition",
        "description": "Same position repeated 3 times.",
        "trigger":     "position_count >= 3",
        "automatic":   False,
        "claimable":   True,
        "source_rule": "threefold_repetition",
    },
    {
        "id":          "insufficient_material",
        "description": "Neither side has enough material to deliver checkmate.",
        "trigger":     "material_insufficient BOTH sides",
        "automatic":   True,
        "cases": [
            "K vs K",
            "K+B vs K",
            "K+N vs K",
            "K+B vs K+B (same colour bishops)",
        ],
    },
    {
        "id":          "mutual_agreement",
        "description": "Both players agree to draw.",
        "trigger":     "player_action BOTH",
        "automatic":   False,
    },
]


# ── Godot setup hook ─────────────────────────────────────────────────────────

_GODOT_SETUP: dict[str, Any] = {
    "scene_template":   "res://games/chess/ChessBoard.tscn",
    "board_node":       "ChessBoard",
    "square_size_px":   80,
    "board_offset_px":  {"x": 0, "y": 0},
    "piece_scenes": {
        "white_pawn":   "res://games/chess/pieces/WhitePawn.tscn",
        "white_rook":   "res://games/chess/pieces/WhiteRook.tscn",
        "white_knight": "res://games/chess/pieces/WhiteKnight.tscn",
        "white_bishop": "res://games/chess/pieces/WhiteBishop.tscn",
        "white_queen":  "res://games/chess/pieces/WhiteQueen.tscn",
        "white_king":   "res://games/chess/pieces/WhiteKing.tscn",
        "black_pawn":   "res://games/chess/pieces/BlackPawn.tscn",
        "black_rook":   "res://games/chess/pieces/BlackRook.tscn",
        "black_knight": "res://games/chess/pieces/BlackKnight.tscn",
        "black_bishop": "res://games/chess/pieces/BlackBishop.tscn",
        "black_queen":  "res://games/chess/pieces/BlackQueen.tscn",
        "black_king":   "res://games/chess/pieces/BlackKing.tscn",
    },
    "animations": {
        "move":    "slide_0.15s",
        "capture": "pop_fade_0.2s",
        "check":   "king_flash_red",
        "castle":  "dual_slide_0.2s",
    },
    "signals": {
        "on_move":      "piece_moved(from_sq, to_sq, piece_id)",
        "on_capture":   "piece_captured(square, piece_id)",
        "on_promotion": "pawn_promoted(square, chosen_type)",
        "on_check":     "check_delivered(king_square)",
        "on_game_end":  "game_ended(result, reason)",
    },
    "gdscript_hooks": {
        "load_position": "func load_fen(fen: String) -> void",
        "get_legal_moves": "func get_legal_moves(square: String) -> Array[String]",
        "apply_move":   "func apply_move(uci: String) -> void",
        "request_ai_move": "func request_rocky_move() -> void",
    },
}


# ── Public API ────────────────────────────────────────────────────────────────

def generate_chess_manifest() -> dict[str, Any]:
    """
    Return the complete chess game manifest.

    Counts:
      pieces         — 12  (6 types × 2 colours)
      rules          — 11  (7 move rules + 4 meta rules)
      win_conditions — 3
      draw_conditions— 5
    """
    manifest: dict[str, Any] = {
        "meta": {
            "name":            "Chess",
            "version":         "1.0",
            "game_type":       "turn_based_strategy",
            "players":         2,
            "turn_based":      True,
            "fen_start":       _FEN_START,
            "board":           _BOARD,
            "source_imp":      "IMP-118",
        },
        "pieces":          _PIECES,
        "rules":           _RULES,
        "win_conditions":  _WIN_CONDITIONS,
        "draw_conditions": _DRAW_CONDITIONS,
        "godot_setup":     _GODOT_SETUP,
    }
    _validate(manifest)
    return manifest


# ── Internal validation ───────────────────────────────────────────────────────

def _validate(m: dict[str, Any]) -> None:
    n_pieces = len(m["pieces"])
    n_rules  = len(m["rules"])
    assert n_pieces == 12, f"Expected 12 pieces, got {n_pieces}"
    assert n_rules  == 11, f"Expected 11 rules, got {n_rules}"
    assert m["meta"]["board"]["width"]  == 8
    assert m["meta"]["board"]["height"] == 8
    assert m["meta"]["fen_start"].startswith("rnbqkbnr/pppppppp")
    colors = {p["color"] for p in m["pieces"]}
    assert colors == {"white", "black"}, f"Unexpected colours: {colors}"
    rule_ids = [r["rule"] for r in m["rules"]]
    assert len(rule_ids) == len(set(rule_ids)), "Duplicate rule ids"
    piece_ids = [p["id"] for p in m["pieces"]]
    assert len(piece_ids) == len(set(piece_ids)), "Duplicate piece ids"
