# forge:run_mode = gpu_window
# core_goal_display.gd — VOLET PRODUIT (FORGE_ORACLE, fenetre GPU). Charge la VRAIE
# scene principale (res://main.tscn) et prouve le maillon NEXT_GOAL : la banniere
# "objectif" affiche AU MOINS 3 textes de but successifs et DISTINCTS au fil de la
# progression (initial, puis paliers suivants). Le bot adopte un chaton, lance la
# production par un clic, puis echantillonne la banniere. GARDE V4 : uniquement
# InputEvent + lecture de Label.
extends SceneTree

const SETTLE := 30
const SAMPLE_EVERY := 20
const MAX_FRAMES := 1200

var _f := 0
var _phase := "settle"
var _seen: Array = []
var _label: Label = null
var _pelote: Control = null
var _buy: Control = null
var _last_sample := 0


func _init() -> void:
	var packed = load("res://main.tscn")
	if packed == null or not (packed is PackedScene):
		_emit(false, ["main.tscn introuvable"], {})
		return
	get_root().add_child(packed.instantiate())


func _process(_d: float) -> bool:
	_f += 1
	if _phase == "settle":
		if _f >= SETTLE:
			_label = _find_label("objectif")
			_pelote = _find("affordance", "pelote")
			_buy = _find("affordance", "acheter_chaton")
			if _label == null or _pelote == null or _buy == null:
				_emit(false, ["objectif / pelote / acheter_chaton introuvable"], {})
				return false
			_sample()
			_click(_buy)       # adopte le chaton gratuit (production possible)
			_click(_pelote)    # premier clic : demarre la production
			_phase = "run"
		return false
	if _phase == "run":
		_click(_pelote)
		if _f - _last_sample >= SAMPLE_EVERY:
			_sample()
			_last_sample = _f
		if _seen.size() >= 3:
			_emit(true, [], {"distinct_goals": _seen})
			return true
		if _f >= MAX_FRAMES:
			_emit(false, ["seulement %d but(s) distinct(s) en %d trames" % [_seen.size(), _f]], {"distinct_goals": _seen})
			return true
	return false


func _sample() -> void:
	var t := _label.text
	if t.strip_edges() != "" and not _seen.has(t):
		_seen.append(t)


func _find(group: String, nom: String) -> Node:
	for n in get_nodes_in_group(group):
		if n.name == nom:
			return n
	return null


func _find_label(nom: String) -> Label:
	for n in get_nodes_in_group("hud"):
		if n is Label and n.name == nom:
			return n
	return null


func _click(node: Control) -> void:
	var c: Vector2 = node.get_global_rect().get_center()
	var p := InputEventMouseButton.new()
	p.button_index = MOUSE_BUTTON_LEFT; p.pressed = true; p.position = c
	var r := InputEventMouseButton.new()
	r.button_index = MOUSE_BUTTON_LEFT; r.pressed = false; r.position = c
	Input.parse_input_event(p); Input.parse_input_event(r)


func _emit(ok: bool, fails: Array, data: Dictionary) -> void:
	print("FORGE_ORACLE core_goal_display " + JSON.stringify({"ok": ok, "fails": fails, "data": data}))
	quit(0 if ok else 1)
