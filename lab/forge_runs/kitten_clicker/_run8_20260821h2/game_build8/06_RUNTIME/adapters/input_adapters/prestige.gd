# prestige.gd — ADAPTATEUR D'ENTREE (categorie `system.adapter`). Affordance `prestige`.
#
# Capte le clic et le DELEGUE a la regle pure `rule.prestige` (Prestige.prestige).
# Ne calcule rien ; rapporte au controleur si le prestige a eu lieu (pour vider la
# collection affichee et rafraichir).
extends Button

const Prestige = preload("res://05_SYSTEMS/economy/prestige.gd")

signal acted(ok: bool)

var _state: Dictionary = {}


func _ready() -> void:
	add_to_group("affordance")
	pressed.connect(_on_pressed)


func bind(state: Dictionary) -> void:
	_state = state


func _on_pressed() -> void:
	var ok: bool = Prestige.prestige(_state)
	acted.emit(ok)
