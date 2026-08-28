# auto.gd — production automatique (capacite production.auto, couvre R4).
#
# Depend UNIQUEMENT de game_state. Un tick fait monter le compteur du taux agrege,
# sans aucune interaction du joueur.
extends RefCounted


# Un tick de production : ajoute le taux agrege courant au compteur. Rend le gain.
static func tick_production(state) -> float:
	var gain: float = state.aggregate_rate()
	state.ronrons += gain
	return gain


# T ticks consecutifs. Rend le gain total. Boucle bornee et deterministe.
static func run_ticks(state, ticks: int) -> float:
	var total: float = 0.0
	for _i in range(ticks):
		total += tick_production(state)
	return total
