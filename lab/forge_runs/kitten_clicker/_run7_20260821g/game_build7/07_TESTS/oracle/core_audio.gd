# core_audio.gd — oracle produit de la ligne audio.events / core.audio. Tient un journal des
# declenchements sonores : apres avoir PROVOQUE, depuis main.tscn et par les entrees joueur,
# les 4 evenements du jeu (clic, achat, deblocage, prestige), le journal contient 4
# identifiants de son DISTINCTS, un par evenement, aucun son decoratif. Lit le journal de
# l'adaptateur audio reutilise (06_RUNTIME), jamais res://05_SYSTEMS.
extends SceneTree

const Audio := preload("res://06_RUNTIME/adapters/audio/audio.gd")

var _inst
var _f := 0
const SETTLE := 6

func _initialize() -> void:
	_inst = load("res://main.tscn").instantiate()
	get_root().add_child(_inst)

func _clic(nom: String) -> void:
	var node := _trouver(nom)
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

func _trouver(nom: String) -> Node:
	for n in get_nodes_in_group("affordance"):
		if n.name == nom:
			return n
	return null

func _emettre() -> void:
	var distincts: Array = Audio.sons_distincts()
	var fails: Array = []
	if Audio.journal().is_empty():
		fails.append("aucun declenchement sonore trace sur une partie jouee")
	for evt in ["clic", "achat", "deblocage", "prestige"]:
		if not (evt in distincts):
			fails.append("evenement '%s' n'a declenche aucun son propre" % evt)
	if distincts.size() != 4:
		fails.append("nombre de sons distincts != 4 : %s" % str(distincts))
	print("FORGE_ORACLE core_audio " + JSON.stringify({
		"ok": fails.is_empty(), "fails": fails,
		"data": {"sons_distincts": distincts, "declenchements": Audio.journal().size()}}))
	quit(0 if fails.is_empty() else 1)

func _process(_d: float) -> bool:
	_f += 1
	if _f <= SETTLE:
		return false
	# Provoque les 4 evenements par les entrees joueur : d'abord accumuler des ronrons
	# cumules (clic), puis acheter un chaton (achat + deblocage du 1er type), puis prestige.
	if _f <= SETTLE + 40:
		_clic("pelote")
		return false
	if _f == SETTLE + 42:
		_clic("acheter_chaton")   # achat + deblocage (1er type)
		return false
	if _f == SETTLE + 44:
		_clic("prestige")         # cumul >= 30 atteint par les 40 clics
		return false
	if _f >= SETTLE + 50:
		_emettre()
		return true
	return false
