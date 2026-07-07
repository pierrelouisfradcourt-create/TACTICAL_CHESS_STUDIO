# AI — adversaire déterministe 1-ply (clone -> simule action + BRAWL -> évalue).
# Pas de RNG (déterministe, rejouable). Heuristique : matériel + pression roi.
extends RefCounted

const Board = preload("res://core/board.gd")
const Moves = preload("res://core/moves.gd")
const Rules = preload("res://core/rules.gd")
const Piece = preload("res://core/piece.gd")

const WIN := 1000000.0

static func choose_move(board, side: int) -> Dictionary:
	var best_score := -INF
	var best := {}
	for from in board.pieces_of(side):
		for to in Moves.destinations(board, from):
			var sim = board.clone()
			Rules.resolve(sim, from, to)
			Rules.resolve_brawl(sim)
			# tie-break déterministe (stable, sans RNG)
			var s := _eval(sim, side) - _tiebreak(from, to)
			if s > best_score:
				best_score = s
				best = {"from": from, "to": to}
	return best

static func _tiebreak(from: Vector2i, to: Vector2i) -> float:
	return (float(from.x * 8 + from.y) + float(to.x * 8 + to.y) * 0.01) * 0.0001

static func _eval(board, side: int) -> float:
	var enemy := 1 - side
	if not Rules.king_alive(board, enemy):
		return WIN
	if not Rules.king_alive(board, side):
		return -WIN
	var s := _material(board, side) - _material(board, enemy)
	s += 2.0 * float(Rules.king_pressure(board, enemy))
	s -= 3.0 * float(Rules.king_pressure(board, side))
	return s

static func _material(board, side: int) -> float:
	var m := 0.0
	for pos in board.pieces_of(side):
		var p = board.get_piece(pos)
		m += float(p.hp) + float(p.atk) + 2.0 * float(p.arm)
		if p.type == Piece.Type.KING:
			m += 60.0
	return m
