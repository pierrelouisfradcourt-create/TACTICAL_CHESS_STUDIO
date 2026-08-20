# Chess TCG — présentation 3D animée. Le moteur (core/) reste identique et testé ;
# ceci n'est QUE la couche visuelle (plateau + pièces 3D + caméra + lumière + animations Tween).
extends Node3D

const Match = preload("res://core/match.gd")
const Piece = preload("res://core/piece.gd")
const PieceDefs = preload("res://core/piece_defs.gd")
const Cards = preload("res://core/cards.gd")

const TILE := 1.0
const HAND_W := 150.0
const HAND_H := 56.0
const TEAM := [Color("efe3c2"), Color("d0566a")]

var match_state
var _selected: Vector2i = Vector2i(-1, -1)
var _legal: Array = []
var _card_mode: String = ""
var _busy: bool = false
var _hover_cell: Vector2i = Vector2i(-1, -1)

var _pieces_root: Node3D
var _markers_root: Node3D
var _view_by_id: Dictionary = {}
var _scenes: Dictionary = {}
var _camera: Camera3D
var _hud: Control

func _ready() -> void:
	match_state = Match.new()
	_build_environment()
	_build_board()
	_pieces_root = Node3D.new()
	add_child(_pieces_root)
	_markers_root = Node3D.new()
	add_child(_markers_root)
	_build_hud()
	_sync_views(false)
	_refresh_markers()

# ---------- monde 3D ----------

func _build_environment() -> void:
	var env := Environment.new()
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color("161f30")
	sky_mat.sky_horizon_color = Color("3a516d")
	sky_mat.ground_bottom_color = Color("0d1017")
	sky_mat.ground_horizon_color = Color("28313f")
	var sky := Sky.new()
	sky.sky_material = sky_mat
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.5
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 1.05
	env.fog_enabled = true
	env.fog_light_color = Color("233047")
	env.fog_density = 0.016
	env.ssao_enabled = true
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	var sun := DirectionalLight3D.new()
	sun.light_color = Color(1.0, 0.94, 0.82)
	sun.rotation_degrees = Vector3(-52, -46, 0)
	sun.light_energy = 1.7
	sun.shadow_enabled = true
	add_child(sun)

	var rim := DirectionalLight3D.new()
	rim.light_color = Color(0.45, 0.55, 0.86)
	rim.rotation_degrees = Vector3(-18, 150, 0)
	rim.light_energy = 0.6
	add_child(rim)

	var ground := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(46, 46)
	ground.mesh = pm
	ground.position = Vector3(0, -0.36, 0)
	ground.material_override = _mat(Color("141a24"), 0.0, 0.95)
	add_child(ground)

	_camera = Camera3D.new()
	_camera.fov = 43
	_camera.position = Vector3(0, 8.4, 11.4)
	add_child(_camera)
	_camera.look_at(Vector3(0, 0.2, -1.4), Vector3.UP)

func _cell_to_world(pos: Vector2i) -> Vector3:
	return Vector3((pos.x - 3.5) * TILE, 0.0, (3.5 - pos.y) * TILE)

func _build_board() -> void:
	var base := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(8.6, 0.4, 8.6)
	base.mesh = bm
	base.position = Vector3(0, -0.28, 0)
	base.material_override = _mat(Color("20293a"), 0.1, 0.7)
	add_child(base)
	for x in 8:
		for y in 8:
			var tile := MeshInstance3D.new()
			var tm := BoxMesh.new()
			tm.size = Vector3(0.96, 0.14, 0.96)
			tile.mesh = tm
			tile.position = _cell_to_world(Vector2i(x, y)) + Vector3(0, -0.07, 0)
			var light: bool = (x + y) % 2 == 0
			tile.material_override = _mat(Color("4a6076") if light else Color("32475c"), 0.0, 0.8)
			add_child(tile)

func _mat(col: Color, metallic: float, rough: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.metallic = metallic
	m.roughness = rough
	return m

# ---------- pièces (primitives stylisées) ----------

# Factions : side 0 = Ordre (Adventurers), side 1 = Horde (Skeletons). Modèles CC0 KayKit.
func _char_name(side: int, type: int) -> String:
	if side == 0:
		match type:
			Piece.Type.PAWN: return "Rogue"
			Piece.Type.KNIGHT: return "Barbarian"
			Piece.Type.BISHOP: return "Mage"
			Piece.Type.ROOK: return "Knight"
			Piece.Type.QUEEN: return "Mage"
			Piece.Type.KING: return "Knight"
		return "Knight"
	match type:
		Piece.Type.PAWN: return "Skeleton_Minion"
		Piece.Type.KNIGHT: return "Skeleton_Warrior"
		Piece.Type.BISHOP: return "Skeleton_Mage"
		Piece.Type.ROOK: return "Skeleton_Warrior"
		Piece.Type.QUEEN: return "Skeleton_Mage"
		Piece.Type.KING: return "Skeleton_Warrior"
	return "Skeleton_Warrior"

func _char_scene(side: int, type: int) -> PackedScene:
	var folder := "adventurers" if side == 0 else "skeletons"
	var path := "res://assets/characters/%s/%s.glb" % [folder, _char_name(side, type)]
	if not _scenes.has(path):
		_scenes[path] = load(path)
	return _scenes[path]

func _make_piece(piece) -> Node3D:
	var root := Node3D.new()
	var model = _char_scene(piece.side, piece.type).instantiate()
	model.scale = Vector3(0.6, 0.6, 0.6)
	model.rotation.y = 0.0 if piece.side == 0 else PI   # se font face
	root.add_child(model)
	# socle lumineux d'appartenance (bleu Ordre / rouge Horde)
	var team_col: Color = Color("3fa0ff") if piece.side == 0 else Color("ff4d4d")
	var ring := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.32
	tm.outer_radius = 0.46
	ring.mesh = tm
	ring.position = Vector3(0, 0.03, 0)
	var rmat := StandardMaterial3D.new()
	rmat.albedo_color = team_col
	rmat.emission_enabled = true
	rmat.emission = team_col
	rmat.emission_energy_multiplier = 1.4
	rmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	ring.material_override = rmat
	root.add_child(ring)
	var ap = _find_ap(model)
	if ap != null:
		root.set_meta("ap", ap)
		_play_anim(ap, "Idle", true)
	var lbl := Label3D.new()
	lbl.name = "hp"
	lbl.text = str(piece.hp)
	lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	lbl.no_depth_test = true
	lbl.fixed_size = true
	lbl.pixel_size = 0.001
	lbl.font_size = 30
	lbl.outline_size = 9
	lbl.outline_modulate = Color(0, 0, 0, 0.9)
	lbl.modulate = Color("bcd8ff") if piece.side == 0 else Color("ffc2ba")
	lbl.position = Vector3(0, 1.55, 0)
	root.add_child(lbl)
	return root

func _find_ap(n):
	if n is AnimationPlayer:
		return n
	for c in n.get_children():
		var r = _find_ap(c)
		if r != null:
			return r
	return null

func _play_anim(ap, anim_name: String, loop: bool) -> void:
	if ap == null:
		return
	if not ap.has_animation(anim_name):
		var list = ap.get_animation_list()
		if list.is_empty():
			return
		anim_name = list[0]
	var a = ap.get_animation(anim_name)
	if a != null:
		a.loop_mode = Animation.LOOP_LINEAR if loop else Animation.LOOP_NONE
	ap.play(anim_name)

func _cyl(bottom: float, top: float, h: float) -> CylinderMesh:
	var c := CylinderMesh.new()
	c.bottom_radius = bottom
	c.top_radius = top
	c.height = h
	c.radial_segments = 20
	return c

# ---------- synchronisation vue <-> moteur (animée) ----------

func _sync_views(animate: bool) -> void:
	var present := {}
	for x in 8:
		for y in 8:
			var p = match_state.board.get_piece(Vector2i(x, y))
			if p != null:
				present[p.get_instance_id()] = {"pos": Vector2i(x, y), "piece": p}
	# apparitions
	for id in present:
		if not _view_by_id.has(id):
			var node := _make_piece(present[id].piece)
			node.position = _cell_to_world(present[id].pos)
			_pieces_root.add_child(node)
			_view_by_id[id] = node
	# captures
	for id in _view_by_id.keys():
		if not present.has(id):
			_death_anim(_view_by_id[id])
			_view_by_id.erase(id)
	# positions + PV
	for id in present:
		var node: Node3D = _view_by_id[id]
		var target := _cell_to_world(present[id].pos)
		var lbl := node.get_node_or_null("hp")
		if lbl != null:
			lbl.text = str(present[id].piece.hp)
		if animate and node.position.distance_to(target) > 0.01:
			var apx = node.get_meta("ap", null)
			if apx != null:
				_play_anim(apx, "Running_A", true)
			var tw := create_tween().set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
			tw.tween_property(node, "position", target + Vector3(0, 0.28, 0), 0.20)
			tw.tween_property(node, "position", target, 0.18)
			if apx != null:
				tw.chain().tween_callback(_play_anim.bind(apx, "Idle", true))
		else:
			node.position = target

func _death_anim(node: Node3D) -> void:
	var ap = node.get_meta("ap", null)
	if ap != null and ap.has_animation("Death_A"):
		_play_anim(ap, "Death_A", false)
		await get_tree().create_timer(1.3).timeout
	if is_instance_valid(node):
		node.queue_free()

# ---------- marqueurs (sélection / coups légaux / cibles carte) ----------

func _refresh_markers() -> void:
	for c in _markers_root.get_children():
		c.queue_free()
	if _card_mode != "":
		var enemy: bool = Cards.CATALOG[_card_mode].target == "enemy"
		var col: Color = Color("ff5236") if enemy else Color("57d06a")
		for x in 8:
			for y in 8:
				if Cards.valid_target(match_state.board, _card_mode, 0, Vector2i(x, y)):
					_add_tile(Vector2i(x, y), col, 0.42)
					if enemy:
						_add_ring(Vector2i(x, y), col)
		return
	if _selected.x >= 0:
		_add_tile(_selected, Color("f2c14e"), 0.5)
		_add_ring(_selected, Color("f2c14e"))
		for c in _legal:
			if match_state.board.is_empty(c):
				_add_tile(c, Color("46a3ff"), 0.30)      # déplacement (bleu)
			else:
				_add_tile(c, Color("ff2f1c"), 0.6)        # cible d'attaque (rouge vif)
				_add_ring(c, Color("ff6a4a"))

# case entière surlignée (translucide + émissive) : lisible pour la longue portée
func _add_tile(cell: Vector2i, col: Color, alpha: float) -> void:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(0.94, 0.02, 0.94)
	mi.mesh = bm
	mi.position = _cell_to_world(cell) + Vector3(0, 0.04, 0)
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(col.r, col.g, col.b, alpha)
	m.emission_enabled = true
	m.emission = col
	m.emission_energy_multiplier = 0.55
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mi.material_override = m
	_markers_root.add_child(mi)

func _add_ring(cell: Vector2i, col: Color) -> void:
	var mi := MeshInstance3D.new()
	var t := TorusMesh.new()
	t.inner_radius = 0.34
	t.outer_radius = 0.46
	mi.mesh = t
	mi.position = _cell_to_world(cell) + Vector3(0, 0.05, 0)
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.emission_enabled = true
	m.emission = col
	m.emission_energy_multiplier = 0.8
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mi.material_override = m
	_markers_root.add_child(mi)

# ---------- entrée ----------

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_R:
		_restart()
		return
	if event is InputEventMouseMotion:
		var hc := _pick_cell(event.position)
		if hc != _hover_cell:
			_hover_cell = hc
			_hud.queue_redraw()
		return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var hi := _hand_index_at(event.position)
		if hi >= 0:
			_on_hand_click(hi)
			return
		var cell := _pick_cell(event.position)
		if cell.x >= 0:
			_resolve_click(cell)

# Case dont afficher la fiche : la sélection sinon le survol.
func info_cell() -> Vector2i:
	return _selected if _selected.x >= 0 else _hover_cell

func _pick_cell(mpos: Vector2) -> Vector2i:
	var from := _camera.project_ray_origin(mpos)
	var dir := _camera.project_ray_normal(mpos)
	if absf(dir.y) < 0.0001:
		return Vector2i(-1, -1)
	var t := -from.y / dir.y
	if t < 0:
		return Vector2i(-1, -1)
	var hit := from + dir * t
	var bx := int(round(hit.x / TILE + 3.5))
	var by := int(round(3.5 - hit.z / TILE))
	if bx >= 0 and bx < 8 and by >= 0 and by < 8:
		return Vector2i(bx, by)
	return Vector2i(-1, -1)

func _resolve_click(cell: Vector2i) -> void:
	if _busy or match_state.winner != -1:
		return
	if _card_mode != "":
		match_state.play_card(_card_mode, cell)
		_card_mode = ""
		_sync_views(false)
		_refresh_markers()
		_hud.queue_redraw()
		return
	var p = match_state.board.get_piece(cell)
	if _selected == Vector2i(-1, -1):
		if p != null and p.side == match_state.current:
			_selected = cell
			_legal = match_state.legal_for(cell)
	elif cell in _legal:
		_play_and_animate(_selected, cell)
		return
	elif p != null and p.side == match_state.current:
		_selected = cell
		_legal = match_state.legal_for(cell)
	else:
		_selected = Vector2i(-1, -1)
		_legal = []
	_refresh_markers()
	_hud.queue_redraw()

func _play_and_animate(from: Vector2i, to: Vector2i) -> void:
	_busy = true
	_selected = Vector2i(-1, -1)
	_legal = []
	_refresh_markers()
	await _do_move(from, to)
	if match_state.winner == -1 and match_state.current == 1:
		await get_tree().create_timer(0.2).timeout
		var mv = match_state.ai_pick()
		if not mv.is_empty():
			await _do_move(mv.from, mv.to)
	_busy = false
	_hud.queue_redraw()

# Joue un coup et l'ANIME étape par étape depuis le journal d'événements du moteur.
func _do_move(from: Vector2i, to: Vector2i) -> void:
	var mover = match_state.board.get_piece(from)
	var mover_id: int = mover.get_instance_id() if mover != null else 0
	var target = match_state.board.get_piece(to)
	var target_id: int = target.get_instance_id() if target != null else 0
	var path := _straight_path(from, to)
	var top = match_state.play(from, to)   # {ok, res, brawl, winner}
	if not top.get("ok", false):
		return
	var res = top.get("res", {})           # détail combat : events/killed/attacked/damage/retaliated/mover_died
	var brawl = top.get("brawl", [])
	var node = _view_by_id.get(mover_id, null)
	var apx = node.get_meta("ap", null) if node != null else null

	# 1) MARCHE case par case + contre-attaques de TRAVERSÉE visibles
	if node != null and not path.is_empty():
		if apx != null:
			_play_anim(apx, "Running_A", true)
		for tile in path:
			await _tween_to(node, _cell_to_world(tile), 0.16)
			var tdmg := _event_dmg(res, "traversal", tile)
			if tdmg > 0:
				_fx_hit(_cell_to_world(tile), Color("ffb14a"), tdmg)
				if apx != null:
					_play_anim(apx, "Hit_A", false)
				await get_tree().create_timer(0.34).timeout
				if apx != null:
					_play_anim(apx, "Running_A", true)

	# 2) mort en cours de traversée
	if res.get("mover_died", false):
		if node != null:
			_view_by_id.erase(mover_id)
			await _death_anim(node)
		_sync_views(false)
		return

	# 3) RÉSOLUTION à l'arrivée (attaque + riposte)
	if res.get("attacked", false):
		if apx != null:
			_play_anim(apx, "1H_Melee_Attack_Chop", false)
		await get_tree().create_timer(0.34).timeout
		_fx_hit(_cell_to_world(to), Color("ff5236"), res.get("damage", 0))
		var victim = _view_by_id.get(target_id, null)
		if victim != null and not res.get("killed", false):
			var vap = victim.get_meta("ap", null)
			if vap != null:
				_play_anim(vap, "Hit_A", false)
		if res.get("retaliated", false):
			await get_tree().create_timer(0.28).timeout
			if victim != null:
				var vap2 = victim.get_meta("ap", null)
				if vap2 != null:
					_play_anim(vap2, "1H_Melee_Attack_Chop", false)
			_fx_hit(_cell_to_world(from), Color("ff5236"), 0)
			if apx != null:
				_play_anim(apx, "Hit_A", false)
		await get_tree().create_timer(0.3).timeout

	# 4) synchronise positions/PV/morts restantes
	_sync_views(true)
	_hud.queue_redraw()
	await get_tree().create_timer(0.42).timeout

	# 5) BRAWL de fin (chaque engagement montré)
	if brawl.size() > 0:
		for be in brawl:
			_fx_hit(_cell_to_world(be.pos), Color("b565ff"), be.get("dmg", 0))
		_shake(0.12)
		await get_tree().create_timer(0.4).timeout
		_sync_views(true)

func _straight_path(from: Vector2i, to: Vector2i) -> Array:
	var dx := to.x - from.x
	var dy := to.y - from.y
	if not (dx == 0 or dy == 0 or absi(dx) == absi(dy)):
		return []
	var step := Vector2i(signi(dx), signi(dy))
	var out: Array = []
	var cur: Vector2i = from + step
	while cur != to:
		out.append(cur)
		cur += step
	return out

func _event_dmg(res, kind: String, tile: Vector2i) -> int:
	for e in res.get("events", []):
		if e.get("e", "") == kind and e.get("tile", Vector2i(-9, -9)) == tile:
			return int(e.get("dmg", 0))
	return 0

func _tween_to(node: Node3D, target: Vector3, dur: float) -> void:
	var tw := create_tween().set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tw.tween_property(node, "position", target, dur)
	await tw.finished

# étincelle + nombre de dégâts flottant + secousse
func _fx_hit(cell_world: Vector3, col: Color, dmg: int) -> void:
	var pos := cell_world + Vector3(0, 0.9, 0)
	var spark := MeshInstance3D.new()
	spark.mesh = _sphere(0.16)
	var sm := StandardMaterial3D.new()
	sm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	sm.albedo_color = col
	sm.emission_enabled = true
	sm.emission = col
	sm.emission_energy_multiplier = 2.5
	sm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	spark.material_override = sm
	spark.position = pos
	add_child(spark)
	var tw := create_tween().set_parallel(true)
	tw.tween_property(spark, "scale", Vector3(3.2, 3.2, 3.2), 0.28)
	tw.tween_property(sm, "albedo_color:a", 0.0, 0.28)
	tw.chain().tween_callback(spark.queue_free)
	if dmg > 0:
		_damage_popup(pos, dmg)
	_shake(0.09)

func _damage_popup(pos: Vector3, dmg: int) -> void:
	var lbl := Label3D.new()
	lbl.text = "-%d" % dmg
	lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	lbl.no_depth_test = true
	lbl.fixed_size = true
	lbl.pixel_size = 0.0012
	lbl.font_size = 40
	lbl.outline_size = 10
	lbl.modulate = Color("ff5a4a")
	lbl.position = pos
	add_child(lbl)
	var tw := create_tween().set_parallel(true)
	tw.tween_property(lbl, "position", pos + Vector3(0, 1.1, 0), 0.7)
	tw.tween_property(lbl, "modulate:a", 0.0, 0.7)
	tw.chain().tween_callback(lbl.queue_free)

func _shake(amp: float) -> void:
	var base := _camera.position
	var tw := create_tween()
	tw.tween_property(_camera, "position", base + Vector3(amp, amp * 0.5, 0), 0.04)
	tw.tween_property(_camera, "position", base - Vector3(amp, 0, 0), 0.06)
	tw.tween_property(_camera, "position", base, 0.06)

func _sphere(r: float) -> SphereMesh:
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2.0
	s.radial_segments = 12
	s.rings = 6
	return s

func _restart() -> void:
	match_state.reset()
	_selected = Vector2i(-1, -1)
	_legal = []
	_card_mode = ""
	_busy = false
	for n in _view_by_id.values():
		n.queue_free()
	_view_by_id.clear()
	_sync_views(false)
	_refresh_markers()
	_hud.queue_redraw()

# ---------- cartes (rects écran, partagés avec le HUD) ----------

func hand_rect(i: int) -> Rect2:
	var vp := get_viewport().get_visible_rect().size
	return Rect2(30 + i * (HAND_W + 12), vp.y - HAND_H - 22, HAND_W, HAND_H)

func _hand_index_at(pos: Vector2) -> int:
	if match_state.current != 0 or match_state.winner != -1 or _busy:
		return -1
	for i in match_state.hand[0].size():
		if hand_rect(i).has_point(pos):
			return i
	return -1

func _on_hand_click(i: int) -> void:
	if match_state.card_played:
		return
	var id: String = match_state.hand[0][i]
	_card_mode = "" if _card_mode == id else id
	_refresh_markers()
	_hud.queue_redraw()

# ---------- HUD 2D ----------

func _build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	_hud = preload("res://ui/hud.gd").new()
	_hud.game = self
	_hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hud.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(_hud)
