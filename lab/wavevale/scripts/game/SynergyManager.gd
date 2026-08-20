extends Node
# WAVEVALE — SynergyManager
# Calcule les synergies actives à partir des unités sur le board.
# Node (pas autoload) — instancié par la scène principale.

const MAX_BONUS_LEVEL: int = 2

# Index de départ de la zone joueur dans ally_board (row 5)
const _PLAYER_ZONE_START: int = 25  # PLAYER_START_ROW(5) × BOARD_COLS(5)
const _BOARD_SIZE: int = 50         # BOARD_ROWS(10) × BOARD_COLS(5)


# ── API publique ──────────────────────────────────────────────────────────────

# Retourne { "Knight": 3, "Mage": 2, ... } pour les unités en zone joueur.
func compute_trait_counts(board: Array) -> Dictionary:
	var counts: Dictionary = {}
	for i in range(_PLAYER_ZONE_START, _BOARD_SIZE):
		if i >= board.size():
			break
		var unit = board[i]
		if unit == null or (unit is Dictionary and unit.is_empty()):
			continue
		_count_unit_traits(unit, counts)
	return counts


# Retourne { "Knight": { "count": 3, "level": 1 }, ... } (seulement level > 0).
func compute_active_synergies(board: Array) -> Dictionary:
	var counts: Dictionary = compute_trait_counts(board)
	var active: Dictionary = {}
	for trait_name in counts:
		var level: int = TraitData.get_active_level(trait_name, counts[trait_name])
		if level > 0:
			active[trait_name] = { "count": counts[trait_name], "level": level }
	return active


# Applique les bonus de synergies sur des copies d'unités (pour le combat).
# units = liste de dicts (modifiés en place).
# Retourne la liste modifiée.
func apply_synergy_bonuses(units: Array, synergies: Dictionary) -> Array:
	for unit in units:
		if unit.is_empty():
			continue
		_ensure_combat_fields(unit)
		_apply_unit_synergies(unit, synergies)
	return units


func get_priest_heal_amount(synergies: Dictionary) -> int:
	if not synergies.has("Priest"):
		return 0
	var level: int = synergies["Priest"].get("level", 0)
	if level == 1:
		return 5
	if level >= 2:
		return 15
	return 0


# ── Comptage des traits ───────────────────────────────────────────────────────

func _count_unit_traits(unit: Dictionary, counts: Dictionary) -> void:
	var traits: Array = unit.get("traits", [])
	for trait_name in traits:
		counts[trait_name] = counts.get(trait_name, 0) + 1
	# Bonus traits des items équipés
	var items: Array = unit.get("items", [])
	for item in items:
		var bonus_trait: String = item.get("bonus_trait", "")
		if bonus_trait != "":
			counts[bonus_trait] = counts.get(bonus_trait, 0) + 1


# ── Application des bonus ─────────────────────────────────────────────────────

func _ensure_combat_fields(unit: Dictionary) -> void:
	if not unit.has("_armor"):
		unit["_armor"] = 0
	if not unit.has("crit_chance"):
		unit["crit_chance"] = 0.0
	if not unit.has("dodge"):
		unit["dodge"] = 0.0
	if not unit.has("_undead_revives"):
		unit["_undead_revives"] = 0
	if not unit.has("_priest_heal"):
		unit["_priest_heal"] = 0
	if not unit.has("items"):
		unit["items"] = []


func _apply_unit_synergies(unit: Dictionary, synergies: Dictionary) -> void:
	var traits: Array = unit.get("traits", [])
	for trait_name in traits:
		if not synergies.has(trait_name):
			continue
		var level: int = synergies[trait_name].get("level", 0)
		if level <= 0:
			continue
		_apply_trait_bonus(trait_name, level, unit)


func _apply_trait_bonus(trait_name: String, level: int, unit: Dictionary) -> void:
	match trait_name:
		"Knight":
			_apply_knight(level, unit)
		"Mage":
			_apply_mage(level, unit)
		"Ranger":
			_apply_ranger(level, unit)
		"Warrior":
			_apply_warrior(level, unit)
		"Rogue":
			_apply_rogue(level, unit)
		"Priest":
			_apply_priest(level, unit)
		"Demon":
			pass  # Géré à la mort par CombatEngine
		"Elf":
			_apply_elf(level, unit)
		"Dragon":
			_apply_dragon(level, unit)
		"Undead":
			_apply_undead(level, unit)


func _apply_knight(level: int, unit: Dictionary) -> void:
	if level == 1:
		unit["_armor"] = unit.get("_armor", 0) + 30
	elif level >= 2:
		unit["_armor"] = unit.get("_armor", 0) + 60


func _apply_mage(level: int, unit: Dictionary) -> void:
	if level == 1:
		unit["atk"] = int(unit.get("atk", 0) * 1.25)
	elif level >= 2:
		unit["atk"] = int(unit.get("atk", 0) * 1.50)


func _apply_ranger(level: int, unit: Dictionary) -> void:
	if level == 1:
		unit["atk"] = int(unit.get("atk", 0) * 1.20)
	elif level >= 2:
		unit["atk"] = int(unit.get("atk", 0) * 1.35)
	# range bonus géré par CombatEngine via le niveau de synergie


func _apply_warrior(level: int, unit: Dictionary) -> void:
	var multiplier: float = 1.30 if level == 1 else 1.60
	var new_max_hp: int = int(unit.get("max_hp", 0) * multiplier)
	unit["hp"] = mini(unit.get("hp", 0), new_max_hp)
	unit["max_hp"] = new_max_hp


func _apply_rogue(level: int, unit: Dictionary) -> void:
	if level == 1:
		unit["crit_chance"] = unit.get("crit_chance", 0.0) + 0.25
	elif level >= 2:
		unit["crit_chance"] = unit.get("crit_chance", 0.0) + 0.50


func _apply_priest(level: int, unit: Dictionary) -> void:
	if level == 1:
		unit["_priest_heal"] = 5
	elif level >= 2:
		unit["_priest_heal"] = 15


func _apply_elf(level: int, unit: Dictionary) -> void:
	if level >= 1:
		unit["dodge"] = unit.get("dodge", 0.0) + 0.25


func _apply_dragon(level: int, unit: Dictionary) -> void:
	if level >= 1:
		unit["atk"] = int(unit.get("atk", 0) * 1.50)
		var new_max_hp: int = int(unit.get("max_hp", 0) * 1.50)
		unit["hp"] = mini(unit.get("hp", 0), new_max_hp)
		unit["max_hp"] = new_max_hp


func _apply_undead(level: int, unit: Dictionary) -> void:
	unit["_undead_revives"] = level
