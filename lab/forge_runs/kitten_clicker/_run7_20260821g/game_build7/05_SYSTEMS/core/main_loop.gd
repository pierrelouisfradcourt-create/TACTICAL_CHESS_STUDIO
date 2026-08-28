# main_loop.gd — boucle de jeu PURE et DETERMINISTE (core.main_loop, prod_passive_ronrons).
# Meme etat + meme n -> meme etat suivant : la production passive avance l'etat sans aucune
# source d'alea ni de temps (le nombre de ticks est decide par l'adaptateur, jamais ici).
extends RefCounted

const Purrs := preload("res://05_SYSTEMS/core/purrs.gd")

# Avance l'etat de n ticks de production passive (deterministe).
static func avancer(e: Dictionary, n: int) -> void:
	var i := 0
	while i < n:
		Purrs.tick_passif(e)
		i += 1
