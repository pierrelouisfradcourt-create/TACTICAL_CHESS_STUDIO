extends Node2D

## Présentation PLACEHOLDER : des rectangles et des ronds pilotés par les données.
## Aucune règle de jeu ici — tout vient de core/moteur.gd. Le but est d'avoir
## quelque chose de jouable avant d'avoir le moindre asset, pour pouvoir tester
## les niveaux avec des enfants sans attendre l'art.
##
## Commandes : clic = prendre / poser · 1-9 = aller au niveau · R = rejouer · Échap = lâcher

const Donnees := preload("res://core/donnees.gd")
const Moteur := preload("res://core/moteur.gd")

const CANEVAS := Vector2(1600, 900)
const FOND := Color("#14171C")
const CRAIE := Color("#DCD6C9")
const BRUME := Color("#8C8578")
const LUEUR := Color("#E9B872")

var _roster: Dictionary = {}
var _ordre: Array = []
var _index: int = 0
var _moteur: Moteur = null
var _murmure: String = ""
var _font: Font = ThemeDB.fallback_font


func _ready() -> void:
	_roster = Donnees.charger_roster()
	_ordre = Donnees.ordre_des_niveaux()
	if _roster.is_empty() or _ordre.is_empty():
		push_error("Données de jeu absentes : vérifie games/qui_va_ou/data/")
		return
	_aller_a(0)


func _aller_a(index: int) -> void:
	if index < 0 or index >= _ordre.size():
		return
	_index = index
	var niveau := Donnees.charger_niveau(String(_ordre[index]))
	if niveau.is_empty():
		return
	_moteur = Moteur.new()
	_moteur.charger(niveau, _roster)
	_murmure = String(niveau.get("mission", ""))
	queue_redraw()


func _unhandled_input(evenement: InputEvent) -> void:
	if _moteur == null:
		return

	if evenement is InputEventKey and evenement.pressed:
		var touche := evenement as InputEventKey
		if touche.keycode == KEY_ESCAPE:
			_moteur.lacher()
			queue_redraw()
		elif touche.keycode == KEY_R:
			_aller_a(_index)
		elif touche.keycode >= KEY_1 and touche.keycode <= KEY_9:
			_aller_a(touche.keycode - KEY_1)
		return

	if not (evenement is InputEventMouseButton):
		return
	var clic := evenement as InputEventMouseButton
	if not (clic.pressed and clic.button_index == MOUSE_BUTTON_LEFT):
		return

	var p := get_global_mouse_position()

	if _moteur.libere:
		_aller_a(_index + 1)
		return

	for chat_id: String in _moteur.disponibles:
		if _position_chat(chat_id).distance_to(p) < 70.0:
			_moteur.prendre(chat_id)
			_murmure = "Tu tiens celui qui sait %s. Où le poses-tu ?" % _verbe_lisible(chat_id)
			queue_redraw()
			return

	for z: Variant in _moteur.zones():
		var zone: Dictionary = z
		if _rect_de(zone).has_point(p):
			var issue := _moteur.poser(String(zone["id"]))
			_murmure = String(issue["texte"])
			if int(issue["resultat"]) == Moteur.Resultat.SUCCES:
				_murmure = "%s %s" % [String(issue["geste"]), String(issue["effet"])]
			queue_redraw()
			return

	_moteur.lacher()
	queue_redraw()


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, CANEVAS), FOND, true)
	if _moteur == null:
		draw_string(_font, Vector2(60, 80), "Données absentes.", HORIZONTAL_ALIGNMENT_LEFT, -1, 34, CRAIE)
		return

	for z: Variant in _moteur.zones():
		_dessiner_zone(z as Dictionary)

	_dessiner_prisonnier()

	for chat_id: String in _moteur.disponibles:
		_dessiner_chat(chat_id, _position_chat(chat_id), chat_id == _moteur.en_main)

	var titre := String(_moteur.niveau.get("titre", ""))
	draw_string(_font, Vector2(60, 70), "%d. %s" % [_index + 1, titre], HORIZONTAL_ALIGNMENT_LEFT, -1, 38, CRAIE)
	draw_multiline_string(_font, Vector2(60, 830), _murmure, HORIZONTAL_ALIGNMENT_LEFT, CANEVAS.x - 120, 30, 2, LUEUR)
	if _moteur.libere:
		draw_string(_font, Vector2(60, 120), "Libéré ! Clique pour le tableau suivant.",
			HORIZONTAL_ALIGNMENT_LEFT, -1, 30, LUEUR)


func _dessiner_zone(zone: Dictionary) -> void:
	var r := _rect_de(zone)
	var ouverte := _moteur.zone_ouverte(zone)
	var vise := _moteur.en_main != "" and ouverte \
		and _moteur.verbe_du_chat(_moteur.en_main) == String(zone["verbe"])

	var remplissage := Color(LUEUR, 0.20) if vise else Color(CRAIE, 0.05 if ouverte else 0.02)
	draw_rect(r, remplissage, true)
	draw_rect(r, Color(LUEUR if vise else BRUME, 0.85 if vise else 0.35), false, 4.0)

	var etiquette := "%s · %s" % [String(zone["nom"]), String(zone["verbe"])]
	if not ouverte:
		etiquette += "  (bloqué)"
	draw_string(_font, r.position + Vector2(14, r.size.y - 16), etiquette,
		HORIZONTAL_ALIGNMENT_LEFT, r.size.x - 20, 26, Color(CRAIE, 0.8 if ouverte else 0.35))


func _dessiner_prisonnier() -> void:
	var p: Dictionary = _moteur.niveau.get("prisonnier", {})
	if p.is_empty():
		return
	var cle := "libere" if _moteur.libere else "coince"
	var coord: Array = p[cle]
	var centre := Vector2(float(coord[0]), float(coord[1]))
	_dessiner_minois(centre, Donnees.robe(_roster, String(p["robe"])), not _moteur.libere)


func _dessiner_chat(chat_id: String, centre: Vector2, en_main: bool) -> void:
	if en_main:
		draw_circle(centre + Vector2(0, 10), 84.0, Color(LUEUR, 0.22))
	_dessiner_minois(centre, Donnees.robe(_roster, chat_id), false)
	draw_string(_font, centre + Vector2(-60, 92), _verbe_lisible(chat_id),
		HORIZONTAL_ALIGNMENT_CENTER, 120, 24, Color(CRAIE, 0.85))


func _dessiner_minois(centre: Vector2, robe: Dictionary, appelle: bool) -> void:
	var poil := Color(String(robe.get("poil", "#888888")))
	var ventre := Color(String(robe.get("ventre", "#BBBBBB")))
	var oeil := Color(String(robe.get("oeil", "#8FD3C7")))

	draw_circle(centre + Vector2(0, 46), 52.0, poil)
	draw_circle(centre + Vector2(6, 58), 30.0, ventre)
	draw_colored_polygon(PackedVector2Array([
		centre + Vector2(-34, -24), centre + Vector2(-16, -58), centre + Vector2(-4, -22)]), poil)
	draw_colored_polygon(PackedVector2Array([
		centre + Vector2(34, -24), centre + Vector2(18, -58), centre + Vector2(6, -22)]), poil)
	draw_circle(centre, 36.0, poil)
	draw_circle(centre + Vector2(-13, -4), 7.0, oeil)
	draw_circle(centre + Vector2(13, -4), 7.0, oeil)

	if appelle:
		draw_arc(centre + Vector2(56, -10), 22.0, -0.9, 0.9, 12, Color(LUEUR, 0.9), 4.0)
		draw_arc(centre + Vector2(56, -10), 36.0, -0.8, 0.8, 14, Color(LUEUR, 0.5), 4.0)


func _rect_de(zone: Dictionary) -> Rect2:
	var r: Array = zone["rect"]
	return Rect2(float(r[0]), float(r[1]), float(r[2]), float(r[3]))


## Un chat posé se tient sur sa zone ; sinon il attend en bas à gauche.
func _position_chat(chat_id: String) -> Vector2:
	for zone_id: Variant in _moteur.occupees.keys():
		if String(_moteur.occupees[zone_id]) != chat_id:
			continue
		var zone := _moteur.zone(String(zone_id))
		if zone.has("pose_chat"):
			var pc: Array = zone["pose_chat"]
			return Vector2(float(pc[0]), float(pc[1]))
		return _rect_de(zone).get_center()

	var rang := 0
	for autre: String in _moteur.disponibles:
		if autre == chat_id:
			break
		if not _est_pose(autre):
			rang += 1
	return Vector2(160.0 + float(rang) * 190.0, 700.0)


func _est_pose(chat_id: String) -> bool:
	for zone_id: Variant in _moteur.occupees.keys():
		if String(_moteur.occupees[zone_id]) == chat_id:
			return true
	return false


func _verbe_lisible(chat_id: String) -> String:
	return _moteur.verbe_du_chat(chat_id)
