# acheter_chaton.gd — ADAPTATEUR D'ENTREE (categorie `system.adapter`).
# Affordance `acheter_chaton`.
#
# Capte le clic et le DELEGUE a la regle pure `rule.buy_kitten`
# (PurchaseKitten.buy). Ne porte aucun calcul d'economie ; il rapporte au
# controleur si l'adoption a eu lieu (pour faire apparaitre le sprite du chaton).
extends Button

const PurchaseKitten = preload("res://05_SYSTEMS/economy/purchase_kitten.gd")

signal acted(ok: bool)

var _state: Dictionary = {}


func _ready() -> void:
	add_to_group("affordance")
	pressed.connect(_on_pressed)


func bind(state: Dictionary) -> void:
	_state = state


func _on_pressed() -> void:
	var ok: bool = PurchaseKitten.buy(_state)
	acted.emit(ok)
