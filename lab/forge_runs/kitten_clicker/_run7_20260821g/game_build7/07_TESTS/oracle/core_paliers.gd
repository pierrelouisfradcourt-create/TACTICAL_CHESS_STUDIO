# core_paliers.gd — oracle produit de la ligne core.paliers. Prouve, DEPUIS main.tscn et par
# les seules entrees d'un joueur (clic sur la pelote, lecture des Labels "palier"/"ronrons"),
# que la courbe de paliers porte >=3 seuils DISTINCTS strictement croissants (regle de variance
# des metriques, ratifiee Pierre 2026-07-21) : on releve le cumul de ronrons au moment ou le
# palier s'incremente, et on verifie 3 franchissements a des valeurs distinctes et croissantes.
# Aucune lecture de 05_SYSTEMS : la preuve traverse l'ecran.
extends SceneTree

var _inst
var _f := 0
var _prev_palier := 0
var _seuils_observes: Array = []
const SETTLE := 8
const MAX := 400

func _initialize() -> void:
	_inst = load("res://main.tscn").instantiate()
	get_root().add_child(_inst)

func _trouver(groupe: String, nom: String) -> Node:
	for n in get_nodes_in_group(groupe):
		if n.name == nom:
			return n
	return null

func _num(nom: String) -> float:
	var l := _trouver("hud", nom)
	if l == null or not (l is Label):
		return -1.0
	var re := RegEx.new()
	re.compile("[-+]?\\d+(?:[.,]\\d+)?")
	var m := re.search(l.text)
	return m.get_string().replace(",", ".").to_float() if m != null else -1.0

func _cliquer(node: Control) -> void:
	var c: Vector2 = node.get_global_rect().get_center()
	var p := InputEventMouseButton.new()
	p.button_index = MOUSE_BUTTON_LEFT
	p.pressed = true
	p.position = c
	get_root().push_input(p, true)
	var r := InputEventMouseButton.new()
	r.button_index = MOUSE_BUTTON_LEFT
	r.pressed = false
	r.position = c
	get_root().push_input(r, true)

func _emettre() -> void:
	var fails: Array = []
	if _seuils_observes.size() < 3:
		fails.append("moins de 3 franchissements de palier observes : %s" % str(_seuils_observes))
	else:
		for i in range(1, _seuils_observes.size()):
			if float(_seuils_observes[i]) <= float(_seuils_observes[i - 1]):
				fails.append("seuils non strictement croissants : %s" % str(_seuils_observes))
				break
		var uniques := {}
		for s in _seuils_observes:
			uniques[s] = true
		if uniques.size() < 3:
			fails.append("seuils non distincts : %s" % str(_seuils_observes))
	print("FORGE_ORACLE core_paliers " + JSON.stringify({
		"ok": fails.is_empty(), "fails": fails, "data": {"seuils_observes": _seuils_observes}}))
	quit(0 if fails.is_empty() else 1)

func _process(_d: float) -> bool:
	_f += 1
	if _f <= SETTLE:
		return false
	var palier := int(_num("palier"))
	if palier > _prev_palier:
		_seuils_observes.append(_num("ronrons"))
		_prev_palier = palier
	if _seuils_observes.size() >= 3 or _f > MAX:
		_emettre()
		return true
	var pelote := _trouver("affordance", "pelote")
	if pelote == null:
		_emettre()
		return true
	_cliquer(pelote)
	return false
