# boot.gd — demarrage PUR (core.boot). Produit l'etat initial observable : des le boot,
# le HUD objectif est non vide (prog_objective_permanent).
extends RefCounted

const GS := preload("res://05_SYSTEMS/core/game_state.gd")
const Progression := preload("res://05_SYSTEMS/core/progression.gd")

# Etat initial du jeu (aucune intervention humaine requise).
static func etat_initial(nb_types: int) -> Dictionary:
	return GS.nouvel_etat(nb_types)

# Objectif affiche des l'ouverture (non vide).
static func objectif_initial(e: Dictionary) -> String:
	return Progression.objectif_courant(e)
