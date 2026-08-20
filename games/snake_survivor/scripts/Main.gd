extends Node2D
# Orchestrateur v3 : câble Snake, EnemyField, SurvivorSystems, Weapons, SnakeAudio.
# Gère aussi : kill particles, constriction implosion, screenshake relay, boss HUD.
# AJOUTS v3:
#   - Audio module (SnakeAudio): SFX + musique procédurale
#   - Nouveaux upgrades: constrict_size, constrict_grow, hp_regen, armor, lifesteal,
#     dash_power, nova_upgrade, energy_cap, xp_magnet
#   - Phase 2: relay depuis EnemyField.phase2_started
#   - Pseudo-HP joueur: _player_hp, _player_max_hp, _hp_regen, _damage_reduce, _lifesteal_per_kill

const SnakeScript    := preload("res://scripts/Snake.gd")
const EnemyFieldScript := preload("res://scripts/EnemyField.gd")
const SurvivorScript := preload("res://scripts/SurvivorSystems.gd")
const WeaponsScript  := preload("res://scripts/Weapons.gd")
const AudioScript    := preload("res://scripts/SnakeAudio.gd")

const DEATH_RADIUS  := 13.0
const SPAWN_PROTECT := 2.0

# ── Nodes ─────────────────────────────────────────────────────────────────────
var snake:    Node2D
var field:    Node2D
var survivor: Node2D
var weapons:  Node2D
var audio:    Node
var _bg:      ColorRect

# ── State ─────────────────────────────────────────────────────────────────────
var score:   int   = 0
var dead:    bool  = false
var protect: float = SPAWN_PROTECT

# ── Pseudo player stats (no HP node — managed here) ──────────────────────────
var _player_hp:          float = 100.0
var _player_max_hp:      float = 100.0
var _hp_regen:           float = 0.0     # HP/s from regen card
var _damage_reduce:      float = 1.0     # multiplier (armor/energy_cap)
var _lifesteal_per_kill: int   = 0       # HP per kill

# ── Particles ─────────────────────────────────────────────────────────────────
class Particle:
	var pos:   Vector2
	var vel:   Vector2
	var col:   Color
	var size:  float
	var age:   float = 0.0
	var life:  float

var _particles: Array = []

# ── Constriction implosion arcs ───────────────────────────────────────────────
class ImplosionArc:
	var center:    Vector2
	var radius:    float
	var age:       float = 0.0
	var life:      float = 0.55
	var col:       Color

var _implosions: Array = []

# ── HUD debug ─────────────────────────────────────────────────────────────────
var _hud_layer: CanvasLayer
var _hud_label: Label

# ── Particle drawer node ──────────────────────────────────────────────────────
var _fx_drawer: Node2D

var _rng := RandomNumberGenerator.new()

func _ready() -> void:
	_rng.randomize()

	# Dark background
	_bg = ColorRect.new()
	_bg.color = Color(0.04, 0.05, 0.07)
	_bg.size = get_viewport_rect().size
	_bg.z_index = -100
	_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_bg)

	# FX drawer
	_fx_drawer = Node2D.new()
	_fx_drawer.name = "FxDrawer"
	_fx_drawer.z_index = 15
	_fx_drawer.draw.connect(_draw_fx)
	add_child(_fx_drawer)

	# Modules
	field = Node2D.new()
	field.set_script(EnemyFieldScript)
	add_child(field)

	survivor = Node2D.new()
	survivor.set_script(SurvivorScript)
	add_child(survivor)

	snake = Node2D.new()
	snake.set_script(SnakeScript)
	add_child(snake)

	weapons = Node2D.new()
	weapons.set_script(WeaponsScript)
	weapons.z_index = 10
	add_child(weapons)

	# Audio module
	audio = Node.new()
	audio.set_script(AudioScript)
	add_child(audio)

	# Weapon <-> field link
	weapons.set_field(field)

	# Signal wiring
	snake.constriction.connect(_on_constriction)
	survivor.spawn_request.connect(_on_spawn_request)
	survivor.spawn_type_request.connect(_on_spawn_type_request)
	survivor.upgrade_chosen.connect(_on_upgrade)
	survivor.run_ended.connect(_on_run_ended)
	survivor.level_up_started.connect(_on_level_up_started)
	field.enemy_killed.connect(_on_enemy_killed)
	field.boss_phase_changed.connect(_on_boss_phase_changed)
	field.phase2_started.connect(_on_phase2)
	weapons.damage_numbers_request.connect(_on_damage_number)

	# Debug HUD (top-left)
	_hud_layer = CanvasLayer.new()
	_hud_layer.layer = 5
	add_child(_hud_layer)
	_hud_label = Label.new()
	_hud_label.position = Vector2(12, 10)
	_hud_label.add_theme_font_size_override("font_size", 15)
	_hud_label.add_theme_color_override("font_color", Color(0.70, 0.80, 0.90, 0.80))
	_hud_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hud_layer.add_child(_hud_label)

	# Start audio before run so music fades in
	audio.start_music()

	survivor.start_run()
	field.spawn_batch(40)

# ── Signal handlers ───────────────────────────────────────────────────────────
func _on_spawn_request(n: int) -> void:
	field.spawn_batch(n)

func _on_spawn_type_request(n: int, type: int) -> void:
	if type == 4:  # TYPE_BOSS
		field.spawn_boss()
	else:
		field.spawn_batch(n, type)

func _on_enemy_killed(pos: Vector2, enemy_type: int, is_elite: bool) -> void:
	survivor.on_enemy_killed(pos, enemy_type, is_elite)
	_spawn_kill_particles(pos, enemy_type)
	audio.play_sfx("kill")
	# Lifesteal
	if _lifesteal_per_kill > 0:
		_player_hp = minf(_player_max_hp, _player_hp + float(_lifesteal_per_kill))

func _on_boss_phase_changed(phase: int) -> void:
	survivor.add_screenshake(8.0)
	audio.play_sfx("boss_phase")
	var boss_pos: Vector2 = Vector2.ZERO
	if field.boss_idx >= 0:
		boss_pos = field.positions[field.boss_idx]
	_spawn_implosion(boss_pos, 120.0, Color(0.95, 0.75, 0.10))

func _on_level_up_started() -> void:
	audio.play_sfx("levelup")

func _on_phase2() -> void:
	survivor.add_screenshake(5.0)
	survivor.elite_spawn_interval = 18.0

func _on_damage_number(pos: Vector2, amount: int, col: Color) -> void:
	survivor.add_damage_number(pos, amount, col)

# ── _process ──────────────────────────────────────────────────────────────────
func _process(delta: float) -> void:
	if dead:
		return

	field.set_run_time(survivor.run_time)
	field.update_field(delta, snake.head)
	weapons.update_weapons(delta, snake.trail, field)
	survivor.update_systems(delta, snake.head)

	# Music intensity: 0 at start, ramps to 1 at 5 min
	audio.set_music_intensity(clampf(survivor.run_time / 300.0, 0.0, 1.0))

	# HP regen
	if _hp_regen > 0.0:
		_player_hp = minf(_player_max_hp, _player_hp + _hp_regen * delta)

	# Relay weapon screenshake
	if weapons.screenshake_intensity > 0.0:
		survivor.add_screenshake(weapons.screenshake_intensity)
		weapons.screenshake_intensity = 0.0

	# Update particles
	_update_particles(delta)

	# Boss HUD
	survivor.update_boss_hud(
		field.get_boss_hp_frac(),
		field.get_boss_shield_frac() if field.boss_phase == 0 else 0.0,
		field.boss_alive
	)

	# Death check
	if protect > 0.0:
		protect -= delta
	else:
		var hit := false
		if field.any_within(snake.head, DEATH_RADIUS):
			hit = true
		elif field.any_zoner_proj_within(snake.head, DEATH_RADIUS):
			hit = true
		elif field.player_in_red_zone(snake.head):
			hit = true
		if hit:
			dead = true
			audio.play_sfx("hit")
			_spawn_kill_particles(snake.head, -1)
			survivor.add_screenshake(12.0)
			survivor.end_run_death()

	# Debug HUD
	_hud_label.text = "Score:%d  Ennemis:%d  Longueur:%d  HP:%.0f  FPS:%d" % [
		score, field.alive_count(), snake.trail.size(), _player_hp, Engine.get_frames_per_second()
	]

# ── Constriction ──────────────────────────────────────────────────────────────
func _on_constriction(poly: PackedVector2Array, area: float) -> void:
	var killed: PackedVector2Array = field.kill_in_polygon(poly)
	var c: int = killed.size()
	if c > 0:
		survivor.drop_orbs(killed)
		snake.grow(3 + c)
		score += c

	# Implosion effect
	var centroid := Vector2.ZERO
	for p in poly:
		centroid += p
	if poly.size() > 0:
		centroid /= float(poly.size())

	var radius: float = sqrt(area / PI) * 0.9
	_spawn_implosion(centroid, radius, Color(1.0, 0.88, 0.30))
	survivor.add_screenshake(4.0 + c * 0.3)
	audio.play_sfx("constriction")
	_flash_poly(poly)

# ── Implosion ─────────────────────────────────────────────────────────────────
func _spawn_implosion(center: Vector2, radius: float, col: Color) -> void:
	var arc := ImplosionArc.new()
	arc.center = center
	arc.radius = radius
	arc.col = col
	arc.life = 0.55
	_implosions.append(arc)
	var count: int = mini(24, maxi(8, int(radius * 0.3)))
	for _k in range(count):
		var angle: float = _rng.randf() * TAU
		var spd: float = _rng.randf_range(80.0, 240.0)
		var p := Particle.new()
		p.pos = center + Vector2(cos(angle), sin(angle)) * radius * 0.3
		p.vel = Vector2(cos(angle), sin(angle)) * spd
		p.col = col.lerp(Color(1, 1, 1), _rng.randf() * 0.4)
		p.size = _rng.randf_range(3.0, 7.0)
		p.life = _rng.randf_range(0.35, 0.65)
		_particles.append(p)

# ── Kill particles ─────────────────────────────────────────────────────────────
func _spawn_kill_particles(pos: Vector2, enemy_type: int) -> void:
	var col: Color
	var count: int
	var speed_max: float
	match enemy_type:
		-1:   # player death
			col = Color(0.30, 1.0, 0.65)
			count = 32
			speed_max = 300.0
		0:    # FODDER
			col = Color(0.95, 0.25, 0.28)
			count = 5
			speed_max = 120.0
		1:    # CHASER
			col = Color(1.0, 0.55, 0.10)
			count = 7
			speed_max = 160.0
		2:    # ZONER
			col = Color(0.30, 0.55, 1.0)
			count = 6
			speed_max = 140.0
		3:    # ELITE
			col = Color(0.90, 0.20, 0.90)
			count = 18
			speed_max = 220.0
		4:    # BOSS
			col = Color(0.95, 0.85, 0.10)
			count = 60
			speed_max = 400.0
		5:    # DASHER
			col = Color(1.0, 0.85, 0.15)
			count = 8
			speed_max = 200.0
		6:    # SPLITTER
			col = Color(0.45, 1.0, 0.45)
			count = 10
			speed_max = 150.0
		_:
			col = Color(1.0, 0.5, 0.5)
			count = 5
			speed_max = 100.0
	for _k in range(count):
		var angle: float = _rng.randf() * TAU
		var spd: float = _rng.randf_range(20.0, speed_max)
		var particle := Particle.new()
		particle.pos = pos
		particle.vel = Vector2(cos(angle), sin(angle)) * spd
		particle.col = col.lerp(Color(1, 1, 1, 0.9), _rng.randf() * 0.3)
		particle.size = _rng.randf_range(2.5, 6.0)
		particle.life = _rng.randf_range(0.25, 0.70)
		_particles.append(particle)

# ── Particle update ────────────────────────────────────────────────────────────
func _update_particles(delta: float) -> void:
	var i: int = _particles.size() - 1
	while i >= 0:
		var p: Particle = _particles[i]
		p.age += delta
		p.pos += p.vel * delta
		p.vel = p.vel.move_toward(Vector2.ZERO, 180.0 * delta)
		if p.age >= p.life:
			_particles.remove_at(i)
		i -= 1
	var j: int = _implosions.size() - 1
	while j >= 0:
		var arc: ImplosionArc = _implosions[j]
		arc.age += delta
		if arc.age >= arc.life:
			_implosions.remove_at(j)
		j -= 1
	_fx_drawer.queue_redraw()

# ── FX draw ────────────────────────────────────────────────────────────────────
func _draw_fx() -> void:
	for arc: ImplosionArc in _implosions:
		var t: float = arc.age / arc.life
		var ease_t: float = 1.0 - (1.0 - t) * (1.0 - t)
		var cur_r: float = arc.radius * ease_t
		var alpha: float = (1.0 - t) * 0.85
		var width: float = lerpf(6.0, 1.5, t)
		var col: Color = arc.col
		col.a = alpha
		_fx_drawer.draw_arc(arc.center, cur_r, 0.0, TAU, 48, col, width)
		if t < 0.3:
			var fill_alpha: float = (0.3 - t) / 0.3 * 0.4
			_fx_drawer.draw_circle(arc.center, cur_r, Color(arc.col.r, arc.col.g, arc.col.b, fill_alpha))
	for p: Particle in _particles:
		var t: float = p.age / p.life
		var col: Color = p.col
		col.a = (1.0 - t) * (1.0 - t)
		var cur_size: float = p.size * (1.0 - t * 0.5)
		_fx_drawer.draw_circle(p.pos, cur_size * 2.2, Color(col.r, col.g, col.b, col.a * 0.25))
		_fx_drawer.draw_circle(p.pos, cur_size, col)

# ── Poly flash ────────────────────────────────────────────────────────────────
func _flash_poly(poly: PackedVector2Array) -> void:
	var p2d := Polygon2D.new()
	p2d.polygon = poly
	p2d.color = Color(1.0, 0.88, 0.25, 0.55)
	p2d.z_index = 8
	add_child(p2d)
	var tw := create_tween()
	tw.tween_property(p2d, "modulate:a", 0.0, 0.50)
	tw.tween_callback(p2d.queue_free)

# ── Upgrade handler ───────────────────────────────────────────────────────────
func _on_upgrade(id: String) -> void:
	match id:
		# ── Serpent stats ──
		"turn":
			snake.turn_rate += 0.4
		"trail":
			snake.max_points += 60
		"speed":
			snake.speed += 20.0
		"damage":
			snake.min_loop_area = maxf(1500.0, snake.min_loop_area - 500.0)
		"constrict_size":
			snake.min_loop_area = maxf(800.0, snake.min_loop_area * 0.70)
		"constrict_grow":
			snake.grow(8)
		# ── Weapon upgrades ──
		"weapon_fire", "weapon_ice", "weapon_lightning", \
		"fire_level",  "ice_level",  "lightning_level":
			weapons.apply_upgrade(id)
		# ── Skills ──
		"dash_power":
			# Makes constriction threshold even lower + visual: future dash-on-constriction
			snake.min_loop_area = maxf(600.0, snake.min_loop_area - 300.0)
		"nova_upgrade":
			# Future: constriction explosion doubled in area + damage
			# Currently reserved — placeholder screenshake
			survivor.add_screenshake(3.0)
		# ── Passives ──
		"hp_regen":
			_hp_regen += 1.5
		"armor":
			_damage_reduce *= 0.80
		"lifesteal":
			_lifesteal_per_kill += 2
		"energy_cap":
			_damage_reduce = maxf(0.3, _damage_reduce - 0.05)
		# pickup / xp / xp_magnet / constrict_size / constrict_grow handled in SurvivorSystems
		_:
			pass

func _on_run_ended(_victory: bool, _stats: Dictionary) -> void:
	dead = true
	position = Vector2.ZERO
	audio.stop_music()
