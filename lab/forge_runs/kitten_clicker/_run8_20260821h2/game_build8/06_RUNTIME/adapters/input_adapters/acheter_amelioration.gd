# acheter_amelioration.gd — ADAPTATEUR D'ENTREE (categorie `system.adapter`).
# Affordance `acheter_amelioration`.
#
# Une seule affordance couvre les deux faces de l'"amelioration du refuge"
# (blueprint : feat_achat_amelioration + feat_deblocage_lieu) :
#   - DELEGUE a `rule.upgrade_rate` (Upgrade.buy_upgrade) : releve le taux ;
#   - DELEGUE a `rule.meta_unlock` (MetaUnlock.unlock) : debloque un nouveau lieu.
# Chaque regle s'applique independamment si elle est finançable. L'adaptateur ne
# calcule rien : il rapporte au controleur si un deblocage a eu lieu (pour faire
# APPARAITRE le jardin).
extends Button

const Upgrade = preload("res://05_SYSTEMS/economy/upgrade.gd")
const MetaUnlock = preload("res://05_SYSTEMS/economy/meta_unlock.gd")

signal acted(upgraded: bool, unlocked: bool)

var _state: Dictionary = {}


func _ready() -> void:
	add_to_group("affordance")
	pressed.connect(_on_pressed)


func bind(state: Dictionary) -> void:
	_state = state


func _on_pressed() -> void:
	var upgraded: bool = Upgrade.buy_upgrade(_state)
	var unlocked: bool = MetaUnlock.unlock(_state)
	acted.emit(upgraded, unlocked)
