# pelote.gd — entite pelote centrale AUTO-CONTENUE. C'est l'affordance de clic (un Control,
# groupe "affordance", nom "pelote") ET l'entite qui produit un REBOND visible dans la meme
# frame que le clic (fb_click_pelote_anim). Aucune regle de jeu : l'increment est decide par
# la logique ; ici on ne fait que rebondir.
extends Control

const DUREE := 0.25

var _tex: TextureRect
var _anim := false
var _t := 0.0

func _ready() -> void:
	if _tex == null:
		_tex = TextureRect.new()
		_tex.texture = load("res://04_ASSETS/sprites/wool_ball.svg")
		_tex.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		_tex.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_tex.set_anchors_preset(Control.PRESET_FULL_RECT)
		add_child(_tex)

# Declenche le rebond (appele dans la meme frame que le clic par le controleur de rendu).
func rebondir() -> void:
	_anim = true
	_t = 0.0

# Vrai tant que le rebond joue (lu par la preuve de reponse au clic).
func animation_jouee() -> bool:
	return _anim

func _process(delta: float) -> void:
	if not _anim:
		return
	_t += delta
	if _t >= DUREE:
		_anim = false
		if _tex != null:
			_tex.scale = Vector2.ONE
		return
	if _tex != null:
		_tex.pivot_offset = _tex.size / 2.0
		var s := 1.0 + 0.25 * sin(_t / DUREE * PI)
		_tex.scale = Vector2(s, s)
