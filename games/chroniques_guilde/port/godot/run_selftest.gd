# =============================================================================
#  run_selftest.gd — LANCEUR EN LIGNE DE COMMANDE (Godot 4)
#  Chroniques de Guilde · portage. Date : 2026-09-19.
#
#  Pourquoi ce fichier : `det_selftest.gd` étend Node, donc il se lance à la
#  souris (scène vide + F6). Pour `godot --script`, Godot veut une boucle
#  principale, c'est-à-dire un SceneTree. Ce lanceur est cette boucle, et il
#  ne fait rien d'autre qu'appeler `run_all()` sur le banc.
#
#  Usage, depuis games/chroniques_guilde/port/godot/ :
#      godot --headless --script run_selftest.gd
#  Sortie attendue : « 58/58 — PRIMITIVES CONFORMES », code de sortie 0.
#  Le premier échec nomme la primitive qui diverge : c'est là que le portage
#  casse, et il casse en silence si on ne le regarde pas.
#
#  ---------------------------------------------------------------------------
#  CE FICHIER N'A PAS ÉTÉ EXÉCUTÉ (pas de Godot sur la machine d'écriture).
#  Si `--script` refuse le projet, le chemin à la souris marche toujours :
#  ouvre ce dossier comme projet, pose `det_selftest.gd` sur un Node, F6.
#  ---------------------------------------------------------------------------
# =============================================================================
extends SceneTree

func _initialize() -> void:
	var banc: Object = (load("res://det_selftest.gd") as GDScript).new()
	banc.run_all()
	quit(0 if banc.failures() == 0 else 1)
