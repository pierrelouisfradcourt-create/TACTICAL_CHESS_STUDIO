extends Node2D
# Serpent : deplacement continu, BRAQUAGE RELATIF (A/D style), corps en trainee,
# et mecanique de CONSTRICTION (croiser son corps -> explosion de la zone enfermee).
#
# Contrat PUBLIC (d'autres scripts en dependent) :
#   - extends Node2D
#   - property head: Vector2                              (position monde de la tete)
#   - property trail: PackedVector2Array
#   - signal constriction(polygon: PackedVector2Array, area: float)   <-- emet AUSSI l'aire
#   - func grow(amount: int = 5) -> void
#
# AJOUTS v3:
#   - Touch input : drag-to-steer via InputEventScreenTouch / InputEventScreenDrag
#   - Joystick virtuel affiché si touch actif
#   - Compatible keyboard + touch simultanément

signal constriction(polygon: PackedVector2Array, area: float)

# --- Mouvement ---
@export var speed: float = 240.0
@export var turn_rate: float = 3.2
@export var step: float = 7.0
@export var start_points: int = 60
@export var max_points: int = 240
@export var min_loop_area: float = 4000.0
@export var allow_absolute_fallback: bool = true

# --- Etat ---
var heading: Vector2 = Vector2.RIGHT
var head: Vector2 = Vector2.ZERO
var trail: PackedVector2Array = PackedVector2Array()
var target_points: int = 60

const SKIP_NECK: int = 6
const SUBSTEP_MAX_LEN: float = 6.0
const TELEGRAPH_DIST: float = 26.0

var _telegraph_poly: PackedVector2Array = PackedVector2Array()

# ── Touch / virtual joystick state ───────────────────────────────────────────
var _touch_active: bool = false
var _touch_id: int = -1
var _touch_origin: Vector2 = Vector2.ZERO
var _touch_current: Vector2 = Vector2.ZERO
var _touch_steer: float = 0.0   # -1..1

# Joystick visual constants
const TOUCH_OUTER_RADIUS: float = 50.0
const TOUCH_INNER_RADIUS: float = 20.0
const TOUCH_STEER_DEAD: float = 8.0    # px dead zone before steer begins
const TOUCH_STEER_RANGE: float = 60.0  # px = full deflection

# ── Animated background dots ──────────────────────────────────────────────────
const BG_DOT_COUNT := 60
var _bg_dots: PackedVector2Array = PackedVector2Array()
var _bg_vel: PackedVector2Array = PackedVector2Array()
var _bg_size: PackedFloat32Array = PackedFloat32Array()
var _rng := RandomNumberGenerator.new()

func _ready() -> void:
	_rng.randomize()
	target_points = max(3, start_points)
	head = get_viewport_rect().size * 0.5
	heading = Vector2.RIGHT
	trail.clear()
	trail.append(head)
	_init_bg_dots()

func _init_bg_dots() -> void:
	var vp: Vector2 = get_viewport_rect().size
	_bg_dots.resize(BG_DOT_COUNT)
	_bg_vel.resize(BG_DOT_COUNT)
	_bg_size.resize(BG_DOT_COUNT)
	for i in range(BG_DOT_COUNT):
		_bg_dots[i] = Vector2(_rng.randf() * vp.x, _rng.randf() * vp.y)
		var angle: float = _rng.randf() * TAU
		var spd: float = _rng.randf_range(6.0, 22.0)
		_bg_vel[i] = Vector2(cos(angle) * spd, sin(angle) * spd)
		_bg_size[i] = _rng.randf_range(1.2, 3.5)

# ── Touch input handling ──────────────────────────────────────────────────────
func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		var touch: InputEventScreenTouch = event as InputEventScreenTouch
		if touch.pressed:
			# Only accept first finger (or if no active touch)
			if not _touch_active:
				_touch_active = true
				_touch_id = touch.index
				_touch_origin = touch.position
				_touch_current = touch.position
				_touch_steer = 0.0
		else:
			if touch.index == _touch_id:
				_touch_active = false
				_touch_id = -1
				_touch_steer = 0.0

	elif event is InputEventScreenDrag:
		var drag: InputEventScreenDrag = event as InputEventScreenDrag
		if _touch_active and drag.index == _touch_id:
			_touch_current = drag.position
			var delta_vec: Vector2 = _touch_current - _touch_origin
			var dx: float = delta_vec.x
			# Map horizontal offset to steer (clamped -1..1)
			if absf(dx) > TOUCH_STEER_DEAD:
				_touch_steer = clampf((dx - signf(dx) * TOUCH_STEER_DEAD) / TOUCH_STEER_RANGE, -1.0, 1.0)
			else:
				_touch_steer = 0.0

func _process(delta: float) -> void:
	if delta <= 0.0:
		return
	_apply_steering(delta)
	var prev: Vector2 = head
	head += heading * speed * delta
	var vp: Vector2 = get_viewport_rect().size
	head.x = clampf(head.x, 0.0, vp.x)
	head.y = clampf(head.y, 0.0, vp.y)
	if trail.is_empty() or head.distance_to(trail[trail.size() - 1]) >= step:
		trail.append(head)
		_trim_trail()
	_check_constriction(prev, head)
	_update_telegraph(prev, head)
	_update_bg_dots(delta, vp)
	queue_redraw()

func _apply_steering(delta: float) -> void:
	# Keyboard takes priority
	var turn_input: float = Input.get_axis("ui_left", "ui_right")
	var length_factor: float = 1.0 + float(trail.size()) / 600.0
	var effective_turn: float = turn_rate / length_factor

	if absf(turn_input) > 0.001:
		heading = heading.rotated(turn_input * effective_turn * delta)
		heading = heading.normalized()
		return

	# Touch steer (drag-to-steer)
	if _touch_active and absf(_touch_steer) > 0.001:
		heading = heading.rotated(_touch_steer * effective_turn * delta)
		heading = heading.normalized()
		return

	# Absolute fallback (arrow keys vertical)
	if allow_absolute_fallback:
		var vy: float = Input.get_axis("ui_up", "ui_down")
		if absf(vy) > 0.2:
			var target_angle: float = Vector2(heading.x, vy).angle() if absf(heading.x) > 0.001 else (PI * 0.5 * signf(vy))
			var cur_angle: float = heading.angle()
			var diff: float = wrapf(target_angle - cur_angle, -PI, PI)
			var max_step: float = effective_turn * delta
			diff = clampf(diff, -max_step, max_step)
			heading = Vector2.RIGHT.rotated(cur_angle + diff)
			heading = heading.normalized()

func _update_bg_dots(delta: float, vp: Vector2) -> void:
	for i in range(BG_DOT_COUNT):
		var p: Vector2 = _bg_dots[i] + _bg_vel[i] * delta
		if p.x < 0.0:
			p.x += vp.x
		elif p.x > vp.x:
			p.x -= vp.x
		if p.y < 0.0:
			p.y += vp.y
		elif p.y > vp.y:
			p.y -= vp.y
		_bg_dots[i] = p

func _trim_trail() -> void:
	var cap: int = mini(target_points, max_points)
	cap = maxi(cap, 3)
	while trail.size() > cap:
		trail.remove_at(0)

func _check_constriction(prev: Vector2, cur: Vector2) -> void:
	var move: Vector2 = cur - prev
	var dist: float = move.length()
	if dist <= 0.0001:
		return
	var n_sub: int = maxi(1, int(ceil(dist / SUBSTEP_MAX_LEN)))
	var a_pt: Vector2 = prev
	for s in range(1, n_sub + 1):
		var t: float = float(s) / float(n_sub)
		var b_pt: Vector2 = prev + move * t
		if _test_segment_against_trail(a_pt, b_pt):
			return
		a_pt = b_pt

func _test_segment_against_trail(seg_a: Vector2, seg_b: Vector2) -> bool:
	if trail.size() < SKIP_NECK + 3:
		return false
	var limit: int = trail.size() - SKIP_NECK - 1
	for i in range(0, limit):
		var a: Vector2 = trail[i]
		var b: Vector2 = trail[i + 1]
		var hit: Variant = Geometry2D.segment_intersects_segment(seg_a, seg_b, a, b)
		if hit == null:
			continue
		var cross: Vector2 = hit as Vector2
		var poly: PackedVector2Array = PackedVector2Array()
		poly.append(cross)
		for j in range(i + 1, trail.size()):
			poly.append(trail[j])
		if poly.size() < 3:
			_cut_loop(i, cross)
			return true
		var area: float = _polygon_area(poly)
		if area < min_loop_area:
			return false
		emit_signal("constriction", poly, area)
		_cut_loop(i, cross)
		return true
	return false

func _cut_loop(i: int, cross: Vector2) -> void:
	var newtrail: PackedVector2Array = PackedVector2Array()
	for j in range(0, i + 1):
		newtrail.append(trail[j])
	newtrail.append(cross)
	head = cross
	trail = newtrail

func _polygon_area(poly: PackedVector2Array) -> float:
	var n: int = poly.size()
	if n < 3:
		return 0.0
	var acc: float = 0.0
	for k in range(n):
		var p0: Vector2 = poly[k]
		var p1: Vector2 = poly[(k + 1) % n]
		acc += p0.x * p1.y - p1.x * p0.y
	return absf(acc) * 0.5

func _update_telegraph(prev: Vector2, cur: Vector2) -> void:
	_telegraph_poly = PackedVector2Array()
	if trail.size() < SKIP_NECK + 3:
		return
	var move: Vector2 = cur - prev
	if move.length() <= 0.0001:
		return
	var dir: Vector2 = move.normalized()
	var limit: int = trail.size() - SKIP_NECK - 1
	var best_i: int = -1
	var best_d: float = TELEGRAPH_DIST
	var best_point: Vector2 = Vector2.ZERO
	for i in range(0, limit):
		var a: Vector2 = trail[i]
		var b: Vector2 = trail[i + 1]
		var closest: Vector2 = Geometry2D.get_closest_point_to_segment(cur, a, b)
		var d: float = cur.distance_to(closest)
		if d > best_d:
			continue
		var to_seg: Vector2 = closest - cur
		if to_seg.length() <= 0.0001:
			continue
		if dir.dot(to_seg.normalized()) <= 0.25:
			continue
		best_d = d
		best_i = i
		best_point = closest
	if best_i < 0:
		return
	var preview: PackedVector2Array = PackedVector2Array()
	preview.append(best_point)
	for j in range(best_i + 1, trail.size()):
		preview.append(trail[j])
	preview.append(cur)
	if preview.size() < 3:
		return
	if _polygon_area(preview) < min_loop_area:
		return
	_telegraph_poly = preview

func grow(amount: int = 5) -> void:
	target_points += amount
	if target_points > max_points:
		target_points = max_points

func _draw() -> void:
	# ── Animated background dots ─────────────────────────────────────────────
	for i in range(BG_DOT_COUNT):
		var t: float = float(i) / float(BG_DOT_COUNT)
		var brightness: float = 0.08 + t * 0.06
		var col := Color(brightness * 0.6, brightness * 0.8, brightness + 0.1, 0.55)
		draw_circle(_bg_dots[i], _bg_size[i], col)

	# ── Telegraph: golden translucent fill ──────────────────────────────────
	if _telegraph_poly.size() >= 3:
		draw_colored_polygon(_telegraph_poly, Color(1.0, 0.85, 0.30, 0.13))
		draw_polyline(_telegraph_poly, Color(1.0, 0.85, 0.30, 0.35), 1.5, true)

	if trail.size() < 2:
		return

	# ── Glow pass ────────────────────────────────────────────────────────────
	draw_polyline(trail, Color(0.15, 0.90, 0.55, 0.08), 26.0, true)
	draw_polyline(trail, Color(0.25, 1.00, 0.65, 0.18), 16.0, true)

	# ── Body: gradient segments ───────────────────────────────────────────────
	var n: int = trail.size()
	var batch: int = 4
	var i: int = 0
	while i < n - 1:
		var end: int = mini(i + batch, n - 1)
		var seg: PackedVector2Array = PackedVector2Array()
		for k in range(i, end + 1):
			seg.append(trail[k])
		var t_start: float = float(i) / float(n - 1)
		var t_end: float = float(end) / float(n - 1)
		var t_mid: float = (t_start + t_end) * 0.5
		var col: Color = Color(
			lerpf(0.05, 0.55, t_mid),
			lerpf(0.55, 1.00, t_mid),
			lerpf(0.40, 0.70, t_mid),
			lerpf(0.65, 1.00, t_mid)
		)
		var width: float = lerpf(5.0, 11.0, t_mid)
		draw_polyline(seg, col, width, true)
		i += batch - 1

	# ── Head: layered neon circles ────────────────────────────────────────────
	draw_circle(head, 18.0, Color(0.30, 1.00, 0.65, 0.15))
	draw_circle(head, 13.0, Color(0.55, 1.00, 0.80, 0.30))
	draw_circle(head, 10.0, Color(0.85, 1.00, 0.92))
	draw_circle(head, 4.5, Color(0.04, 0.18, 0.12))
	draw_circle(head + Vector2(2.5, -2.5), 2.0, Color(1.0, 1.0, 1.0, 0.9))

	# ── Virtual joystick (touch only) ────────────────────────────────────────
	if _touch_active:
		# Outer ring
		draw_arc(_touch_origin, TOUCH_OUTER_RADIUS, 0.0, TAU, 32,
			Color(0.4, 0.9, 0.6, 0.25), 2.5, true)
		# Clamp inner dot to outer ring
		var raw_delta: Vector2 = _touch_current - _touch_origin
		var clamped_delta: Vector2 = raw_delta
		if clamped_delta.length() > TOUCH_OUTER_RADIUS:
			clamped_delta = clamped_delta.normalized() * TOUCH_OUTER_RADIUS
		var inner_pos: Vector2 = _touch_origin + clamped_delta
		draw_circle(inner_pos, TOUCH_INNER_RADIUS, Color(0.4, 0.9, 0.6, 0.45))
