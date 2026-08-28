# progression.gd — regle PURE de progression : objectif courant (permanent, change au
# franchissement d'un palier vers un seuil superieur) et palier courant. La solvabilite
# (prog_solvability) est prouvee par un bot pilotant main.tscn (solvability.gd).
extends RefCounted

const GS := preload("res://05_SYSTEMS/core/game_state.gd")
const Paliers := preload("res://05_SYSTEMS/core/paliers.gd")

const OBJECTIF_FINAL := "Refuge accompli : ronronne a l'infini !"

# Texte d'objectif courant : viser le prochain seuil de palier non atteint. Non vide au
# boot, il change (vers un seuil superieur) quand le cumul franchit un palier.
static func objectif_courant(e: Dictionary) -> String:
	var cumul := float(e["cumul"])
	var suivant := Paliers.prochain_seuil(cumul)
	if suivant < 0.0:
		return OBJECTIF_FINAL
	return "Atteins %d ronrons cumules (palier %d)" % [int(suivant), Paliers.palier(cumul) + 1]

# Palier courant (delegue a la courbe de paliers).
static func palier_courant(e: Dictionary) -> int:
	return Paliers.palier(float(e["cumul"]))
