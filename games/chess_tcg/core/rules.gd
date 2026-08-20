# Rules — pipeline de résolution explicite (déterministe, pur, sans scène).
# Aligné sur le pipeline canon 17 étapes (RECOVERY §6) ; retourne un JOURNAL d'événements
# (observabilité + graine de replay pour le simulateur de balance — cf. 10_ARCH_REVIEW).
# Canon ratifié : dégâts max(1,ATK-ARM) · traversée (contre-attaques case par case, arrêt si mort ;
# cavalier = exception) · riposte si la cible survit · attaque->mort->prise de case ·
# victoire = roi PV<=0 OU pression >= seuil.
extends RefCounted

const Piece = preload("res://core/piece.gd")
const Board = preload("res://core/board.gd")
const Moves = preload("res://core/moves.gd")

const PRESSURE_BONUS := 2       # seuil de collapse = PV_roi + BONUS - fatigue (canon)
const _ADJ := [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1),
	Vector2i(1, 1), Vector2i(1, -1), Vector2i(-1, 1), Vector2i(-1, -1)]

static func damage(atk: int, arm: int) -> int:
	return max(1, atk - arm)

static func is_legal_destination(board, from: Vector2i, to: Vector2i) -> bool:
	return to in Moves.destinations(board, from)

# Résout une action (from -> to). MUTE le plateau. Retourne un Dictionary + `events`.
static func resolve(board, from: Vector2i, to: Vector2i) -> Dictionary:
	var ev: Array = []
	var mover = board.get_piece(from)
	if mover == null:
		return {"ok": false, "reason": "no_piece", "events": ev}
	if not is_legal_destination(board, from, to):
		return {"ok": false, "reason": "illegal", "events": ev}
	var target = board.get_piece(to)
	if target != null and target.side == mover.side:
		return {"ok": false, "reason": "friendly", "events": ev}
	if target != null and not mover.can_attack:
		return {"ok": false, "reason": "cannot_attack", "events": ev}

	# --- Étape traversée : contre-attaques case par case (cavalier exempté) ---
	if mover.type != Piece.Type.KNIGHT:
		for tile in _path(from, to):
			for ctrl in _tile_controllers(board, tile, mover):
				var td := damage(ctrl.atk, mover.arm)
				mover.hp -= td
				ev.append({"e": "traversal", "tile": tile, "dmg": td})
				if mover.hp <= 0:
					board.remove(from)   # meurt en route -> mouvement annulé
					ev.append({"e": "mover_died", "tile": tile})
					return {"ok": true, "moved": false, "mover_died": true,
						"killed": false, "events": ev}

	# --- Étape arrivée / combat ---
	if target == null:
		_move(board, from, to, mover)
		ev.append({"e": "move", "to": to})
		return {"ok": true, "attacked": false, "killed": false, "moved": true, "events": ev}

	var dmg := damage(mover.atk, target.arm)
	target.hp -= dmg
	ev.append({"e": "attack", "dmg": dmg})
	if target.hp <= 0:
		board.remove(to)
		_move(board, from, to, mover)
		mover.kills += 1
		ev.append({"e": "kill", "to": to})
		return {"ok": true, "attacked": true, "killed": true, "damage": dmg,
			"moved": true, "events": ev}

	# cible survit -> riposte, pas de prise de case
	var rdmg := damage(target.atk, mover.arm)
	mover.hp -= rdmg
	ev.append({"e": "retaliation", "dmg": rdmg})
	var mover_died: bool = mover.hp <= 0
	if mover_died:
		board.remove(from)
		ev.append({"e": "mover_died", "tile": from})
	return {"ok": true, "attacked": true, "killed": false, "damage": dmg,
		"retaliated": true, "mover_died": mover_died, "events": ev}

# Cases traversées entre from et to (exclus). Vide pour cavalier / saut non linéaire.
static func _path(from: Vector2i, to: Vector2i) -> Array:
	var dx := to.x - from.x
	var dy := to.y - from.y
	if not (dx == 0 or dy == 0 or absi(dx) == absi(dy)):
		return []
	var step := Vector2i(signi(dx), signi(dy))
	var tiles: Array = []
	var cur: Vector2i = from + step
	while cur != to:
		tiles.append(cur)
		cur += step
	return tiles

static func _tile_controllers(board, tile: Vector2i, mover) -> Array:
	var out: Array = []
	for x in Board.SIZE:
		for y in Board.SIZE:
			var p = board.get_piece(Vector2i(x, y))
			if p != null and p.side != mover.side and p.can_control:
				if tile in Moves.controlled_tiles(board, Vector2i(x, y)):
					out.append(p)
	return out

static func _move(board, from: Vector2i, to: Vector2i, piece) -> void:
	board.remove(from)
	board.set_piece(to, piece)
	_promote_if_needed(to, piece)

static func _promote_if_needed(pos: Vector2i, piece) -> void:
	if piece.type != Piece.Type.PAWN or piece.is_summon:
		return
	var last_rank := Board.SIZE - 1 if piece.side == 0 else 0
	if pos.y == last_rank:
		piece.type = Piece.Type.QUEEN
		piece.can_attack = false

static func king_alive(board, side: int) -> bool:
	return board.find_king(side) != Vector2i(-1, -1)

# Pression du roi (canon) : directThreat + floor(supporters/4) + floor(escapes bloquées/3) + brawl.
static func king_pressure(board, side: int) -> int:
	var kpos: Vector2i = board.find_king(side)
	if kpos == Vector2i(-1, -1):
		return 0
	var enemy := 1 - side
	var direct := 0
	var supporting := 0
	var brawlp := 0
	for pos in board.pieces_of(enemy):
		var p = board.get_piece(pos)
		if p.can_attack and kpos in Moves.destinations(board, pos):
			direct += 1
		elif _threatens_adjacent(board, pos, kpos):
			supporting += 1
		if p.can_brawl and _is_adjacent(pos, kpos):
			brawlp = 1
	var blocked := _blocked_escapes(board, kpos, side)
	return direct + supporting / 4 + blocked / 3 + brawlp

static func _is_adjacent(a: Vector2i, b: Vector2i) -> bool:
	return a != b and absi(a.x - b.x) <= 1 and absi(a.y - b.y) <= 1

static func _threatens_adjacent(board, pos: Vector2i, kpos: Vector2i) -> bool:
	var ctl: Array = Moves.controlled_tiles(board, pos)
	for d in _ADJ:
		if (kpos + d) in ctl:
			return true
	return false

static func _tile_controlled_by_enemy(board, tile: Vector2i, side: int) -> bool:
	for pos in board.pieces_of(1 - side):
		if tile in Moves.controlled_tiles(board, pos):
			return true
	return false

static func _blocked_escapes(board, kpos: Vector2i, side: int) -> int:
	var blocked := 0
	for d in _ADJ:
		var t: Vector2i = kpos + d
		if not Board.in_bounds(t):
			blocked += 1
			continue
		var occ = board.get_piece(t)
		if occ != null and occ.side == side:
			blocked += 1
		elif _tile_controlled_by_enemy(board, t, side):
			blocked += 1
	return blocked

static func fatigue_reduction(turn: int) -> int:
	if turn < 48:
		return 0
	return mini(2, 1 + (turn - 48) / 18)

static func king_collapsed(board, side: int, turn: int) -> bool:
	var kpos: Vector2i = board.find_king(side)
	if kpos == Vector2i(-1, -1):
		return false
	var king = board.get_piece(kpos)
	return king_pressure(board, side) >= king.hp + PRESSURE_BONUS - fatigue_reduction(turn)

static func check_victory(board, turn: int = 0) -> int:
	for side in [0, 1]:
		if not king_alive(board, side):
			return 1 - side
	for side in [0, 1]:
		if king_collapsed(board, side, turn):
			return 1 - side
	return -1

# BRAWL — attrition locale. Snapshot : les dégâts entrants sont calculés AVANT
# application (simultané), puis appliqués, puis les morts retirées. Canon C6 :
# variante par défaut brawlDamage = max(1, ATK - ARM). Retourne le journal.
static func resolve_brawl(board) -> Array:
	var incoming := {}   # Vector2i -> int (snapshot)
	for x in Board.SIZE:
		for y in Board.SIZE:
			var pos := Vector2i(x, y)
			var p = board.get_piece(pos)
			if p == null or not p.can_brawl:
				continue
			var dmg := 0
			for d in _ADJ:
				var e = board.get_piece(pos + d)
				if e != null and e.side != p.side and e.can_brawl:
					dmg += damage(e.atk, p.arm)
			if dmg > 0:
				incoming[pos] = dmg
	var events: Array = []
	for pos in incoming:
		var p = board.get_piece(pos)
		p.hp -= incoming[pos]
		var died: bool = p.hp <= 0
		if died:
			board.remove(pos)
		events.append({"pos": pos, "dmg": incoming[pos], "died": died})
	return events
