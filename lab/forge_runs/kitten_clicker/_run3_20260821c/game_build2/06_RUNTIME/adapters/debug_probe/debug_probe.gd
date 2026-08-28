# debug_probe.gd — adaptateur `debug_probe` (blueprint s4-archi). Expose a un lecteur EXTERIEUR
# au runtime, tick par tick, le releve observable de l'etat (compteur, producteurs,
# multiplicateur, taille et etats de la collection). Sans ce point de sortie, l'exigence R3
# (monotonie de la collection, aucun game_over) n'a aucun observateur et n'est pas verifiable.
#
# Ne calcule RIEN : recopie la projection pure de game_state. Deps (blueprint) : game_state.
extends RefCounted

const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")

# Releve observable complet a un instant (copie de la projection pure).
static func read(state) -> Dictionary:
	return GameState.project(state)

# Taille de collection lue par un observateur exterieur (le chiffre que R3 surveille).
static func collection_size(state) -> int:
	return int(GameState.project(state)["collection_size"])

# Un releve porte-t-il un etat de defaite ? (toujours false — R3)
static func has_game_over(state) -> bool:
	return bool(GameState.project(state)["game_over"])
