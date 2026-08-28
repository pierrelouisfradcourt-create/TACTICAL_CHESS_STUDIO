# forge:run_mode = gpu_window
# solvability.gd — VOLET DE SOLVABILITE (FORGE_ORACLE, fenetre GPU). Un bot
# DETERMINISTE joue depuis la VRAIE scene principale (res://main.tscn) et GAGNE :
# il atteint le 3e palier (palier >= 3) en un nombre de trames FINI et non trivial.
#
# Un jeu aux objectifs inatteignables passe les tests unitaires mais echoue ICI
# (lecon s10a). GARDE V4 (non negociable) : le bot n'a QUE les entrees d'un joueur —
# InputEvent sur les affordances (groupe "affordance") + lecture des Label (groupe
# "hud"). Aucun acces a l'economie, aucune API interne, aucun script de regles.
extends SceneTree

const SETTLE := 20
const TARGET_PALIER := 3
const MAX_FRAMES := 3000

var _f := 0
var _started := false
var _pelote: Control = null
var _buy_kitten: Control = null
var _buy_amelio: Control = null
var _objectif: Label = null
var _ronrons: Label = null
var _num := RegEx.new()
var _reached_frame := -1


func _init() -> void:
	_num.compile("[-+]?\\d+(?:[.,]\\d+)?")
	var packed = load("res://main.tscn")
	if packed == null or not (packed is PackedScene):
		_emit(false, ["main.tscn introuvable"], {})
		return
	get_root().add_child(packed.instantiate())


func _process(_d: float) -> bool:
	_f += 1
	if _f < SETTLE:
		return false
	if not _started:
		_pelote = _find("affordance", "pelote")
		_buy_kitten = _find("affordance", "acheter_chaton")
		_buy_amelio = _find("affordance", "acheter_amelioration")
		_objectif = _find_label("objectif")
		_ronrons = _find_label("ronrons")
		if _pelote == null or _buy_kitten == null or _objectif == null:
			_emit(false, ["affordances/hud introuvables"], {})
			return false
		_click(_buy_kitten)   # adopte le chaton gratuit
		_started = true
		return false

	# Politique deterministe : caresser la pelote a chaque trame, et depenser des
	# que possible en chatons puis en ameliorations (accroit la production).
	_click(_pelote)
	if _f % 6 == 0:
		_click(_buy_kitten)
	if _f % 15 == 0 and _buy_amelio != null:
		_click(_buy_amelio)

	var palier := _palier()
	if palier >= TARGET_PALIER:
		_emit(true, [], {"reached_palier": palier, "frames": _f, "trivial": _f <= SETTLE + 2})
		return true
	if _f >= MAX_FRAMES:
		_emit(false, ["3e palier non atteint en %d trames (palier %d)" % [_f, palier]], {"reached_palier": palier, "frames": _f})
		return true
	return false


func _palier() -> int:
	var m := _num.search(_objectif.text)   # "Palier N — ..."
	return int(m.get_string()) if m != null else -1


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
	print("FORGE_ORACLE solvability " + JSON.stringify({"ok": ok, "fails": fails, "data": data}))
	quit(0 if ok else 1)
