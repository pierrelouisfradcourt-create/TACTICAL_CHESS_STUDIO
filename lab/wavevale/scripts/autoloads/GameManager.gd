extends Node
# WAVEVALE — GameManager
# Singleton global. Gère tout l'état de la partie.

# ── Signaux ───────────────────────────────────────────────────────────────────
signal phase_changed(phase: String)
signal gold_changed(amount: int)
signal hp_changed(amount: int)
signal wave_changed(wave: int)
signal level_changed(level: int)
signal shop_refreshed()
signal bench_changed(bench: Array)
signal items_dropped(items: Array)
signal combat_result(won: bool, damage: int, gold_earned: int)

# ── État partie ───────────────────────────────────────────────────────────────
var hp: int = 100
var gold: int = 8
var wave: int = 0
var level: int = 1
var xp: int = 0
var xp_needed: int = 4
var kills: int = 0
var phase: String = "title"  # "title" | "prep" | "combat" | "result"
var shop_frozen: bool = false

# Board : ally_board[row*5+col] = unit dict ou null
# Rows 5–9 = player zone (prep), rows 0–4 = enemy zone (combat only)
var ally_board: Array = []   # 10 rows × 5 cols = 50 cells
var enemy_board: Array = []  # 10×5, rempli pendant combat
var bench: Array = []        # 7 slots
var shop_units: Array = []   # unités actuelles dans le shop
var pending_items: Array = []  # items à distribuer après combat
var unit_pool: Array = []    # pool de copies disponibles

const BOARD_ROWS: int = 10
const BOARD_COLS: int = 5
const PLAYER_START_ROW: int = 5   # rows 5–9 = player zone
const BENCH_SIZE: int = 7

# UID interne croissant
var _uid_counter: int = 0


func _ready() -> void:
	_init_boards()


func _init_boards() -> void:
	ally_board = []
	enemy_board = []
	for i in range(BOARD_ROWS * BOARD_COLS):
		ally_board.append(null)
		enemy_board.append(null)
	bench = []
	for i in range(BENCH_SIZE):
		bench.append(null)


# ── Contrôle de partie ────────────────────────────────────────────────────────

func start_game() -> void:
	hp = 100
	gold = 8
	wave = 0
	level = 1
	xp = 0
	xp_needed = 4
	kills = 0
	shop_frozen = false
	pending_items = []
	shop_units = []
	_uid_counter = 0
	_init_boards()
	build_pool()
	phase = "prep"
	next_wave()


func build_pool() -> void:
	unit_pool = []
	for unit_id in UnitData.UNIT_POOL:
		var template: Dictionary = UnitData.UNIT_POOL[unit_id]
		var count: int = template.get("pool_size", 10)
		for _i in range(count):
			unit_pool.append(unit_id)


func next_wave() -> void:
	wave += 1
	xp += 2
	check_level_up()
	if not shop_frozen:
		refresh_shop()
	shop_frozen = false
	emit_signal("phase_changed", "prep")
	emit_signal("wave_changed", wave)


# ── Shop ──────────────────────────────────────────────────────────────────────

func refresh_shop() -> void:
	shop_units = []
	var slots: int = mini(4 + level, 7)
	@warning_ignore("integer_division")
	var max_cost: int = mini(5, 1 + level / 2)
	var candidates: Array = _build_shop_candidates(max_cost)
	candidates.shuffle()
	var added: int = 0
	for candidate_id in candidates:
		if added >= slots:
			break
		var template: Dictionary = UnitData.get_unit_template(candidate_id)
		shop_units.append(template.duplicate())
		added += 1
	# Complète avec null si pas assez de candidats
	while shop_units.size() < slots:
		shop_units.append(null)
	emit_signal("shop_refreshed")


func get_shop() -> Array:
	return shop_units


func _build_shop_candidates(max_cost: int) -> Array:
	var candidates: Array = []
	for unit_id in unit_pool:
		var template: Dictionary = UnitData.get_unit_template(unit_id)
		if template.get("cost", 99) <= max_cost:
			candidates.append(unit_id)
	return candidates


func buy_unit(shop_index: int) -> bool:
	if shop_index < 0 or shop_index >= shop_units.size():
		return false
	var unit: Dictionary = shop_units[shop_index]
	if unit.is_empty():
		return false
	if gold < unit.get("cost", 0):
		return false
	var bench_slot: int = _find_free_bench_slot()
	if bench_slot == -1:
		return false
	gold -= unit["cost"]
	shop_units[shop_index] = null
	var new_unit: Dictionary = _create_unit_instance(unit)
	bench[bench_slot] = new_unit
	check_merge(new_unit)
	emit_signal("gold_changed", gold)
	emit_signal("bench_changed", bench)
	return true


func _create_unit_instance(template: Dictionary) -> Dictionary:
	var u: Dictionary = template.duplicate()
	_uid_counter += 1
	u["uid"] = _uid_counter
	u["hp"] = u.get("max_hp", 100)
	u["star"] = u.get("star", 1)
	u["items"] = []
	u["_armor"] = 0
	u["crit_chance"] = 0.0
	u["dodge"] = 0.0
	u["_undead_revives"] = 0
	u["_priest_heal"] = 0
	return u


func _find_free_bench_slot() -> int:
	for i in range(BENCH_SIZE):
		if bench[i] == null:
			return i
	return -1


func sell_unit(source: String, index: int) -> void:
	var unit: Dictionary = {}
	if source == "bench":
		if index < 0 or index >= bench.size():
			return
		unit = bench[index]
		if unit.is_empty():
			return
		bench[index] = null
	elif source == "board":
		if index < 0 or index >= ally_board.size():
			return
		unit = ally_board[index]
		if unit == null or unit.is_empty():
			return
		ally_board[index] = null
	else:
		return
	gold += unit.get("cost", 1) * unit.get("star", 1)
	emit_signal("gold_changed", gold)
	emit_signal("bench_changed", bench)


func buy_xp() -> void:
	if gold < 4:
		return
	gold -= 4
	xp += 4
	check_level_up()
	emit_signal("gold_changed", gold)


func check_level_up() -> void:
	while xp >= xp_needed and level < 9:
		xp -= xp_needed
		level += 1
		xp_needed = level * 4
		emit_signal("level_changed", level)
		refresh_shop()


func reroll_shop() -> void:
	if gold < 2:
		return
	gold -= 2
	shop_frozen = false
	refresh_shop()
	emit_signal("gold_changed", gold)


func toggle_freeze() -> void:
	shop_frozen = !shop_frozen


# ── Board ─────────────────────────────────────────────────────────────────────

func place_unit(unit: Dictionary, row: int, col: int) -> bool:
	if row < PLAYER_START_ROW or row >= BOARD_ROWS:
		return false
	if col < 0 or col >= BOARD_COLS:
		return false
	var cell_index: int = row * BOARD_COLS + col
	if board_unit_count() >= max_board_units():
		if ally_board[cell_index] == null:
			return false
	ally_board[cell_index] = unit
	return true


func place_unit_from_bench(bench_index: int, row: int, col: int) -> bool:
	if bench_index < 0 or bench_index >= bench.size():
		return false
	var unit = bench[bench_index]
	if unit == null or (unit is Dictionary and unit.is_empty()):
		return false
	if not place_unit(unit, row, col):
		return false
	bench[bench_index] = null
	emit_signal("bench_changed", bench)
	return true


func move_unit_on_board(from_row: int, from_col: int, to_row: int, to_col: int) -> void:
	var from_index: int = from_row * BOARD_COLS + from_col
	var to_index: int = to_row * BOARD_COLS + to_col
	var tmp = ally_board[from_index]
	ally_board[from_index] = ally_board[to_index]
	ally_board[to_index] = tmp


func return_to_bench(row: int, col: int) -> bool:
	var cell_index: int = row * BOARD_COLS + col
	var unit = ally_board[cell_index]
	if unit == null or (unit is Dictionary and unit.is_empty()):
		return false
	var bench_slot: int = _find_free_bench_slot()
	if bench_slot == -1:
		return false
	bench[bench_slot] = unit
	ally_board[cell_index] = null
	return true


func max_board_units() -> int:
	return mini(level + 2, 8)


func board_unit_count() -> int:
	var count: int = 0
	for row in range(PLAYER_START_ROW, BOARD_ROWS):
		for col in range(BOARD_COLS):
			if ally_board[row * BOARD_COLS + col] != null:
				count += 1
	return count


func get_board_unit(row: int, col: int) -> Dictionary:
	if row < 0 or row >= BOARD_ROWS or col < 0 or col >= BOARD_COLS:
		return {}
	var cell = ally_board[row * BOARD_COLS + col]
	if cell == null:
		return {}
	return cell


# ── Économie ──────────────────────────────────────────────────────────────────

func compute_interests() -> int:
	@warning_ignore("integer_division")
	return mini(gold / 10, 5)


# ── Post-combat ───────────────────────────────────────────────────────────────

func apply_post_combat_heal() -> void:
	_heal_units_in_board()
	_heal_units_in_bench()


func _heal_units_in_board() -> void:
	for row in range(PLAYER_START_ROW, BOARD_ROWS):
		for col in range(BOARD_COLS):
			var unit = ally_board[row * BOARD_COLS + col]
			if unit != null and not unit.is_empty():
				var max_hp: int = unit.get("max_hp", 1)
				unit["hp"] = mini(max_hp, unit.get("hp", 0) + int(max_hp * 0.40))


func _heal_units_in_bench() -> void:
	for i in range(BENCH_SIZE):
		var unit = bench[i]
		if unit != null and not unit.is_empty():
			var max_hp: int = unit.get("max_hp", 1)
			unit["hp"] = mini(max_hp, unit.get("hp", 0) + int(max_hp * 0.40))


func resurrect_dead_units(dead_units: Array) -> void:
	for unit in dead_units:
		if unit.is_empty():
			continue
		var max_hp: int = unit.get("max_hp", 1)
		unit["hp"] = int(max_hp * 0.30)
		var bench_slot: int = _find_free_bench_slot()
		if bench_slot != -1:
			bench[bench_slot] = unit
		# sinon l'unité est perdue


func award_post_combat(won: bool, surviving_enemies: int, combat_kills: int) -> void:
	var gold_earned: int = 3 + mini(wave, 5) + compute_interests()
	gold += gold_earned
	var damage: int = 0
	if not won:
		damage = 2 + surviving_enemies
		hp -= damage
		emit_signal("hp_changed", hp)
	kills += combat_kills
	pending_items = _generate_post_combat_items()
	emit_signal("gold_changed", gold)
	emit_signal("combat_result", won, damage, gold_earned)
	emit_signal("items_dropped", pending_items)


func _generate_post_combat_items() -> Array:
	var items: Array = []
	var count: int = 1 if wave < 5 else 2
	for _i in range(count):
		items.append(ItemData.get_random_drop(wave))
	return items


# ── Merge ─────────────────────────────────────────────────────────────────────

func check_merge(unit: Dictionary) -> void:
	if unit.is_empty():
		return
	var unit_id: String = unit.get("id", "")
	var unit_star: int = unit.get("star", 1)
	var copies: Array = _find_all_copies(unit_id, unit_star)
	if copies.size() < 3:
		return
	_remove_copies(copies.slice(0, 3))
	var upgraded: Dictionary = _create_upgraded_unit(unit, unit_star)
	var bench_slot: int = _find_free_bench_slot()
	if bench_slot != -1:
		bench[bench_slot] = upgraded
	emit_signal("bench_changed", bench)
	check_merge(upgraded)


func _find_all_copies(unit_id: String, star: int) -> Array:
	var copies: Array = []
	for i in range(ally_board.size()):
		var u = ally_board[i]
		if u != null and not u.is_empty():
			if u.get("id") == unit_id and u.get("star") == star:
				copies.append({"source": "board", "index": i})
	for i in range(BENCH_SIZE):
		var u = bench[i]
		if u != null and not u.is_empty():
			if u.get("id") == unit_id and u.get("star") == star:
				copies.append({"source": "bench", "index": i})
	return copies


func _remove_copies(copies: Array) -> void:
	for entry in copies:
		var source: String = entry["source"]
		var index: int = entry["index"]
		if source == "board":
			ally_board[index] = null
		else:
			bench[index] = null


func _create_upgraded_unit(base: Dictionary, old_star: int) -> Dictionary:
	var u: Dictionary = base.duplicate()
	u["star"] = old_star + 1
	var new_max_hp: int = int(u.get("max_hp", 100) * 1.8)
	u["max_hp"] = new_max_hp
	u["hp"] = new_max_hp
	u["atk"] = int(u.get("atk", 10) * 1.8)
	_uid_counter += 1
	u["uid"] = _uid_counter
	u["items"] = []
	u["_armor"] = 0
	u["crit_chance"] = 0.0
	u["dodge"] = 0.0
	u["_undead_revives"] = 0
	u["_priest_heal"] = 0
	return u


# ── Items ─────────────────────────────────────────────────────────────────────

func equip_item(item: Dictionary, unit: Dictionary) -> bool:
	if item.is_empty() or unit.is_empty():
		return false
	if not unit.has("items"):
		unit["items"] = []
	if unit["items"].size() >= 2:
		return false
	unit["items"].append(item)
	_apply_item_bonuses(item, unit)
	pending_items.erase(item)
	return true


func _apply_item_bonuses(item: Dictionary, unit: Dictionary) -> void:
	unit["atk"] = unit.get("atk", 0) + item.get("atk_flat", 0)
	unit["_armor"] = unit.get("_armor", 0) + item.get("armor_flat", 0)
	var hp_flat: int = item.get("hp_flat", 0)
	if hp_flat > 0:
		unit["max_hp"] = unit.get("max_hp", 0) + hp_flat
		unit["hp"] = unit.get("hp", 0) + hp_flat
	var atk_pct: float = item.get("atk_pct", 0.0)
	if atk_pct > 0.0:
		unit["atk"] = int(unit.get("atk", 0) * (1.0 + atk_pct))
	var hp_pct: float = item.get("hp_pct", 0.0)
	if hp_pct > 0.0:
		var bonus: int = int(unit.get("max_hp", 0) * hp_pct)
		unit["max_hp"] = unit.get("max_hp", 0) + bonus
		unit["hp"] = unit.get("hp", 0) + bonus
	unit["dodge"] = unit.get("dodge", 0.0) + item.get("dodge", 0.0)


# ── Fin de partie ─────────────────────────────────────────────────────────────

func is_game_over() -> bool:
	return hp <= 0


func is_victory() -> bool:
	return wave >= 15 and phase == "result"
