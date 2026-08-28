# app_lifecycle.gd — cycle de vie applicatif (core.exit). Le jeu peut etre quitte proprement
# (code de sortie 0, aucune ressource laissee active). Adaptateur : ne detient aucune regle.
extends Node

# Quitte le jeu proprement avec le code de sortie declare.
func quitter() -> void:
	get_tree().quit(code_sortie())

# Code de sortie applicatif (0 = sortie propre).
func code_sortie() -> int:
	return 0
