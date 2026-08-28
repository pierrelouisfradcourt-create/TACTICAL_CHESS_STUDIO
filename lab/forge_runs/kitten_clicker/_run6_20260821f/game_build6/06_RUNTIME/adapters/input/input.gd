# input.gd — ADAPTATEUR D'ENTREE : capture le clic sur la pelote et le traduit en une
# INTENTION, sans jamais toucher a l'economie (direction input -> logique uniquement).
#
# L'adaptateur ne connait ni ronrons, ni cout, ni taux : il constate "un clic gauche est
# tombe sur la pelote" et EMET un signal. C'est la racine de composition (runtime) qui route
# ce signal vers l'API de 05_SYSTEMS. Ainsi aucune regle d'economie ne vit ici.
extends Node

const Pelote = preload("res://02_ENTITIES/wool_ball/wool_ball.gd")

# Emis quand un clic gauche tombe sur la pelote centrale.
signal clic_pelote

var _pelote: Node = null


func configurer(pelote: Node) -> void:
	_pelote = pelote


# Traduit une entree brute en intention. Le clic injecte par la sonde runtime_alive
# (InputEventMouseButton au centre de l'ecran) passe par ici.
func _unhandled_input(event: InputEvent) -> void:
	if _pelote == null:
		return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if _pelote.contient(event.position):
			clic_pelote.emit()
