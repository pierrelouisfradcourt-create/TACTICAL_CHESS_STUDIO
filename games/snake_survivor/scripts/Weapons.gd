extends Node2D
# Weapons.gd — Auto-attack system for Snake Survivor.
# Three elements: FIRE (AoE burn), ICE (slow), LIGHTNING (chain).
# Projectiles are drawn purely in GDScript (_draw). No image assets.
# Each weapon is a slot with a cooldown, level, and element type.
# Main wires this by calling update_weapons(delta, trail, field) each frame.
# Upgrade ids handled here: "weapon_fire", "weapon_ice", "weapon_lightning",
#   "fire_level", "ice_level", "lightning_level"
#
# PUBLIC API:
#   func update_weapons(delta, trail, field) -> void
#   func apply_upgrade(id: String) -> void
#   signal damage_numbers_request(pos, amount, color)  -- for floating numbers

signal damage_numbers_request(pos: Vector2, amount: int, col: Color)

# ── Element definitions ─────────────────────────────────────────────────────
enum Element { FIRE, ICE, LIGHTNING }

const ELEM_COLOR := {
	Element.FIRE:      Color(1.0,  0.45, 0.10),
	Element.ICE:       Color(0.35, 0.80, 1.0),
	Element.LIGHTNING: Color(0.85, 0.50, 1.0),
}

const ELEM_GLOW := {
	Element.FIRE:      Color(1.0,  0.20, 0.00, 0.45),
	Element.ICE:       Color(0.10, 0.50, 1.0,  0.45),
	Element.LIGHTNING: Color(0.60, 0.00, 1.0,  0.45),
}

# ── Per-weapon stats (per level) ────────────────────────────────────────────
# damage, cooldown, radius (fire=burn r, ice=slow r, lightning=chain r), segment_src
# segment_src: which trail segment fires (0=head end, 1=mid, 2=tail end)
const BASE_STATS := {
	Element.FIRE:      {"damage": 8,  "cooldown": 1.2, "radius": 80.0,  "proj_speed": 0.0, "seg": 0},
	Element.ICE:       {"damage": 4,  "cooldown": 0.9, "radius": 55.0,  "proj_speed": 260.0, "seg": 1},
	Element.LIGHTNING: {"damage": 12, "cooldown": 1.5, "radius": 120.0, "proj_speed": 0.0, "seg": 2},
}

const LEVEL_SCALE := {
	"damage":   1.20,  # +20% per level
	"cooldown": 0.88,  # ×0.88 per level (faster)
	"radius":   1.12,  # +12% per level
}

# ── Weapon slot ─────────────────────────────────────────────────────────────
class WeaponSlot:
	var element: int = Element.FIRE
	var level: int = 1
	var cooldown_max: float = 1.2
	var cooldown_cur: float = 0.0
	var damage: int = 8
	var radius: float = 80.0
	var proj_speed: float = 0.0
	var seg_frac: float = 0.0  # fraction along trail (0=head, 1=tail)
	var unlocked: bool = false

# ── Projectile (drawn, not Node) ─────────────────────────────────────────────
class Proj:
	var pos: Vector2
	var vel: Vector2
	var element: int
	var damage: int
	var radius: float
	var life: float = 0.8
	var age: float = 0.0
	var hit_set: PackedInt32Array  # indices already damaged this frame

# ── State ────────────────────────────────────────────────────────────────────
var slots: Array[WeaponSlot] = []
var projectiles: Array = []       # Array of Proj
var burn_timers: Array = []        # parallel to field capacity: [timer, damage_per_s]
var slow_timers: Array = []        # parallel to field capacity: [timer, factor]

var _rng := RandomNumberGenerator.new()
var _field_ref = null              # set by Main after field is ready

const BURN_DURATION := 3.0
const BURN_DPS := 6.0
const SLOW_DURATION := 2.5
const SLOW_FACTOR := 0.35
const CHAIN_COUNT := 4             # lightning chains up to N enemies
const CHAIN_DIST := 140.0

# ── Screenshake (communicated upward) ────────────────────────────────────────
var screenshake_intensity: float = 0.0  # Main reads and resets

func _ready() -> void:
	_rng.randomize()
	# Start with fire unlocked only; ice+lightning unlocked via upgrade
	_add_slot(Element.FIRE, 0.0)
	_add_slot(Element.ICE, 0.5)
	_add_slot(Element.LIGHTNING, 1.0)
	# Only fire starts unlocked
	slots[0].unlocked = true

func _add_slot(elem: int, frac: float) -> void:
	var s := WeaponSlot.new()
	s.element = elem
	s.seg_frac = frac
	var base: Dictionary = BASE_STATS[elem]
	s.cooldown_max = base["cooldown"]
	s.damage = base["damage"]
	s.radius = base["radius"]
	s.proj_speed = base["proj_speed"]
	slots.append(s)

# Called by Main after EnemyField is ready
func set_field(f: Node2D) -> void:
	_field_ref = f
	# Init burn/slow parallel arrays
	burn_timers.resize(f.capacity)
	slow_timers.resize(f.capacity)
	for i in range(f.capacity):
		burn_timers[i] = [0.0, 0.0]
		slow_timers[i] = [0.0, 1.0]

# ── Main update ──────────────────────────────────────────────────────────────
func update_weapons(delta: float, trail: PackedVector2Array, field: Node2D) -> void:
	_tick_dot_effects(delta, field)
	if trail.size() < 2:
		queue_redraw()
		return
	for s in slots:
		if not s.unlocked:
			continue
		s.cooldown_cur -= delta
		if s.cooldown_cur > 0.0:
			continue
		s.cooldown_cur = s.cooldown_max
		var src: Vector2 = _trail_point(trail, s.seg_frac)
		_fire_weapon(s, src, field)
	_update_projectiles(delta, field)
	queue_redraw()

func _trail_point(trail: PackedVector2Array, frac: float) -> Vector2:
	if trail.is_empty():
		return Vector2.ZERO
	var idx: int = int(clampf(frac * float(trail.size() - 1), 0.0, float(trail.size() - 1)))
	return trail[idx]

func _fire_weapon(s: WeaponSlot, src: Vector2, field: Node2D) -> void:
	match s.element:
		Element.FIRE:
			_fire_explosion(s, src, field)
		Element.ICE:
			_fire_icebolt(s, src, field)
		Element.LIGHTNING:
			_fire_lightning(s, src, field)

# FIRE — instant AoE burn pulse ───────────────────────────────────────────────
func _fire_explosion(s: WeaponSlot, src: Vector2, field: Node2D) -> void:
	# Visual pulse projectile (life = 0.35 for ring expansion)
	var p := Proj.new()
	p.pos = src
	p.vel = Vector2.ZERO
	p.element = Element.FIRE
	p.damage = s.damage
	p.radius = s.radius
	p.life = 0.35
	p.hit_set = PackedInt32Array()
	projectiles.append(p)
	# Apply burn to all in radius immediately
	_apply_aoe_burn(src, s.radius, s.damage, field)
	screenshake_intensity = maxf(screenshake_intensity, 2.5)

func _apply_aoe_burn(center: Vector2, radius: float, dmg: int, field: Node2D) -> void:
	if field == null:
		return
	var r2 := radius * radius
	for i in range(field.capacity):
		if field.alive[i] == 0:
			continue
		if field.positions[i].distance_squared_to(center) <= r2:
			field.damage_index(i, dmg)
			_apply_burn(i)
			var col: Color = ELEM_COLOR[Element.FIRE]
			emit_signal("damage_numbers_request", field.positions[i], dmg, col)

func _apply_burn(idx: int) -> void:
	burn_timers[idx][0] = BURN_DURATION
	burn_timers[idx][1] = BURN_DPS

# ICE — projectile bolt that slows on hit ─────────────────────────────────────
func _fire_icebolt(s: WeaponSlot, src: Vector2, field: Node2D) -> void:
	# Find nearest enemy and fire toward it
	var target_idx: int = _nearest_enemy(src, field, s.radius * 3.0)
	if target_idx < 0:
		return
	var dir: Vector2 = (field.positions[target_idx] - src).normalized()
	var p := Proj.new()
	p.pos = src
	p.vel = dir * s.proj_speed
	p.element = Element.ICE
	p.damage = s.damage
	p.radius = 8.0      # small collision radius for bolt
	p.life = (s.radius * 3.0) / s.proj_speed
	p.hit_set = PackedInt32Array()
	projectiles.append(p)

func _apply_slow(idx: int) -> void:
	if idx < 0 or idx >= slow_timers.size():
		return
	slow_timers[idx][0] = SLOW_DURATION
	slow_timers[idx][1] = SLOW_FACTOR
	# Write directly into field's slow_mult so EnemyField.update_field reads it
	if _field_ref != null and idx < _field_ref.slow_mult.size():
		_field_ref.slow_mult[idx] = SLOW_FACTOR

# LIGHTNING — instant chain ────────────────────────────────────────────────────
func _fire_lightning(s: WeaponSlot, src: Vector2, field: Node2D) -> void:
	# Collect chain targets
	var chain_targets: PackedInt32Array = PackedInt32Array()
	var chain_positions: PackedVector2Array = PackedVector2Array()
	chain_positions.append(src)
	var cur: Vector2 = src
	var visited: PackedInt32Array = PackedInt32Array()
	for _c in range(CHAIN_COUNT):
		var best_i: int = -1
		var best_d2: float = CHAIN_DIST * CHAIN_DIST
		for i in range(field.capacity):
			if field.alive[i] == 0:
				continue
			if visited.has(i):
				continue
			var d2: float = field.positions[i].distance_squared_to(cur)
			if d2 < best_d2:
				best_d2 = d2
				best_i = i
		if best_i < 0:
			break
		visited.append(best_i)
		chain_targets.append(best_i)
		chain_positions.append(field.positions[best_i])
		cur = field.positions[best_i]
	# Deal damage
	for idx in chain_targets:
		field.damage_index(idx, s.damage)
		var col: Color = ELEM_COLOR[Element.LIGHTNING]
		emit_signal("damage_numbers_request", field.positions[idx], s.damage, col)
	# Visual: bolt projectile stores path in vel.x/y unusually — we use a special proj
	# We store the chain as a sequence of "arc" prims via a meta dictionary
	var p := Proj.new()
	p.pos = src
	p.vel = Vector2.ZERO
	p.element = Element.LIGHTNING
	p.damage = 0   # already applied
	p.radius = 0.0
	p.life = 0.4
	p.hit_set = PackedInt32Array()
	# Pack chain_positions into the hit_set packing — we'll use a separate array
	# Actually store it in projectiles as a Dictionary to keep chains renderable
	var arc_dict: Dictionary = {
		"type": "lightning_arc",
		"points": chain_positions,
		"age": 0.0,
		"life": 0.4,
	}
	_arc_effects.append(arc_dict)
	screenshake_intensity = maxf(screenshake_intensity, 1.5)

var _arc_effects: Array = []   # lightning arcs for drawing

# ── DoT ticks ────────────────────────────────────────────────────────────────
func _tick_dot_effects(delta: float, field: Node2D) -> void:
	if field == null:
		return
	if burn_timers.size() < field.capacity:
		return  # set_field not yet called or capacity mismatch
	for i in range(field.capacity):
		# Burn
		if burn_timers[i][0] > 0.0:
			burn_timers[i][0] -= delta
			field.damage_index(i, int(BURN_DPS * delta))
		# Slow (affects field's effective speed via field.slow_mult)
		if slow_timers[i][0] > 0.0:
			slow_timers[i][0] -= delta
			if slow_timers[i][0] <= 0.0:
				slow_timers[i][1] = 1.0
				# Restore field slow_mult
				if _field_ref != null and i < _field_ref.slow_mult.size():
					_field_ref.slow_mult[i] = 1.0

# ── Projectile update ─────────────────────────────────────────────────────────
func _update_projectiles(delta: float, field: Node2D) -> void:
	# Update arc effects
	var a := _arc_effects.size() - 1
	while a >= 0:
		_arc_effects[a]["age"] += delta
		if _arc_effects[a]["age"] >= _arc_effects[a]["life"]:
			_arc_effects.remove_at(a)
		a -= 1
	# Update moving projectiles (ice bolts)
	var j := projectiles.size() - 1
	while j >= 0:
		var p: Proj = projectiles[j]
		p.age += delta
		if p.age >= p.life:
			projectiles.remove_at(j)
			j -= 1
			continue
		if p.vel.length_squared() > 0.0:
			p.pos += p.vel * delta
			# Check collision with enemies
			if field != null:
				var hit_r2 := p.radius * p.radius
				for i in range(field.capacity):
					if field.alive[i] == 0:
						continue
					if p.hit_set.has(i):
						continue
					if field.positions[i].distance_squared_to(p.pos) <= hit_r2:
						field.damage_index(i, p.damage)
						_apply_slow(i)
						p.hit_set.append(i)
						var col: Color = ELEM_COLOR[Element.ICE]
						emit_signal("damage_numbers_request", field.positions[i], p.damage, col)
						# Ice bolt stops on first hit
						projectiles.remove_at(j)
						j -= 1
						break
		j -= 1

# ── Nearest enemy helper ──────────────────────────────────────────────────────
func _nearest_enemy(from: Vector2, field: Node2D, max_r: float) -> int:
	if field == null:
		return -1
	var best_i: int = -1
	var best_d2: float = max_r * max_r
	for i in range(field.capacity):
		if field.alive[i] == 0:
			continue
		var d2: float = field.positions[i].distance_squared_to(from)
		if d2 < best_d2:
			best_d2 = d2
			best_i = i
	return best_i

# ── Upgrade application ───────────────────────────────────────────────────────
func apply_upgrade(id: String) -> void:
	match id:
		"weapon_fire":
			slots[0].unlocked = true
		"weapon_ice":
			slots[1].unlocked = true
		"weapon_lightning":
			slots[2].unlocked = true
		"fire_level":
			_level_up_slot(0)
		"ice_level":
			_level_up_slot(1)
		"lightning_level":
			_level_up_slot(2)

func _level_up_slot(idx: int) -> void:
	if idx >= slots.size():
		return
	var s: WeaponSlot = slots[idx]
	s.level += 1
	s.damage = int(float(BASE_STATS[s.element]["damage"]) * pow(LEVEL_SCALE["damage"], s.level - 1))
	s.cooldown_max = BASE_STATS[s.element]["cooldown"] * pow(LEVEL_SCALE["cooldown"], s.level - 1)
	s.radius = BASE_STATS[s.element]["radius"] * pow(LEVEL_SCALE["radius"], s.level - 1)

# ── Draw ──────────────────────────────────────────────────────────────────────
func _draw() -> void:
	# Draw moving projectiles (ice bolts)
	for p: Proj in projectiles:
		var t: float = 1.0 - (p.age / p.life)
		var col: Color = ELEM_COLOR[p.element]
		col.a = t
		var glow: Color = ELEM_GLOW[p.element]
		glow.a = t * 0.6
		if p.vel.length_squared() > 0.0:
			# Moving bolt — small circle with glow halo
			draw_circle(p.pos, p.radius * 2.0, glow)
			draw_circle(p.pos, p.radius, col)
		else:
			# Fire explosion ring
			var r: float = p.radius * (1.0 - t) * 2.0 + 8.0
			draw_arc(p.pos, r, 0.0, TAU, 32, col, 3.0 * t)
			draw_circle(p.pos, r * 0.6, Color(col.r, col.g, col.b, t * 0.3))
	# Draw lightning arcs
	for arc in _arc_effects:
		var points: PackedVector2Array = arc["points"]
		var t: float = 1.0 - (arc["age"] / arc["life"])
		var col: Color = ELEM_COLOR[Element.LIGHTNING]
		col.a = t
		var jitter_amp: float = 8.0 * t
		if points.size() >= 2:
			for k in range(points.size() - 1):
				var a_pt: Vector2 = points[k]
				var b_pt: Vector2 = points[k + 1]
				# Jittered midpoint for lightning bolt look
				var mid: Vector2 = (a_pt + b_pt) * 0.5 + Vector2(
					_rng.randf_range(-jitter_amp, jitter_amp),
					_rng.randf_range(-jitter_amp, jitter_amp)
				)
				var glow_col: Color = ELEM_GLOW[Element.LIGHTNING]
				glow_col.a = t * 0.8
				draw_line(a_pt, mid, glow_col, 5.0)
				draw_line(mid, b_pt, glow_col, 5.0)
				draw_line(a_pt, mid, col, 2.0)
				draw_line(mid, b_pt, col, 2.0)
		# Draw endpoint flash
		if points.size() >= 1:
			draw_circle(points[points.size() - 1], 10.0 * t, Color(col.r, col.g, col.b, t * 0.7))
