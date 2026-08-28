# core_no_defeat.gd — oracle produit de la ligne core.no_defeat. Prouve, DEPUIS main.tscn,
# que la machine a etats du clicker ne comporte AUCUN etat de defaite : le vocabulaire de
# phases atteignables exclut "defeat"/"game_over", et apres une sequence d'entrees joueur
# variees (clics, achats, prestige, y compris repetees), la phase reste "jeu" — aucune
# reinitialisation involontaire de la progression. Inspecte la scene assemblee (methodes
# observables du controleur), jamais res://05_SYSTEMS.
extends SceneTree

var _inst
var _f := 0
var _cumul_max := 0.0
var _phase_deviante := ""
const SETTLE := 6
const MAX := 260

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

func _cliquer(nom: String) -> void:
	var node := _trouver("affordance", nom)
	if node == null:
		return
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
	var etats: Array = _inst.etats_possibles()
	if "defeat" in etats or "game_over" in etats:
		fails.append("vocabulaire de phases contient un etat de defaite : %s" % str(etats))
	if _phase_deviante != "":
		fails.append("phase de defaite/anomalie atteinte en jouant : %s" % _phase_deviante)
	print("FORGE_ORACLE core_no_defeat " + JSON.stringify({
		"ok": fails.is_empty(), "fails": fails,
		"data": {"etats_possibles": etats, "cumul_max": _cumul_max}}))
	quit(0 if fails.is_empty() else 1)

func _process(_d: float) -> bool:
	_f += 1
	if _f <= SETTLE:
		return false
	# suit la phase courante : elle ne doit jamais devier de "jeu".
	var ph := String(_inst.phase_courante())
	if ph != "jeu" and _phase_deviante == "":
		_phase_deviante = ph
	_cumul_max = maxf(_cumul_max, _num("ronrons"))

	# sequence d'entrees variees : clic, achats (souvent non finances = entrees hors domaine),
	# prestige — rien ne doit casser la partie.
	_cliquer("pelote")
	if _f % 5 == 0:
		_cliquer("acheter_chaton")
	if _f % 7 == 0:
		_cliquer("acheter_amelioration")
	if _f % 11 == 0:
		_cliquer("prestige")

	if _f > MAX:
		_emettre()
		return true
	return false
