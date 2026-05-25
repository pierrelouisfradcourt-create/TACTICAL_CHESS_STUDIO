extends StaticBody3D
class_name GardenZone

signal selected(zone_data: Dictionary)

var data: Dictionary = {}
var _base_y: float = 0.0
var _selected: bool = false
var _mesh_instance: MeshInstance3D
var _label: Label3D
var _status_marker: MeshInstance3D
var _selection_marker: MeshInstance3D
var _focus_ring: MeshInstance3D
var _focus_pin: MeshInstance3D
var _layer_focused: bool = false
var _architecture_view_match: bool = true

func setup(zone_data: Dictionary) -> void:
	data = zone_data
	name = String(data.get("id", "garden_zone"))
	position = data.get("position", Vector3.ZERO)
	_base_y = position.y
	input_ray_pickable = true
	_build_body()

func set_selected(value: bool) -> void:
	_selected = value
	_apply_visual_focus_state()
	if not value:
		position.y = _base_y

func set_layer_focus(layer_id: String) -> void:
	set_architecture_view(layer_id, layer_id.is_empty())

func set_architecture_view(layer_id: String, all_view: bool) -> void:
	var layer_ids: Array = data.get("layer_ids", [])
	_architecture_view_match = all_view or layer_id.is_empty() or layer_id in layer_ids
	_layer_focused = not all_view and layer_id in layer_ids
	_apply_visual_focus_state()

func _apply_visual_focus_state() -> void:
	if _mesh_instance != null:
		_set_zone_visual_transparency(0.0 if _architecture_view_match or _selected else 0.58)
		var material := _mesh_instance.material_override as StandardMaterial3D
		if material != null:
			material.emission_enabled = _selected or _layer_focused
			if _selected:
				material.emission = Color(0.42, 0.70, 0.28, 1.0)
				material.emission_energy_multiplier = 0.85
			elif _layer_focused:
				material.emission = Color(0.28, 0.62, 0.50, 1.0)
				material.emission_energy_multiplier = 0.24
			else:
				material.emission = Color(0.0, 0.0, 0.0, 1.0)
				material.emission_energy_multiplier = 0.0
	if _label != null:
		if _selected:
			_label.modulate = Color(1.0, 0.96, 0.68, 1.0)
			_label.outline_size = 10
		elif _layer_focused:
			_label.modulate = Color(0.80, 1.0, 0.90, 1.0)
			_label.outline_size = 8
		elif not _architecture_view_match:
			_label.modulate = Color(0.56, 0.62, 0.56, 0.42)
			_label.outline_size = 4
		else:
			_label.modulate = Color(0.92, 0.96, 0.86, 1.0)
			_label.outline_size = 7
	if _selection_marker != null:
		_selection_marker.visible = _selected
		_selection_marker.scale = Vector3(1.08, 1.0, 1.08) if _selected else Vector3.ONE
	if _focus_ring != null:
		_focus_ring.visible = _selected
	if _focus_pin != null:
		_focus_pin.visible = _selected

func _set_zone_visual_transparency(amount: float) -> void:
	for child in get_children():
		if child is MeshInstance3D:
			(child as MeshInstance3D).transparency = amount

func _process(_delta: float) -> void:
	if _selected:
		var pulse := sin(Time.get_ticks_msec() * 0.004)
		position.y = _base_y + pulse * 0.045
		if _selection_marker != null:
			var soil_scale := 1.08 + pulse * 0.035
			_selection_marker.scale = Vector3(soil_scale, 1.0, soil_scale)
		if _focus_ring != null:
			var ring_scale := 1.0 + pulse * 0.025
			_focus_ring.scale = Vector3(ring_scale, 1.0, ring_scale)

func _input_event(_camera: Camera3D, event: InputEvent, _event_position: Vector3, _normal: Vector3, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		selected.emit(data)

func _build_body() -> void:
	var shape_name := String(data.get("shape", "bed"))
	var weight := float(data.get("scale_or_weight", 1.0))
	var color := data.get("color", Color(0.4, 0.6, 0.3, 1.0)) as Color

	match shape_name:
		"tree":
			_build_tree(weight, color)
		"feedback_sphere":
			_build_feedback_sphere(weight, color)
		"gate":
			_build_gate(weight, color)
		"bramble":
			_build_bramble(weight, color)
		"roots":
			_build_roots(weight, color)
		"greenhouse":
			_build_greenhouse_bed(weight, color)
		"mycelium":
			_build_mycelium_patch(weight, color)
		"merle":
			_build_merle_scout(weight, color)
		"layer_marker":
			_build_layer_marker(weight, color)
		"forest":
			_build_forest_marker(weight, color)
		"game_tree":
			_build_game_tree(weight, color)
		"build_zone":
			_build_build_zone(weight, color)
		"archive_zone":
			_build_archive_zone(weight, color)
		"tool_zone":
			_build_outside_tool_zone(weight, color)
		"immune":
			_build_immune_plants(weight, color)
		"tools":
			_build_tool_patch(weight, color)
		"compost":
			_build_compost(weight, color)
		"climate":
			_build_climate_markers(weight, color)
		_:
			_build_seed_bed(weight, color)

	_add_status_marker(weight)
	_add_selection_marker(weight)
	_add_focus_ring(weight)
	_add_zone_label(weight)
	_add_collision(shape_name, weight)

func _build_tree(weight: float, _color: Color) -> void:
	var trunk_material := _material(Color(0.34, 0.22, 0.12, 1.0), false)
	var crown_material := _material(Color(0.30, 0.72, 0.32, 1.0), true)
	crown_material.emission_energy_multiplier = 0.12
	_mesh_instance = _add_cylinder("RecoveredOrganismTrunk", 0.28 * weight, 1.68 * weight, Vector3(0, 0.90 * weight, 0), trunk_material)
	_add_sphere("CentralLeafMass", 0.72 * weight, Vector3(0, 1.78 * weight, 0), crown_material)
	_add_sphere("LeftLeafMass", 0.50 * weight, Vector3(-0.50 * weight, 1.52 * weight, 0.10 * weight), crown_material)
	_add_sphere("RightLeafMass", 0.50 * weight, Vector3(0.50 * weight, 1.57 * weight, -0.08 * weight), crown_material)
	_add_sphere("UpperLeafMass", 0.42 * weight, Vector3(0.08 * weight, 2.18 * weight, -0.04 * weight), crown_material)
	var branch_material := _material(Color(0.26, 0.16, 0.08, 1.0), false)
	for angle in [0.35, 2.45, 4.4]:
		_add_box("LivingBranch", Vector3(0.62 * weight, 0.08 * weight, 0.08 * weight), Vector3(cos(angle) * 0.23 * weight, 1.25 * weight, sin(angle) * 0.23 * weight), branch_material, angle)
	var root_material := _material(Color(0.20, 0.12, 0.06, 1.0), false)
	for angle in [0.0, 1.05, 2.1, 3.15, 4.2, 5.25]:
		_add_box("OrganismRoot", Vector3(0.78 * weight, 0.045 * weight, 0.07 * weight), Vector3(cos(angle) * 0.34 * weight, 0.06, sin(angle) * 0.34 * weight), root_material, angle)

func _build_feedback_sphere(weight: float, color: Color) -> void:
	var sphere_material := _material(color, true, 0.46)
	sphere_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	sphere_material.cull_mode = BaseMaterial3D.CULL_DISABLED
	sphere_material.emission_energy_multiplier = 0.44
	_mesh_instance = _add_sphere("LivingFeedbackWaterSphere", 0.62 * weight, Vector3.ZERO, sphere_material)
	var ring_material := _material(Color(0.62, 0.92, 1.0, 1.0), true, 0.34)
	ring_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	for ring_index in range(3):
		var ring := _add_torus("FeedbackReturnRing", 0.80 * weight + ring_index * 0.13, 0.015 * weight, Vector3(0, 0.04 * ring_index, 0), ring_material)
		ring.rotation.x = PI * 0.5
		ring.rotation.y = float(ring_index) * 0.52
	_add_small_label("source feedback humain", Vector3(0, 0.72 * weight, 0), Color(0.78, 0.96, 1.0, 1.0), 14)
	for marker in [
		{"name": "AcceptCurrent", "text": "signal accepter", "pos": Vector3(-0.9 * weight, 0.15 * weight, 0.0), "color": Color(0.50, 0.96, 0.62, 1.0)},
		{"name": "ReviseCurrent", "text": "signal reviser", "pos": Vector3(0.9 * weight, 0.15 * weight, 0.0), "color": Color(0.95, 0.76, 0.28, 1.0)},
		{"name": "ObserveCurrent", "text": "signal observer", "pos": Vector3(0.0, 0.15 * weight, -0.9 * weight), "color": Color(0.68, 0.88, 1.0, 1.0)},
		{"name": "BlockCurrent", "text": "signal bloquer", "pos": Vector3(0.0, 0.15 * weight, 0.9 * weight), "color": Color(0.98, 0.34, 0.42, 1.0)},
	]:
		var marker_name := String(marker["name"])
		var marker_text := String(marker["text"])
		var marker_position: Vector3 = marker["pos"]
		var marker_color: Color = marker["color"]
		var current := _add_sphere(marker_name, 0.085 * weight, marker_position, _material(marker_color, true))
		current.name = marker_name
		_add_small_label(marker_text, marker_position + Vector3(0, 0.18 * weight, 0), Color(0.90, 0.98, 1.0, 1.0), 12)

func _build_gate(weight: float, color: Color) -> void:
	var gate_material := _material(color, true)
	var post_height := 1.35 * weight
	_mesh_instance = _add_box("LeftGatePost", Vector3(0.16, post_height, 0.18), Vector3(-0.45 * weight, post_height * 0.5, 0), gate_material)
	_add_box("RightGatePost", Vector3(0.16, post_height, 0.18), Vector3(0.45 * weight, post_height * 0.5, 0), gate_material)
	_add_box("GateLintel", Vector3(1.08 * weight, 0.16, 0.2), Vector3(0, post_height + 0.05, 0), gate_material)
	_add_box("GateSign", Vector3(1.0 * weight, 0.32, 0.08), Vector3(0, post_height * 0.72, -0.16), _material(Color(0.98, 0.88, 0.46, 1.0), true))

func _build_bramble(weight: float, color: Color) -> void:
	var soil_material := _material(color, false)
	_mesh_instance = _add_cylinder("BlockedSoilPatch", 0.62 * weight, 0.18, Vector3.ZERO, soil_material)
	var fence_material := _material(Color(0.16, 0.10, 0.08, 1.0), false)
	for x in [-0.55, 0.0, 0.55]:
		_add_box("FencePost", Vector3(0.08, 0.85, 0.08), Vector3(x * weight, 0.42, -0.55 * weight), fence_material)
	_add_box("FenceRailLow", Vector3(1.35 * weight, 0.08, 0.08), Vector3(0, 0.32, -0.55 * weight), fence_material)
	_add_box("FenceRailHigh", Vector3(1.35 * weight, 0.08, 0.08), Vector3(0, 0.62, -0.55 * weight), fence_material)
	for index in range(6):
		var angle := TAU * float(index) / 6.0
		_add_sphere("BrambleThorn", 0.07 * weight, Vector3(cos(angle) * 0.45 * weight, 0.28, sin(angle) * 0.45 * weight), _material(Color(0.72, 0.08, 0.14, 1.0), true))

func _build_roots(weight: float, color: Color) -> void:
	_mesh_instance = _add_cylinder("LockedRootMass", 0.48 * weight, 0.24 * weight, Vector3.ZERO, _material(color, false))
	var root_material := _material(Color(0.18, 0.10, 0.06, 1.0), false)
	for angle in [0.0, 1.2, 2.4, 3.6, 4.8]:
		_add_box("RootRib", Vector3(0.9 * weight, 0.055, 0.09), Vector3(cos(angle) * 0.25 * weight, 0.1, sin(angle) * 0.25 * weight), root_material, angle)
	var lock_material := _material(Color(0.78, 0.62, 0.32, 1.0), true)
	_add_box("LockedRootLatch", Vector3(0.55 * weight, 0.10, 0.12), Vector3(0, 0.38, -0.48 * weight), lock_material)
	_add_sphere("LockedRootPin", 0.10 * weight, Vector3(0, 0.5, -0.48 * weight), lock_material)

func _build_greenhouse_bed(weight: float, color: Color) -> void:
	_mesh_instance = _add_box("GreenhouseSoilFrame", Vector3(2.7 * weight, 0.08, 1.85 * weight), Vector3.ZERO, _material(color, true, 0.30))
	var rib_material := _material(Color(0.68, 0.92, 0.72, 1.0), true, 0.42)
	_add_box("GreenhouseNorthRib", Vector3(2.65 * weight, 0.07, 0.07), Vector3(0, 0.55, -0.82 * weight), rib_material)
	_add_box("GreenhouseSouthRib", Vector3(2.65 * weight, 0.07, 0.07), Vector3(0, 0.55, 0.82 * weight), rib_material)
	_add_box("GreenhouseRoofRib", Vector3(0.08, 0.95, 1.75 * weight), Vector3(0, 0.48, 0), rib_material)

func _build_mycelium_patch(weight: float, color: Color) -> void:
	_mesh_instance = _add_sphere("ScoutNode", 0.23 * weight, Vector3.ZERO, _material(color, true))
	for angle in [0.0, 0.78, 1.57, 2.35, 3.14, 3.92, 4.71, 5.5]:
		_add_box("ScoutThread", Vector3(0.65 * weight, 0.035, 0.035), Vector3(cos(angle) * 0.22 * weight, 0.03, sin(angle) * 0.22 * weight), _material(Color(0.80, 0.86, 1.0, 1.0), true), angle)

func _build_merle_scout(weight: float, _color: Color) -> void:
	var feather_material := _material(Color(0.055, 0.062, 0.070, 1.0), true)
	feather_material.emission_energy_multiplier = 0.18
	var wing_material := _material(Color(0.035, 0.040, 0.048, 1.0), true)
	wing_material.emission_energy_multiplier = 0.08
	var beak_material := _material(Color(0.95, 0.62, 0.16, 1.0), true)
	var eye_material := _material(Color(0.92, 0.96, 0.78, 1.0), true)
	_mesh_instance = _add_sphere("MerleBlackbirdBody", 0.24 * weight, Vector3(0, 0.22 * weight, 0), feather_material)
	_mesh_instance.scale = Vector3(1.35, 0.82, 0.72)
	var head := _add_sphere("MerleHead", 0.16 * weight, Vector3(0.28 * weight, 0.34 * weight, 0), feather_material)
	head.scale = Vector3(1.05, 0.95, 0.95)
	_add_box("MerleLeftWing", Vector3(0.36 * weight, 0.035 * weight, 0.16 * weight), Vector3(-0.05 * weight, 0.22 * weight, -0.20 * weight), wing_material, -0.25)
	_add_box("MerleRightWing", Vector3(0.36 * weight, 0.035 * weight, 0.16 * weight), Vector3(-0.05 * weight, 0.22 * weight, 0.20 * weight), wing_material, 0.25)
	_add_box("MerleTail", Vector3(0.30 * weight, 0.045 * weight, 0.16 * weight), Vector3(-0.33 * weight, 0.20 * weight, 0), wing_material, 0.12)
	_add_box("MerleBeak", Vector3(0.18 * weight, 0.055 * weight, 0.055 * weight), Vector3(0.45 * weight, 0.34 * weight, 0), beak_material)
	_add_sphere("MerleEye", 0.025 * weight, Vector3(0.38 * weight, 0.40 * weight, -0.09 * weight), eye_material)
	_add_cylinder("MerlePerch", 0.025 * weight, 1.25 * weight, Vector3(0, -0.32 * weight, 0), _material(Color(0.25, 0.14, 0.07, 1.0), false), PI * 0.5)
	_add_sphere("MerleReportSeed", 0.055 * weight, Vector3(0.18 * weight, 0.05 * weight, 0.24 * weight), _material(Color(0.74, 0.92, 1.0, 1.0), true))

func _build_layer_marker(weight: float, color: Color) -> void:
	var layer_material := _material(color, true, 0.46)
	layer_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	layer_material.cull_mode = BaseMaterial3D.CULL_DISABLED
	_mesh_instance = _add_box("ReadOnlyLayerCalque", Vector3(1.05 * weight, 0.035, 0.62 * weight), Vector3.ZERO, layer_material)
	_add_box("LayerContourLineA", Vector3(1.18 * weight, 0.025, 0.035), Vector3(0, 0.08, -0.22 * weight), layer_material)
	_add_box("LayerContourLineB", Vector3(0.82 * weight, 0.025, 0.035), Vector3(0, 0.14, 0.0), layer_material)
	_add_box("LayerContourLineC", Vector3(1.02 * weight, 0.025, 0.035), Vector3(0, 0.20, 0.22 * weight), layer_material)

func _build_forest_marker(weight: float, color: Color) -> void:
	_mesh_instance = _add_cylinder("VideoGameGardenBed", 0.58 * weight, 0.10, Vector3.ZERO, _material(color, true, 0.55))
	for item in [
		{"pos": Vector3(-0.38 * weight, 0.14, -0.22 * weight), "scale": 0.32},
		{"pos": Vector3(0.0, 0.14, 0.16 * weight), "scale": 0.42},
		{"pos": Vector3(0.36 * weight, 0.14, -0.18 * weight), "scale": 0.28},
	]:
		var pos: Vector3 = item["pos"]
		var tree_scale := float(item["scale"]) * weight
		_add_cylinder("OneTreePerGameTrunk", 0.035 * tree_scale, 0.34 * tree_scale, pos + Vector3(0, 0.16 * tree_scale, 0), _material(Color(0.32, 0.20, 0.10, 1.0), false))
		_add_sphere("OneTreePerGameCrown", 0.14 * tree_scale, pos + Vector3(0, 0.38 * tree_scale, 0), _material(Color(0.38, 0.72, 0.28, 1.0), true))

func _build_game_tree(weight: float, color: Color) -> void:
	var trunk_material := _material(Color(0.32, 0.20, 0.10, 1.0), false)
	var crown_material := _material(color, true)
	_mesh_instance = _add_cylinder("CandidateGameTreeTrunk", 0.12 * weight, 0.72 * weight, Vector3(0, 0.36 * weight, 0), trunk_material)
	_add_sphere("CandidateGameTreeCrown", 0.34 * weight, Vector3(0, 0.86 * weight, 0), crown_material)
	_add_sphere("CandidateGameTreeSmallCrown", 0.22 * weight, Vector3(0.24 * weight, 0.72 * weight, -0.06 * weight), crown_material)
	_add_box("RoadmapCandidateTag", Vector3(0.52 * weight, 0.045, 0.07), Vector3(0, 0.18 * weight, -0.38 * weight), _material(Color(0.96, 0.78, 0.32, 1.0), true))

func _build_build_zone(weight: float, color: Color) -> void:
	_mesh_instance = _add_box("OutsideBuildOutputBed", Vector3(0.92 * weight, 0.16, 0.58 * weight), Vector3.ZERO, _material(color, false))
	var marker_material := _material(Color(0.88, 0.78, 0.48, 1.0), true)
	for index in range(3):
		_add_box("PassiveOutputStone", Vector3(0.32 * weight, 0.08, 0.20 * weight), Vector3((-0.28 + index * 0.28) * weight, 0.16 + index * 0.055, 0.02), marker_material)
	_add_small_label("bac a sable", Vector3(0, 0.48 * weight, 0.42 * weight), Color(0.94, 0.92, 0.72, 1.0), 14)

func _build_archive_zone(weight: float, color: Color) -> void:
	_mesh_instance = _add_box("OutsideArchiveCleanStorageBed", Vector3(1.02 * weight, 0.14, 0.62 * weight), Vector3.ZERO, _material(color, false))
	var jar_material := _material(Color(0.62, 0.78, 0.80, 1.0), true, 0.78)
	for x in [-0.32, 0.0, 0.32]:
		_add_cylinder("CleanStorageJar", 0.09 * weight, 0.32 * weight, Vector3(x * weight, 0.22 * weight, 0.0), jar_material)
		_add_sphere("CleanStorageLid", 0.075 * weight, Vector3(x * weight, 0.40 * weight, 0.0), _material(Color(0.84, 0.88, 0.74, 1.0), true))
	_add_small_label("stockage anti-doublon", Vector3(0, 0.58 * weight, 0.38 * weight), Color(0.84, 0.96, 0.92, 1.0), 14)

func _build_outside_tool_zone(weight: float, color: Color) -> void:
	_mesh_instance = _add_cylinder("OutsideToolPatch", 0.42 * weight, 0.14, Vector3.ZERO, _material(color, false))
	var tool_material := _material(Color(0.52, 0.70, 0.82, 1.0), true)
	_add_box("GardenerToolHandle", Vector3(0.07, 0.72 * weight, 0.07), Vector3(-0.20 * weight, 0.38 * weight, 0), _material(Color(0.22, 0.18, 0.12, 1.0), false), 0.42)
	_add_box("GardenerToolHead", Vector3(0.34 * weight, 0.10, 0.12), Vector3(0.18 * weight, 0.25 * weight, 0), tool_material, -0.25)
	_add_box("GodotToolMarker", Vector3(0.32 * weight, 0.32 * weight, 0.045), Vector3(0.12 * weight, 0.55 * weight, 0.28 * weight), _material(Color(0.24, 0.58, 0.92, 1.0), true), 0.78)
	_add_small_label("Godot / Codex", Vector3(0.1 * weight, 0.82 * weight, 0.28 * weight), Color(0.72, 0.92, 1.0, 1.0), 14)

func _build_immune_plants(weight: float, color: Color) -> void:
	_mesh_instance = _add_cylinder("ImmunePlantCenter", 0.18 * weight, 0.55 * weight, Vector3(0, 0.27 * weight, 0), _material(color, true))
	for angle in [0.0, 2.1, 4.2]:
		_add_sphere("ImmuneLeaf", 0.18 * weight, Vector3(cos(angle) * 0.32 * weight, 0.48 * weight, sin(angle) * 0.32 * weight), _material(Color(0.85, 0.18, 0.18, 1.0), true))
	for x in [-0.38, 0.38]:
		_add_cylinder("ImmuneSprout", 0.07 * weight, 0.42 * weight, Vector3(x * weight, 0.2 * weight, 0.28 * weight), _material(Color(0.38, 0.66, 0.24, 1.0), true))

func _build_tool_patch(weight: float, color: Color) -> void:
	_mesh_instance = _add_cylinder("ObservationPatch", 0.42 * weight, 0.16, Vector3.ZERO, _material(color, false))
	_add_box("ToolHandle", Vector3(0.08, 0.72 * weight, 0.08), Vector3(-0.22 * weight, 0.42 * weight, 0), _material(Color(0.22, 0.18, 0.12, 1.0), false), 0.45)
	_add_box("ToolHead", Vector3(0.36 * weight, 0.10, 0.12), Vector3(0.18 * weight, 0.25 * weight, 0), _material(Color(0.52, 0.66, 0.72, 1.0), true), -0.25)

func _build_compost(weight: float, color: Color) -> void:
	_mesh_instance = _add_cylinder("CompostMound", 0.48 * weight, 0.35 * weight, Vector3.ZERO, _material(color, false))
	_add_sphere("TraceGlow", 0.18 * weight, Vector3(0.28 * weight, 0.25, -0.12 * weight), _material(Color(0.82, 0.56, 0.22, 1.0), true))
	_add_sphere("TraceGlowSmall", 0.11 * weight, Vector3(-0.24 * weight, 0.20, 0.18 * weight), _material(Color(0.72, 0.44, 0.16, 1.0), true))

func _build_climate_markers(weight: float, color: Color) -> void:
	_mesh_instance = _add_cylinder("WarmSoilPatch", 0.42 * weight, 0.12, Vector3.ZERO, _material(color, true, 0.82))
	for angle in [0.0, 2.1, 4.2]:
		_add_sphere("HeatSeed", 0.11 * weight, Vector3(cos(angle) * 0.32 * weight, 0.20, sin(angle) * 0.32 * weight), _material(Color(1.0, 0.68, 0.28, 1.0), true))

func _build_seed_bed(weight: float, color: Color) -> void:
	_mesh_instance = _add_box("SeedBed", Vector3(1.25 * weight, 0.18, 0.74 * weight), Vector3.ZERO, _material(color, false))
	var sprout_material := _material(Color(0.46, 0.72, 0.34, 1.0), true)
	for x in [-0.28, 0.0, 0.28]:
		_add_cylinder("SeedSprout", 0.035 * weight, 0.32 * weight, Vector3(x * weight, 0.24 * weight, 0), sprout_material)
	for z in [-0.22, 0.22]:
		_add_box("SeedRow", Vector3(1.05 * weight, 0.035, 0.04), Vector3(0, 0.12, z * weight), _material(Color(0.30, 0.20, 0.10, 1.0), false))

func _add_zone_label(weight: float) -> void:
	_label = Label3D.new()
	_label.name = "ReadableZoneLabel"
	_label.text = String(data.get("label", "Garden Zone"))
	_label.font_size = int(data.get("label_size", 32))
	_label.outline_size = 7
	_label.outline_modulate = Color(0.04, 0.06, 0.05, 1.0)
	_label.modulate = Color(0.92, 0.96, 0.86, 1.0)
	_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	_label.no_depth_test = true
	var label_offset: Vector3 = data.get("label_offset", Vector3(0, max(1.05, 0.9 * weight), 0))
	_label.position = label_offset
	add_child(_label)

func _add_status_marker(weight: float) -> void:
	var marker_material := _material(_status_color(String(data.get("status", "UNKNOWN"))), true)
	_status_marker = _add_sphere("StatusMarker", 0.12 * max(weight, 1.0), Vector3(0.55 * weight, 0.42, 0.55 * weight), marker_material)

func _add_selection_marker(weight: float) -> void:
	var marker_material := _material(Color(0.86, 0.95, 0.44, 1.0), true, 0.42)
	marker_material.cull_mode = BaseMaterial3D.CULL_DISABLED
	var mesh := CylinderMesh.new()
	var radius: float = max(0.72, weight * 0.78)
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = 0.018
	_selection_marker = _add_mesh("SelectedSoilGlow", mesh, Vector3(0, 0.025, 0), marker_material)
	_selection_marker.visible = false

func _add_focus_ring(weight: float) -> void:
	var ring_material := _material(Color(1.0, 0.94, 0.50, 1.0), true, 0.74)
	ring_material.cull_mode = BaseMaterial3D.CULL_DISABLED
	ring_material.emission_energy_multiplier = 0.62
	var radius: float = max(0.86, weight * 0.92)
	_focus_ring = _add_torus("SelectedFocusRing", radius, 0.035, Vector3(0, 0.07, 0), ring_material)
	_focus_ring.rotation.x = PI * 0.5
	_focus_ring.visible = false

	var pin_material := _material(Color(1.0, 0.96, 0.62, 1.0), true, 0.84)
	pin_material.emission_energy_multiplier = 0.7
	_focus_pin = _add_cylinder("SelectedFocusPin", 0.035 * max(weight, 1.0), 0.62 * max(weight, 1.0), Vector3(0, 0.42 * max(weight, 1.0), -radius), pin_material)
	_focus_pin.visible = false

func _add_collision(shape_name: String, weight: float) -> void:
	var collision := CollisionShape3D.new()
	collision.name = "ClickShape"
	var box := BoxShape3D.new()
	box.size = _collision_size(shape_name, weight)
	collision.shape = box
	add_child(collision)

func _collision_size(shape_name: String, weight: float) -> Vector3:
	match shape_name:
		"feedback_sphere":
			return Vector3(2.2 * weight, 2.2 * weight, 2.2 * weight)
		"greenhouse":
			return Vector3(2.8 * weight, 1.25, 1.95 * weight)
		"gate":
			return Vector3(1.35 * weight, 2.9, 0.65)
		"tree":
			return Vector3(1.55 * weight, 2.35 * weight, 1.55 * weight)
		"bramble":
			return Vector3(1.65 * weight, 1.1, 1.45 * weight)
		"merle":
			return Vector3(1.15 * weight, 1.25 * weight, 1.05 * weight)
		"layer_marker":
			return Vector3(1.35 * weight, 0.75, 0.9 * weight)
		"forest":
			return Vector3(1.4 * weight, 1.1, 1.25 * weight)
		"game_tree":
			return Vector3(0.95 * weight, 1.45 * weight, 0.95 * weight)
		"build_zone", "archive_zone", "tool_zone":
			return Vector3(1.35 * weight, 1.15, 1.15 * weight)
		_:
			return Vector3(1.45 * weight, 1.25, 1.45 * weight)

func _add_box(node_name: String, size: Vector3, local_position: Vector3, material: StandardMaterial3D, y_rotation: float = 0.0) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	return _add_mesh(node_name, mesh, local_position, material, y_rotation)

func _add_cylinder(node_name: String, radius: float, height: float, local_position: Vector3, material: StandardMaterial3D, y_rotation: float = 0.0) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	return _add_mesh(node_name, mesh, local_position, material, y_rotation)

func _add_sphere(node_name: String, radius: float, local_position: Vector3, material: StandardMaterial3D) -> MeshInstance3D:
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	return _add_mesh(node_name, mesh, local_position, material)

func _add_torus(node_name: String, radius: float, tube_radius: float, local_position: Vector3, material: StandardMaterial3D) -> MeshInstance3D:
	var mesh := TorusMesh.new()
	mesh.inner_radius = max(0.01, radius - tube_radius)
	mesh.outer_radius = radius + tube_radius
	return _add_mesh(node_name, mesh, local_position, material)

func _add_small_label(text: String, local_position: Vector3, color: Color, font_size: int = 22) -> void:
	var label := Label3D.new()
	label.name = "SymbolicCurrentLabel"
	label.text = text
	label.font_size = font_size
	label.outline_size = 6
	label.outline_modulate = Color(0.02, 0.04, 0.05, 1.0)
	label.modulate = color
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true
	label.position = local_position
	add_child(label)

func _add_mesh(node_name: String, mesh: Mesh, local_position: Vector3, material: StandardMaterial3D, y_rotation: float = 0.0) -> MeshInstance3D:
	var visual := MeshInstance3D.new()
	visual.name = node_name
	visual.mesh = mesh
	visual.position = local_position
	visual.rotation.y = y_rotation
	visual.material_override = material
	add_child(visual)
	return visual

func _material(color: Color, glow: bool, alpha: float = 1.0) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(color.r, color.g, color.b, alpha)
	material.roughness = 0.78
	if alpha < 1.0:
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	if glow:
		material.emission_enabled = true
		material.emission = color
		material.emission_energy_multiplier = 0.18
	return material

func _status_color(status: String) -> Color:
	match status:
		"IMPLEMENTED":
			return Color(0.22, 0.84, 0.34, 1.0)
		"TESTED":
			return Color(0.34, 0.92, 0.72, 1.0)
		"DOCUMENTED_ONLY":
			return Color(0.92, 0.70, 0.24, 1.0)
		"PASSIVE":
			return Color(0.56, 0.64, 0.72, 1.0)
		"BLOCKED":
			return Color(0.90, 0.16, 0.18, 1.0)
		"BLOCKED / UNKNOWN":
			return Color(0.90, 0.16, 0.18, 1.0)
		"NOT_FOUND":
			return Color(0.40, 0.40, 0.40, 1.0)
		_:
			return Color(0.62, 0.62, 0.70, 1.0)
