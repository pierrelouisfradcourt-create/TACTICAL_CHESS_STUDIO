# click.gd — production par clic (capacite production.click, couvre R1).
#
# Depend UNIQUEMENT de game_state (par duck-typing sur l'etat passe) — jamais de
# rendu ni d'entree : l'adaptateur d'entree (06_RUNTIME/adapters/input) route un clic
# vers on_click(), mais ce systeme ignore d'ou vient l'appel.
extends RefCounted


# Un clic ajoute exactement click_value() au compteur. Rend le gain applique (jamais
# un booleen nu) pour qu'un observateur puisse verifier l'increment exact.
static func on_click(state) -> float:
	var gain: float = state.click_value()
	state.ronrons += gain
	return gain
