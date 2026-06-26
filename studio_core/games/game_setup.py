"""
studio_core/games/game_setup.py
Chess game setup — IMP-119.

Consumes the manifest from IMP-118 and returns a ChessGame ready for Godot
or a headless chess session.

Public API:
  setup_game(fen=None) -> ChessGame
"""

from __future__ import annotations

import os
import sys
from typing import Any

_here        = os.path.dirname(os.path.abspath(__file__))
_studio_core = os.path.dirname(_here)
for _p in (_studio_core,):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from factory.manifest import generate_chess_manifest  # noqa: E402


def _build_initial_positions(pieces: list[dict[str, Any]]) -> dict[str, str]:
    """Map each occupied start square to its piece id (32 entries for standard chess)."""
    positions: dict[str, str] = {}
    for piece in pieces:
        for sq in piece["initial_squares"]:
            positions[sq] = piece["id"]
    return positions


class ChessGame:
    """
    Compiled chess game configuration — mirrors CompiledGame from ir_compiler.py.

    Attributes
    ----------
    manifest          : full manifest dict from generate_chess_manifest()
    initial_fen       : FEN string for the starting position (overridable)
    initial_positions : {square: piece_id} for all 32 occupied start squares
    godot             : godot_setup sub-dict with scene paths, signals, hooks
    """

    def __init__(self, manifest: dict[str, Any], fen: str | None = None) -> None:
        self.manifest          = manifest
        self.initial_fen       = fen if fen is not None else manifest["meta"]["fen_start"]
        self.initial_positions = _build_initial_positions(manifest["pieces"])
        self.godot             = manifest["godot_setup"]

    # ── Describe ──────────────────────────────────────────────────────────────

    def describe(self) -> str:
        m      = self.manifest["meta"]
        board  = m["board"]
        pieces = self.manifest["pieces"]
        rules  = self.manifest["rules"]
        godot  = self.godot

        move_rules = [r for r in rules if r["category"] == "move"]
        meta_rules = [r for r in rules if r["category"] == "meta"]
        piece_types = sorted({p["type"] for p in pieces})

        lines = [
            f"{'='*60}",
            f"  {m['name']}  v{m['version']}  (IMP-118 manifest)",
            f"{'='*60}",
            f"  Board         : {board['width']}×{board['height']}  ({board['squares']} squares)",
            f"  FEN           : {self.initial_fen}",
            f"  Pieces        : {len(pieces)}  ({len(piece_types)} types × 2 colours)",
            f"  Rules         : {len(rules)}  ({len(move_rules)} move + {len(meta_rules)} meta)",
            f"  Win conds     : {len(self.manifest['win_conditions'])}",
            f"  Draw conds    : {len(self.manifest['draw_conditions'])}",
            f"  Init positions: {len(self.initial_positions)} squares occupied",
            f"",
            f"  Piece types   : {', '.join(piece_types)}",
            f"",
            f"  Godot scene   : {godot['scene_template']}",
            f"  Godot signals : {len(godot['signals'])}",
            f"  GDScript hooks: {len(godot['gdscript_hooks'])}",
            f"{'='*60}",
        ]
        return "\n".join(lines)


def setup_game(fen: str | None = None) -> ChessGame:
    """
    Build a fully configured ChessGame from the IMP-118 manifest.

    Parameters
    ----------
    fen : optional FEN string; defaults to the standard starting position
          embedded in the manifest.

    Returns
    -------
    ChessGame ready for headless use or Godot integration.
    """
    manifest = generate_chess_manifest()
    return ChessGame(manifest, fen=fen)
