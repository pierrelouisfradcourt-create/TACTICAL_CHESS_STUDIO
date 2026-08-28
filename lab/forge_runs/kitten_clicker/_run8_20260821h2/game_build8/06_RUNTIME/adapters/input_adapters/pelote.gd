# pelote.gd — ADAPTATEUR D'ENTREE (categorie `system.adapter`). Affordance `pelote`.
#
# Capte le geste (clic) sur la scene reelle et le DELEGUE a la regle pure
# `rule.click_ronron` (ClickEconomy.click). Ne calcule aucune economie lui-meme :
# il applique la regle sur l'etat partage puis previent le controleur (signal).
#
# C'est un Control (TextureButton) place au centre, dans le groupe "affordance" et
# nomme "pelote" : le bot-joueur generique (player_loop.gd) le trouve par son groupe
# et son nom, et l'actionne par un vrai InputEvent.
extends TextureButton

const ClickEconomy = preload("res://05_SYSTEMS/economy/click_economy.gd")

signal acted(ok: bool, gain: float)

var _state: Dictionary = {}


func _ready() -> void:
	add_to_group("affordance")
	pressed.connect(_on_pressed)


func bind(state: Dictionary) -> void:
	_state = state


func _on_pressed() -> void:
	var gain: float = ClickEconomy.click(_state)
	acted.emit(true, gain)
