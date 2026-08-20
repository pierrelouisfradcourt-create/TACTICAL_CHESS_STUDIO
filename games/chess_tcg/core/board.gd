# Board — grille 8x8. Classe pure, sans scène. Positions = Vector2i(x,y), 0..7.
extends RefCounted

const Piece = preload("res://core/piece.gd")
const SIZE := 8

var _grid: Array = []

func _init() -> void:
	for x in SIZE:
		var col: Array = []
		for y in SIZE:
			col.append(null)
		_grid.append(col)

static func in_bounds(pos: Vector2i) -> bool:
	return pos.x >= 0 and pos.x < SIZE and pos.y >= 0 and pos.y < SIZE

func get_piece(pos: Vector2i):
	if not in_bounds(pos):
		return null
	return _grid[pos.x][pos.y]

func set_piece(pos: Vector2i, piece) -> void:
	assert(in_bounds(pos), "set_piece hors plateau")
	_grid[pos.x][pos.y] = piece

func remove(pos: Vector2i) -> void:
	if in_bounds(pos):
		_grid[pos.x][pos.y] = null

func is_empty(pos: Vector2i) -> bool:
	return get_piece(pos) == null

func clone() -> RefCounted:
	var b = get_script().new()
	for x in SIZE:
		for y in SIZE:
			var p = _grid[x][y]
			if p != null:
				b.set_piece(Vector2i(x, y), p.clone())
	return b

func pieces_of(side: int) -> Array:
	var out: Array = []
	for x in SIZE:
		for y in SIZE:
			var p = _grid[x][y]
			if p != null and p.side == side:
				out.append(Vector2i(x, y))
	return out

func find_king(side: int) -> Vector2i:
	for x in SIZE:
		for y in SIZE:
			var p = _grid[x][y]
			if p != null and p.type == Piece.Type.KING and p.side == side:
				return Vector2i(x, y)
	return Vector2i(-1, -1)
