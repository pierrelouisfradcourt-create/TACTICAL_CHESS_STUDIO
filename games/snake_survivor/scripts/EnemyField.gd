extends Node2D
# Champ d'ennemis data-oriented haute performance (bullet-heaven).
# Pas de Node2D par ennemi : un seul MultiMeshInstance2D + tableaux parallèles + free-list.
# Cible : 1000-3000 ennemis a 60fps.
#
# AJOUTS v3:
#   - TYPE_DASHER (5): fond lentement, dash en rafales vers le joueur
#   - TYPE_SPLITTER (6): éclate en 2 FODDERs à la mort (gen 0 seulement)
#   - Phase 2: signal phase2_started() à 3 min, vitesse +15%, élites plus fréquentes
#   - TYPE_COLORS/HP/SIZE_MULT/SPEEDS sont maintenant des var (étendables)

signal enemy_killed(pos: Vector2, enemy_type: int, is_elite: bool)
signal boss_phase_changed(phase: int)
signal damage_numbers_request(pos: Vector2, amount: int, col: Color)
signal phase2_started()

# ── Type enum ────────────────────────────────────────────────────────────────
const TYPE_FODDER    := 0
const TYPE_CHASER    := 1
const TYPE_ZONER     := 2
const TYPE_ELITE     := 3
const TYPE_BOSS      := 4
const TYPE_DASHER    := 5
const TYPE_SPLITTER  := 6

# These are vars so we can append entries for new types
var TYPE_COLORS: Array = [
	Color(0.95, 0.22, 0.26, 1.0),   # FODDER  — red
	Color(1.00, 0.55, 0.10, 1.0),   # CHASER  — orange
	Color(0.30, 0.55, 1.00, 1.0),   # ZONER   — blue
	Color(0.90, 0.20, 0.90, 1.0),   # ELITE   — magenta
	Color(0.95, 0.85, 0.10, 1.0),   # BOSS    — gold
	Color(1.00, 0.85, 0.15, 1.0),   # DASHER  — yellow
	Color(0.45, 1.00, 0.45, 1.0),   # SPLITTER — green
]

var TYPE_HP: Array = [
	1,    # FODDER
	2,    # CHASER
	3,    # ZONER
	12,   # ELITE
	200,  # BOSS
	3,    # DASHER
	5,    # SPLITTER
]

var TYPE_SIZE_MULT: Array = [1.0, 0.85, 0.9, 1.4, 3.0, 0.95, 1.2]

var TYPE_SPEEDS: Array = [58.0, 110.0, 45.0, 65.0, 30.0, 75.0, 50.0]

# ── Exports ───────────────────────────────────────────────────────────────────
@export var capacity: int = 3000
@export var speed: float = 58.0
@export var quad_size: float = 18.0
@export var enemy_radius: float = 9.0

# ── SoA arrays ───────────────────────────────────────────────────────────────
var positions  := PackedVector2Array()
var drifts     := PackedVector2Array()
var alive      := PackedByteArray()
var types      := PackedByteArray()
var hp         := PackedInt32Array()
var max_hp     := PackedInt32Array()
var hit_flash  := PackedFloat32Array()
var slow_mult  := PackedFloat32Array()

# Dasher SoA
var dash_cooldown := PackedFloat32Array()   # time until next dash can start
var dash_timer    := PackedFloat32Array()   # time remaining in active dash
var dash_vel      := PackedVector2Array()   # direction of ongoing dash

# Splitter SoA
var split_gen := PackedByteArray()          # 0=can split, 1=spawned from split (won't split again)

# Zoner projectiles
var zp_pos     := PackedVector2Array()
var zp_vel     := PackedVector2Array()
var zp_life    := PackedFloat32Array()

# Boss state
var boss_idx: int = -1
var boss_alive: bool = false
var boss_phase: int = 0
var boss_shield_hp: int = 80
var _boss_telegraph_timer: float = 0.0
var _boss_attack_timer: float = 0.0
var _boss_red_zones: Array = []
var _boss_attack_cooldown: float = 4.0

# ── Runtime difficulty ────────────────────────────────────────────────────────
var run_time_ref: float = 0.0
const HP_SCALE_PER_MIN: float = 0.18
const SPEED_SCALE_PER_MIN: float = 0.07

# Phase 2
var _phase2_active: bool = false
var _speed_phase2_mult: float = 1.0   # 1.15 on phase 2

# ── Pooling ───────────────────────────────────────────────────────────────────
var _free_list := PackedInt32Array()
var _alive_count: int = 0

var _mmi: MultiMeshInstance2D
var _mm: MultiMesh
var _rng := RandomNumberGenerator.new()

var _DEAD_XFORM := Transform2D(0.0, Vector2.ZERO, 0.0, Vector2(-100000.0, -100000.0))

# ── Zoner settings ────────────────────────────────────────────────────────────
const ZONER_PROJ_SPEED   := 140.0
const ZONER_PROJ_LIFE    := 3.5
const ZONER_FIRE_INTERVAL := 3.2
const ZONER_PROJ_RADIUS  := 10.0

var _zoner_cooldowns := PackedFloat32Array()

# ── Dasher settings ───────────────────────────────────────────────────────────
const DASHER_DASH_SPEED    := 380.0
const DASHER_DRIFT_SPEED   := 40.0
const DASHER_DASH_DURATION := 0.18

# ── Red zone drawer ───────────────────────────────────────────────────────────
var _rz_drawer: Node2D

func _ready() -> void:
	_rng.randomize()
	capacity = maxi(capacity, 1)
	_init_arrays()
	_build_multimesh()
	_build_rz_drawer()

func _init_arrays() -> void:
	positions.resize(capacity)
	drifts.resize(capacity)
	alive.resize(capacity)
	types.resize(capacity)
	hp.resize(capacity)
	max_hp.resize(capacity)
	hit_flash.resize(capacity)
	slow_mult.resize(capacity)
	dash_cooldown.resize(capacity)
	dash_timer.resize(capacity)
	dash_vel.resize(capacity)
	split_gen.resize(capacity)
	_zoner_cooldowns.resize(capacity)
	_free_list.resize(capacity)
	_alive_count = 0
	for i in range(capacity):
		positions[i] = Vector2.ZERO
		drifts[i] = Vector2.RIGHT
		alive[i] = 0
		types[i] = TYPE_FODDER
		hp[i] = 1
		max_hp[i] = 1
		hit_flash[i] = 0.0
		slow_mult[i] = 1.0
		dash_cooldown[i] = _rng.randf_range(0.5, 2.5)
		dash_timer[i] = 0.0
		dash_vel[i] = Vector2.ZERO
		split_gen[i] = 0
		_zoner_cooldowns[i] = _rng.randf_range(0.0, ZONER_FIRE_INTERVAL)
		_free_list[capacity - 1 - i] = i

func _build_multimesh() -> void:
	_mmi = MultiMeshInstance2D.new()
	_mmi.name = "EnemyMultiMesh"
	var quad := QuadMesh.new()
	quad.size = Vector2(quad_size, quad_size)
	_mm = MultiMesh.new()
	_mm.transform_format = MultiMesh.TRANSFORM_2D
	_mm.use_colors = true
	_mm.mesh = quad
	_mm.instance_count = capacity
	_mmi.multimesh = _mm
	_mmi.texture = _make_circle_texture()
	add_child(_mmi)
	for i in range(capacity):
		_mm.set_instance_transform_2d(i, _DEAD_XFORM)
		_mm.set_instance_color(i, TYPE_COLORS[TYPE_FODDER])

func _build_rz_drawer() -> void:
	_rz_drawer = Node2D.new()
	_rz_drawer.name = "RedZoneDrawer"
	_rz_drawer.z_index = 5
	_rz_drawer.draw.connect(_draw_red_zones)
	add_child(_rz_drawer)

func _make_circle_texture() -> ImageTexture:
	var size: int = 32
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var c := float(size) * 0.5
	var r := c - 1.0
	var inner := r * 0.45
	for y in range(size):
		for x in range(size):
			var dx := float(x) + 0.5 - c
			var dy := float(y) + 0.5 - c
			var d := sqrt(dx * dx + dy * dy)
			if d <= r:
				var col := Color(1.0, 1.0, 1.0)
				if d <= inner:
					col = Color(0.3, 0.3, 0.3)
				var a := clampf(r - d, 0.0, 1.0)
				col.a = a if d > r - 1.0 else 1.0
				img.set_pixelv(Vector2i(x, y), col)
	return ImageTexture.create_from_image(img)

# ── set_run_time ──────────────────────────────────────────────────────────────
func set_run_time(t: float) -> void:
	run_time_ref = t
	# Phase 2 trigger at 3 minutes
	if not _phase2_active and run_time_ref >= 180.0:
		_phase2_active = true
		_speed_phase2_mult = 1.15
		emit_signal("phase2_started")

# ── HP / speed scaling ────────────────────────────────────────────────────────
func _scaled_hp(base: int) -> int:
	var mins: float = run_time_ref / 60.0
	return maxi(1, int(float(base) * (1.0 + HP_SCALE_PER_MIN * mins)))

func _scaled_speed(base: float) -> float:
	var mins: float = run_time_ref / 60.0
	return base * (1.0 + SPEED_SCALE_PER_MIN * mins) * _speed_phase2_mult

# ── SPAWN API ─────────────────────────────────────────────────────────────────
func spawn_batch(n: int, type_override: int = -1) -> void:
	if n <= 0:
		return
	var vp: Vector2 = get_viewport_rect().size
	var margin := enemy_radius + 3.0
	var max_x := maxf(margin, vp.x - margin)
	var max_y := maxf(margin, vp.y - margin)
	for _k in range(n):
		if _free_list.is_empty():
			return
		var i: int = _free_list[_free_list.size() - 1]
		_free_list.remove_at(_free_list.size() - 1)
		var t: int = _pick_type(type_override)
		_activate_slot(i, t, vp, margin, max_x, max_y)

func spawn_boss() -> void:
	if boss_alive:
		return
	if _free_list.is_empty():
		return
	var i: int = _free_list[_free_list.size() - 1]
	_free_list.remove_at(_free_list.size() - 1)
	var vp: Vector2 = get_viewport_rect().size
	positions[i] = Vector2(vp.x * 0.5, vp.y * 0.15)
	drifts[i] = Vector2.DOWN
	alive[i] = 1
	types[i] = TYPE_BOSS
	var bhp: int = _scaled_hp(TYPE_HP[TYPE_BOSS])
	hp[i] = bhp
	max_hp[i] = bhp
	hit_flash[i] = 0.0
	slow_mult[i] = 1.0
	dash_cooldown[i] = 999.0
	dash_timer[i] = 0.0
	split_gen[i] = 0
	boss_idx = i
	boss_alive = true
	boss_phase = 0
	boss_shield_hp = _scaled_hp(80)
	_boss_attack_timer = 3.0
	_alive_count += 1
	_apply_multimesh_slot(i)

func _pick_type(override: int) -> int:
	if override >= 0:
		return override
	var mins: float = run_time_ref / 60.0
	var r: float = _rng.randf()
	if mins < 1.0:
		return TYPE_FODDER
	elif mins < 2.5:
		return TYPE_CHASER if r < 0.3 else TYPE_FODDER
	elif mins < 3.5:
		if r < 0.12:
			return TYPE_DASHER
		elif r < 0.22:
			return TYPE_CHASER
		elif r < 0.32:
			return TYPE_ZONER
		elif r < 0.38:
			return TYPE_SPLITTER
		else:
			return TYPE_FODDER
	else:
		if r < 0.04:
			return TYPE_ELITE
		elif r < 0.10:
			return TYPE_DASHER
		elif r < 0.17:
			return TYPE_CHASER
		elif r < 0.24:
			return TYPE_ZONER
		elif r < 0.29:
			return TYPE_SPLITTER
		else:
			return TYPE_FODDER

func _activate_slot(i: int, t: int, vp: Vector2, margin: float, _max_x: float, _max_y: float) -> void:
	var edge: int = _rng.randi() % 4
	var pos: Vector2
	match edge:
		0: pos = Vector2(_rng.randf_range(0, vp.x), -margin)
		1: pos = Vector2(_rng.randf_range(0, vp.x), vp.y + margin)
		2: pos = Vector2(-margin, _rng.randf_range(0, vp.y))
		_: pos = Vector2(vp.x + margin, _rng.randf_range(0, vp.y))
	pos.x = clampf(pos.x, -margin * 2.0, vp.x + margin * 2.0)
	pos.y = clampf(pos.y, -margin * 2.0, vp.y + margin * 2.0)
	positions[i] = pos
	drifts[i] = Vector2.RIGHT.rotated(_rng.randf() * TAU)
	alive[i] = 1
	types[i] = t
	var base_hp: int = TYPE_HP[t] if t < TYPE_HP.size() else 1
	var shp: int = _scaled_hp(base_hp)
	hp[i] = shp
	max_hp[i] = shp
	hit_flash[i] = 0.0
	slow_mult[i] = 1.0
	dash_cooldown[i] = _rng.randf_range(0.5, 2.5) if t == TYPE_DASHER else 999.0
	dash_timer[i] = 0.0
	dash_vel[i] = Vector2.ZERO
	split_gen[i] = 0
	_zoner_cooldowns[i] = _rng.randf_range(0.0, ZONER_FIRE_INTERVAL)
	_alive_count += 1
	_apply_multimesh_slot(i)

# Helper for split-spawn (mark split_gen=1 immediately after activate)
func _spawn_fodder_split(spawn_pos: Vector2) -> void:
	if _free_list.is_empty():
		return
	var i: int = _free_list[_free_list.size() - 1]
	_free_list.remove_at(_free_list.size() - 1)
	var vp: Vector2 = get_viewport_rect().size
	var margin := enemy_radius + 3.0
	positions[i] = spawn_pos
	drifts[i] = Vector2.RIGHT.rotated(_rng.randf() * TAU)
	alive[i] = 1
	types[i] = TYPE_FODDER
	var shp: int = _scaled_hp(TYPE_HP[TYPE_FODDER])
	hp[i] = shp
	max_hp[i] = shp
	hit_flash[i] = 0.0
	slow_mult[i] = 1.0
	dash_cooldown[i] = 999.0
	dash_timer[i] = 0.0
	dash_vel[i] = Vector2.ZERO
	split_gen[i] = 1   # cannot split again
	_zoner_cooldowns[i] = _rng.randf_range(0.0, ZONER_FIRE_INTERVAL)
	_alive_count += 1
	_apply_multimesh_slot(i)

func _apply_multimesh_slot(i: int) -> void:
	var t: int = types[i]
	var sz_mult: float = TYPE_SIZE_MULT[t] if t < TYPE_SIZE_MULT.size() else 1.0
	var s: float = sz_mult
	var xf := Transform2D(0.0, Vector2(s, s), 0.0, positions[i])
	_mm.set_instance_transform_2d(i, xf)
	var col: Color = TYPE_COLORS[t] if t < TYPE_COLORS.size() else Color(1, 1, 1)
	_mm.set_instance_color(i, col)

# ── UPDATE ────────────────────────────────────────────────────────────────────
func update_field(delta: float, target: Vector2) -> void:
	var vp: Vector2 = get_viewport_rect().size
	var lo := -enemy_radius * 3.0
	var hi_x := vp.x + enemy_radius * 3.0
	var hi_y := vp.y + enemy_radius * 3.0
	for i in range(capacity):
		if alive[i] == 0:
			continue
		if types[i] == TYPE_BOSS:
			_update_boss_movement(i, delta, target, vp)
			continue
		var pos: Vector2 = positions[i]
		var drift: Vector2 = drifts[i]
		var base_spd: float = TYPE_SPEEDS[types[i]] if types[i] < TYPE_SPEEDS.size() else 58.0
		var eff_spd: float = _scaled_speed(base_spd) * slow_mult[i]
		var to_t: Vector2 = target - pos
		var move_dir: Vector2
		match types[i]:
			TYPE_FODDER:
				if to_t.length_squared() > 0.000001:
					to_t = to_t.normalized()
				move_dir = (to_t * 0.5 + drift * 0.5).normalized()
			TYPE_CHASER:
				if to_t.length_squared() > 0.000001:
					move_dir = to_t.normalized()
				else:
					move_dir = drift
			TYPE_ZONER:
				var dist: float = to_t.length()
				var preferred_dist: float = 260.0
				if dist > preferred_dist + 30.0:
					move_dir = to_t.normalized()
				elif dist < preferred_dist - 30.0:
					move_dir = -to_t.normalized()
				else:
					move_dir = to_t.normalized().rotated(PI * 0.5)
				_update_zoner_fire(i, delta, pos, target)
			TYPE_ELITE:
				if to_t.length_squared() > 0.000001:
					to_t = to_t.normalized()
				move_dir = (to_t * 0.7 + drift * 0.3).normalized()
			TYPE_DASHER:
				move_dir = _update_dasher(i, delta, pos, target, eff_spd)
				# eff_spd is overridden inside _update_dasher; skip normal apply
				pos = positions[i]   # _update_dasher writes positions directly
				hit_flash[i] = maxf(0.0, hit_flash[i] - delta)
				var base_col: Color = TYPE_COLORS[TYPE_DASHER]
				var flash_t_d: float = hit_flash[i] / 0.12
				var col_d: Color = base_col.lerp(Color(1, 1, 1), flash_t_d)
				var sz_d: float = TYPE_SIZE_MULT[TYPE_DASHER]
				_mm.set_instance_transform_2d(i, Transform2D(0.0, Vector2(sz_d, sz_d), 0.0, pos))
				_mm.set_instance_color(i, col_d)
				continue   # already updated position, skip bottom of loop
			TYPE_SPLITTER:
				if to_t.length_squared() > 0.000001:
					to_t = to_t.normalized()
				move_dir = (to_t * 0.6 + drift * 0.4).normalized()
			_:
				move_dir = drift
		pos += move_dir * eff_spd * delta
		drift = drift.rotated(_rng.randf_range(-0.4, 0.4) * delta)
		pos.x = clampf(pos.x, lo, hi_x)
		pos.y = clampf(pos.y, lo, hi_y)
		positions[i] = pos
		drifts[i] = drift
		if hit_flash[i] > 0.0:
			hit_flash[i] = maxf(0.0, hit_flash[i] - delta)
		var base_col: Color = TYPE_COLORS[types[i]] if types[i] < TYPE_COLORS.size() else Color(1, 1, 1)
		var flash_t: float = hit_flash[i] / 0.12
		var col: Color = base_col.lerp(Color(1, 1, 1), flash_t)
		var sz_mult: float = TYPE_SIZE_MULT[types[i]] if types[i] < TYPE_SIZE_MULT.size() else 1.0
		var s: float = sz_mult
		_mm.set_instance_transform_2d(i, Transform2D(0.0, Vector2(s, s), 0.0, pos))
		_mm.set_instance_color(i, col)
	_update_zoner_projectiles(delta)
	if boss_alive:
		_update_boss_logic(delta, target)
	_rz_drawer.queue_redraw()

# ── Dasher behaviour ──────────────────────────────────────────────────────────
# Returns a dummy move_dir (position is applied directly)
func _update_dasher(i: int, delta: float, pos: Vector2, target: Vector2, _eff_spd: float) -> Vector2:
	var vp: Vector2 = get_viewport_rect().size
	var lo := -enemy_radius * 3.0
	var hi_x := vp.x + enemy_radius * 3.0
	var hi_y := vp.y + enemy_radius * 3.0

	if dash_timer[i] > 0.0:
		# Active dash phase — move at high speed in locked direction
		dash_timer[i] -= delta
		pos += dash_vel[i] * DASHER_DASH_SPEED * delta
		pos.x = clampf(pos.x, lo, hi_x)
		pos.y = clampf(pos.y, lo, hi_y)
		positions[i] = pos
	elif dash_cooldown[i] > 0.0:
		# Approach slowly
		dash_cooldown[i] -= delta
		var to_t: Vector2 = target - pos
		if to_t.length_squared() > 0.0001:
			pos += to_t.normalized() * DASHER_DRIFT_SPEED * delta
		pos.x = clampf(pos.x, lo, hi_x)
		pos.y = clampf(pos.y, lo, hi_y)
		positions[i] = pos
	else:
		# Launch dash toward target
		var to_t: Vector2 = target - pos
		if to_t.length_squared() > 0.0001:
			dash_vel[i] = to_t.normalized()
		else:
			dash_vel[i] = Vector2.RIGHT.rotated(_rng.randf() * TAU)
		dash_timer[i] = DASHER_DASH_DURATION
		dash_cooldown[i] = _rng.randf_range(1.2, 2.5)

	return Vector2.ZERO   # not used; position applied above

# ── Boss movement ─────────────────────────────────────────────────────────────
func _update_boss_movement(i: int, delta: float, target: Vector2, vp: Vector2) -> void:
	var pos: Vector2 = positions[i]
	var to_t: Vector2 = target - pos
	var eff_spd: float = _scaled_speed(TYPE_SPEEDS[TYPE_BOSS]) * slow_mult[i]
	var move_dir: Vector2 = Vector2.ZERO
	if to_t.length_squared() > 0.000001:
		move_dir = to_t.normalized()
	pos += move_dir * eff_spd * delta
	pos.x = clampf(pos.x, enemy_radius * 3.0, vp.x - enemy_radius * 3.0)
	pos.y = clampf(pos.y, enemy_radius * 3.0, vp.y - enemy_radius * 3.0)
	positions[i] = pos
	if hit_flash[i] > 0.0:
		hit_flash[i] = maxf(0.0, hit_flash[i] - delta)
	var base_col: Color = TYPE_COLORS[TYPE_BOSS]
	if boss_phase == 0:
		var pulse: float = (sin(Time.get_ticks_msec() * 0.003) + 1.0) * 0.5
		base_col = base_col.lerp(Color(1, 1, 0.5), pulse * 0.5)
	var flash_t: float = hit_flash[i] / 0.12
	var col: Color = base_col.lerp(Color(1, 1, 1), flash_t)
	var s: float = TYPE_SIZE_MULT[TYPE_BOSS]
	_mm.set_instance_transform_2d(i, Transform2D(0.0, Vector2(s, s), 0.0, pos))
	_mm.set_instance_color(i, col)

func _update_boss_logic(delta: float, target: Vector2) -> void:
	if boss_idx < 0 or alive[boss_idx] == 0:
		boss_alive = false
		return
	_boss_attack_timer -= delta
	var r := _boss_red_zones.size() - 1
	while r >= 0:
		_boss_red_zones[r]["life"] -= delta
		if _boss_red_zones[r]["life"] <= 0.0:
			_boss_red_zones.remove_at(r)
		r -= 1
	if _boss_attack_timer <= 0.0:
		_boss_attack_timer = _boss_attack_cooldown
		# Phase 2 boss: fires more red zones
		var zone_count: int = 5 if _phase2_active else 3
		for _k in range(zone_count):
			var angle: float = _rng.randf() * TAU
			var dist: float = _rng.randf_range(60.0, 180.0)
			var rz_center: Vector2 = target + Vector2(cos(angle), sin(angle)) * dist
			_boss_red_zones.append({
				"center": rz_center,
				"radius": 55.0,
				"life": 1.8,
				"max_life": 1.8,
			})

func _update_zoner_fire(i: int, delta: float, pos: Vector2, target: Vector2) -> void:
	_zoner_cooldowns[i] -= delta
	if _zoner_cooldowns[i] > 0.0:
		return
	_zoner_cooldowns[i] = ZONER_FIRE_INTERVAL * _rng.randf_range(0.8, 1.2)
	var dir: Vector2 = (target - pos)
	if dir.length_squared() > 0.0001:
		dir = dir.normalized().rotated(_rng.randf_range(-0.3, 0.3))
	else:
		dir = Vector2.RIGHT.rotated(_rng.randf() * TAU)
	zp_pos.append(pos)
	zp_vel.append(dir * ZONER_PROJ_SPEED)
	zp_life.append(ZONER_PROJ_LIFE)

func _update_zoner_projectiles(delta: float) -> void:
	var j: int = zp_pos.size() - 1
	while j >= 0:
		zp_pos[j] = zp_pos[j] + zp_vel[j] * delta
		zp_life[j] = zp_life[j] - delta
		if zp_life[j] <= 0.0:
			zp_pos.remove_at(j)
			zp_vel.remove_at(j)
			zp_life.remove_at(j)
		j -= 1

func any_zoner_proj_within(p: Vector2, radius: float) -> bool:
	var r2 := radius * radius
	for i in range(zp_pos.size()):
		if zp_pos[i].distance_squared_to(p) <= r2:
			return true
	return false

func player_in_red_zone(p: Vector2) -> bool:
	for rz in _boss_red_zones:
		var life_frac: float = rz["life"] / rz["max_life"]
		if life_frac < 0.15:
			if p.distance_squared_to(rz["center"]) <= rz["radius"] * rz["radius"]:
				return true
	return false

# ── DAMAGE API ────────────────────────────────────────────────────────────────
func damage_at(center: Vector2, radius: float, amount: int) -> void:
	var r2 := radius * radius
	for i in range(capacity):
		if alive[i] == 0:
			continue
		if positions[i].distance_squared_to(center) <= r2:
			damage_index(i, amount)

func damage_index(i: int, amount: int) -> void:
	if i < 0 or i >= capacity:
		return
	if alive[i] == 0:
		return
	if types[i] == TYPE_BOSS and boss_phase == 0:
		boss_shield_hp -= amount
		hit_flash[i] = 0.12
		if boss_shield_hp <= 0:
			boss_phase = 1
			emit_signal("boss_phase_changed", 1)
		return
	hp[i] -= amount
	hit_flash[i] = 0.12
	if hp[i] <= 0:
		_kill_slot(i)

# ── CONSTRICTION ──────────────────────────────────────────────────────────────
func kill_in_polygon(poly: PackedVector2Array) -> PackedVector2Array:
	var killed := PackedVector2Array()
	if poly.size() < 3:
		return killed
	var min_x := poly[0].x; var min_y := poly[0].y
	var max_x := poly[0].x; var max_y := poly[0].y
	for p in poly:
		min_x = minf(min_x, p.x); min_y = minf(min_y, p.y)
		max_x = maxf(max_x, p.x); max_y = maxf(max_y, p.y)
	for i in range(capacity):
		if alive[i] == 0:
			continue
		var pos: Vector2 = positions[i]
		if pos.x < min_x or pos.x > max_x or pos.y < min_y or pos.y > max_y:
			continue
		if Geometry2D.is_point_in_polygon(pos, poly):
			killed.push_back(pos)
			if types[i] == TYPE_BOSS:
				if boss_phase == 0:
					boss_shield_hp -= 999
					if boss_shield_hp <= 0:
						boss_phase = 1
						emit_signal("boss_phase_changed", 1)
				else:
					damage_index(i, 9999)
			else:
				_kill_slot(i)
	return killed

# ── KILL ──────────────────────────────────────────────────────────────────────
func _kill_slot(i: int) -> void:
	var pos: Vector2 = positions[i]
	var t: int = types[i]
	var is_elite: bool = (t == TYPE_ELITE)

	# Splitter: spawn 2 fodder children (only if not already a split product)
	if t == TYPE_SPLITTER and split_gen[i] == 0:
		var offset1 := Vector2(_rng.randf_range(-20.0, 20.0), _rng.randf_range(-20.0, 20.0))
		var offset2 := Vector2(_rng.randf_range(-20.0, 20.0), _rng.randf_range(-20.0, 20.0))
		_free_slot(i)   # free before spawning to avoid pool exhaustion
		_spawn_fodder_split(pos + offset1)
		_spawn_fodder_split(pos + offset2)
		emit_signal("enemy_killed", pos, t, is_elite)
		return

	emit_signal("enemy_killed", pos, t, is_elite)
	_free_slot(i)

# ── QUERIES ───────────────────────────────────────────────────────────────────
func any_within(p: Vector2, radius: float) -> bool:
	var r2 := radius * radius
	for i in range(capacity):
		if alive[i] == 0:
			continue
		if types[i] == TYPE_BOSS or types[i] == TYPE_ELITE:
			continue
		if positions[i].distance_squared_to(p) <= r2:
			return true
	return false

func alive_count() -> int:
	return _alive_count

func get_boss_hp_frac() -> float:
	if boss_idx < 0 or not boss_alive:
		return 0.0
	if max_hp[boss_idx] <= 0:
		return 0.0
	return float(hp[boss_idx]) / float(max_hp[boss_idx])

func get_boss_shield_frac() -> float:
	return clampf(float(boss_shield_hp) / 80.0, 0.0, 1.0)

# ── RESET ─────────────────────────────────────────────────────────────────────
func reset() -> void:
	for i in range(capacity):
		if alive[i] == 1:
			alive[i] = 0
		_mm.set_instance_transform_2d(i, _DEAD_XFORM)
		_free_list[capacity - 1 - i] = i
	_free_list.resize(capacity)
	_alive_count = 0
	boss_alive = false
	boss_idx = -1
	boss_phase = 0
	_boss_red_zones.clear()
	zp_pos.clear()
	zp_vel.clear()
	zp_life.clear()
	_phase2_active = false
	_speed_phase2_mult = 1.0

func _free_slot(i: int) -> void:
	if alive[i] == 0:
		return
	if types[i] == TYPE_BOSS:
		boss_alive = false
		boss_idx = -1
	alive[i] = 0
	_alive_count -= 1
	_mm.set_instance_transform_2d(i, _DEAD_XFORM)
	_free_list.push_back(i)

# ── DRAW: red zones + zoner projectiles ──────────────────────────────────────
func _draw_red_zones() -> void:
	for i in range(zp_pos.size()):
		var t: float = clampf(zp_life[i] / ZONER_PROJ_LIFE, 0.0, 1.0)
		var col := Color(0.30, 0.55, 1.0, t * 0.9)
		var glow := Color(0.10, 0.30, 1.0, t * 0.4)
		_rz_drawer.draw_circle(zp_pos[i], ZONER_PROJ_RADIUS * 1.6, glow)
		_rz_drawer.draw_circle(zp_pos[i], ZONER_PROJ_RADIUS, col)
	for rz in _boss_red_zones:
		var life_frac: float = rz["life"] / rz["max_life"]
		var danger: float = 1.0 - life_frac
		var alpha: float = 0.25 + danger * 0.55
		var col := Color(1.0, 0.15 + life_frac * 0.3, 0.0, alpha)
		_rz_drawer.draw_circle(rz["center"], rz["radius"], col)
		_rz_drawer.draw_arc(rz["center"], rz["radius"], 0.0, TAU, 32, Color(1, 0.3, 0, alpha + 0.2), 2.5)
