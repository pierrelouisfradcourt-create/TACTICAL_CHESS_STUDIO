# runtime_loop.gd — adaptateur `runtime_loop` (blueprint s4-archi). POINT D'ENTREE runtime
# explicite : amorce l'application SUR LA SCENE PRINCIPALE, sans ecran de configuration
# bloquant — le chaton central est cliquable des la fin du chargement. Convertit le temps du
# moteur en pas de temps remis au tick PUR. SEUL endroit ou l'horloge du moteur pilote le tick.
#
# Deps (blueprint) : game_state, input_adapter, main_screen, gallery_view, persistence,
# bonus_event. La logique de jeu vit dans les systemes purs ; cet adaptateur ne fait que cadencer,
# router les intentions (via input_adapter) et rendre (via les vues). Le noyau `boot_state` est
# PUR et teste headless (R10).
extends Control

const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")
const InputAdapter = preload("res://06_RUNTIME/adapters/input_adapter/input_adapter.gd")
const MainScreen = preload("res://06_RUNTIME/adapters/main_screen/main_screen.gd")
const GalleryView = preload("res://06_RUNTIME/adapters/gallery_view/gallery_view.gd")
const Persistence = preload("res://06_RUNTIME/adapters/persistence/persistence.gd")
const BonusEvent = preload("res://05_SYSTEMS/bonus_event/bonus_event.gd")

const SEED_DEMARRAGE := 1
const FEEDBACK_TTL_S := 0.6   # duree d'affichage du feedback flottant apres un clic

var _state
var _main: Control
var _gallery: Control
var _fb_timer: float = 0.0

# --- NOYAU PUR (teste headless — R10) ---
# Etat initial JOUABLE immediatement : aucun menu, aucun ecran de config. Le premier clic
# produit deja un gain. C'est ce que _ready amorce.
static func boot_state(seed_value: int):
	return GameState.initial(seed_value)

# --- AMORCAGE / CADENCE (partie runtime) ---

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_state = boot_state(SEED_DEMARRAGE)
	_main = MainScreen.new()
	_main.name = "MainScreen"
	_main.set_anchors_preset(Control.PRESET_FULL_RECT)
	_main.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_main)
	_gallery = GalleryView.new()
	_gallery.name = "GalleryView"
	_gallery.set_anchors_preset(Control.PRESET_FULL_RECT)
	_gallery.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_gallery.visible = false
	add_child(_gallery)
	_render()

func _process(delta: float) -> void:
	# Le temps du moteur devient le pas de temps du tick pur (production passive, bonus).
	_state = GameState.tick(_state, delta)
	if _fb_timer > 0.0:
		_fb_timer -= delta
		if _fb_timer <= 0.0 and _main != null:
			_main.clear_feedback()
	_render()

func _render() -> void:
	if _main != null:
		_main.render(GameState.project(_state))
	if _gallery != null:
		_gallery.render(GameState.project(_state))

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var intention: int = InputAdapter.intention_from_click(event.position, MainScreen.focal_rect())
		_apply_intention(intention, 0)

func _apply_intention(intention: int, arg: int) -> void:
	_state = InputAdapter.apply(_state, intention, arg)
	if intention == InputAdapter.Intention.CARESSER and _main != null:
		_main.flash_feedback(_state.gain_par_clic())
		_fb_timer = FEEDBACK_TTL_S
	_render()

# --- Helpers pour les volets visuels (R9/R5) : pilotage deterministe hors input reel ---

func simulate_caresse() -> void:
	_apply_intention(InputAdapter.Intention.CARESSER, 0)

func show_gallery(v: bool) -> void:
	if _gallery != null:
		_gallery.visible = v
	if _main != null:
		_main.visible = not v

func etat_observable() -> Dictionary:
	return GameState.project(_state)
