# forge:run_mode = gpu_window
# mutation_click.gd — VOLET PRODUIT (FORGE_ORACLE). Charge la VRAIE scene principale
# (res://main.tscn) et prouve OBSERVABLEMENT l'increment de clic : au repos le
# compteur vaut 0 ; apres K clics reels sur l'affordance "pelote", il a monte d'au
# moins K (chaque clic rapporte >=1, jamais 0 : un mecanisme mort serait pris).
#
# La preuve STRICTE `ronrons == n+1` (mutation) est portee par le harnais scelle
# tests/run_tests.gd, mute par le driver ; ce volet la COMPLETE cote scene reelle.
# GARDE V4 : uniquement InputEvent + lecture de Label. Aucun appel a l'economie.
extends SceneTree

const SETTLE := 40
const CLICKS := 6

var _f := 0
var _phase := "settle"
var _clicked := 0
var _before := -1.0
var _pelote: Control = null
var _label: Label = null
var _num := RegEx.new()


func _init() -> void:
	_num.compile("[-+]?\\d+(?:[.,]\\d+)?")
	var packed = load("res://main.tscn")
	if packed == null or not (packed is PackedScene):
		_emit(false, ["main.tscn introuvable"], {})
		return
	get_root().add_child(packed.instantiate())


func _process(_d: float) -> bool:
	_f += 1
	if _phase == "settle":
		if _f >= SETTLE:
			_pelote = _find("affordance", "pelote")
			_label = _find_label("ronrons")
			if _pelote == null or _label == null:
				_emit(false, ["pelote ou label ronrons introuvable"], {})
				return false
			_before = _val(_label.text)
			_phase = "click"
		return false
	if _phase == "click":
		_click(_pelote)
		_clicked += 1
		if _clicked >= CLICKS:
			_phase = "measure"
		return false
	if _phase == "measure":
		var after := _val(_label.text)
		var delta := after - _before
		var fails: Array = []
		if _before != 0.0:
			fails.append("compteur non nul au repos (%f)" % _before)
		if delta < float(CLICKS):
			fails.append("%d clics n'ont ajoute que %f (< %d, increment faible/mort)" % [CLICKS, delta, CLICKS])
		if not (after > _before):
			fails.append("le compteur n'a pas augmente")
		_emit(fails.is_empty(), fails, {"before": _before, "after": after, "clicks": CLICKS, "delta": delta})
		return true
	return false


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


func _val(s: String) -> float:
	var m := _num.search(s)
	return m.get_string().replace(",", ".").to_float() if m != null else NAN


func _emit(ok: bool, fails: Array, data: Dictionary) -> void:
	print("FORGE_ORACLE mutation_click " + JSON.stringify({"ok": ok, "fails": fails, "data": data}))
	quit(0 if ok else 1)
