# click_response.gd — reponse au clic cote rendu (clk_click_response). Couple, dans la meme
# frame, le rebond de la pelote (entite) et un pop de feedback visuel. LIT l'etat, ne calcule
# aucun gain (l'increment est decide par la logique).
extends Node

const DUREE := 0.35

var _feedback: TextureRect
var _t := 0.0
var _actif := false

func construire(parent: Control) -> void:
	_feedback = TextureRect.new()
	_feedback.texture = load("res://04_ASSETS/sprites/click_feedback_pop.svg")
	_feedback.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_feedback.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_feedback.position = Vector2(300, 176)
	_feedback.size = Vector2(64, 64)
	_feedback.visible = false
	parent.add_child(_feedback)

# Reagit a un clic sur la pelote : rebond + pop de feedback (meme frame que le clic).
func reagir_au_clic(pelote) -> void:
	if pelote != null and pelote.has_method("rebondir"):
		pelote.rebondir()
	_actif = true
	_t = 0.0
	if _feedback != null:
		_feedback.visible = true
		_feedback.modulate.a = 1.0

func _process(delta: float) -> void:
	if not _actif:
		return
	_t += delta
	if _t >= DUREE:
		_actif = false
		if _feedback != null:
			_feedback.visible = false
		return
	if _feedback != null:
		_feedback.modulate.a = 1.0 - _t / DUREE
