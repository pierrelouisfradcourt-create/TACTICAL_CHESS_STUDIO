extends Node3D

const GardenDataScript := preload("res://scripts/GardenData.gd")
const GardenZoneScript := preload("res://scripts/GardenZone.gd")
const MAIN_VIEW_ZONE_IDS: Array[String] = [
	"studio_greenhouse",
	"central_tree",
	"docs_seed_beds",
	"artifacts_compost",
	"runtime_outputs_zone",
	"purelab_legacy_triage_zone",
	"scripts_zone",
	"tool_zone",
	"datasets_zone",
	"models_zone",
	"secrets_locked_zone",
	"llm_mycelium",
	"build_zone",
	"archive_zone",
	"merle_audit_scout",
	"humangate",
]
const MAIN_LABEL_ALLOWLIST: Array[String] = [
	"C:/TACTICAL_CHESS_STUDIO",
	"Studio Control / Feedback",
	"PureLab / component",
	"Sorties / Runtime / Evidence",
	"Scripts / Outils",
	"Données / Modèles / Secrets",
	"Build / Archive / hors système",
	"Rocky IA / Engine / Search / Neural",
	"A / 0 / 1-7",
]

@onready var _zones_root: Node3D = $Zones
@onready var _ui: CanvasLayer = $UI
@onready var _inspector: ZoneInspector = $UI/ZoneInspector
@onready var _orbit_camera: OrbitCamera = $OrbitCamera

var _selected_zone: GardenZone
var _zone_order: Array[GardenZone] = []
var _selected_index: int = -1
var _flow_links: Array[Dictionary] = []
var _flow_focus_root: Node3D
var _architecture_views: Array[Dictionary] = []
var _architecture_view_index: int = 1
var _layer_reading_modes: Array[Dictionary] = []
var _layer_focus_index: int = 0
var _layer_visuals: Array[Dictionary] = []
var _layer_labels: Array[Dictionary] = []
var _layer_focus_title: Label
var _layer_focus_purpose: Label
var _architecture_room_root: Node3D
var _architecture_room_suppressed_nodes: Array[Node3D] = []
var _architecture_room_selected_marker: MeshInstance3D

func _ready() -> void:
	_layer_reading_modes = GardenDataScript.layer_reading_modes()
	_architecture_views = GardenDataScript.architecture_views()
	_flow_focus_root = Node3D.new()
	_flow_focus_root.name = "SelectedLinkedFlowMarkers"
	add_child(_flow_focus_root)
	_build_ground()
	_build_greenhouse_frame()
	_build_architecture_roadmap_layers()
	_build_semantic_pyramid_architecture_room()
	_build_zones()
	_build_primary_flows()
	_build_map_legend()
	_inspector.show_empty()
	_set_architecture_view(_architecture_view_index)
	_inspector.set_layer_reading_mode(_current_architecture_view())

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_TAB:
		var direction := -1 if event.shift_pressed else 1
		_select_relative_zone(direction)
		get_viewport().set_input_as_handled()
	elif event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F:
		_focus_selected_zone()
		get_viewport().set_input_as_handled()
	elif event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_L:
		_cycle_architecture_view()
		get_viewport().set_input_as_handled()
	elif event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_A:
		_cycle_architecture_view()
		get_viewport().set_input_as_handled()
	elif event is InputEventKey and event.pressed and not event.echo and _keycode_to_architecture_index(event.keycode) >= 0:
		_set_architecture_view(_keycode_to_architecture_index(event.keycode))
		get_viewport().set_input_as_handled()

func _build_ground() -> void:
	var ground := MeshInstance3D.new()
	ground.name = "SoilSubstrate"
	var mesh := PlaneMesh.new()
	mesh.size = Vector2(28.0, 22.0)
	ground.mesh = mesh
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(0.10, 0.15, 0.11, 1.0)
	material.roughness = 0.9
	ground.material_override = material
	add_child(ground)

	for item in [
		{"name": "StudioRootBase", "pos": Vector3(0.0, 0.018, 0.0), "size": Vector3(6.5, 0.035, 5.8), "color": Color(0.20, 0.28, 0.18, 1.0)},
		{"name": "DistrictStudioControlFeedback", "pos": Vector3(-2.3, 0.02, -2.5), "size": Vector3(6.4, 0.030, 2.8), "color": Color(0.20, 0.24, 0.16, 1.0)},
		{"name": "DistrictPureLab", "pos": Vector3(0.0, 0.02, 0.0), "size": Vector3(4.0, 0.028, 3.2), "color": Color(0.23, 0.19, 0.11, 1.0)},
		{"name": "DistrictOutputsRuntimeEvidence", "pos": Vector3(-1.15, 0.02, 4.35), "size": Vector3(6.9, 0.030, 2.3), "color": Color(0.26, 0.20, 0.12, 1.0)},
		{"name": "DistrictScriptsTools", "pos": Vector3(5.8, 0.02, 2.15), "size": Vector3(3.4, 0.030, 3.5), "color": Color(0.14, 0.20, 0.24, 1.0)},
		{"name": "DistrictDataModelsSecrets", "pos": Vector3(-6.7, 0.02, 4.9), "size": Vector3(3.4, 0.030, 5.1), "color": Color(0.24, 0.11, 0.12, 1.0)},
		{"name": "DistrictBuildArchiveOutside", "pos": Vector3(8.4, 0.02, -0.05), "size": Vector3(5.6, 0.032, 7.5), "color": Color(0.16, 0.22, 0.24, 1.0)},
		{"name": "DistrictRockyIA", "pos": Vector3(4.95, 0.02, -2.45), "size": Vector3(3.8, 0.028, 2.5), "color": Color(0.17, 0.15, 0.25, 1.0)},
	]:
		var patch := MeshInstance3D.new()
		patch.name = item["name"]
		var patch_mesh := BoxMesh.new()
		patch_mesh.size = item["size"]
		patch.mesh = patch_mesh
		patch.position = item["pos"]
		var patch_material := StandardMaterial3D.new()
		patch_material.albedo_color = item["color"]
		patch_material.roughness = 0.9
		patch.material_override = patch_material
		add_child(patch)

	_add_scene_label("C:/TACTICAL_CHESS_STUDIO", Vector3(-2.75, 1.55, -0.75), Color(0.92, 1.0, 0.86, 1.0), 21)
	_add_scene_label("Studio Control / Feedback", Vector3(-2.55, 0.68, -3.75), Color(0.84, 0.96, 0.80, 1.0), 15)
	_add_scene_label("PureLab / component", Vector3(-0.65, 0.62, 1.95), Color(0.86, 1.0, 0.80, 1.0), 15)
	_add_scene_label("Sorties / Runtime / Evidence", Vector3(-2.95, 0.66, 5.75), Color(0.98, 0.92, 0.66, 1.0), 15)
	_add_scene_label("Scripts / Outils", Vector3(4.95, 0.68, 4.15), Color(0.80, 0.92, 1.0, 1.0), 15)
	_add_scene_label("Données / Modèles / Secrets", Vector3(-8.45, 0.66, 7.55), Color(1.0, 0.80, 0.76, 1.0), 15)
	_add_scene_label("Build / Archive / hors système", Vector3(7.2, 0.70, -4.15), Color(0.92, 0.96, 0.92, 1.0), 15)
	_add_scene_label("Rocky IA / Engine / Search / Neural", Vector3(2.95, 0.70, -4.25), Color(0.86, 0.84, 1.0, 1.0), 15)
	_add_scene_label("A / 0 / 1-7", Vector3(0.0, 1.0, -7.0), Color(0.82, 0.96, 0.78, 1.0), 16)

func _build_architecture_roadmap_layers() -> void:
	var truth_material := _layer_material(Color(0.60, 0.98, 0.70, 1.0), 0.20, 0.18)
	var sensitive_material := _layer_material(Color(1.0, 0.30, 0.34, 1.0), 0.24, 0.22)
	var heritage_material := _layer_material(Color(0.62, 0.72, 1.0, 1.0), 0.22, 0.18)
	var flow_material := _layer_material(Color(0.54, 0.96, 1.0, 1.0), 0.18, 0.16)
	var build_archive_material := _layer_material(Color(0.95, 0.82, 0.42, 1.0), 0.20, 0.18)
	var architecture_material := _layer_material(Color(0.54, 0.92, 0.76, 1.0), 0.25, 0.16)
	var roadmap_material := _layer_material(Color(0.95, 0.78, 0.32, 1.0), 0.24, 0.18)

	for item in [
		{"name": "TruthCurrentLayerContour", "radius": 2.75, "tube": 0.020, "y": 0.078, "material": truth_material, "layer_id": "truth_layer"},
		{"name": "TruthCurrentLayerOuterContour", "radius": 3.18, "tube": 0.014, "y": 0.088, "material": truth_material, "layer_id": "truth_layer"},
		{"name": "FlowReadingLayerContour", "radius": 3.35, "tube": 0.015, "y": 0.096, "material": flow_material, "layer_id": "flow_layer"},
		{"name": "ArchitectureTargetLayerContour", "radius": 3.55, "tube": 0.025, "y": 0.102, "material": architecture_material, "layer_id": "target_architecture_layer"},
		{"name": "ArchitectureTargetLayerOuterContour", "radius": 4.45, "tube": 0.018, "y": 0.112, "material": architecture_material, "layer_id": "target_architecture_layer"},
		{"name": "BuildArchiveLayerContour", "radius": 5.05, "tube": 0.018, "y": 0.122, "material": build_archive_material, "layer_id": "build_archive_layer"},
		{"name": "RoadmapLayerContour", "radius": 5.65, "tube": 0.025, "y": 0.132, "material": roadmap_material, "layer_id": "roadmap_layer"},
		{"name": "RoadmapLayerOuterContour", "radius": 6.55, "tube": 0.018, "y": 0.142, "material": roadmap_material, "layer_id": "roadmap_layer"},
	]:
		_add_layer_ring(String(item["name"]), float(item["radius"]), float(item["tube"]), float(item["y"]), item["material"] as StandardMaterial3D, String(item["layer_id"]))

	for item in [
		{"name": "SensitiveLayerDatasetsFence", "pos": Vector3(-7.1, 0.16, 3.25), "size": Vector3(2.55, 0.030, 1.55), "material": sensitive_material, "layer_id": "sensitive_layer"},
		{"name": "SensitiveLayerModelsFence", "pos": Vector3(-7.35, 0.17, 5.65), "size": Vector3(2.35, 0.030, 1.35), "material": sensitive_material, "layer_id": "sensitive_layer"},
		{"name": "SensitiveLayerSecretsFence", "pos": Vector3(5.85, 0.17, -5.75), "size": Vector3(2.45, 0.030, 1.45), "material": sensitive_material, "layer_id": "sensitive_layer"},
		{"name": "SensitiveLayerBlockedFence", "pos": Vector3(5.75, 0.16, -4.25), "size": Vector3(3.05, 0.028, 2.10), "material": sensitive_material, "layer_id": "sensitive_layer"},
		{"name": "HeritageReintegrationBand", "pos": Vector3(-3.68, 0.145, -0.02), "size": Vector3(5.35, 0.022, 0.16), "material": heritage_material, "layer_id": "target_architecture_layer"},
		{"name": "FlowReadingDirectionBand", "pos": Vector3(-2.45, 0.165, 3.45), "size": Vector3(5.80, 0.018, 0.12), "material": flow_material, "layer_id": "flow_layer"},
		{"name": "BuildArchiveDirectionBand", "pos": Vector3(8.95, 0.170, -0.15), "size": Vector3(0.14, 0.020, 6.45), "material": build_archive_material, "layer_id": "build_archive_layer"},
		{"name": "RoadmapDirectionBand", "pos": Vector3(-3.85, 0.155, 1.72), "size": Vector3(7.65, 0.020, 0.13), "material": roadmap_material, "layer_id": "roadmap_layer"},
	]:
		_add_layer_band(String(item["name"]), item["pos"] as Vector3, item["size"] as Vector3, item["material"] as StandardMaterial3D, String(item["layer_id"]))

	_add_layer_line("HeritageReintegrationDirection", Vector3(0.0, 0.17, 0.0), Vector3(-7.35, 0.17, 0.05), 0.016, heritage_material, "target_architecture_layer")
	_add_layer_line("FlowReadingDirection", Vector3(0.75, 0.21, -0.95), Vector3(-2.45, 0.21, 4.35), 0.012, flow_material, "flow_layer")
	_add_layer_line("BuildArchiveReadingDirection", Vector3(-1.85, 0.20, 4.35), Vector3(10.35, 0.20, -0.15), 0.012, build_archive_material, "build_archive_layer")
	_add_layer_line("RoadmapFutureStepsDirection", Vector3(-1.2, 0.19, 4.9), Vector3(-7.35, 0.19, 1.05), 0.014, roadmap_material, "roadmap_layer")
	_add_layer_line("TargetArchitectureDirection", Vector3(-4.9, 0.18, -2.9), Vector3(4.95, 0.18, 1.75), 0.012, architecture_material, "target_architecture_layer")

	_add_scene_label("Calque vérité", Vector3(-2.72, 0.68, -4.18), Color(0.74, 1.0, 0.78, 1.0), 19)
	_add_scene_label("Calque sensible", Vector3(3.45, 0.70, -6.35), Color(1.0, 0.58, 0.58, 1.0), 19)
	_add_scene_label("Calque héritage", Vector3(-5.95, 0.72, -1.00), Color(0.72, 0.82, 1.0, 1.0), 19)
	_add_scene_label("Calque architecture cible", Vector3(-3.6, 0.76, -5.25), Color(0.72, 1.0, 0.82, 1.0), 19)
	_add_scene_label("Calque roadmap", Vector3(2.8, 0.78, -5.72), Color(1.0, 0.86, 0.46, 1.0), 19)
	_add_scene_label("Calque Vérité", Vector3(-2.72, 0.96, -4.55), Color(0.74, 1.0, 0.78, 1.0), 17)
	_add_scene_label("Calque Sensible", Vector3(3.45, 0.98, -6.70), Color(1.0, 0.58, 0.58, 1.0), 17)
	_add_scene_label("Calque Flux", Vector3(-2.15, 0.92, 3.10), Color(0.72, 0.96, 1.0, 1.0), 17)
	_add_scene_label("Calque Build / Archive", Vector3(8.95, 0.94, -1.80), Color(1.0, 0.88, 0.50, 1.0), 17)
	_add_scene_label("Calque Architecture cible", Vector3(-3.6, 1.04, -5.58), Color(0.72, 1.0, 0.82, 1.0), 17)
	_add_scene_label("Calque Roadmap", Vector3(2.8, 1.04, -6.05), Color(1.0, 0.86, 0.46, 1.0), 17)
	_add_scene_label("switch visuel local — aucun effet système - touche A / touche 0 / touches 1-7", Vector3(0.0, 1.1, -7.1), Color(0.82, 0.96, 0.78, 1.0), 17)

func _layer_material(color: Color, alpha: float, emission_energy: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(color.r, color.g, color.b, alpha)
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.emission_enabled = true
	material.emission = Color(color.r, color.g, color.b, 1.0)
	material.emission_energy_multiplier = emission_energy
	material.roughness = 0.78
	return material

func _add_layer_ring(node_name: String, radius: float, tube: float, y: float, material: StandardMaterial3D, layer_id: String) -> void:
	var ring := MeshInstance3D.new()
	ring.name = node_name
	var ring_mesh := TorusMesh.new()
	ring_mesh.inner_radius = radius - tube
	ring_mesh.outer_radius = radius + tube
	ring.mesh = ring_mesh
	ring.position = Vector3(0, y, 0)
	ring.rotation.x = PI * 0.5
	ring.material_override = material
	add_child(ring)
	_register_layer_visual(ring, layer_id, material)

func _add_layer_band(node_name: String, band_position: Vector3, size: Vector3, material: StandardMaterial3D, layer_id: String) -> void:
	var band := MeshInstance3D.new()
	band.name = node_name
	var mesh := BoxMesh.new()
	mesh.size = size
	band.mesh = mesh
	band.position = band_position
	band.material_override = material
	add_child(band)
	_register_layer_visual(band, layer_id, material)

func _add_layer_line(node_name: String, start: Vector3, end: Vector3, radius: float, material: StandardMaterial3D, layer_id: String) -> void:
	var line := MeshInstance3D.new()
	line.name = node_name
	line.mesh = _line_mesh(start, end, radius)
	line.material_override = material
	add_child(line)
	_register_layer_visual(line, layer_id, material)

func _register_layer_visual(visual: MeshInstance3D, layer_id: String, base_material: StandardMaterial3D) -> void:
	if layer_id.is_empty():
		return
	var base_color := base_material.albedo_color
	_layer_visuals.append({
		"visual": visual,
		"layer_id": layer_id,
		"base_material": base_material,
		"soft_material": _layer_material(Color(base_color.r, base_color.g, base_color.b, 1.0), maxf(0.13, base_color.a * 0.55), 0.06),
		"focus_material": _layer_material(Color(base_color.r, base_color.g, base_color.b, 1.0), minf(0.58, maxf(0.36, base_color.a * 2.0)), 0.58),
	})

func _build_semantic_pyramid_architecture_room() -> void:
	var layer_id := "semantic_pyramid_layer"
	_architecture_room_root = Node3D.new()
	_architecture_room_root.name = "ArchitectureRoomThreeSemanticPyramids"
	add_child(_architecture_room_root)

	var room_floor_material := _layer_material(Color(0.16, 0.18, 0.20, 1.0), 0.34, 0.04)
	_add_room_band("ArchitectureRoomFloor", Vector3(0.0, 0.035, 0.35), Vector3(15.8, 0.05, 6.8), room_floor_material, layer_id)
	_add_architecture_room_label("Salle des pyramides - separation semantique passive - aucun effet système", Vector3(0.0, 3.55, -2.55), Color(0.88, 0.96, 1.0, 1.0), 18, layer_id)

	_add_semantic_pyramid_group(
		"PyramideSysteme",
		Vector3(-5.35, 0.18, 0.15),
		"Pyramide Architecture Système",
		"Carte structurelle du studio",
		Color(0.60, 0.92, 0.78, 1.0),
		Color(0.98, 0.88, 0.46, 1.0),
		[
			"C:/TACTICAL_CHESS_STUDIO = full garden / studio system",
			"Studio Control = governance / control room",
			"outputs + runtime_outputs = artifact areas",
			"Datasets = sensitive data zone, training blocked",
			"Models = sensitive model zone, loading/promotion blocked",
			"Secrets = locked/unknown",
			"PureLab = component, not root",
			"Tool Zone, Build Zone, Archive Zone = structural zones",
			"no execution / scan / move / mutation",
		],
		layer_id
	)
	_add_semantic_pyramid_group(
		"PyramideAgentique",
		Vector3(0.0, 0.18, 0.15),
		"Pyramide Agentique",
		"Rôles assistant / contrôle",
		Color(0.70, 0.82, 1.0, 1.0),
		Color(1.0, 0.90, 0.48, 1.0),
		[
			"HumanGate = apex / autorisation",
			"Merle = yeux, audit, hygiene, verite",
			"ChatGPT = navigateur / critique / prompt builder",
			"Codex = executeur local borne",
			"Local LLM = futur assistant passif",
			"Mistral / Devstral = futur/passif candidat",
			"aucune activation agent ni auto-approbation",
			"no autonomous loop / workflow engine / mutation",
		],
		layer_id
	)
	_add_semantic_pyramid_group(
		"PyramideRocky",
		Vector3(5.35, 0.18, 0.15),
		"Pyramide Rocky IA joueur d’échecs",
		"Architecture joueur d'échecs",
		Color(0.86, 0.78, 1.0, 1.0),
		Color(0.62, 1.0, 0.68, 1.0),
		[
			"Engine = monde / regles / etat / actions legales",
			"Search décide = autorite tactique finale",
			"Neural propose / rerank seulement",
			"Evidence = observations / logs / reports, not proof",
			"HumanGate = promotion / claim / activation",
			"pas de DecisionController ni Chess960 actif",
			"Neural is not final authority",
			"pas de training, benchmark ou model promotion",
		],
		layer_id
	)

	_add_architecture_room_flow(Vector3(-3.62, 0.72, -1.10), Vector3(-1.72, 0.72, -1.10), "contexte / garde-fous", Color(0.64, 0.94, 0.88, 1.0), layer_id)
	_add_architecture_room_flow(Vector3(0.0, 2.55, -0.95), Vector3(0.0, 1.84, -0.95), "autorisation / feedback humain", Color(1.0, 0.90, 0.46, 1.0), layer_id)
	_add_architecture_room_flow(Vector3(-1.72, 0.48, 1.58), Vector3(-3.62, 0.48, 1.58), "prompts / patchs bornés / docs", Color(0.74, 0.88, 1.0, 1.0), layer_id)
	_add_architecture_room_flow(Vector3(-3.62, 0.44, 2.32), Vector3(3.62, 0.44, 2.32), "runtime / règles / support", Color(0.76, 0.96, 0.70, 1.0), layer_id)
	_add_architecture_room_flow(Vector3(5.35, 1.76, -0.85), Vector3(0.86, 1.76, -0.85), "traces / evidence", Color(0.92, 0.86, 1.0, 1.0), layer_id)

func _add_semantic_pyramid_group(prefix: String, origin: Vector3, title: String, subtitle: String, body_color: Color, apex_color: Color, labels: Array, layer_id: String) -> void:
	var body_material := _layer_material(body_color, 0.54, 0.32)
	var apex_material := _layer_material(apex_color, 0.66, 0.66)
	var foundation_material := _layer_material(Color(body_color.r * 0.40, body_color.g * 0.40, body_color.b * 0.40, 1.0), 0.42, 0.05)
	_add_room_band("%sBasePlate" % prefix, origin + Vector3(0.0, -0.045, 0.0), Vector3(4.15, 0.055, 4.25), foundation_material, layer_id)
	_add_agent_pyramid("%sMainPyramid" % prefix, origin + Vector3(0.0, 0.04, 0.0), 2.56, 1.78, body_material, layer_id)
	_add_room_band("%sApexAuthorityCap" % prefix, origin + Vector3(0.0, 1.76, 0.0), Vector3(0.42, 0.055, 0.42), apex_material, layer_id)
	_add_pyramid_selector(prefix, origin, title, subtitle, labels, layer_id)

	_add_architecture_room_label(title, origin + Vector3(0.0, 2.44, -0.45), Color(body_color.r, body_color.g, body_color.b, 1.0), 20, layer_id)
	_add_architecture_room_label(subtitle, origin + Vector3(0.0, 2.12, -0.45), Color(0.90, 0.94, 0.88, 1.0), 12, layer_id)
	for index in range(labels.size()):
		var row: int = index
		var label_position := origin + Vector3(0.0, 1.58 - row * 0.18, 1.92)
		_add_architecture_room_label(String(labels[index]), label_position, Color(0.90, 0.94, 0.88, 1.0), 10, layer_id)

func _add_pyramid_selector(prefix: String, origin: Vector3, title: String, subtitle: String, labels: Array, layer_id: String) -> void:
	var selector := StaticBody3D.new()
	selector.name = "%sSelectable" % prefix
	selector.input_ray_pickable = true
	selector.position = origin + Vector3(0.0, 0.84, 0.0)
	var shape := BoxShape3D.new()
	shape.size = Vector3(3.2, 2.1, 3.2)
	var collision := CollisionShape3D.new()
	collision.name = "ArchitecturePyramidClickShape"
	collision.shape = shape
	selector.add_child(collision)
	_architecture_room_root.add_child(selector)
	var data := _architecture_pyramid_data(prefix, title, subtitle, labels)
	selector.input_event.connect(Callable(self, "_on_architecture_pyramid_input").bind(data, origin, layer_id))

func _architecture_pyramid_data(prefix: String, title: String, subtitle: String, labels: Array) -> Dictionary:
	var grounded := PackedStringArray()
	for item in labels:
		grounded.append(String(item))
	var description := ""
	var incoming := ""
	var outgoing := ""
	match prefix:
		"PyramideSysteme":
			description = "Carte structurelle du studio. Grounded by truth summary and ontology: root studio, Studio Control, outputs/runtime_outputs, datasets, models, secrets locked/unknown, PureLab component, Tool/Build/Archive zones. No execution, scan, file move or mutation."
			incoming = "prompts / patchs bornés / docs depuis les rôles assistant/control"
			outgoing = "contexte / garde-fous vers l'agentique; runtime / règles / support vers Rocky"
		"PyramideAgentique":
			description = "Rôles assistant/control seulement. HumanGate authorizes; Merle observes; ChatGPT frames/critiques/prompts; Codex executes bounded local tasks. Local LLM and Mistral / Devstral are future/passive candidate support only."
			incoming = "autorisation / feedback humain depuis HumanGate; contexte / garde-fous depuis le système"
			outgoing = "prompts / patchs bornés / docs vers le système"
		_:
			description = "Architecture joueur d'échecs passive. Engine holds world/rules/state/legal actions; Search décide as final tactical authority; Neural propose / rerank only; Evidence returns observations/logs/reports and is not proof alone."
			incoming = "runtime / règles / support depuis l'architecture système"
			outgoing = "traces / evidence vers Evidence / HumanGate"
	return {
		"id": prefix,
		"label": title,
		"metaphor": subtitle,
		"layers": ["Salle des pyramides"],
		"layer_meaning": "Key 7 architecture room: passive visual separation of three grounded meanings.",
		"surface": "canonical_docs",
		"status": "DOCUMENTED_ONLY",
		"authority": "HumanGate; aucun effet système",
		"description": "%s Items: %s" % [description, ", ".join(grounded)],
		"incoming_flow": incoming,
		"outgoing_flow": outgoing,
		"feedback_signal_strength": "symbolic only",
		"signal_loss": "not measured",
		"data_weight": "not measured; visual scale only",
		"reality_grounding": "docs and current HumanGate task wording; no runtime proof",
		"doctrine_note": "No active button, workflow, scan, training, model loading, benchmark, file operation or autonomous agent.",
		"blocked_actions": ["execution", "scan", "workflow engine", "agent activation", "auto-approval", "model loading", "training", "benchmark", "file operation"],
	}

func _on_architecture_pyramid_input(_camera: Camera3D, event: InputEvent, _event_position: Vector3, _normal: Vector3, _shape_idx: int, pyramid_data: Dictionary, focus_position: Vector3, layer_id: String) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if _selected_zone != null:
			_selected_zone.set_selected(false)
			_selected_zone = null
			_selected_index = -1
		_inspector.show_zone(pyramid_data)
		_inspector.set_layer_reading_mode(_current_architecture_view())
		_set_architecture_room_selection(focus_position, layer_id)
		get_viewport().set_input_as_handled()

func _set_architecture_room_selection(focus_position: Vector3, layer_id: String) -> void:
	if _architecture_room_selected_marker == null:
		var material := _layer_material(Color(1.0, 0.94, 0.48, 1.0), 0.62, 0.72)
		var mesh := TorusMesh.new()
		mesh.inner_radius = 1.52
		mesh.outer_radius = 1.58
		_architecture_room_selected_marker = MeshInstance3D.new()
		_architecture_room_selected_marker.name = "ArchitectureRoomSelectedPyramidRing"
		_architecture_room_selected_marker.mesh = mesh
		_architecture_room_selected_marker.rotation.x = PI * 0.5
		_architecture_room_selected_marker.material_override = material
		_architecture_room_root.add_child(_architecture_room_selected_marker)
		_register_layer_visual(_architecture_room_selected_marker, layer_id, material)
	_architecture_room_selected_marker.position = focus_position + Vector3(0.0, 0.08, 0.0)
	_architecture_room_selected_marker.visible = true

func _add_architecture_room_flow(start: Vector3, end: Vector3, label_text: String, color: Color, layer_id: String) -> void:
	var material := _layer_material(color, 0.66, 0.44)
	_add_room_line("ArchitectureRoomMeaningfulFlow", start, end, 0.045, material, layer_id)
	var endpoint := MeshInstance3D.new()
	endpoint.name = "ArchitectureRoomFlowEnd"
	var mesh := SphereMesh.new()
	mesh.radius = 0.13
	mesh.height = 0.26
	endpoint.mesh = mesh
	endpoint.position = end
	endpoint.material_override = material
	_architecture_room_root.add_child(endpoint)
	_register_layer_visual(endpoint, layer_id, material)
	_add_architecture_room_label(label_text, start.lerp(end, 0.5) + Vector3(0.0, 0.24, 0.0), Color(color.r, color.g, color.b, 1.0), 11, layer_id)

func _add_room_band(node_name: String, band_position: Vector3, size: Vector3, material: StandardMaterial3D, layer_id: String) -> void:
	var band := MeshInstance3D.new()
	band.name = node_name
	var mesh := BoxMesh.new()
	mesh.size = size
	band.mesh = mesh
	band.position = band_position
	band.material_override = material
	_architecture_room_root.add_child(band)
	_register_layer_visual(band, layer_id, material)

func _add_room_line(node_name: String, start: Vector3, end: Vector3, radius: float, material: StandardMaterial3D, layer_id: String) -> void:
	var line := MeshInstance3D.new()
	line.name = node_name
	line.mesh = _line_mesh(start, end, radius)
	line.material_override = material
	_architecture_room_root.add_child(line)
	_register_layer_visual(line, layer_id, material)

func _add_architecture_room_label(text: String, label_position: Vector3, color: Color, font_size: int, layer_id: String) -> void:
	var label := Label3D.new()
	label.name = "ArchitectureRoomPassiveLabel"
	label.text = text
	label.font_size = font_size
	label.outline_size = 7
	label.outline_modulate = Color(0.02, 0.04, 0.05, 1.0)
	label.modulate = color
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true
	label.position = label_position
	_architecture_room_root.add_child(label)
	_register_layer_label(label, layer_id, color)

func _add_agent_pyramid(node_name: String, pyramid_position: Vector3, base_size: float, height: float, material: StandardMaterial3D, layer_id: String) -> void:
	var pyramid := MeshInstance3D.new()
	pyramid.name = node_name
	pyramid.mesh = _pyramid_mesh(base_size, height)
	pyramid.position = pyramid_position
	pyramid.material_override = material
	if _architecture_room_root != null:
		_architecture_room_root.add_child(pyramid)
	else:
		add_child(pyramid)
	_register_layer_visual(pyramid, layer_id, material)

func _pyramid_mesh(base_size: float, height: float) -> Mesh:
	var half := base_size * 0.5
	var base_a := Vector3(-half, 0.0, -half)
	var base_b := Vector3(half, 0.0, -half)
	var base_c := Vector3(half, 0.0, half)
	var base_d := Vector3(-half, 0.0, half)
	var apex := Vector3(0.0, height, 0.0)
	var faces := [
		[base_a, base_c, base_b],
		[base_a, base_d, base_c],
		[base_a, base_b, apex],
		[base_b, base_c, apex],
		[base_c, base_d, apex],
		[base_d, base_a, apex],
	]
	var vertices := PackedVector3Array()
	var normals := PackedVector3Array()
	for face in faces:
		var v0: Vector3 = face[0]
		var v1: Vector3 = face[1]
		var v2: Vector3 = face[2]
		var normal := (v1 - v0).cross(v2 - v0).normalized()
		vertices.append(v0)
		vertices.append(v1)
		vertices.append(v2)
		normals.append(normal)
		normals.append(normal)
		normals.append(normal)
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vertices
	arrays[Mesh.ARRAY_NORMAL] = normals
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return mesh

func _add_agent_pyramid_label(text: String, label_position: Vector3, color: Color, font_size: int, layer_id: String) -> void:
	var label := Label3D.new()
	label.name = "AgentPyramidPassiveLabel"
	label.text = text
	label.font_size = font_size
	label.outline_size = 7
	label.outline_modulate = Color(0.02, 0.04, 0.05, 1.0)
	label.modulate = color
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true
	label.position = label_position
	add_child(label)
	_register_layer_label(label, layer_id, color)

func _register_layer_label(label: Label3D, layer_id: String, base_color: Color) -> void:
	if layer_id.is_empty():
		return
	_layer_labels.append({
		"label": label,
		"layer_id": layer_id,
		"base_color": base_color,
		"soft_color": Color(base_color.r, base_color.g, base_color.b, 0.46),
		"focus_color": Color(base_color.r, base_color.g, base_color.b, 1.0),
	})

func _build_greenhouse_frame() -> void:
	var frame_material := StandardMaterial3D.new()
	frame_material.albedo_color = Color(0.54, 0.78, 0.62, 0.22)
	frame_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	frame_material.roughness = 0.45

	for item in [
		{"name": "NorthFrame", "pos": Vector3(0, 0.9, -7.35), "size": Vector3(16.2, 1.8, 0.055)},
		{"name": "SouthFrame", "pos": Vector3(0, 0.9, 7.35), "size": Vector3(16.2, 1.8, 0.055)},
		{"name": "WestFrame", "pos": Vector3(-8.05, 0.9, 0), "size": Vector3(0.055, 1.8, 14.7)},
		{"name": "EastFrame", "pos": Vector3(8.05, 0.9, 0), "size": Vector3(0.055, 1.8, 14.7)},
		{"name": "GreenhouseRoofRidge", "pos": Vector3(0, 2.15, 0), "size": Vector3(0.075, 0.075, 14.7)},
	]:
		var wall := MeshInstance3D.new()
		wall.name = item["name"]
		var mesh := BoxMesh.new()
		mesh.size = item["size"]
		wall.mesh = mesh
		wall.position = item["pos"]
		wall.material_override = frame_material
		add_child(wall)

func _build_zones() -> void:
	for zone_data in GardenDataScript.zones():
		var zone_id := String(zone_data.get("id", ""))
		if not zone_id in MAIN_VIEW_ZONE_IDS:
			continue
		var zone := GardenZoneScript.new() as GardenZone
		zone.setup(zone_data)
		zone.selected.connect(_on_zone_selected.bind(zone))
		_zones_root.add_child(zone)
		_zone_order.append(zone)

func _build_primary_flows() -> void:
	var root_material := _flow_material(Color(0.74, 0.98, 0.78, 1.0), 0.62, 0.34)
	var root_start := Vector3(0.0, 0.24, 0.0)
	var root_end := Vector3(-5.0, 0.24, -2.85)
	var root_flow := MeshInstance3D.new()
	root_flow.name = "PrimaryFlowStudioRootToTruthDistricts"
	root_flow.mesh = _line_mesh(root_start, root_end, 0.040)
	root_flow.material_override = root_material
	add_child(root_flow)
	_register_linked_flow(root_flow, root_start, root_end, 0.040, root_material, ["studio_greenhouse", "docs_seed_beds"], Color(0.92, 1.0, 0.70, 1.0), "studio_greenhouse", "docs_seed_beds", 1.0, "primary flow studio root to truth districts")

	var feedback_material := _flow_material(Color(0.54, 0.92, 1.0, 1.0), 0.70, 0.44)
	var feedback_start := Vector3(0.75, 5.15, -1.10)
	var feedback_end := Vector3(0.0, 0.32, 0.0)
	var feedback_flow := MeshInstance3D.new()
	feedback_flow.name = "PrimaryFlowFeedbackToStudioRoot"
	feedback_flow.mesh = _line_mesh(feedback_start, feedback_end, 0.038)
	feedback_flow.material_override = feedback_material
	add_child(feedback_flow)
	_register_linked_flow(feedback_flow, feedback_start, feedback_end, 0.038, feedback_material, ["humangate", "studio_greenhouse"], Color(0.80, 0.98, 1.0, 1.0), "humangate", "studio_greenhouse", 1.0, "primary flow feedback to studio root")
	_add_signal_attenuation_markers(feedback_start, feedback_end, 0.92)

	var data_material := _flow_material(Color(1.0, 0.90, 0.52, 1.0), 0.66, 0.34)
	var merle_start := Vector3(-0.90, 4.25, -1.15)
	var data_targets := [
		{"zone_id": "datasets_zone", "target": Vector3(-6.7, 0.55, 2.8), "radius": 0.034, "kind": "primary flow merle to data locks"},
		{"zone_id": "models_zone", "target": Vector3(-6.7, 0.62, 4.9), "radius": 0.016, "kind": "secondary flow merle to data locks"},
		{"zone_id": "secrets_locked_zone", "target": Vector3(-6.7, 0.62, 6.95), "radius": 0.016, "kind": "secondary flow merle to data locks"},
	]
	for item in data_targets:
		var target: Vector3 = item["target"]
		var radius := float(item["radius"])
		var flow := MeshInstance3D.new()
		flow.name = "FlowMerleToDataLocks"
		flow.mesh = _line_mesh(merle_start, target, radius)
		flow.material_override = data_material
		add_child(flow)
		_register_linked_flow(flow, merle_start, target, radius, data_material, ["merle_audit_scout", String(item["zone_id"])], Color(1.0, 0.90, 0.46, 1.0), "merle_audit_scout", String(item["zone_id"]), 1.0, String(item["kind"]))

	var runtime_material := _flow_material(Color(0.74, 0.92, 1.0, 1.0), 0.70, 0.38)
	var runtime_start := Vector3(-1.2, 0.26, 4.5)
	var evidence_end := Vector3(1.6, 0.26, 4.3)
	var runtime_flow := MeshInstance3D.new()
	runtime_flow.name = "PrimaryFlowRuntimeToEvidence"
	runtime_flow.mesh = _line_mesh(runtime_start, evidence_end, 0.034)
	runtime_flow.material_override = runtime_material
	add_child(runtime_flow)
	_register_linked_flow(runtime_flow, runtime_start, evidence_end, 0.034, runtime_material, ["runtime_outputs_zone", "purelab_legacy_triage_zone"], Color(0.88, 0.98, 1.0, 1.0), "runtime_outputs_zone", "purelab_legacy_triage_zone", 1.0, "primary flow runtime to evidence")

	var outside_material := _flow_material(Color(0.92, 0.90, 0.70, 1.0), 0.66, 0.24)
	var build_start := Vector3(10.15, 0.26, -3.35)
	var archive_end := Vector3(10.35, 0.26, -0.15)
	var build_flow := MeshInstance3D.new()
	build_flow.name = "PrimaryFlowBuildToArchive"
	build_flow.mesh = _line_mesh(build_start, archive_end, 0.034)
	build_flow.material_override = outside_material
	add_child(build_flow)
	_register_linked_flow(build_flow, build_start, archive_end, 0.034, outside_material, ["build_zone", "archive_zone"], Color(0.96, 0.92, 0.62, 1.0), "build_zone", "archive_zone", 1.0, "primary flow build archive outside")

	var archive_flow := MeshInstance3D.new()
	archive_flow.name = "SecondaryFlowArchiveToTools"
	archive_flow.mesh = _line_mesh(archive_end, Vector3(6.6, 0.26, 3.15), 0.016)
	archive_flow.material_override = outside_material
	add_child(archive_flow)
	_register_linked_flow(archive_flow, archive_end, Vector3(6.6, 0.26, 3.15), 0.016, outside_material, ["archive_zone", "tool_zone"], Color(0.86, 0.92, 1.0, 1.0), "archive_zone", "tool_zone", 1.0, "secondary flow archive to tools")

func _build_studio_root_provenance_links() -> void:
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(0.74, 0.98, 0.78, 0.34)
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.emission_enabled = true
	material.emission = Color(0.46, 0.88, 0.58, 1.0)
	material.emission_energy_multiplier = 0.16

	var root_anchor := Vector3(0.0, 0.20, -4.75)
	var root_to_system := MeshInstance3D.new()
	root_to_system.name = "StudioRootAnchorBand"
	root_to_system.mesh = _line_mesh(root_anchor, Vector3(0.0, 0.20, -0.95), 0.032)
	root_to_system.material_override = material
	add_child(root_to_system)
	_register_linked_flow(root_to_system, root_anchor, Vector3(0.0, 0.20, -0.95), 0.032, material, ["studio_greenhouse"], Color(0.92, 1.0, 0.70, 1.0), "studio_greenhouse", "studio_greenhouse", 1.0, "provenance root")

	for item in [
		{"zone_id": "central_tree", "end": Vector3(0.0, 0.24, 0.0), "label": "lien système", "color": Color(0.92, 1.0, 0.70, 1.0)},
		{"zone_id": "artifacts_compost", "end": Vector3(-2.45, 0.22, 4.35), "label": "preuve names-only", "color": Color(0.72, 1.0, 0.76, 1.0)},
		{"zone_id": "runtime_outputs_zone", "end": Vector3(0.25, 0.22, 4.95), "label": "preuve names-only", "color": Color(0.72, 1.0, 0.76, 1.0)},
		{"zone_id": "scripts_zone", "end": Vector3(5.95, 0.22, 0.25), "label": "bloqué HumanGate", "color": Color(1.0, 0.82, 0.44, 1.0)},
		{"zone_id": "datasets_zone", "end": Vector3(-7.1, 0.22, 3.25), "label": "bloqué HumanGate", "color": Color(1.0, 0.62, 0.52, 1.0)},
		{"zone_id": "models_zone", "end": Vector3(-7.35, 0.22, 5.65), "label": "bloqué HumanGate", "color": Color(1.0, 0.62, 0.52, 1.0)},
		{"zone_id": "secrets_locked_zone", "end": Vector3(5.85, 0.22, -5.75), "label": "non inspecté", "color": Color(1.0, 0.46, 0.54, 1.0)},
		{"zone_id": "purelab_legacy_triage_zone", "end": Vector3(-9.9, 0.22, 1.95), "label": "lien système", "color": Color(0.86, 0.96, 0.70, 1.0)},
	]:
		var end: Vector3 = item["end"]
		var link := MeshInstance3D.new()
		link.name = "StudioRootProvenanceLink_%s" % String(item["zone_id"])
		link.mesh = _line_mesh(root_anchor, end, 0.018)
		link.material_override = material
		add_child(link)
		_register_linked_flow(link, root_anchor, end, 0.018, material, ["studio_greenhouse", String(item["zone_id"])], item["color"] as Color, "studio_greenhouse", String(item["zone_id"]), 1.0, "lien provenance système")
		_add_scene_label(String(item["label"]), root_anchor.lerp(end, 0.55) + Vector3(0.0, 0.34, 0.0), item["color"] as Color, 13)

	_add_scene_label("C:/TACTICAL_CHESS_STUDIO — racine système", root_anchor + Vector3(-0.65, 0.78, -0.28), Color(0.84, 1.0, 0.76, 1.0), 18)
	_add_scene_label("Cette carte ne lit pas le disque en direct", root_anchor + Vector3(-0.45, 0.48, 0.16), Color(1.0, 0.86, 0.54, 1.0), 14)

func _build_mycelium_paths() -> void:
	var path_material := StandardMaterial3D.new()
	path_material.albedo_color = Color(0.74, 0.84, 1.0, 0.86)
	path_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	path_material.emission_enabled = true
	path_material.emission = Color(0.35, 0.44, 0.70, 1.0)
	path_material.emission_energy_multiplier = 0.45

	var root_material := StandardMaterial3D.new()
	root_material.albedo_color = Color(0.30, 0.16, 0.08, 1.0)
	root_material.roughness = 0.8

	var points: Array[Vector3] = [
		Vector3(0, 0.06, 0),
		Vector3(-4.9, 0.06, -2.9),
		Vector3(3.85, 0.06, -2.75),
		Vector3(4.95, 0.06, 1.75),
		Vector3(-4.9, 0.06, 2.45),
		Vector3(2.05, 0.06, 4.45),
		Vector3(-1.85, 0.06, 4.35),
	]
	var zone_ids: Array[String] = ["docs_seed_beds", "runtime_roots", "python_tools", "tests_immune_plants", "llm_mycelium", "artifacts_compost"]

	for index in range(1, points.size()):
		var link := MeshInstance3D.new()
		link.name = "MyceliumPath%02d" % index
		var start: Vector3 = points[0]
		var end: Vector3 = points[index]
		link.mesh = _line_mesh(start, end, 0.045)
		link.material_override = path_material
		add_child(link)
		_register_linked_flow(link, start, end, 0.045, path_material, ["central_tree", zone_ids[index - 1]], Color(0.92, 0.98, 1.0, 1.0))

	for root_target in [Vector3(3.85, 0.065, -2.75), Vector3(0.0, 0.065, -5.6)]:
		var root_link := MeshInstance3D.new()
		root_link.name = "LockedRootPath"
		var root_start: Vector3 = Vector3(0, 0.065, 0)
		root_link.mesh = _line_mesh(root_start, root_target, 0.06)
		root_link.material_override = root_material
		add_child(root_link)
		var linked_ids: Array = ["central_tree", "runtime_roots"] if root_target.x > 1.0 else ["central_tree", "architecture_layer"]
		_register_linked_flow(root_link, root_start, root_target, 0.06, root_material, linked_ids, Color(0.88, 0.68, 0.34, 1.0))

func _build_outside_system_links() -> void:
	var boundary_material := StandardMaterial3D.new()
	boundary_material.albedo_color = Color(0.84, 0.88, 0.70, 0.36)
	boundary_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	boundary_material.emission_enabled = true
	boundary_material.emission = Color(0.72, 0.76, 0.52, 1.0)
	boundary_material.emission_energy_multiplier = 0.12

	for item in [
		{"name": "OutsideSystemGapToBuildZone", "end": Vector3(10.15, 0.12, -3.35), "zone_id": "build_zone"},
		{"name": "OutsideSystemGapToArchiveZone", "end": Vector3(10.35, 0.12, -0.15), "zone_id": "archive_zone"},
		{"name": "OutsideSystemGapToToolZone", "end": Vector3(10.15, 0.12, 3.15), "zone_id": "tool_zone"},
	]:
		var end: Vector3 = item["end"]
		var start := Vector3(8.1, 0.12, end.z)
		var link := MeshInstance3D.new()
		link.name = String(item["name"])
		link.mesh = _line_mesh(start, end, 0.014)
		link.material_override = boundary_material
		add_child(link)
		_register_linked_flow(link, start, end, 0.014, boundary_material, [String(item["zone_id"])], Color(1.0, 0.92, 0.58, 1.0))

	_add_scene_label("zones hors systeme", Vector3(9.75, 1.05, -5.35), Color(0.94, 0.92, 0.72, 1.0), 19)
	_add_scene_label("jardin vivant propre", Vector3(7.0, 0.72, -0.15), Color(0.80, 0.96, 0.72, 1.0), 17)

func _build_game_forest_links() -> void:
	var forest_material := StandardMaterial3D.new()
	forest_material.albedo_color = Color(0.58, 0.88, 0.48, 0.48)
	forest_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	forest_material.emission_enabled = true
	forest_material.emission = Color(0.34, 0.72, 0.28, 1.0)
	forest_material.emission_energy_multiplier = 0.14

	for target in [Vector3(-7.35, 0.13, -0.95), Vector3(-7.35, 0.13, 0.05), Vector3(-7.35, 0.13, 1.05)]:
		var link := MeshInstance3D.new()
		link.name = "OneTreePerGameLivingPath"
		var start := Vector3(0.0, 0.13, 0.0)
		link.mesh = _line_mesh(start, target, 0.018)
		link.material_override = forest_material
		add_child(link)
		_register_linked_flow(link, start, target, 0.018, forest_material, ["central_tree", "video_game_garden", "future_game_tree_a", "future_game_tree_b"], Color(0.82, 1.0, 0.58, 1.0))

	_add_scene_label("foret de jeux", Vector3(-7.55, 1.45, -2.25), Color(0.82, 1.0, 0.72, 1.0), 20)
	_add_scene_label("un arbre par jeu", Vector3(-7.55, 1.05, 2.35), Color(0.82, 1.0, 0.72, 1.0), 17)

func _build_human_feedback_flows() -> void:
	var sphere_position := Vector3(0.75, 5.65, -0.95)
	var rain_material := StandardMaterial3D.new()
	rain_material.albedo_color = Color(0.44, 0.82, 1.0, 0.62)
	rain_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	rain_material.emission_enabled = true
	rain_material.emission = Color(0.22, 0.62, 1.0, 1.0)
	rain_material.emission_energy_multiplier = 0.38

	var mist_material := StandardMaterial3D.new()
	mist_material.albedo_color = Color(0.74, 0.94, 1.0, 0.28)
	mist_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mist_material.emission_enabled = true
	mist_material.emission = Color(0.62, 0.88, 1.0, 1.0)
	mist_material.emission_energy_multiplier = 0.24

	var irrigation_targets: Array[Dictionary] = [
		{"name": "FeedbackRainToGreenhouse", "end": Vector3(0.0, 0.32, 0.0), "zone_id": "studio_greenhouse", "strength": 0.92},
		{"name": "IrrigationToDocs", "end": Vector3(-4.9, 0.42, -2.9), "zone_id": "docs_seed_beds", "strength": 0.74},
		{"name": "IrrigationToTests", "end": Vector3(-4.9, 0.48, 2.45), "zone_id": "tests_immune_plants", "strength": 0.68},
		{"name": "IrrigationToArtifacts", "end": Vector3(-1.85, 0.42, 4.35), "zone_id": "artifacts_compost", "strength": 0.58},
		{"name": "IrrigationToBlockedSoil", "end": Vector3(5.75, 0.48, -4.25), "zone_id": "blocked_bramble", "strength": 0.36},
	]
	for item in irrigation_targets:
		var end: Vector3 = item["end"]
		var strength := float(item["strength"])
		var flow_radius := 0.014 + strength * 0.018
		var stream := MeshInstance3D.new()
		stream.name = String(item["name"])
		stream.mesh = _line_mesh(sphere_position, end, flow_radius)
		stream.material_override = rain_material
		add_child(stream)
		_register_linked_flow(stream, sphere_position, end, flow_radius, rain_material, ["humangate", String(item["zone_id"])], Color(0.78, 0.95, 1.0, 1.0), "humangate", String(item["zone_id"]), strength, "flux de feedback humain")
		_add_signal_attenuation_markers(sphere_position, end, strength)

	var return_sources: Array[Dictionary] = [
		{"name": "ObservationMistFromTree", "start": Vector3(0.0, 2.8, 0.0), "label": "brume d'observation", "zone_id": "central_tree"},
		{"name": "FeedbackReturnFromMycelium", "start": Vector3(2.05, 0.72, 4.45), "label": "retour feedback", "zone_id": "llm_mycelium"},
		{"name": "FeedbackReturnFromRoots", "start": Vector3(3.85, 0.78, -2.75), "label": "retour feedback", "zone_id": "runtime_roots"},
		{"name": "ObservationMistFromTools", "start": Vector3(4.95, 0.72, 1.75), "label": "brume d'observation passive", "zone_id": "python_tools"},
	]
	for item in return_sources:
		var start: Vector3 = item["start"]
		var end := sphere_position + Vector3(0, -0.35, 0)
		var return_line := MeshInstance3D.new()
		return_line.name = String(item["name"])
		return_line.mesh = _line_mesh(start, end, 0.018)
		return_line.material_override = mist_material
		add_child(return_line)
		_register_linked_flow(return_line, start, end, 0.018, mist_material, ["humangate", String(item["zone_id"])], Color(0.90, 0.98, 1.0, 1.0), String(item["zone_id"]), "humangate", 0.62, "retour feedback")

	_add_scene_label("feedback humain", Vector3(-2.75, 2.15, -2.15), Color(0.72, 0.94, 1.0, 1.0), 19)
	_add_scene_label("perte de signal symbolique", Vector3(-4.15, 1.20, 0.20), Color(0.70, 0.88, 1.0, 1.0), 15)
	_add_scene_label("brume d'observation passive", Vector3(2.95, 2.0, 1.15), Color(0.82, 0.96, 1.0, 1.0), 18)
	_add_scene_label("retour feedback", Vector3(2.85, 2.45, 3.55), Color(0.82, 0.96, 1.0, 1.0), 18)

func _build_merle_audit_trail() -> void:
	var merle_position := Vector3(-0.90, 4.25, -1.15)
	var sphere_position := Vector3(0.75, 5.65, -0.95)
	var trail_material := StandardMaterial3D.new()
	trail_material.albedo_color = Color(0.92, 0.96, 0.72, 0.74)
	trail_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	trail_material.emission_enabled = true
	trail_material.emission = Color(0.74, 0.86, 0.42, 1.0)
	trail_material.emission_energy_multiplier = 0.18

	var report_material := StandardMaterial3D.new()
	report_material.albedo_color = Color(0.70, 0.92, 1.0, 0.64)
	report_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	report_material.emission_enabled = true
	report_material.emission = Color(0.44, 0.76, 1.0, 1.0)
	report_material.emission_energy_multiplier = 0.28

	var chain_points := [
		{"name": "Cartographer", "pos": Vector3(-5.9, 0.32, -2.9), "label": "Cartographie"},
		{"name": "HygieneAgent", "pos": Vector3(-5.35, 0.32, -2.15), "label": "Hygiene"},
		{"name": "TruthAgent", "pos": Vector3(-4.75, 0.32, -1.55), "label": "Verite"},
		{"name": "FusionAuditor", "pos": Vector3(-4.0, 0.32, -1.25), "label": "Audit fusion"},
		{"name": "CartographerRedTeam", "pos": Vector3(-3.35, 0.32, -0.95), "label": "Derive"},
	]

	for index in range(chain_points.size()):
		var point: Dictionary = chain_points[index]
		var marker := MeshInstance3D.new()
		marker.name = "PassiveAuditSeed_%s" % String(point["name"])
		var mesh := SphereMesh.new()
		mesh.radius = 0.08
		mesh.height = 0.16
		marker.mesh = mesh
		marker.position = point["pos"]
		marker.material_override = trail_material
		add_child(marker)
		if index < chain_points.size() - 1:
			var next_point: Dictionary = chain_points[index + 1]
			var link := MeshInstance3D.new()
			link.name = "ObservationTrail_%02d" % index
			link.mesh = _line_mesh(point["pos"], next_point["pos"], 0.014)
			link.material_override = trail_material
			add_child(link)
			_register_linked_flow(link, point["pos"], next_point["pos"], 0.014, trail_material, ["merle_audit_scout", "docs_seed_beds"], Color(1.0, 0.98, 0.64, 1.0))

	_add_scene_label("trace d'observation passive", Vector3(-4.85, 0.66, -2.0), Color(0.96, 0.98, 0.78, 1.0), 14)
	_add_scene_label("rapport vers feedback humain", Vector3(-0.65, 4.85, -1.02), Color(0.74, 0.94, 1.0, 1.0), 18)
	_add_scene_label("alerte sol bloque", Vector3(4.85, 1.05, -5.05), Color(1.0, 0.62, 0.58, 1.0), 16)

	var report_path := MeshInstance3D.new()
	report_path.name = "MerleReportPathToLivingFeedbackSphere"
	var report_start := merle_position + Vector3(0.18, 0.28, 0.18)
	var report_end := sphere_position + Vector3(-0.28, -0.55, 0.05)
	report_path.mesh = _line_mesh(report_start, report_end, 0.018)
	report_path.material_override = report_material
	add_child(report_path)
	_register_linked_flow(report_path, report_start, report_end, 0.018, report_material, ["merle_audit_scout", "humangate"], Color(0.86, 0.98, 1.0, 1.0))

	for item in [
		{"target": Vector3(-4.9, 0.55, -2.9), "zone_id": "docs_seed_beds"},
		{"target": Vector3(5.75, 0.62, -4.25), "zone_id": "blocked_bramble"},
		{"target": Vector3(-1.85, 0.55, 4.35), "zone_id": "artifacts_compost"},
	]:
		var target: Vector3 = item["target"]
		var warning_line := MeshInstance3D.new()
		warning_line.name = "MerlePassiveWarningSightline"
		warning_line.mesh = _line_mesh(merle_position, target, 0.010)
		warning_line.material_override = trail_material
		add_child(warning_line)
		_register_linked_flow(warning_line, merle_position, target, 0.010, trail_material, ["merle_audit_scout", String(item["zone_id"])], Color(1.0, 0.90, 0.46, 1.0))

func _line_mesh(start: Vector3, end: Vector3, radius: float) -> Mesh:
	var direction := end - start
	var length := direction.length()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = maxf(length, 0.001)

	var line_origin := start + direction * 0.5
	var line_basis := Basis.IDENTITY
	if length > 0.001:
		var y_axis := direction / length
		var reference_axis := Vector3.UP
		if absf(y_axis.dot(reference_axis)) > 0.98:
			reference_axis = Vector3.RIGHT
		var x_axis := reference_axis.cross(y_axis).normalized()
		var z_axis := x_axis.cross(y_axis).normalized()
		line_basis = Basis(x_axis, y_axis, z_axis)

	var array_mesh := ArrayMesh.new()
	var arrays := mesh.surface_get_arrays(0)
	var vertices: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	for i in range(vertices.size()):
		vertices[i] = line_origin + line_basis * vertices[i]
	arrays[Mesh.ARRAY_VERTEX] = vertices
	array_mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return array_mesh

func _register_linked_flow(link: MeshInstance3D, start: Vector3, end: Vector3, radius: float, base_material: StandardMaterial3D, linked_zone_ids: Array, highlight_color: Color, from_zone_id: String = "", to_zone_id: String = "", signal_strength: float = 1.0, flow_kind: String = "linked flows") -> void:
	var is_primary := flow_kind.to_lower().begins_with("primary")
	_flow_links.append({
		"link": link,
		"start": start,
		"end": end,
		"radius": radius,
		"from_zone_id": from_zone_id,
		"to_zone_id": to_zone_id,
		"signal_strength": signal_strength,
		"flow_kind": flow_kind,
		"base_material": base_material,
		"soft_material": _flow_material(base_material.albedo_color, 0.22, 0.04),
		"layer_focus_material": _flow_material(highlight_color, 0.58, 0.30),
		"highlight_material": _flow_material(highlight_color, 0.94, 0.74),
		"incoming_material": _flow_material(Color(0.54, 0.96, 1.0, 1.0), 0.96, 0.92),
		"outgoing_material": _flow_material(Color(1.0, 0.84, 0.36, 1.0), 0.94, 0.78),
		"linked_zone_ids": linked_zone_ids,
		"is_primary": is_primary,
	})

func _flow_material(color: Color, alpha: float, emission_energy: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(color.r, color.g, color.b, alpha)
	material.roughness = 0.62
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.emission_enabled = true
	material.emission = Color(color.r, color.g, color.b, 1.0)
	material.emission_energy_multiplier = emission_energy
	return material

func _update_linked_flow_relief(selected_zone_id: String) -> void:
	_clear_flow_focus_markers()
	for record in _flow_links:
		var link := record["link"] as MeshInstance3D
		if link == null:
			continue
		var start: Vector3 = record["start"]
		var end: Vector3 = record["end"]
		var radius := float(record["radius"])
		var relation := _flow_relation(record, selected_zone_id)
		if relation != "none":
			link.visible = true
			var width_multiplier := 2.58 if relation == "incoming" else 2.18
			if relation == "linked":
				width_multiplier = 1.75
			link.mesh = _line_mesh(start, end, radius * width_multiplier)
			var material := record["highlight_material"] as StandardMaterial3D
			if relation == "incoming":
				material = record["incoming_material"] as StandardMaterial3D
			elif relation == "outgoing":
				material = record["outgoing_material"] as StandardMaterial3D
			link.material_override = material
			_add_flow_focus_marker(start, end, material, relation)
		else:
			var layer_focus := _current_layer_id() == "flow_layer"
			var is_primary := bool(record.get("is_primary", false))
			if layer_focus:
				link.visible = true
				link.mesh = _line_mesh(start, end, radius * 1.22)
				link.material_override = record["layer_focus_material"] if is_primary else record["soft_material"]
			else:
				link.visible = is_primary
				if is_primary:
					link.mesh = _line_mesh(start, end, radius)
					link.material_override = record["soft_material"]

func _flow_relation(record: Dictionary, selected_zone_id: String) -> String:
	var linked_zone_ids: Array = record["linked_zone_ids"]
	var from_zone_id := String(record.get("from_zone_id", ""))
	var to_zone_id := String(record.get("to_zone_id", ""))
	if from_zone_id.is_empty() and linked_zone_ids.size() >= 2:
		from_zone_id = String(linked_zone_ids[0])
	if to_zone_id.is_empty() and linked_zone_ids.size() >= 2:
		to_zone_id = String(linked_zone_ids[1])
	if selected_zone_id == to_zone_id:
		return "incoming"
	if selected_zone_id == from_zone_id:
		return "outgoing"
	if selected_zone_id in linked_zone_ids:
		return "linked"
	return "none"

func _clear_flow_focus_markers() -> void:
	if _flow_focus_root == null:
		return
	for child in _flow_focus_root.get_children():
		child.queue_free()

func _add_flow_focus_marker(start: Vector3, end: Vector3, material: StandardMaterial3D, relation: String) -> void:
	if _flow_focus_root == null:
		return
	var marker := MeshInstance3D.new()
	marker.name = "SelectedIncomingFlowMarker" if relation == "incoming" else "SelectedOutgoingFlowMarker"
	var mesh := SphereMesh.new()
	mesh.radius = 0.102 if relation == "incoming" else 0.070
	mesh.height = mesh.radius * 2.0
	marker.mesh = mesh
	var t := 0.78 if relation == "incoming" else 0.34
	if relation == "linked":
		t = 0.58
	marker.position = start.lerp(end, t)
	marker.material_override = material
	_flow_focus_root.add_child(marker)

	var label := Label3D.new()
	label.name = "SelectedFlowDirectionLabel"
	label.text = "ENT" if relation == "incoming" else "SORT"
	if relation == "linked":
		label.text = "LIEN"
	label.font_size = 13
	label.outline_size = 5
	label.outline_modulate = Color(0.02, 0.04, 0.05, 1.0)
	label.modulate = Color(0.70, 0.96, 1.0, 1.0) if relation == "incoming" else Color(1.0, 0.86, 0.42, 1.0)
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true
	label.position = marker.position + Vector3(0.0, 0.18, 0.0)
	_flow_focus_root.add_child(label)

func _add_signal_attenuation_markers(start: Vector3, end: Vector3, strength: float) -> void:
	for index in range(3):
		var step := float(index + 1) / 4.0
		var marker := MeshInstance3D.new()
		marker.name = "SymbolicFeedbackAttenuationMarker"
		var mesh := SphereMesh.new()
		var local_strength := maxf(0.16, strength - float(index) * 0.18)
		mesh.radius = 0.030 + local_strength * 0.040
		mesh.height = mesh.radius * 2.0
		marker.mesh = mesh
		marker.position = start.lerp(end, step)
		marker.material_override = _flow_material(Color(0.62, 0.90, 1.0, 1.0), 0.22 + local_strength * 0.42, 0.10 + local_strength * 0.28)
		add_child(marker)

func _add_scene_label(text: String, label_position: Vector3, color: Color, font_size: int) -> void:
	if not text in MAIN_LABEL_ALLOWLIST:
		return
	var label := Label3D.new()
	label.name = "FeedbackFlowLabel"
	label.text = text
	label.font_size = font_size
	label.outline_size = 8
	label.outline_modulate = Color(0.02, 0.04, 0.05, 1.0)
	label.modulate = color
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true
	label.position = label_position
	add_child(label)

func _build_map_legend() -> void:
	_build_compact_map_legend()
	return

	var panel := PanelContainer.new()
	panel.name = "ReadOnlyMapLegend"
	panel.anchor_left = 1.0
	panel.anchor_right = 1.0
	panel.anchor_top = 0.0
	panel.anchor_bottom = 0.0
	panel.offset_left = -430.0
	panel.offset_top = 18.0
	panel.offset_right = -18.0
	panel.offset_bottom = 696.0
	panel.add_theme_stylebox_override("panel", _legend_panel_style())
	_ui.add_child(panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 10)
	panel.add_child(margin)

	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 5)
	margin.add_child(stack)

	stack.add_child(_legend_label("Légende de carte - visuel passif", 17, Color(0.96, 0.98, 0.86, 1.0)))
	stack.add_child(_legend_label("Aucun bouton actif : pas de scan, build, archive, lancement ou mutation.", 11, Color(1.0, 0.76, 0.62, 1.0)))
	stack.add_child(_legend_label("Architecture: touche A pour cycler; touche 0 pour Toutes les architectures; touches 1-7 pour sélectionner une architecture. switch visuel local — aucun effet système.", 11, Color(0.78, 0.96, 0.86, 1.0)))
	_layer_focus_title = _legend_label("", 13, Color(0.96, 0.90, 0.54, 1.0))
	_layer_focus_purpose = _legend_label("", 11, Color(0.84, 0.92, 0.82, 1.0))
	stack.add_child(_layer_focus_title)
	stack.add_child(_layer_focus_purpose)

	_add_legend_section(stack, "Surfaces")
	for item in [
		{"text": "active_runtime_code - arbre central / racines verrouillées", "color": Color(0.24, 0.64, 0.28, 1.0)},
		{"text": "tests - plantes immunitaires", "color": Color(0.70, 0.16, 0.18, 1.0)},
		{"text": "artifacts_runtime_outputs - compost / zones hors systeme", "color": Color(0.66, 0.56, 0.34, 1.0)},
		{"text": "canonical_docs - semis / calque architecture", "color": Color(0.44, 0.86, 0.60, 1.0)},
		{"text": "roadmap_docs_only - calque roadmap / forêt de jeux", "color": Color(0.95, 0.70, 0.24, 1.0)},
		{"text": "inference - mycelium / merle / zone outils", "color": Color(0.65, 0.70, 0.88, 1.0)},
	]:
		_add_legend_row(stack, String(item["text"]), item["color"] as Color)

	_add_legend_section(stack, "Statuts")
	for item in [
		{"text": "IMPLEMENTED - candidat symbolique présent", "color": Color(0.22, 0.84, 0.34, 1.0)},
		{"text": "TESTED - preuve de validation présente", "color": Color(0.34, 0.92, 0.72, 1.0)},
		{"text": "DOCUMENTED_ONLY - note ou plan seulement", "color": Color(0.92, 0.70, 0.24, 1.0)},
		{"text": "PASSIVE - observation / lecture seule", "color": Color(0.56, 0.64, 0.72, 1.0)},
		{"text": "BLOCKED - interdit ou garde humain requis", "color": Color(0.90, 0.16, 0.18, 1.0)},
		{"text": "NOT_FOUND / UNKNOWN - absent ou non prouvé", "color": Color(0.42, 0.42, 0.48, 1.0)},
	]:
		_add_legend_row(stack, String(item["text"]), item["color"] as Color)

	_add_legend_section(stack, "Calques")
	for text in [
		"Calque Vérité : zones réellement observées, outputs, runtime_outputs, scripts, datasets, models, secrets verrouillé, PureLab composant",
		"Calque Sensible : secrets, datasets sensibles, models, quarantine, cyberdefense, telemetry_sanitized",
		"Calque Flux : flux entrants, flux sortants, perte de signal, feedback humain, ancrage réel",
		"Calque Build / Archive : Zone Build, Archive Zone, sorties, sorties runtime, mise hors système",
		"Calque héritage : PureLab composant du jardin, réintégration lisible",
		"Calque Architecture cible : structure future, PureLab composant, Tool Zone, Studio Control, Mistral / Devstral possible futur noyau",
		"Calque Roadmap : prochaines tranches d'audit, zones non inspectées, inconnus, décisions HumanGate restantes",
		"Salle architecture - trois pyramides : Pyramide Architecture Système; Pyramide Agentique; Pyramide Rocky IA joueur d'échecs; séparation sémantique; aucun effet système",
		"switch visuel local : touche A, touche 0, touches 1-7, aucun effet système, aucun bouton actif, aucun toggle système",
		"jardin vivant : arbre central, feedback humain, brume passive, mycélium",
		"hors système : zone build, archive, zone outils, marqueurs Godot / Codex",
		"forêt de jeux : un arbre par jeu; futurs arbres = placeholders roadmap",
		"merle : auditeur passif, hygiène, vérité, détection de dérive",
	]:
		stack.add_child(_legend_label(text, 11, Color(0.86, 0.92, 0.82, 1.0)))

func _build_compact_map_legend() -> void:
	var panel := PanelContainer.new()
	panel.name = "ReadOnlyMapLegend"
	panel.anchor_left = 1.0
	panel.anchor_right = 1.0
	panel.anchor_top = 0.0
	panel.anchor_bottom = 0.0
	panel.offset_left = -420.0
	panel.offset_top = 18.0
	panel.offset_right = -18.0
	panel.offset_bottom = 184.0
	panel.add_theme_stylebox_override("panel", _legend_panel_style())
	_ui.add_child(panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 10)
	panel.add_child(margin)

	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 4)
	margin.add_child(stack)

	stack.add_child(_legend_label("System map - read-only", 16, Color(0.96, 0.98, 0.86, 1.0)))
	stack.add_child(_legend_label("No active buttons.", 12, Color(1.0, 0.82, 0.72, 1.0)))
	stack.add_child(_legend_label("A cycle | 0 all | 1-7 views | F focus | R reset | Tab cycle", 11, Color(0.80, 0.96, 0.86, 1.0)))
	stack.add_child(_legend_label("Details and provenance are in the inspector.", 11, Color(0.84, 0.92, 0.82, 1.0)))

	_layer_focus_title = _legend_label("", 12, Color(0.96, 0.90, 0.54, 1.0))
	_layer_focus_purpose = _legend_label("", 11, Color(0.84, 0.92, 0.82, 1.0))
	stack.add_child(_layer_focus_title)
	stack.add_child(_layer_focus_purpose)

func _legend_panel_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.040, 0.052, 0.045, 0.88)
	style.border_color = Color(0.42, 0.58, 0.36, 1.0)
	style.set_border_width_all(1)
	style.corner_radius_top_left = 6
	style.corner_radius_top_right = 6
	style.corner_radius_bottom_left = 6
	style.corner_radius_bottom_right = 6
	return style

func _add_legend_section(stack: VBoxContainer, text: String) -> void:
	stack.add_child(_legend_label(text, 13, Color(0.95, 0.82, 0.44, 1.0)))

func _add_legend_row(stack: VBoxContainer, text: String, color: Color) -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 7)
	var swatch := ColorRect.new()
	swatch.custom_minimum_size = Vector2(12, 12)
	swatch.color = color
	row.add_child(swatch)
	row.add_child(_legend_label(text, 11, Color(0.88, 0.92, 0.84, 1.0)))
	stack.add_child(row)

func _legend_label(text: String, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return label

func _keycode_to_architecture_index(keycode: int) -> int:
	match keycode:
		KEY_0, KEY_KP_0:
			return 0
		KEY_1, KEY_KP_1:
			return 1
		KEY_2, KEY_KP_2:
			return 2
		KEY_3, KEY_KP_3:
			return 3
		KEY_4, KEY_KP_4:
			return 4
		KEY_5, KEY_KP_5:
			return 5
		KEY_6, KEY_KP_6:
			return 6
		KEY_7, KEY_KP_7:
			return 7
		_:
			return -1

func _cycle_architecture_view() -> void:
	if _architecture_views.is_empty():
		return
	_set_architecture_view(wrapi(_architecture_view_index + 1, 0, _architecture_views.size()))

func _set_architecture_view(index: int) -> void:
	if _architecture_views.is_empty():
		return
	_architecture_view_index = wrapi(index, 0, _architecture_views.size())
	_layer_focus_index = max(0, _architecture_view_index - 1)
	_update_layer_focus_visuals()
	_update_layer_legend()
	if _inspector != null:
		_inspector.set_layer_reading_mode(_current_architecture_view())

func _current_layer_mode() -> Dictionary:
	if _layer_reading_modes.is_empty():
		return {}
	return _layer_reading_modes[clampi(_layer_focus_index, 0, _layer_reading_modes.size() - 1)]

func _current_architecture_view() -> Dictionary:
	if _architecture_views.is_empty():
		return {}
	return _architecture_views[clampi(_architecture_view_index, 0, _architecture_views.size() - 1)]

func _current_layer_id() -> String:
	return String(_current_architecture_view().get("layer_id", ""))

func _is_all_architecture_view() -> bool:
	return String(_current_architecture_view().get("id", "")) == "all_views"

func _update_layer_focus_visuals() -> void:
	_restore_architecture_room_suppressed_nodes()
	var layer_id := _current_layer_id()
	var all_view := _is_all_architecture_view()
	for record in _layer_visuals:
		var visual := record["visual"] as MeshInstance3D
		if visual == null:
			continue
		var is_active := all_view or String(record["layer_id"]) == layer_id
		visual.visible = is_active
		visual.material_override = record["soft_material"] if all_view else record["focus_material"]
	for record in _layer_labels:
		var label := record["label"] as Label3D
		if label == null:
			continue
		var label_active := all_view or String(record["layer_id"]) == layer_id
		label.visible = label_active
		label.modulate = record["soft_color"] if all_view else record["focus_color"]
	for zone in _zone_order:
		zone.set_architecture_view(layer_id, all_view)
	if _architecture_room_root != null:
		_architecture_room_root.visible = layer_id == "semantic_pyramid_layer"
	if _architecture_room_selected_marker != null and layer_id != "semantic_pyramid_layer":
		_architecture_room_selected_marker.visible = false
	_refresh_flow_layer_reading()
	_apply_architecture_room_suppression(layer_id, all_view)

func _restore_architecture_room_suppressed_nodes() -> void:
	for node in _architecture_room_suppressed_nodes:
		if is_instance_valid(node):
			node.visible = true
	_architecture_room_suppressed_nodes.clear()
	if _zones_root != null:
		_zones_root.visible = true

func _apply_architecture_room_suppression(layer_id: String, all_view: bool) -> void:
	if all_view or layer_id != "semantic_pyramid_layer":
		return
	if _zones_root != null:
		_zones_root.visible = false
	for child in get_children():
		if child == _architecture_room_root or child == _ui or child == _orbit_camera or child == _flow_focus_root:
			continue
		if child is MeshInstance3D or child is Label3D:
			var node := child as Node3D
			if node.visible:
				node.visible = false
				_architecture_room_suppressed_nodes.append(node)
	_clear_flow_focus_markers()

func _refresh_flow_layer_reading() -> void:
	if _selected_zone != null:
		_update_linked_flow_relief(String(_selected_zone.data.get("id", "")))
		return
	_clear_flow_focus_markers()
	var focus_flows := _current_layer_id() == "flow_layer"
	var all_view := _is_all_architecture_view()
	for record in _flow_links:
		var link := record["link"] as MeshInstance3D
		if link == null:
			continue
		var start: Vector3 = record["start"]
		var end: Vector3 = record["end"]
		var radius := float(record["radius"])
		var is_primary := bool(record.get("is_primary", false))
		if focus_flows:
			link.visible = true
			link.mesh = _line_mesh(start, end, radius * 1.22)
			link.material_override = record["layer_focus_material"] if is_primary else record["soft_material"]
		else:
			link.visible = is_primary
			if is_primary:
				link.mesh = _line_mesh(start, end, radius)
				link.material_override = record["base_material"] if all_view else record["soft_material"]

func _update_layer_legend() -> void:
	if _layer_focus_title == null or _layer_focus_purpose == null:
		return
	var compact_view := _current_architecture_view()
	_layer_focus_title.text = "View: %s" % String(compact_view.get("label", "Toutes les architectures"))
	_layer_focus_purpose.text = "Local visual switch only. No system effect."
	return
	var view := _current_architecture_view()
	var shows: Array = view.get("shows", [])
	var show_text := PackedStringArray()
	for item in shows:
		show_text.append(String(item))
	var max_direct_key := maxi(0, _architecture_views.size() - 1)
	_layer_focus_title.text = "Architecture %d/%d - %s" % [_architecture_view_index, max_direct_key, String(view.get("label", "Toutes les architectures"))]
	_layer_focus_purpose.text = "switch visuel local — aucun effet système. But: %s. Montre: %s." % [String(view.get("purpose", "lecture passive")), ", ".join(show_text)]

func _on_zone_selected(_zone_data: Dictionary, zone: GardenZone) -> void:
	_select_zone(zone)

func _select_relative_zone(direction: int) -> void:
	if _zone_order.is_empty():
		return
	var next_index := 0
	if _selected_index >= 0:
		next_index = wrapi(_selected_index + direction, 0, _zone_order.size())
	_select_zone(_zone_order[next_index])

func _select_zone(zone: GardenZone) -> void:
	if _selected_zone != null:
		_selected_zone.set_selected(false)
	_selected_zone = zone
	_selected_index = _zone_order.find(zone)
	_selected_zone.set_selected(true)
	_update_layer_focus_visuals()
	_inspector.show_zone(zone.data)
	_inspector.set_layer_reading_mode(_current_architecture_view())

func _focus_selected_zone() -> void:
	if _selected_zone == null:
		return
	_orbit_camera.focus_on_zone(_selected_zone.global_position, _selected_zone.data)
