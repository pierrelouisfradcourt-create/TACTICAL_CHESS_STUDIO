# runtime.gd — RACINE DE COMPOSITION (res://main.tscn). Le SEUL endroit qui possede une
# horloge, une entree et des noeuds. N'implemente AUCUNE regle d'economie : il charge les
# registres au boot, instancie l'etat, cable les adaptateurs (render / gallery / input /
# audio) et fait tourner la production. Toute la logique reste dans 05_SYSTEMS.
#
# JEU SOLO HORS-LIGNE : aucun appel reseau (aucune requete web, aucun flux TCP/UDP, aucune API externe).
extends Node

const P = preload("res://05_SYSTEMS/params/params.gd")
const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")
const Economy = preload("res://05_SYSTEMS/economy/economy.gd")
const Upgrades = preload("res://05_SYSTEMS/economy/upgrades.gd")
const Prestige = preload("res://05_SYSTEMS/meta/prestige.gd")
const Events = preload("res://05_SYSTEMS/events/events.gd")
const Render = preload("res://06_RUNTIME/adapters/render/render.gd")
const Gallery = preload("res://06_RUNTIME/adapters/render/gallery.gd")
const InputAdapter = preload("res://06_RUNTIME/adapters/input/input.gd")
const Audio = preload("res://06_RUNTIME/adapters/audio/audio.gd")

const TICK_S: float = 1.0 / float(P.TICKS_PAR_SECONDE)

var _state = null
var _reg: Dictionary = {}
var _kitten_ids: Array = []
var _render = null
var _gallery = null
var _input = null
var _audio = null
var _accu: float = 0.0
var _tick: int = 0


func _ready() -> void:
	Audio.reinitialiser()
	load_registries()

	var tex: Dictionary = _charger_textures()

	_state = GameState.initial(_kitten_ids.size() if not _kitten_ids.is_empty() else 6)

	_render = Render.new()
	add_child(_render)
	_render.batir(_reg, tex)

	_gallery = Gallery.new()
	add_child(_gallery)
	_gallery.batir(_reg, tex)

	_audio = Audio.new()
	add_child(_audio)

	_input = InputAdapter.new()
	add_child(_input)
	_input.configurer(_render.get_pelote())
	_input.clic_pelote.connect(_on_clic)

	_render.rafraichir(_state)
	_gallery.rafraichir(_state)


# Charge les 4 registres de contenu (03_WORLD/rules) au boot. Donnee pure lue une fois.
func load_registries() -> void:
	_reg = {
		"kittens": _lire_json(P.REG_KITTENS).get("kittens", []),
		"places": _lire_json(P.REG_PLACES).get("places", []),
		"objects": _lire_json(P.REG_OBJECTS).get("objects", []),
		"quests": _lire_json(P.REG_QUESTS).get("quests", []),
	}
	_kitten_ids = []
	for k in _reg["kittens"]:
		_kitten_ids.append(String(k.get("id", "")))


func _lire_json(chemin: String) -> Dictionary:
	if not FileAccess.file_exists(chemin):
		return {}
	var f := FileAccess.open(chemin, FileAccess.READ)
	if f == null:
		return {}
	var txt := f.get_as_text()
	f.close()
	var data = JSON.parse_string(txt)
	return data if data is Dictionary else {}


func _charger_textures() -> Dictionary:
	var tex: Dictionary = {}
	tex["wool_ball"] = Render.charger_texture("res://04_ASSETS/sprites/wool_ball.svg")
	tex["refuge"] = Render.charger_texture("res://04_ASSETS/sprites/refuge_start.svg")
	tex["garden"] = Render.charger_texture("res://04_ASSETS/sprites/place_garden_unlocked.svg")
	tex["pop"] = Render.charger_texture("res://04_ASSETS/sprites/click_feedback_pop.svg")
	tex["ui_frame"] = Render.charger_texture("res://04_ASSETS/sprites/ui_panel_frame.svg")
	for k in _reg.get("kittens", []):
		tex[String(k.get("id", ""))] = Render.charger_texture(String(k.get("sprite", "")))
	for o in _reg.get("objects", []):
		tex[String(o.get("id", ""))] = Render.charger_texture(String(o.get("icone", "")))
	return tex


func _process(delta: float) -> void:
	_accu += delta
	var change := false
	while _accu >= TICK_S:
		_accu -= TICK_S
		_tick += 1
		if _state.kittens.size() > 0:
			Economy.tick(_state)
			change = true
	if change:
		_render.rafraichir(_state)
		_gallery.rafraichir(_state)


# --- CANAL PUBLIC (memes appels que ceux du joueur ; utilise par input et les oracles) -----
func _on_clic() -> void:
	api_click()


func api_click() -> float:
	var gain: float = Economy.clic(_state)
	if _render != null:
		_render.montrer_pop()
		_render.rafraichir(_state)
	_emit(Events.pour_clic())
	return gain


func api_buy_kitten() -> Dictionary:
	var r: Dictionary = Economy.acheter_chaton(_state, _kitten_ids)
	if r.get("ok", false):
		_emit(Events.pour_achat(bool(r.get("unlocked_new", false))))
		if _render != null:
			_render.rafraichir(_state)
		if _gallery != null:
			_gallery.rafraichir(_state)
	return r


func api_buy_upgrade() -> Dictionary:
	var r: Dictionary = Upgrades.acheter(_state)
	if r.get("ok", false):
		_emit([P.EV_BUY])
		if _render != null:
			_render.rafraichir(_state)
	return r


func api_prestige() -> bool:
	var ok: bool = Prestige.effectuer(_state)
	if ok:
		_emit(Events.pour_prestige())
		if _render != null:
			_render.reset_chatons()
			_render.rafraichir(_state)
		if _gallery != null:
			_gallery.rafraichir(_state)
	return ok


func _emit(events: Array) -> void:
	if _audio != null:
		_audio.consommer(events, _tick)


func api_state():
	return _state


func get_render():
	return _render


func get_gallery():
	return _gallery
