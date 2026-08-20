extends Node2D
# SurvivorSystems : boucle "survivor-like" (bullet-heaven) pour le proto snake.
# Autonome : gère ses propres noeuds (orbes XP, HUD, UI level-up, fin de run, timer).
#
# AJOUTS v3:
#   - UPGRADE_POOL étendu ~20 cartes: weapon/skill/passive/serpent avec rareté + reroll
#   - Rareté: 1=commun, 2=rare, 3=légendaire — tirage pondéré
#   - Cartes affichent catégorie, titre, description et couleur de rareté
#   - Reroll: 1 par niveau — bouton "REROLL (N)"
#   - elite_spawn_interval: var publique (Main peut la modifier pour Phase 2)

signal spawn_request(n: int)
signal spawn_type_request(n: int, type: int)
signal level_up_started()
signal upgrade_chosen(id: String)
signal run_ended(victory: bool, stats: Dictionary)

const RUN_DURATION: float = 900.0
const MAGNET_RADIUS_BASE: float = 120.0
const PICKUP_RADIUS_BASE: float = 26.0
const MAGNET_ACCEL: float = 900.0
const MAGNET_MAX_SPEED: float = 700.0
const ORB_DRAW_RADIUS: float = 5.0
const ORB_VALUE: int = 1
const MAX_ORBS: int = 4000

const WAVE_INTERVAL_START: float = 2.6
const WAVE_INTERVAL_END: float = 0.45
const WAVE_COUNT_START: int = 2
const WAVE_COUNT_END: int = 22

# Boss spawns at this run time (seconds)
const BOSS_SPAWN_TIME: float = 300.0   # 5 min

# Elite interval — public var so Main can adjust for Phase 2
var elite_spawn_interval: float = 25.0

var running: bool = false
var run_time: float = 0.0
var level: int = 1
var xp: int = 0
var xp_to_next: int = 8
var total_xp: int = 0
var orbs_collected: int = 0
var enemies_killed: int = 0

var pickup_radius_mult: float = 1.0
var magnet_radius_mult: float = 1.0
var xp_gain_mult: float = 1.0

var orb_pos: PackedVector2Array = PackedVector2Array()
var orb_vel: PackedVector2Array = PackedVector2Array()

var _wave_accum: float = 0.0
var _elite_accum: float = 0.0
var _boss_spawned: bool = false

# Reroll state (reset each level-up)
var _rerolls_left: int = 0
var _current_level_choices: Array = []   # saved so reroll can re-pick

# ── Floating damage numbers ────────────────────────────────────────────────────
class DmgNum:
	var pos: Vector2
	var vel: Vector2
	var amount: int
	var col: Color
	var age: float = 0.0
	var life: float = 0.9

var _dmg_nums: Array = []

# ── Level-up flash ────────────────────────────────────────────────────────────
var _flash_alpha: float = 0.0

# ── Screenshake state ─────────────────────────────────────────────────────────
var _shake_intensity: float = 0.0
var _shake_time: float = 0.0
var _camera_offset: Vector2 = Vector2.ZERO

var _orb_drawer: Node2D
var _hud_layer: CanvasLayer
var _hud_label: Label
var _xp_bar_bg: ColorRect
var _xp_bar_fill: ColorRect
var _boss_bar_container: Control
var _boss_bar_fill: ColorRect
var _boss_bar_label: Label
var _levelup_layer: CanvasLayer
var _end_layer: CanvasLayer
var _dmg_drawer: Node2D
var _flash_rect: ColorRect

var _rng := RandomNumberGenerator.new()

# ── Rarity colors ─────────────────────────────────────────────────────────────
const RARITY_COLOR := {
	1: Color(0.49, 0.54, 0.63),   # common — grey
	2: Color(0.36, 0.66, 1.00),   # rare   — blue
	3: Color(1.00, 0.83, 0.42),   # legendary — gold
}
const RARITY_NAME := {
	1: "COMMUN",
	2: "RARE",
	3: "LÉGENDAIRE",
}
const CAT_COLOR := {
	"weapon":  Color(0.20, 0.88, 0.82),
	"skill":   Color(1.00, 0.62, 0.24),
	"passive": Color(1.00, 0.42, 0.69),
	"serpent": Color(0.55, 1.00, 0.55),
}

# ── Upgrade pool (extended, ~20 cards with rarity + weight) ──────────────────
# Fields: id, cat, rarity, weight, title, desc
# weight: relative probability before rarity multiplier
# rarity mult: 1=1.0, 2=0.5, 3=0.2
const UPGRADE_POOL: Array = [
	# ── Serpent ──
	{"id": "damage",          "cat": "serpent",  "rarity": 1, "weight": 2.0,
		"title": "+Dégâts Constriction",  "desc": "Seuil de boucle réduit — piège les zones plus petites"},
	{"id": "constrict_size",  "cat": "serpent",  "rarity": 1, "weight": 2.5,
		"title": "BOUCLE ÉTROITE",        "desc": "Seuil de boucle -30% : piège même les petites zones"},
	{"id": "constrict_grow",  "cat": "serpent",  "rarity": 2, "weight": 1.4,
		"title": "CONSTRICTION +CORPS",   "desc": "Chaque constriction allonge le corps de +8 segments"},
	{"id": "pickup",          "cat": "serpent",  "rarity": 1, "weight": 2.4,
		"title": "+Rayon de ramassage",   "desc": "Aspire les orbes de plus loin"},
	{"id": "xp_magnet",       "cat": "serpent",  "rarity": 1, "weight": 2.2,
		"title": "AIMANT XP",             "desc": "Rayon d'aimant XP +40%"},
	{"id": "turn",            "cat": "serpent",  "rarity": 1, "weight": 2.0,
		"title": "+Braquage",             "desc": "Tourne plus vite pour boucler plus facilement"},
	{"id": "trail",           "cat": "serpent",  "rarity": 1, "weight": 1.8,
		"title": "+Longueur",             "desc": "Corps plus long — plus de puissance de constriction"},
	{"id": "speed",           "cat": "serpent",  "rarity": 1, "weight": 1.8,
		"title": "+Vitesse",              "desc": "Glisse plus vite"},
	{"id": "xp",              "cat": "serpent",  "rarity": 1, "weight": 2.0,
		"title": "+Gain d'XP",           "desc": "Gagne plus d'XP par orbe collecté"},
	# ── Armes ──
	{"id": "weapon_fire",     "cat": "weapon",   "rarity": 1, "weight": 2.0,
		"title": "FLÉAU DE FEU",          "desc": "Débloque l'arme Feu — explosion AoE brûlante"},
	{"id": "weapon_ice",      "cat": "weapon",   "rarity": 2, "weight": 1.6,
		"title": "FLÈCHE DE GLACE",       "desc": "Débloque l'arme Glace — ralentit les ennemis"},
	{"id": "weapon_lightning","cat": "weapon",   "rarity": 2, "weight": 1.5,
		"title": "ÉCLAIR EN CHAÎNE",      "desc": "Débloque Foudre — enchaîne jusqu'à 4 ennemis"},
	{"id": "fire_level",      "cat": "weapon",   "rarity": 2, "weight": 1.4,
		"title": "FEU NIV.+1",            "desc": "Dégâts et rayon de feu +20%"},
	{"id": "ice_level",       "cat": "weapon",   "rarity": 2, "weight": 1.3,
		"title": "GLACE NIV.+1",          "desc": "Dégâts et vitesse de glace +20%"},
	{"id": "lightning_level", "cat": "weapon",   "rarity": 2, "weight": 1.3,
		"title": "FOUDRE NIV.+1",         "desc": "Dégâts de foudre +20%"},
	# ── Skills ──
	{"id": "dash_power",      "cat": "skill",    "rarity": 1, "weight": 2.0,
		"title": "FLASH CONSTRICTION",    "desc": "Constriction : flash doré étendu, seuil encore réduit"},
	{"id": "nova_upgrade",    "cat": "skill",    "rarity": 3, "weight": 0.8,
		"title": "NOVA · SINGULARITÉ",    "desc": "Explosion constriction doublée en zone et dégâts"},
	# ── Passifs ──
	{"id": "hp_regen",        "cat": "passive",  "rarity": 2, "weight": 1.6,
		"title": "RÉGÉNÉRATION",          "desc": "+1.5 HP/s — récupère lentement tes points de vie"},
	{"id": "armor",           "cat": "passive",  "rarity": 2, "weight": 1.4,
		"title": "CARAPACE",              "desc": "Réduit les dégâts reçus de 20%"},
	{"id": "lifesteal",       "cat": "passive",  "rarity": 2, "weight": 1.5,
		"title": "VOL DE VIE",            "desc": "+2 HP par ennemi tué"},
	{"id": "energy_cap",      "cat": "passive",  "rarity": 1, "weight": 2.0,
		"title": "RÉSISTANCE",            "desc": "+5% de réduction de dégâts terrain"},
]

func _ready() -> void:
	_rng.randomize()
	_build_orb_drawer()
	_build_dmg_drawer()
	_build_hud()

# ============================================================
# API PUBLIQUE
# ============================================================

func start_run() -> void:
	running = true
	run_time = 0.0
	level = 1
	xp = 0
	xp_to_next = 8
	total_xp = 0
	orbs_collected = 0
	enemies_killed = 0
	pickup_radius_mult = 1.0
	magnet_radius_mult = 1.0
	xp_gain_mult = 1.0
	_wave_accum = 0.0
	_elite_accum = 0.0
	_boss_spawned = false
	elite_spawn_interval = 25.0
	orb_pos = PackedVector2Array()
	orb_vel = PackedVector2Array()
	_dmg_nums.clear()
	_shake_intensity = 0.0
	_flash_alpha = 0.0
	_close_levelup_ui()
	_close_end_ui()
	get_tree().paused = false
	_refresh_hud()
	if is_instance_valid(_orb_drawer):
		_orb_drawer.queue_redraw()

func add_xp(amount: int) -> void:
	if amount <= 0:
		return
	var gained: int = int(round(float(amount) * xp_gain_mult))
	if gained <= 0:
		gained = amount
	xp += gained
	total_xp += gained
	while xp >= xp_to_next:
		xp -= xp_to_next
		level += 1
		xp_to_next = _xp_curve(level)
		_trigger_level_up()
	_refresh_hud()

func drop_orbs(positions: PackedVector2Array) -> void:
	for p in positions:
		if orb_pos.size() >= MAX_ORBS:
			break
		orb_pos.append(p)
		orb_vel.append(Vector2.ZERO)
	if is_instance_valid(_orb_drawer):
		_orb_drawer.queue_redraw()

func drop_orbs_bonus(pos: Vector2, count: int) -> void:
	for i in range(count):
		if orb_pos.size() >= MAX_ORBS:
			break
		var offset := Vector2(_rng.randf_range(-18.0, 18.0), _rng.randf_range(-18.0, 18.0))
		orb_pos.append(pos + offset)
		orb_vel.append(Vector2(_rng.randf_range(-40.0, 40.0), _rng.randf_range(-40.0, 40.0)))
	if is_instance_valid(_orb_drawer):
		_orb_drawer.queue_redraw()

func on_enemy_killed(pos: Vector2, enemy_type: int, is_elite: bool) -> void:
	enemies_killed += 1
	if is_elite:
		drop_orbs_bonus(pos, 6)
	if enemy_type == 4:  # BOSS
		drop_orbs_bonus(pos, 25)

func add_screenshake(intensity: float) -> void:
	_shake_intensity = maxf(_shake_intensity, intensity)
	_shake_time = 0.3

func add_damage_number(pos: Vector2, amount: int, col: Color) -> void:
	var d := DmgNum.new()
	d.pos = pos
	d.vel = Vector2(_rng.randf_range(-20.0, 20.0), _rng.randf_range(-55.0, -25.0))
	d.amount = amount
	d.col = col
	d.age = 0.0
	d.life = 0.9
	_dmg_nums.append(d)
	if _dmg_drawer != null:
		_dmg_drawer.queue_redraw()

func update_systems(delta: float, snake_head: Vector2) -> void:
	if not running:
		return
	if get_tree().paused:
		return
	_update_orbs(delta, snake_head)
	_update_run_timer(delta)
	_update_wave_director(delta)
	_update_damage_numbers(delta)
	_update_screenshake(delta)
	_update_flash(delta)
	_refresh_hud()

func end_run_death() -> void:
	if not running:
		return
	running = false
	get_tree().paused = false
	var stats := _make_stats()
	emit_signal("run_ended", false, stats)
	_show_end_screen(false, stats)

# ── Screenshake ───────────────────────────────────────────────────────────────
func _update_screenshake(delta: float) -> void:
	if _shake_intensity <= 0.0:
		_camera_offset = Vector2.ZERO
		return
	_shake_time -= delta
	if _shake_time <= 0.0:
		_shake_intensity = 0.0
		_camera_offset = Vector2.ZERO
		return
	_camera_offset = Vector2(
		_rng.randf_range(-_shake_intensity, _shake_intensity),
		_rng.randf_range(-_shake_intensity, _shake_intensity)
	)
	if get_parent() != null:
		get_parent().position = _camera_offset

func _update_flash(delta: float) -> void:
	if _flash_alpha > 0.0:
		_flash_alpha = maxf(0.0, _flash_alpha - delta * 4.0)
		if is_instance_valid(_flash_rect):
			_flash_rect.modulate.a = _flash_alpha

# ── Damage numbers ─────────────────────────────────────────────────────────────
func _update_damage_numbers(delta: float) -> void:
	var i: int = _dmg_nums.size() - 1
	while i >= 0:
		var d: DmgNum = _dmg_nums[i]
		d.age += delta
		d.pos += d.vel * delta
		d.vel = d.vel.move_toward(Vector2.ZERO, 80.0 * delta)
		if d.age >= d.life:
			_dmg_nums.remove_at(i)
		i -= 1
	if is_instance_valid(_dmg_drawer):
		_dmg_drawer.queue_redraw()

# ── Orbes XP ──────────────────────────────────────────────────────────────────
func _update_orbs(delta: float, snake_head: Vector2) -> void:
	if orb_pos.size() == 0:
		return
	var magnet_r: float = MAGNET_RADIUS_BASE * magnet_radius_mult
	var pickup_r: float = PICKUP_RADIUS_BASE * pickup_radius_mult
	var magnet_r_sq: float = magnet_r * magnet_r
	var pickup_r_sq: float = pickup_r * pickup_r
	var i: int = orb_pos.size() - 1
	while i >= 0:
		var pos: Vector2 = orb_pos[i]
		var to_head: Vector2 = snake_head - pos
		var dist_sq: float = to_head.length_squared()
		if dist_sq <= pickup_r_sq:
			add_xp(ORB_VALUE)
			orbs_collected += 1
			_remove_orb(i)
			i -= 1
			continue
		var vel: Vector2 = orb_vel[i]
		if dist_sq <= magnet_r_sq and dist_sq > 0.0001:
			var dir: Vector2 = to_head / sqrt(dist_sq)
			vel += dir * MAGNET_ACCEL * delta
			if vel.length() > MAGNET_MAX_SPEED:
				vel = vel.normalized() * MAGNET_MAX_SPEED
		else:
			vel = vel.move_toward(Vector2.ZERO, MAGNET_ACCEL * 0.5 * delta)
		pos += vel * delta
		orb_pos[i] = pos
		orb_vel[i] = vel
		i -= 1
	if is_instance_valid(_orb_drawer):
		_orb_drawer.queue_redraw()

func _remove_orb(idx: int) -> void:
	orb_pos.remove_at(idx)
	orb_vel.remove_at(idx)

func _build_orb_drawer() -> void:
	_orb_drawer = Node2D.new()
	_orb_drawer.name = "OrbDrawer"
	_orb_drawer.z_index = 2
	_orb_drawer.draw.connect(_draw_orbs)
	add_child(_orb_drawer)

func _draw_orbs() -> void:
	var time: float = Time.get_ticks_msec() * 0.001
	for i in range(orb_pos.size()):
		var p: Vector2 = orb_pos[i]
		var pulse: float = (sin(time * 3.0 + float(i) * 0.7) + 1.0) * 0.5
		var glow_r: float = ORB_DRAW_RADIUS * 2.2 + pulse * 2.0
		_orb_drawer.draw_circle(p, glow_r, Color(0.30, 0.75, 1.0, 0.18 + pulse * 0.10))
		_orb_drawer.draw_circle(p, ORB_DRAW_RADIUS, Color(0.45, 0.85, 1.0, 0.92))
		_orb_drawer.draw_circle(p, ORB_DRAW_RADIUS * 0.45, Color(0.90, 0.97, 1.0, 1.0))

func _build_dmg_drawer() -> void:
	_dmg_drawer = Node2D.new()
	_dmg_drawer.name = "DmgNumDrawer"
	_dmg_drawer.z_index = 20
	_dmg_drawer.draw.connect(_draw_damage_numbers)
	add_child(_dmg_drawer)

func _draw_damage_numbers() -> void:
	for d: DmgNum in _dmg_nums:
		var t: float = 1.0 - (d.age / d.life)
		var col: Color = d.col
		col.a = t * t
		var scale: float = 1.0 + (1.0 - t) * 0.3
		var fs: int = int(14.0 * scale)
		fs = clampi(fs, 10, 22)
		_dmg_drawer.draw_string(
			ThemeDB.fallback_font,
			d.pos,
			str(d.amount),
			HORIZONTAL_ALIGNMENT_CENTER,
			-1,
			fs,
			col
		)

# ── XP / LEVEL ────────────────────────────────────────────────────────────────
func _xp_curve(lvl: int) -> int:
	return int(round(8.0 + 4.0 * float(lvl) + 0.6 * float(lvl) * float(lvl)))

func _trigger_level_up() -> void:
	_flash_alpha = 1.0
	if is_instance_valid(_flash_rect):
		_flash_rect.modulate.a = 1.0
	emit_signal("level_up_started")
	get_tree().paused = true
	_rerolls_left = 1
	_show_level_up_ui()

# ── UI LEVEL-UP ───────────────────────────────────────────────────────────────
func _show_level_up_ui() -> void:
	_close_levelup_ui()
	_levelup_layer = CanvasLayer.new()
	_levelup_layer.layer = 50
	_levelup_layer.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(_levelup_layer)

	var dim := ColorRect.new()
	dim.color = Color(0.02, 0.04, 0.06, 0.82)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_STOP
	dim.process_mode = Node.PROCESS_MODE_ALWAYS
	_levelup_layer.add_child(dim)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.process_mode = Node.PROCESS_MODE_ALWAYS
	_levelup_layer.add_child(center)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 18)
	vbox.process_mode = Node.PROCESS_MODE_ALWAYS
	center.add_child(vbox)

	# Title
	var title := Label.new()
	title.text = "NIVEAU %d" % level
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 32)
	title.add_theme_color_override("font_color", Color(1.0, 0.92, 0.35))
	title.process_mode = Node.PROCESS_MODE_ALWAYS
	vbox.add_child(title)

	var sub := Label.new()
	sub.text = "CHOISIS UNE AMÉLIORATION"
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.add_theme_font_size_override("font_size", 13)
	sub.add_theme_color_override("font_color", Color(0.55, 0.65, 0.75))
	sub.process_mode = Node.PROCESS_MODE_ALWAYS
	vbox.add_child(sub)

	# Cards row
	var choices: Array = _pick_upgrade_choices(3)
	_current_level_choices = choices
	var cards := HBoxContainer.new()
	cards.add_theme_constant_override("separation", 16)
	cards.process_mode = Node.PROCESS_MODE_ALWAYS
	vbox.add_child(cards)
	for def in choices:
		cards.add_child(_make_card(def))

	# Reroll button
	if _rerolls_left > 0:
		var reroll_btn := Button.new()
		reroll_btn.text = "REROLL (%d)" % _rerolls_left
		reroll_btn.custom_minimum_size = Vector2(200, 44)
		reroll_btn.add_theme_font_size_override("font_size", 14)
		reroll_btn.process_mode = Node.PROCESS_MODE_ALWAYS
		reroll_btn.pressed.connect(_reroll_level_up)
		vbox.add_child(reroll_btn)

func _reroll_level_up() -> void:
	_rerolls_left -= 1
	_show_level_up_ui()   # rebuilds UI with new choices, no reroll button if 0 left

# ── Weighted card picking ─────────────────────────────────────────────────────
func _pick_upgrade_choices(count: int) -> Array:
	# Rarity weight multipliers
	const RARITY_MULT: Array = [0.0, 1.0, 0.5, 0.2]   # idx by rarity 1/2/3

	# Build weighted pool
	var pool: Array = []
	for card in UPGRADE_POOL:
		var r: int = int(card.get("rarity", 1))
		var w: float = float(card.get("weight", 1.0)) * RARITY_MULT[clampi(r, 1, 3)]
		pool.append({"def": card, "w": w})

	# Weighted random pick without replacement
	var picks: Array = []
	var n: int = mini(count, pool.size())
	for _i in range(n):
		var total_w: float = 0.0
		for entry in pool:
			total_w += float(entry["w"])
		if total_w <= 0.0:
			break
		var roll: float = _rng.randf() * total_w
		var accum: float = 0.0
		var chosen_idx: int = 0
		for k in range(pool.size()):
			accum += float(pool[k]["w"])
			if accum >= roll:
				chosen_idx = k
				break
		picks.append(pool[chosen_idx]["def"])
		pool.remove_at(chosen_idx)

	return picks

# ── Card widget ───────────────────────────────────────────────────────────────
func _make_card(def: Dictionary) -> Button:
	var id: String = String(def.get("id", ""))
	var cat: String = String(def.get("cat", "serpent"))
	var rarity: int = int(def.get("rarity", 1))
	var title_text: String = String(def.get("title", id))
	var desc_text: String = String(def.get("desc", ""))

	var rarity_col: Color = RARITY_COLOR.get(rarity, Color(0.5, 0.5, 0.5))
	var cat_col: Color = CAT_COLOR.get(cat, Color(0.8, 0.8, 0.8))

	# Container button
	var btn := Button.new()
	btn.custom_minimum_size = Vector2(220, 155)
	btn.process_mode = Node.PROCESS_MODE_ALWAYS
	# Left accent bar via modulate — we draw a margin strip using the button's style
	btn.add_theme_color_override("font_color", Color(0.95, 0.98, 1.0))
	btn.pressed.connect(_on_card_pressed.bind(id))

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_right", 10)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_bottom", 10)
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.process_mode = Node.PROCESS_MODE_ALWAYS
	btn.add_child(margin)

	var inner := VBoxContainer.new()
	inner.add_theme_constant_override("separation", 5)
	inner.mouse_filter = Control.MOUSE_FILTER_IGNORE
	inner.process_mode = Node.PROCESS_MODE_ALWAYS
	margin.add_child(inner)

	# Category row
	var cat_row := HBoxContainer.new()
	cat_row.add_theme_constant_override("separation", 8)
	cat_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cat_row.process_mode = Node.PROCESS_MODE_ALWAYS
	inner.add_child(cat_row)

	var cat_label := Label.new()
	cat_label.text = cat.to_upper()
	cat_label.add_theme_font_size_override("font_size", 10)
	cat_label.add_theme_color_override("font_color", cat_col)
	cat_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cat_label.process_mode = Node.PROCESS_MODE_ALWAYS
	cat_row.add_child(cat_label)

	var rare_label := Label.new()
	rare_label.text = RARITY_NAME.get(rarity, "")
	rare_label.add_theme_font_size_override("font_size", 10)
	rare_label.add_theme_color_override("font_color", rarity_col)
	rare_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	rare_label.process_mode = Node.PROCESS_MODE_ALWAYS
	cat_row.add_child(rare_label)

	# Title
	var title_lbl := Label.new()
	title_lbl.text = title_text
	title_lbl.add_theme_font_size_override("font_size", 16)
	title_lbl.add_theme_color_override("font_color", Color(1.0, 0.96, 0.80))
	title_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	title_lbl.process_mode = Node.PROCESS_MODE_ALWAYS
	inner.add_child(title_lbl)

	# Separator bar using the rarity color
	var sep := ColorRect.new()
	sep.color = Color(rarity_col.r, rarity_col.g, rarity_col.b, 0.55)
	sep.custom_minimum_size = Vector2(0, 2)
	sep.mouse_filter = Control.MOUSE_FILTER_IGNORE
	sep.process_mode = Node.PROCESS_MODE_ALWAYS
	inner.add_child(sep)

	# Description
	var desc_lbl := Label.new()
	desc_lbl.text = desc_text
	desc_lbl.add_theme_font_size_override("font_size", 12)
	desc_lbl.add_theme_color_override("font_color", Color(0.72, 0.80, 0.88))
	desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	desc_lbl.process_mode = Node.PROCESS_MODE_ALWAYS
	inner.add_child(desc_lbl)

	return btn

func _on_card_pressed(id: String) -> void:
	# Handle locally-managed upgrades
	match id:
		"pickup":
			pickup_radius_mult += 0.30
			magnet_radius_mult += 0.20
		"xp":
			xp_gain_mult += 0.25
		"xp_magnet":
			magnet_radius_mult += 0.40
		"constrict_size":
			pass   # handled in Main via upgrade_chosen
		"constrict_grow":
			pass   # handled in Main via upgrade_chosen
		_:
			pass
	emit_signal("upgrade_chosen", id)
	_close_levelup_ui()
	get_tree().paused = false
	_refresh_hud()

func _close_levelup_ui() -> void:
	if is_instance_valid(_levelup_layer):
		_levelup_layer.queue_free()
	_levelup_layer = null

# ── WAVE DIRECTOR ──────────────────────────────────────────────────────────────
func _update_wave_director(delta: float) -> void:
	var t: float = clampf(run_time / RUN_DURATION, 0.0, 1.0)
	var interval: float = lerpf(WAVE_INTERVAL_START, WAVE_INTERVAL_END, t)
	var count: int = int(round(lerpf(float(WAVE_COUNT_START), float(WAVE_COUNT_END), t)))
	count = maxi(1, count)
	_wave_accum += delta
	while _wave_accum >= interval:
		_wave_accum -= interval
		emit_signal("spawn_request", count)
	# Elite spawns after 2 min (interval is public — Main can adjust for Phase 2)
	if run_time > 120.0:
		_elite_accum += delta
		if _elite_accum >= elite_spawn_interval:
			_elite_accum = 0.0
			emit_signal("spawn_type_request", 1, 3)  # TYPE_ELITE=3
	# Boss at 5 min
	if not _boss_spawned and run_time >= BOSS_SPAWN_TIME:
		_boss_spawned = true
		emit_signal("spawn_type_request", 1, 4)  # TYPE_BOSS=4

# ── RUN TIMER ─────────────────────────────────────────────────────────────────
func _update_run_timer(delta: float) -> void:
	run_time += delta
	if run_time >= RUN_DURATION:
		run_time = RUN_DURATION
		_win_run()

func _win_run() -> void:
	if not running:
		return
	running = false
	get_tree().paused = false
	var stats := _make_stats()
	emit_signal("run_ended", true, stats)
	_show_end_screen(true, stats)

func _make_stats() -> Dictionary:
	return {
		"time_survived": run_time,
		"level": level,
		"xp": xp,
		"total_xp": total_xp,
		"orbs_collected": orbs_collected,
		"enemies_killed": enemies_killed,
	}

# ── END SCREEN ────────────────────────────────────────────────────────────────
func _show_end_screen(victory: bool, stats: Dictionary) -> void:
	_close_end_ui()
	_end_layer = CanvasLayer.new()
	_end_layer.layer = 60
	_end_layer.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(_end_layer)
	var dim := ColorRect.new()
	dim.color = Color(0.02, 0.03, 0.05, 0.88)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_STOP
	dim.process_mode = Node.PROCESS_MODE_ALWAYS
	_end_layer.add_child(dim)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.process_mode = Node.PROCESS_MODE_ALWAYS
	_end_layer.add_child(center)
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 18)
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.process_mode = Node.PROCESS_MODE_ALWAYS
	center.add_child(vbox)
	var title := Label.new()
	title.text = "VICTOIRE !" if victory else "FIN DE PARTIE"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 42)
	title.add_theme_color_override("font_color", Color(0.55, 1.0, 0.65) if victory else Color(1.0, 0.40, 0.40))
	title.process_mode = Node.PROCESS_MODE_ALWAYS
	vbox.add_child(title)
	var info := Label.new()
	var mins: int = int(stats.get("time_survived", 0.0)) / 60
	var secs: int = int(stats.get("time_survived", 0.0)) % 60
	info.text = "Temps : %02d:%02d  |  Niveau : %d  |  XP : %d  |  Tués : %d" % [
		mins, secs,
		int(stats.get("level", 0)),
		int(stats.get("total_xp", 0)),
		int(stats.get("enemies_killed", 0))
	]
	info.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	info.add_theme_font_size_override("font_size", 20)
	info.add_theme_color_override("font_color", Color(0.92, 0.96, 1.0))
	info.process_mode = Node.PROCESS_MODE_ALWAYS
	vbox.add_child(info)
	var restart := Button.new()
	restart.text = "Rejouer"
	restart.custom_minimum_size = Vector2(180, 56)
	restart.add_theme_font_size_override("font_size", 22)
	restart.process_mode = Node.PROCESS_MODE_ALWAYS
	restart.pressed.connect(_on_restart_pressed)
	vbox.add_child(restart)

func _on_restart_pressed() -> void:
	get_tree().paused = false
	_close_end_ui()
	if get_parent() != null:
		get_parent().position = Vector2.ZERO
	var err: int = get_tree().reload_current_scene()
	if err != OK:
		start_run()

func _close_end_ui() -> void:
	if is_instance_valid(_end_layer):
		_end_layer.queue_free()
	_end_layer = null

# ── HUD ───────────────────────────────────────────────────────────────────────
func _build_hud() -> void:
	_hud_layer = CanvasLayer.new()
	_hud_layer.layer = 10
	add_child(_hud_layer)

	_flash_rect = ColorRect.new()
	_flash_rect.color = Color(0.85, 0.90, 1.0, 0.0)
	_flash_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_flash_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_flash_rect.modulate.a = 0.0
	_hud_layer.add_child(_flash_rect)

	var bar_w: float = 520.0
	var bar_h: float = 16.0
	_xp_bar_bg = ColorRect.new()
	_xp_bar_bg.color = Color(0.06, 0.08, 0.12, 0.88)
	_xp_bar_bg.custom_minimum_size = Vector2(bar_w, bar_h)
	_xp_bar_bg.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_xp_bar_bg.position = Vector2(-bar_w * 0.5, -48.0)
	_xp_bar_bg.size = Vector2(bar_w, bar_h)
	_xp_bar_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hud_layer.add_child(_xp_bar_bg)
	_xp_bar_fill = ColorRect.new()
	_xp_bar_fill.color = Color(0.35, 0.80, 1.0, 0.95)
	_xp_bar_fill.position = Vector2(0, 0)
	_xp_bar_fill.size = Vector2(0.0, bar_h)
	_xp_bar_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_xp_bar_bg.add_child(_xp_bar_fill)

	_hud_label = Label.new()
	_hud_label.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_hud_label.position = Vector2(-260.0, -82.0)
	_hud_label.size = Vector2(520.0, 28.0)
	_hud_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hud_label.add_theme_font_size_override("font_size", 18)
	_hud_label.add_theme_color_override("font_color", Color(0.92, 0.96, 1.0))
	_hud_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hud_layer.add_child(_hud_label)

	_boss_bar_container = Control.new()
	_boss_bar_container.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_boss_bar_container.position = Vector2(-200.0, 14.0)
	_boss_bar_container.size = Vector2(400.0, 36.0)
	_boss_bar_container.visible = false
	_boss_bar_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hud_layer.add_child(_boss_bar_container)

	_boss_bar_label = Label.new()
	_boss_bar_label.text = "BOSS"
	_boss_bar_label.position = Vector2(0, 0)
	_boss_bar_label.size = Vector2(400.0, 16.0)
	_boss_bar_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_boss_bar_label.add_theme_font_size_override("font_size", 14)
	_boss_bar_label.add_theme_color_override("font_color", Color(1.0, 0.85, 0.20))
	_boss_bar_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_boss_bar_container.add_child(_boss_bar_label)

	var boss_bg := ColorRect.new()
	boss_bg.color = Color(0.06, 0.08, 0.12, 0.88)
	boss_bg.position = Vector2(0, 18.0)
	boss_bg.size = Vector2(400.0, 14.0)
	boss_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_boss_bar_container.add_child(boss_bg)

	_boss_bar_fill = ColorRect.new()
	_boss_bar_fill.color = Color(0.95, 0.75, 0.10)
	_boss_bar_fill.position = Vector2(0, 0)
	_boss_bar_fill.size = Vector2(400.0, 14.0)
	_boss_bar_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	boss_bg.add_child(_boss_bar_fill)

	_refresh_hud()

func _refresh_hud() -> void:
	if not is_instance_valid(_hud_label):
		return
	var mins: int = int(run_time) / 60
	var secs: int = int(run_time) % 60
	_hud_label.text = "Niv.%d  —  %02d:%02d  —  XP %d/%d" % [level, mins, secs, xp, xp_to_next]
	if is_instance_valid(_xp_bar_fill) and is_instance_valid(_xp_bar_bg):
		var frac: float = 0.0
		if xp_to_next > 0:
			frac = clampf(float(xp) / float(xp_to_next), 0.0, 1.0)
		_xp_bar_fill.size = Vector2(_xp_bar_bg.size.x * frac, _xp_bar_bg.size.y)

func update_boss_hud(hp_frac: float, shield_frac: float, boss_alive: bool) -> void:
	if not is_instance_valid(_boss_bar_container):
		return
	_boss_bar_container.visible = boss_alive
	if not boss_alive:
		return
	if is_instance_valid(_boss_bar_fill) and is_instance_valid(_boss_bar_fill.get_parent()):
		_boss_bar_fill.size = Vector2(400.0 * hp_frac, _boss_bar_fill.get_parent().size.y)
	if is_instance_valid(_boss_bar_label):
		if shield_frac > 0.0:
			_boss_bar_label.text = "BOSS — Bouclier %d%%" % int(shield_frac * 100)
			_boss_bar_fill.color = Color(0.50, 0.80, 1.0)
		else:
			_boss_bar_label.text = "BOSS — %d%%" % int(hp_frac * 100)
			_boss_bar_fill.color = Color(0.95, 0.75, 0.10)
