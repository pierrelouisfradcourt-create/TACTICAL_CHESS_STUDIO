# Moves — génération des destinations légales (patterns d'échecs). Statique, pur.
# Une destination = case vide (déplacement) OU case ennemie atteignable (attaque).
extends RefCounted

const Piece = preload("res://core/piece.gd")
const Board = preload("res://core/board.gd")

const _ORTHO := [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]
const _DIAG := [Vector2i(1, 1), Vector2i(1, -1), Vector2i(-1, 1), Vector2i(-1, -1)]
const _KNIGHT := [Vector2i(1, 2), Vector2i(2, 1), Vector2i(-1, 2), Vector2i(-2, 1),
	Vector2i(1, -2), Vector2i(2, -1), Vector2i(-1, -2), Vector2i(-2, -1)]

static func destinations(board, pos: Vector2i) -> Array:
	var piece = board.get_piece(pos)
	if piece == null:
		return []
	match piece.type:
		Piece.Type.KNIGHT:
			return _step(board, pos, piece, _KNIGHT)
		Piece.Type.KING:
			return _step(board, pos, piece, _ORTHO + _DIAG)
		Piece.Type.BISHOP:
			return _slide(board, pos, piece, _DIAG)
		Piece.Type.ROOK:
			return _slide(board, pos, piece, _ORTHO)
		Piece.Type.QUEEN:
			return _slide(board, pos, piece, _ORTHO + _DIAG)
		Piece.Type.PAWN:
			return _pawn(board, pos, piece)
	return []

static func _can_land(board, t: Vector2i, piece) -> bool:
	if not Board.in_bounds(t):
		return false
	var occ = board.get_piece(t)
	return occ == null or occ.side != piece.side

static func _step(board, pos: Vector2i, piece, offsets: Array) -> Array:
	var out: Array = []
	for o in offsets:
		var t: Vector2i = pos + o
		if _can_land(board, t, piece):
			out.append(t)
	return out

static func _slide(board, pos: Vector2i, piece, dirs: Array) -> Array:
	var out: Array = []
	for d in dirs:
		var cur: Vector2i = pos + d
		while Board.in_bounds(cur):
			var occ = board.get_piece(cur)
			if occ == null:
				out.append(cur)
			elif occ.side != piece.side:
				out.append(cur)  # attaque ennemi puis stop
				break
			else:
				break  # allié bloque
			cur += d
	return out

static func _pawn(board, pos: Vector2i, piece) -> Array:
	var out: Array = []
	var dir := 1 if piece.side == 0 else -1
	var fwd: Vector2i = pos + Vector2i(0, dir)
	if Board.in_bounds(fwd) and board.get_piece(fwd) == null:
		out.append(fwd)
		var start_rank := 1 if piece.side == 0 else 6
		var fwd2: Vector2i = pos + Vector2i(0, dir * 2)
		if pos.y == start_rank and board.get_piece(fwd2) == null:
			out.append(fwd2)
	for dx in [-1, 1]:
		var diag: Vector2i = pos + Vector2i(dx, dir)
		if Board.in_bounds(diag):
			var occ = board.get_piece(diag)
			if occ != null and occ.side != piece.side:
				out.append(diag)  # capture diagonale seulement
	return out

# Cases CONTRÔLÉES (menacées) — indépendant de l'occupation (pion = diagonales).
# Sert aux contre-attaques de traversée. Canon EXTRAIT2 : « une pièce contrôle
# exactement les cases où elle pourrait capturer ».
static func controlled_tiles(board, pos: Vector2i) -> Array:
	var piece = board.get_piece(pos)
	if piece == null:
		return []
	match piece.type:
		Piece.Type.PAWN:
			return _pawn_control(pos, piece)
		Piece.Type.KNIGHT:
			return _targets_in_bounds(pos, _KNIGHT)
		Piece.Type.KING:
			return _targets_in_bounds(pos, _ORTHO + _DIAG)
		Piece.Type.BISHOP:
			return _slide_control(board, pos, _DIAG)
		Piece.Type.ROOK:
			return _slide_control(board, pos, _ORTHO)
		Piece.Type.QUEEN:
			return _slide_control(board, pos, _ORTHO + _DIAG)
	return []

static func _pawn_control(pos: Vector2i, piece) -> Array:
	var out: Array = []
	var dir := 1 if piece.side == 0 else -1
	for dx in [-1, 1]:
		var t: Vector2i = pos + Vector2i(dx, dir)
		if Board.in_bounds(t):
			out.append(t)
	return out

static func _targets_in_bounds(pos: Vector2i, offsets: Array) -> Array:
	var out: Array = []
	for o in offsets:
		var t: Vector2i = pos + o
		if Board.in_bounds(t):
			out.append(t)
	return out

static func _slide_control(board, pos: Vector2i, dirs: Array) -> Array:
	var out: Array = []
	for d in dirs:
		var cur: Vector2i = pos + d
		while Board.in_bounds(cur):
			out.append(cur)             # inclut le 1er bloqueur (case défendue) puis stop
			if board.get_piece(cur) != null:
				break
			cur += d
	return out
