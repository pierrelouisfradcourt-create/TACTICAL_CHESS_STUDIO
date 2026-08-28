# main.gd — CONTROLEUR RACINE (categorie godot.project_root : script racine attendu
# par les oracles, script de `main.tscn`). ASSEMBLE le jeu jouable :
#   - construit l'ecran (fond, pelote, boutons, HUD, galerie, quetes) ;
#   - charge les registres de monde AU BOOT (03_WORLD) ;
#   - instancie les adaptateurs d'ENTREE (input_adapters) et de PRESENTATION ;
#   - fait tourner la PRODUCTION dans `_process` une fois le jeu commence.
#
# SEPARATION (garde-fou (c)) : toute la logique de jeu vit dans 05_SYSTEMS/economy
# (pur). Ce controleur ne fait que CAPTER (via adaptateurs) et AFFICHER (via labels /
# sprites) ; il ne recalcule aucune economie. DETERMINISME (garde-fou (b)) : la
# production avance d'UN tick par trame rendue (compteur de trames), aucune horloge.
#
# GATE DE PRODUCTION : la production ne demarre qu'au PREMIER clic de pelote
# (`_play_started`). Cela garantit que le compteur de ronrons vaut 0 a sa premiere
# lecture (maillon META_LOOP `resets` : le prestige y ramene le compteur).
extends Control

const CostCurve = preload("res://05_SYSTEMS/economy/cost_curve.gd")
const Production = preload("res://05_SYSTEMS/economy/production.gd")
const GoalBanner = preload("res://06_RUNTIME/adapters/presentation/goal_banner.gd")
const RarityView = preload("res://06_RUNTIME/adapters/presentation/rarity_view.gd")
const ClickFeedback = preload("res://06_RUNTIME/adapters/presentation/click_feedback.gd")
const Pelote = preload("res://06_RUNTIME/adapters/input_adapters/pelote.gd")
const AcheterChaton = preload("res://06_RUNTIME/adapters/input_adapters/acheter_chaton.gd")
const AcheterAmelioration = preload("res://06_RUNTIME/adapters/input_adapters/acheter_amelioration.gd")
const PrestigeBtn = preload("res://06_RUNTIME/adapters/input_adapters/prestige.gd")

const SPRITE_DIR := "res://04_ASSETS/sprites/"

var _state: Dictionary = {}
var _play_started := false

var _kittens: Array = []
var _locations: Array = []
var _objects: Array = []
var _quests: Array = []

var _hud: Dictionary = {}          # nom -> Label
var _pelote: TextureButton = null
var _feedback: ClickFeedback = null
var _kitten_box: HBoxContainer = null
var _jardin_box: HBoxContainer = null
var _bg: TextureRect = null


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_state = CostCurve.initial_state()
	_load_registries()
	_build_background()
	_build_hud()
	_build_cost_ladder()
	_build_quests()
	_build_gallery()
	_build_containers()
	_build_affordances()
	_feedback = ClickFeedback.new()
	add_child(_feedback)
	_refresh()


# --- chargement des registres (consommation amont, AU BOOT) --------------------
func _load_registries() -> void:
	_kittens = _read_json_array("res://03_WORLD/kittens.json", "kittens")
	_locations = _read_json_array("res://03_WORLD/locations.json", "locations")
	_objects = _read_json_array("res://03_WORLD/objects.json", "objects")
	_quests = _read_json_array("res://03_WORLD/quests.json", "quests")


func _read_json_array(path: String, key: String) -> Array:
	if not FileAccess.file_exists(path):
		return []
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(path))
	if parsed is Dictionary and parsed.get(key) is Array:
		return parsed[key]
	return []


# --- construction de l'ecran ---------------------------------------------------
func _build_background() -> void:
	_bg = TextureRect.new()
	_bg.texture = load(SPRITE_DIR + "refuge_start.svg")
	_bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	_bg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_bg.stretch_mode = TextureRect.STRETCH_SCALE
	_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_bg)


func _make_label(nom: String, pos: Vector2, w: float) -> Label:
	var l := Label.new()
	l.name = nom
	l.position = pos
	l.size = Vector2(w, 22)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	l.add_theme_color_override("font_color", Color(0.29, 0.29, 0.33))
	add_child(l)
	return l


func _build_hud() -> void:
	# Labels du groupe "hud", nommes EXACTEMENT comme les cles lues par loop.json.
	var obj := _make_label("objectif", Vector2(12, 8), 616)
	obj.add_theme_font_size_override("font_size", 16)
	obj.add_to_group("hud")
	_hud["objectif"] = obj
	var specs := [["ronrons", 36.0], ["collection", 58.0], ["taux_production", 80.0], ["lieux", 102.0]]
	for spec in specs:
		var l := _make_label(String(spec[0]), Vector2(12, float(spec[1])), 300)
		l.add_to_group("hud")
		_hud[String(spec[0])] = l


func _build_cost_ladder() -> void:
	# Echelle des couts affichee (regle de variance) : groupe "cost_ladder".
	var costs: Array = CostCurve.cost_ladder()
	var x := 12.0
	for c in costs:
		var l := _make_label("cout_%d" % int(c), Vector2(x, 452), 56)
		l.text = "%d" % int(c)
		l.add_to_group("cost_ladder")
		x += 56.0


func _build_quests() -> void:
	# >=3 quetes avec objectif affiche (groupe "quests").
	var y := 128.0
	for q in _quests:
		if not (q is Dictionary):
			continue
		var l := _make_label("quest_%s" % String(q.get("id", "")), Vector2(12, y), 320)
		l.text = "* %s (%s %d)" % [String(q.get("titre", "")), String(q.get("unite", "")), int(q.get("seuil", 0))]
		l.add_to_group("quests")
		y += 20.0


func _build_gallery() -> void:
	# Galerie de TOUTES les raretes (groupe "gallery") : rend 3 raretes visuellement
	# distinctes des le boot, independamment de la collection (oracle gallery_render).
	var box := HBoxContainer.new()
	box.position = Vector2(220, 300)
	box.add_theme_constant_override("separation", 6)
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(box)
	for k in _kittens:
		if not (k is Dictionary):
			continue
		var panel := ColorRect.new()
		panel.color = RarityView.tint_for(String(k.get("rarete", "")))
		panel.custom_minimum_size = Vector2(52, 52)
		panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
		panel.add_to_group("gallery")
		panel.set_meta("rarete", String(k.get("rarete", "")))
		var spr := RarityView.make_sprite(k)
		spr.position = Vector2(2, 2)
		panel.add_child(spr)
		box.add_child(panel)


func _build_containers() -> void:
	_kitten_box = HBoxContainer.new()
	_kitten_box.position = Vector2(12, 300)
	_kitten_box.add_theme_constant_override("separation", 4)
	_kitten_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_kitten_box)
	_jardin_box = HBoxContainer.new()
	_jardin_box.position = Vector2(470, 300)
	_jardin_box.add_theme_constant_override("separation", 4)
	_jardin_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_jardin_box)


func _build_affordances() -> void:
	# Pelote centrale (TextureButton), nommee "pelote", groupe "affordance".
	_pelote = Pelote.new()
	_pelote.name = "pelote"
	_pelote.texture_normal = load(SPRITE_DIR + "wool_ball.svg")
	_pelote.ignore_texture_size = true
	_pelote.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	_pelote.position = Vector2(260, 180)
	_pelote.size = Vector2(120, 120)
	_pelote.bind(_state)
	_pelote.acted.connect(_on_pelote)
	add_child(_pelote)

	_make_action_button(AcheterChaton, "acheter_chaton", "Adopter un chaton", Vector2(466, 60), _on_buy_kitten)
	_make_action_button(AcheterAmelioration, "acheter_amelioration", "Ameliorer le refuge", Vector2(466, 110), _on_amelioration)
	_make_action_button(PrestigeBtn, "prestige", "Prestige", Vector2(466, 160), _on_prestige)


func _make_action_button(script, nom: String, label: String, pos: Vector2, cb: Callable) -> void:
	var b = script.new()
	b.name = nom
	b.text = label
	b.position = pos
	b.size = Vector2(162, 40)
	b.bind(_state)
	b.acted.connect(cb)
	add_child(b)


# --- handlers ------------------------------------------------------------------
func _on_pelote(_ok: bool, _gain: float) -> void:
	_play_started = true
	if _feedback != null:
		_feedback.pop(_pelote.get_global_rect().get_center())
	_refresh()


func _on_buy_kitten(ok: bool) -> void:
	if ok:
		var idx: int = int(_state["collection"]) - 1
		if idx >= 0 and idx < _kittens.size():
			_kitten_box.add_child(RarityView.make_sprite(_kittens[idx]))
	_refresh()


func _on_amelioration(_upgraded: bool, unlocked: bool) -> void:
	if unlocked:
		_add_jardin_node()
	_refresh()


func _add_jardin_node() -> void:
	# Fait APPARAITRE un nouvel element du groupe "jardin" (maillon UNLOCK, appears).
	var node := TextureRect.new()
	node.texture = load(SPRITE_DIR + "place_garden_unlocked.svg")
	node.custom_minimum_size = Vector2(48, 48)
	node.size = Vector2(48, 48)
	node.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	node.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	node.add_to_group("jardin")
	_jardin_box.add_child(node)


func _on_prestige(ok: bool) -> void:
	if ok:
		for c in _kitten_box.get_children():
			c.queue_free()
		for c in _jardin_box.get_children():
			c.queue_free()
	_refresh()


# --- boucle et affichage -------------------------------------------------------
func _process(_delta: float) -> void:
	if _play_started:
		Production.tick(_state)
	_refresh()


func _refresh() -> void:
	_hud["objectif"].text = GoalBanner.text_for(_state)
	_hud["ronrons"].text = "Ronrons : %d" % int(floor(float(_state["ronrons"])))
	_hud["collection"].text = "Chatons : %d" % int(_state["collection"])
	_hud["taux_production"].text = "Ronron/s : %.2f" % Production.taux(_state)
	_hud["lieux"].text = "Lieux : %d" % int(_state["locations"])
