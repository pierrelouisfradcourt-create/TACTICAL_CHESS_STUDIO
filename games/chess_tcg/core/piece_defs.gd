# PieceDefs — stats par défaut (lignée T) + mise en place initiale type échecs.
# Stats issues du canon (Crown/EXTRAIT2, lignée T HP/ATK/ARM).
extends RefCounted

const Piece = preload("res://core/piece.gd")
const Board = preload("res://core/board.gd")

const BACK := [Piece.Type.ROOK, Piece.Type.KNIGHT, Piece.Type.BISHOP, Piece.Type.QUEEN,
	Piece.Type.KING, Piece.Type.BISHOP, Piece.Type.KNIGHT, Piece.Type.ROOK]

static func make(type: int, side: int):
	match type:
		Piece.Type.PAWN:   return Piece.new(type, side, 3, 1, 0)
		Piece.Type.KNIGHT: return Piece.new(type, side, 6, 2, 0)
		Piece.Type.BISHOP: return Piece.new(type, side, 6, 2, 0)
		Piece.Type.ROOK:   return Piece.new(type, side, 7, 2, 1)
		Piece.Type.QUEEN:  return Piece.new(type, side, 8, 4, 0)
		Piece.Type.KING:   return Piece.new(type, side, 10, 2, 2)
	return Piece.new(type, side, 3, 1, 0)

# Plateau de départ : side0 en bas (rangs 0-1), side1 en haut (rangs 6-7).
static func initial_board():
	var b = Board.new()
	for x in Board.SIZE:
		b.set_piece(Vector2i(x, 0), make(BACK[x], 0))
		b.set_piece(Vector2i(x, 1), make(Piece.Type.PAWN, 0))
		b.set_piece(Vector2i(x, 6), make(Piece.Type.PAWN, 1))
		b.set_piece(Vector2i(x, 7), make(BACK[x], 1))
	return b

static func type_letter(type: int) -> String:
	match type:
		Piece.Type.PAWN:   return "P"
		Piece.Type.KNIGHT: return "C"   # Cavalier
		Piece.Type.BISHOP: return "F"   # Fou
		Piece.Type.ROOK:   return "T"   # Tour
		Piece.Type.QUEEN:  return "D"   # Dame
		Piece.Type.KING:   return "R"   # Roi
	return "?"
