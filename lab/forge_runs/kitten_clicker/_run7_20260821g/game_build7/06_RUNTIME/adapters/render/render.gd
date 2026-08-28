# render.gd — ADAPTATEUR DE RENDU + ASSEMBLEUR (le "GameController" du jeu). C'est la scene
# racine (res://main.tscn). Il TIENT l'etat de jeu pur, ASSEMBLE la scene (fond, HUD, refuge,
# quetes, pelote, boutons d'achat, feedback, audio, entree), fait tourner la production
# passive dans _process, et route les evenements joueur vers l'audio et la vue. Il LIT l'etat,
# ne decide d'AUCUNE regle (core.render : l'affichage change quand l'etat change).
extends Control

const Boot := preload("res://05_SYSTEMS/core/boot.gd")
const GameState := preload("res://05_SYSTEMS/core/game_state.gd")
const Progression := preload("res://05_SYSTEMS/core/progression.gd")
const Purrs := preload("res://05_SYSTEMS/core/purrs.gd")
const Shop := preload("res://05_SYSTEMS/core/shop.gd")
const LoopSys := preload("res://05_SYSTEMS/core/main_loop.gd")

const InputAdapter := preload("res://06_RUNTIME/adapters/input/input.gd")
const Audio := preload("res://06_RUNTIME/adapters/audio/audio.gd")
const PeloteScene := preload("res://02_ENTITIES/entities/pelote.gd")
const Hud := preload("res://06_RUNTIME/adapters/render/hud.gd")
const RefugeView := preload("res://06_RUNTIME/adapters/render/refuge_view.gd")
const QuestPanel := preload("res://06_RUNTIME/adapters/render/quest_panel.gd")
const ClickResponse := preload("res://06_RUNTIME/adapters/render/click_response.gd")
const AppLifecycle := preload("res://06_RUNTIME/adapters/render/app_lifecycle.gd")

var etat: Dictionary = {}
var _registres := {}
var _hud
var _refuge
var _quetes
var _click
var _input
var _pelote: Control
var _fond: TextureRect
var _boutons := {}
var _types_affiches := 0
var _tick := 0

func _ready() -> void:
	assembler()

# Assemble la scene JOUABLE complete et cable les entrees, l'audio et la vue.
func assembler() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_registres = _charger_registres()
	Audio.reinitialiser()
	etat = Boot.etat_initial(_nb_types())
	_construire_fond()
	_hud = Hud.new(); add_child(_hud); _hud.construire(self)
	_refuge = RefugeView.new(); add_child(_refuge); _refuge.construire(self)
	_quetes = QuestPanel.new(); add_child(_quetes); _quetes.construire(self, _registres.get("quests", []))
	_click = ClickResponse.new(); add_child(_click); _click.construire(self)
	_construire_pelote()
	_construire_boutons()
	Audio.brancher_lecteur(self)
	_input = InputAdapter.new(); add_child(_input); _input.etat = etat
	_cabler_entrees()
	add_child(AppLifecycle.new())
	_rafraichir()

func _process(_delta: float) -> void:
	_tick += 1
	LoopSys.avancer(etat, 1)  # production passive deterministe : 1 tick / frame
	_rafraichir()

# --- entrees ---
func _cabler_entrees() -> void:
	_input.brancher(_pelote, "pelote")
	_input.brancher(_boutons["acheter_chaton"], "acheter_chaton")
	_input.brancher(_boutons["acheter_amelioration"], "acheter_amelioration")
	_input.brancher(_boutons["prestige"], "prestige")
	_input.action_effectuee.connect(_sur_action)

# Route une action joueur vers l'audio et la vue (jamais une regle : la logique a deja agi).
func _sur_action(action: String, effet: bool) -> void:
	match action:
		"pelote":
			Audio.jouer("clic", _tick)
			_click.reagir_au_clic(_pelote)
		"acheter_chaton":
			if effet:
				Audio.jouer("achat", _tick)
				_spawn_prochain_chaton()
		"acheter_amelioration":
			if effet:
				Audio.jouer("achat", _tick)
		"prestige":
			if effet:
				Audio.jouer("prestige", _tick)
				_debloquer_jardin()
	_rafraichir()

# Fait apparaitre le chaton correspondant au dernier TYPE distinct acquis (deblocage).
func _spawn_prochain_chaton() -> void:
	var chatons: Array = _registres.get("kittens", [])
	if int(etat["types"]) > _types_affiches and _types_affiches < chatons.size():
		var k = chatons[_types_affiches]
		_refuge.ajouter_chaton(String(k.get("sprite", "")), String(k.get("rarete", "common")))
		_types_affiches += 1
		Audio.jouer("deblocage", _tick)

# Le prestige debloque le second lieu : le decor passe au jardin (lieux 1->2, deblocage).
func _debloquer_jardin() -> void:
	if int(etat["lieux"]) >= 2 and _fond != null:
		var t = load("res://04_ASSETS/sprites/place_garden_unlocked.svg")
		if t is Texture2D:
			_fond.texture = t
		Audio.jouer("deblocage", _tick)

# --- vue ---
func _rafraichir() -> void:
	if _hud != null:
		_hud.rafraichir({
			"objectif": Progression.objectif_courant(etat),
			"ronrons": etat["ronrons"],
			"taux": Purrs.taux(etat),
			"collection": GameState.collection_texte(etat),
			"lieux": etat["lieux"],
			"palier": Progression.palier_courant(etat),
		})
	if _quetes != null:
		_quetes.afficher_quetes(etat)
	_maj_couts()

# Le cout du prochain achat est lisible a cote de chaque affordance (guidage).
func _maj_couts() -> void:
	if _boutons.has("acheter_chaton"):
		_boutons["acheter_chaton"].get_node("Label").text = "Adopter un chaton  (%d ronrons)" % ceili(Shop.cout_chaton(etat))
	if _boutons.has("acheter_amelioration"):
		_boutons["acheter_amelioration"].get_node("Label").text = "Ameliorer la prod  (%d ronrons)" % ceili(Shop.cout_amelioration(etat))
	if _boutons.has("prestige"):
		_boutons["prestige"].get_node("Label").text = "Prestige  (palier 3 requis)"

# --- construction ---
func _construire_fond() -> void:
	_fond = TextureRect.new()
	_fond.texture = load("res://04_ASSETS/sprites/refuge_start.svg")
	_fond.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fond.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_fond)

func _construire_pelote() -> void:
	_pelote = PeloteScene.new()
	_pelote.name = "pelote"
	_pelote.add_to_group("affordance")
	_pelote.position = Vector2(260, 180)
	_pelote.size = Vector2(120, 120)
	_pelote.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(_pelote)

func _construire_boutons() -> void:
	_creer_bouton("acheter_chaton", Vector2(10, 344))
	_creer_bouton("acheter_amelioration", Vector2(10, 380))
	_creer_bouton("prestige", Vector2(10, 416))

func _creer_bouton(nom: String, pos: Vector2) -> void:
	var b := Control.new()
	b.name = nom
	b.add_to_group("affordance")
	b.position = pos
	b.size = Vector2(300, 30)
	b.mouse_filter = Control.MOUSE_FILTER_STOP
	var fond := ColorRect.new()
	fond.color = Color(0.66, 0.85, 0.78)
	fond.set_anchors_preset(Control.PRESET_FULL_RECT)
	fond.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(fond)
	var l := Label.new()
	l.name = "Label"
	l.position = Vector2(8, 4)
	l.add_theme_color_override("font_color", Color(0.29, 0.29, 0.33))
	l.add_theme_font_size_override("font_size", 14)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(l)
	add_child(b)
	_boutons[nom] = b

# --- registres de contenu (charges au boot) ---
func _charger_registres() -> Dictionary:
	return {
		"kittens": _lire_json("res://03_WORLD/rules/content/kittens.json", "kittens"),
		"locations": _lire_json("res://03_WORLD/rules/content/locations.json", "locations"),
		"objects": _lire_json("res://03_WORLD/rules/content/objects.json", "objects"),
		"quests": _lire_json("res://03_WORLD/rules/content/quests.json", "quests"),
	}

func _lire_json(chemin: String, cle: String) -> Array:
	if not FileAccess.file_exists(chemin):
		return []
	var texte := FileAccess.get_file_as_string(chemin)
	var parsed = JSON.parse_string(texte)
	if parsed is Dictionary and parsed.get(cle) is Array:
		return parsed[cle]
	return []

func _nb_types() -> int:
	return int(_registres.get("kittens", []).size())

# --- inspection observable (lue par les oracles produits via main.tscn, jamais 05_SYSTEMS) ---
func phase_courante() -> String:
	return GameState.phase(etat)

func etats_possibles() -> Array:
	return GameState.phases_possibles()

func nb_chatons_affiches() -> int:
	return _refuge.nb_chatons_affiches() if _refuge != null else 0
