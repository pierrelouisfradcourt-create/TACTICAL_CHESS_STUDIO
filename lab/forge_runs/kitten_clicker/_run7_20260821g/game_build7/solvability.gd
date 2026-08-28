# solvability.gd — POINT D'ENTREE de l'oracle R9 (racine du projet, categorie
# godot.project_root). Lance par scripts/forge/solvability_godot.mjs en --headless avec
# `--seed=<n> --max_ticks=<m>`.
#
# GARDE ANTI-CONTOURNEMENT V4 (decision Pierre 2026-08-22) : le bot joue main.tscn par les
# SEULES entrees d'un joueur — un clic (InputEvent) sur l'affordance "pelote" du groupe
# "affordance", et la lecture du Label "palier" du groupe "hud". AUCUN acces a l'economie,
# a une API interne, ni a res://05_SYSTEMS : un bot qui contourne l'ecran prouverait un jeu
# qui n'existe pas. En --headless, l'evenement est injecte par get_root().push_input (le
# picking GUI du Viewport, mesure : Input.parse_input_event ne route pas les clics sans
# serveur d'affichage). Le jeu est deterministe (aucun alea) : il gagne a chaque graine.
# Sortie : une ligne `FORGE_TRIAL {"succeeded": bool, "ticks": number|null}`, exit 0.
extends SceneTree

var _inst
var _f := 0
var _max := 400
const SETTLE := 20

func _lire_arg(nom: String, defaut: int) -> int:
	for a in OS.get_cmdline_user_args():
		if a.begins_with(nom + "="):
			var v := a.substr((nom + "=").length())
			if v.is_valid_int():
				return int(v)
	return defaut

func _initialize() -> void:
	_max = maxi(_lire_arg("--max_ticks", 400), 120)
	_inst = load("res://main.tscn").instantiate()
	get_root().add_child(_inst)

func _trouver(groupe: String, nom: String) -> Node:
	for n in get_nodes_in_group(groupe):
		if n.name == nom:
			return n
	return null

func _palier() -> int:
	var l := _trouver("hud", "palier")
	if l == null or not (l is Label):
		return -1
	return int(String(l.text))

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

func _finir(gagne: bool) -> void:
	var recu := {"succeeded": gagne, "ticks": (_f if gagne else null)}
	print("FORGE_TRIAL " + JSON.stringify(recu))
	quit(0)

func _process(_d: float) -> bool:
	_f += 1
	if _f <= SETTLE:
		return false
	var pelote := _trouver("affordance", "pelote")
	if pelote == null:
		_finir(false)
		return true
	# assertion STRICTE d'egalite au 3e palier (jamais un >= tautologique : la table ne
	# porte que 3 seuils, le palier plafonne a 3).
	if _palier() == 3:
		_finir(true)
		return true
	if _f > _max:
		_finir(false)
		return true
	_cliquer(pelote)  # seule entree : caresser la pelote fait monter les ronrons cumules
	return false
