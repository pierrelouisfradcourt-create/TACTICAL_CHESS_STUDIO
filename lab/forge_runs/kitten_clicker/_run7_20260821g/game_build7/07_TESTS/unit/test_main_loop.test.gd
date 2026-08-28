# Tests de la boucle deterministe (production passive avancee de n ticks).
extends RefCounted

const GS := preload("res://05_SYSTEMS/core/game_state.gd")
const LoopSys := preload("res://05_SYSTEMS/core/main_loop.gd")

func run(t) -> void:
	var e = GS.nouvel_etat(6)
	e["chatons"] = 1  # taux 0.2 / tick
	LoopSys.avancer(e, 5)
	t.eq(float(e["ronrons"]), 1.0, "5 ticks * 0.2 = 1.0 ronrons")
	t.eq(float(e["cumul"]), 1.0, "5 ticks * 0.2 = 1.0 cumul")

	# n == 0 -> aucun changement.
	var f = GS.nouvel_etat(6)
	f["chatons"] = 3
	LoopSys.avancer(f, 0)
	t.eq(float(f["ronrons"]), 0.0, "0 tick n'avance rien")

	# DETERMINISME : meme etat + meme n -> meme etat.
	var a = GS.nouvel_etat(6)
	a["chatons"] = 2
	a["ameliorations"] = 1
	var b = GS.nouvel_etat(6)
	b["chatons"] = 2
	b["ameliorations"] = 1
	LoopSys.avancer(a, 10)
	LoopSys.avancer(b, 10)
	t.eq(float(a["ronrons"]), float(b["ronrons"]), "meme etat + meme n -> meme ronrons")
	t.eq(float(a["cumul"]), float(b["cumul"]), "meme etat + meme n -> meme cumul")
	t.eq(float(a["ronrons"]), 9.0, "10 ticks * (0.4+0.5) = 9.0")
