extends Node
# WAVEVALE — CombatEngine
# Gère la boucle de combat tick-par-tick.
# Instancié par la scène principale.
#
# Board layout en combat :
#   [ROW 0–4]  Zone ennemie  (row 0 = backline ennemie, row 4 = frontline ennemie)
#   [ROW 5–9]  Zone joueur   (row 5 = frontline joueur,  row 9 = backline joueur)
#   Colonnes : 0–4 (5 colonnes)
#   Index cell = row * 5 + col

# ── Signaux ───────────────────────────────────────────────────────────────────
signal tick_completed(ally_states: Array, enemy_states: Array)
signal unit_attacked(attacker_pos: Vector2i, target_pos: Vector2i, damage: int)
signal unit_died(pos: Vector2i, is_enemy: bool)
signal unit_moved(from_pos: Vector2i, to_pos: Vector2i)
signal unit_resurrected(pos: Vector2i)
signal combat_ended(result: Dictionary)
# result = { "won": bool, "surviving_enemies": int, "kills": int,
#            "ally_survivors": Array, "ally_dead": Array }

# ── Constantes ────────────────────────────────────────────────────────────────
const BOARD_COLS: int = 5
const ENEMY_ROW_MIN: int = 0
const ENEMY_ROW_MAX: int = 4
const ALLY_ROW_MIN: int = 5
const ALLY_ROW_MAX: int = 9
const CRIT_MULTIPLIER: float = 1.8

# ── Données internes ─────────────────────────────────────────────────────────
var _ally_cells: Dictionary = {}    # Vector2i → unit_dict (copie de travail)
var _enemy_cells: Dictionary = {}   # Vector2i → unit_dict
var _ally_dead: Array = []
var _enemy_dead: Array = []
var _tick_timer: Timer
var _tick_interval: float = 0.7
var _combat_kills: int = 0
var _is_running: bool = false
var _synergy_manager: Node = null   # référence injectée (SynergyManager)
var _active_synergies: Dictionary = {}
var _undead_revives_ally: int = 0   # stock global de résurrections Undead alliées


# ── Cycle de vie ──────────────────────────────────────────────────────────────

func _ready() -> void:
	_tick_timer = Timer.new()
	_tick_timer.wait_time = _tick_interval
	_tick_timer.one_shot = false
	_tick_timer.timeout.connect(_on_tick)
	add_child(_tick_timer)


# ── API publique ──────────────────────────────────────────────────────────────

func inject_synergy_manager(sm: Node) -> void:
	_synergy_manager = sm


func start_combat(ally_board: Array, enemy_board: Array, synergies: Dictionary) -> void:
	_is_running = false
	_tick_timer.stop()
	_ally_cells = {}
	_enemy_cells = {}
	_ally_dead = []
	_enemy_dead = []
	_combat_kills = 0
	_active_synergies = synergies.duplicate(true)

	_populate_ally_cells(ally_board)
	_populate_enemy_cells(enemy_board)
	_apply_synergy_bonuses_to_allies()

	_is_running = true
	_tick_timer.start(_tick_interval)


func stop_combat() -> void:
	_is_running = false
	_tick_timer.stop()


# ── Initialisation interne ────────────────────────────────────────────────────

func _populate_ally_cells(ally_board: Array) -> void:
	for row in range(ALLY_ROW_MIN, ALLY_ROW_MAX + 1):
		for col in range(BOARD_COLS):
			var idx: int = row * BOARD_COLS + col
			if idx >= ally_board.size():
				continue
			var unit = ally_board[idx]
			if unit == null or (unit is Dictionary and unit.is_empty()):
				continue
			var pos := Vector2i(col, row)
			_ally_cells[pos] = unit.duplicate(true)


func _populate_enemy_cells(enemy_board: Array) -> void:
	for row in range(ENEMY_ROW_MIN, ENEMY_ROW_MAX + 1):
		for col in range(BOARD_COLS):
			var idx: int = row * BOARD_COLS + col
			if idx >= enemy_board.size():
				continue
			var unit = enemy_board[idx]
			if unit == null or (unit is Dictionary and unit.is_empty()):
				continue
			var pos := Vector2i(col, row)
			_enemy_cells[pos] = unit.duplicate(true)


func _apply_synergy_bonuses_to_allies() -> void:
	if _synergy_manager == null:
		return
	var units: Array = _ally_cells.values()
	_synergy_manager.apply_synergy_bonuses(units, _active_synergies)
	# Re-sync les dicts après modification in-place par SynergyManager
	var keys: Array = _ally_cells.keys()
	for i in range(keys.size()):
		_ally_cells[keys[i]] = units[i]


# ── Boucle de tick ────────────────────────────────────────────────────────────

func _on_tick() -> void:
	if not _is_running:
		return

	# Phase 1 : HEAL PRIEST
	_phase_priest_heal()

	# Phase 2 : MOUVEMENT
	_execute_movement(true)   # alliés
	_execute_movement(false)  # ennemis

	# Phase 3 : ATTAQUE
	_execute_attacks(true)    # alliés attaquent
	_execute_attacks(false)   # ennemis attaquent

	# Phase 4 : NETTOYAGE
	_cleanup_dead()

	# Phase 5 : CHECK FIN
	if _check_combat_end():
		return

	# Injecte la position (clé du dict) dans chaque état avant d'émettre,
	# car Arena._update_side lit state.get("pos") pour savoir où afficher l'unité.
	var ally_states: Array = []
	for pos in _ally_cells:
		var state: Dictionary = _ally_cells[pos].duplicate()
		state["pos"] = pos
		ally_states.append(state)
	var enemy_states: Array = []
	for pos in _enemy_cells:
		var state: Dictionary = _enemy_cells[pos].duplicate()
		state["pos"] = pos
		enemy_states.append(state)
	emit_signal("tick_completed", ally_states, enemy_states)


func _phase_priest_heal() -> void:
	if _synergy_manager == null:
		return
	var heal_amount: int = _synergy_manager.get_priest_heal_amount(_active_synergies)
	if heal_amount <= 0:
		return
	for pos in _ally_cells:
		var unit: Dictionary = _ally_cells[pos]
		var max_hp: int = unit.get("max_hp", 1)
		unit["hp"] = mini(unit.get("hp", 0) + heal_amount, max_hp)


# ── Mouvement ─────────────────────────────────────────────────────────────────

func _execute_movement(is_ally: bool) -> void:
	var my_cells: Dictionary = _ally_cells if is_ally else _enemy_cells
	var enemy_cells: Dictionary = _enemy_cells if is_ally else _ally_cells

	# Snapshot des positions pour éviter les mises à jour en cours d'itération
	var positions: Array = my_cells.keys().duplicate()

	for pos in positions:
		if not my_cells.has(pos):
			continue
		var unit: Dictionary = my_cells[pos]
		var target_pos: Vector2i = _find_target(pos, my_cells, enemy_cells)
		if target_pos == Vector2i(-1, -1):
			continue
		if _is_in_range(unit, pos, target_pos):
			continue
		var new_pos: Vector2i = _move_toward(pos, target_pos, my_cells)
		if new_pos == pos:
			continue
		my_cells.erase(pos)
		my_cells[new_pos] = unit
		emit_signal("unit_moved", pos, new_pos)


func _move_toward(pos: Vector2i, target_pos: Vector2i, my_cells: Dictionary) -> Vector2i:
	var dx: int = target_pos.x - pos.x
	var dy: int = target_pos.y - pos.y

	# Construit la liste des directions candidates par priorité (axe dominant en premier)
	var directions: Array = _build_move_directions(dx, dy)

	for dir in directions:
		var candidate: Vector2i = pos + dir
		if not _is_valid_cell(candidate):
			continue
		if my_cells.has(candidate):
			continue
		return candidate

	return pos


func _build_move_directions(dx: int, dy: int) -> Array:
	var dirs: Array = []
	var primary: Vector2i
	var secondary: Vector2i

	if abs(dx) >= abs(dy):
		primary = Vector2i(sign(dx), 0)
		secondary = Vector2i(0, sign(dy)) if dy != 0 else Vector2i(sign(dx), 0)
	else:
		primary = Vector2i(0, sign(dy))
		secondary = Vector2i(sign(dx), 0) if dx != 0 else Vector2i(0, sign(dy))

	dirs.append(primary)
	if secondary != primary:
		dirs.append(secondary)
	return dirs


func _is_valid_cell(pos: Vector2i) -> bool:
	return pos.x >= 0 and pos.x < BOARD_COLS and pos.y >= 0 and pos.y <= ALLY_ROW_MAX


# ── Attaque ───────────────────────────────────────────────────────────────────

func _execute_attacks(is_ally: bool) -> void:
	var my_cells: Dictionary = _ally_cells if is_ally else _enemy_cells
	var enemy_cells: Dictionary = _enemy_cells if is_ally else _ally_cells

	var positions: Array = my_cells.keys().duplicate()

	for att_pos in positions:
		if not my_cells.has(att_pos):
			continue
		var attacker: Dictionary = my_cells[att_pos]
		var target_pos: Vector2i = _find_target_in_range(attacker, att_pos, enemy_cells)
		if target_pos == Vector2i(-1, -1):
			continue
		var target: Dictionary = enemy_cells[target_pos]
		_apply_attack(attacker, att_pos, target, target_pos, is_ally)


func _find_target_in_range(
		attacker: Dictionary,
		pos: Vector2i,
		enemy_cells: Dictionary) -> Vector2i:
	var best_pos := Vector2i(-1, -1)
	var best_dist: int = 999

	for epos in enemy_cells:
		if not _is_in_range(attacker, pos, epos):
			continue
		var dist: int = _manhattan(pos, epos)
		if dist < best_dist:
			best_dist = dist
			best_pos = epos

	return best_pos


func _apply_attack(
		attacker: Dictionary,
		att_pos: Vector2i,
		target: Dictionary,
		tgt_pos: Vector2i,
		is_ally_attacking: bool) -> void:
	# Esquive
	var dodge: float = target.get("dodge", 0.0)
	if dodge > 0.0 and randf() < dodge:
		return

	# Calcul des dégâts
	var dmg: int = attacker.get("atk", 1)
	if is_ally_attacking:
		var crit: float = attacker.get("crit_chance", 0.0)
		if crit > 0.0 and randf() < crit:
			dmg = int(float(dmg) * CRIT_MULTIPLIER)

	var armor: int = target.get("_armor", 0)
	var final_dmg: int = maxi(1, dmg - armor)
	target["hp"] = target.get("hp", 0) - final_dmg

	emit_signal("unit_attacked", att_pos, tgt_pos, final_dmg)

	if target.get("hp", 0) <= 0:
		if is_ally_attacking:
			_combat_kills += 1
			_handle_demon_steal(att_pos)
		emit_signal("unit_died", tgt_pos, not is_ally_attacking)


func _handle_demon_steal(att_pos: Vector2i) -> void:
	if not _active_synergies.has("Demon"):
		return
	var demon_level: int = _active_synergies["Demon"].get("level", 0)
	if demon_level <= 0:
		return
	var bonus_atk: int = 15 if demon_level == 1 else 30
	for pos in _ally_cells:
		var unit: Dictionary = _ally_cells[pos]
		var traits: Array = unit.get("traits", [])
		if "Demon" in traits:
			unit["atk"] = unit.get("atk", 0) + bonus_atk


# ── Nettoyage ─────────────────────────────────────────────────────────────────

func _cleanup_dead() -> void:
	_cleanup_dead_in_camp(_ally_cells, _ally_dead, false)
	_cleanup_dead_in_camp(_enemy_cells, _enemy_dead, true)


func _cleanup_dead_in_camp(cells: Dictionary, dead_list: Array, is_enemy: bool) -> void:
	var dead_positions: Array = []
	for pos in cells:
		if cells[pos].get("hp", 1) <= 0:
			dead_positions.append(pos)

	for pos in dead_positions:
		var unit: Dictionary = cells[pos]
		var revives: int = unit.get("_undead_revives", 0)
		if revives > 0 and not is_enemy:
			unit["_undead_revives"] = revives - 1
			var max_hp: int = unit.get("max_hp", 1)
			unit["hp"] = int(max_hp * 0.30)
			emit_signal("unit_resurrected", pos)
		else:
			cells.erase(pos)
			dead_list.append(unit)


# ── Fin de combat ─────────────────────────────────────────────────────────────

func _check_combat_end() -> bool:
	if _ally_cells.is_empty() or _enemy_cells.is_empty():
		_end_combat()
		return true
	return false


func _end_combat() -> void:
	_is_running = false
	_tick_timer.stop()

	var won: bool = _enemy_cells.is_empty()
	var surviving_enemies: int = _enemy_cells.size()

	var result: Dictionary = {
		"won": won,
		"surviving_enemies": surviving_enemies,
		"kills": _combat_kills,
		"ally_survivors": _ally_cells.values().duplicate(),
		"ally_dead": _ally_dead.duplicate()
	}

	emit_signal("combat_ended", result)


# ── Utilitaires ───────────────────────────────────────────────────────────────

func _find_target(
		pos: Vector2i,
		_my_cells: Dictionary,
		enemy_cells: Dictionary) -> Vector2i:
	var best_pos := Vector2i(-1, -1)
	var best_dist: int = 999

	for epos in enemy_cells:
		var dist: int = _manhattan(pos, epos)
		if dist < best_dist:
			best_dist = dist
			best_pos = epos

	return best_pos


func _manhattan(a: Vector2i, b: Vector2i) -> int:
	return abs(a.x - b.x) + abs(a.y - b.y)


func _is_in_range(attacker: Dictionary, from_pos: Vector2i, target_pos: Vector2i) -> bool:
	var attack_range: int = attacker.get("range", 1)
	return _manhattan(from_pos, target_pos) <= attack_range
