# Tests de la regle des ronrons (increment strict au clic + production passive).
extends RefCounted

const GS := preload("res://05_SYSTEMS/core/game_state.gd")
const Purrs := preload("res://05_SYSTEMS/core/purrs.gd")

func run(t) -> void:
	var e = GS.nouvel_etat(6)
	t.eq(Purrs.gain_clic(e), 1.0, "gain clic de base 1")
	e["multiplicateur"] = 2.0
	t.eq(Purrs.gain_clic(e), 2.0, "gain clic double avec mult 2")
	e["multiplicateur"] = 1.0

	# increment STRICT au clic : +1 exactement, jamais >=.
	Purrs.clic(e)
	t.eq(float(e["ronrons"]), 1.0, "ronrons == 1 apres 1 clic")
	t.eq(float(e["cumul"]), 1.0, "cumul == 1 apres 1 clic")
	Purrs.clic(e)
	t.eq(float(e["ronrons"]), 2.0, "ronrons == 2 apres 2 clics")
	t.eq(float(e["cumul"]), 2.0, "cumul == 2 apres 2 clics")

	# taux de production passive
	var f = GS.nouvel_etat(6)
	t.eq(Purrs.taux(f), 0.0, "taux 0 sans producteur")
	f["chatons"] = 1
	t.eq(Purrs.taux(f), 0.2, "taux 0.2 avec 1 chaton")
	f["chatons"] = 0
	f["ameliorations"] = 1
	t.eq(Purrs.taux(f), 0.5, "taux 0.5 avec 1 amelioration")
	f["chatons"] = 1
	f["ameliorations"] = 1
	t.eq(Purrs.taux(f), 0.7, "taux 0.7 avec 1 chaton + 1 amelioration")
	f["multiplicateur"] = 2.0
	t.eq(Purrs.taux(f), 1.4, "taux double avec mult 2")
	f["multiplicateur"] = 1.0

	# tick passif accumule le taux (strictement croissant des qu'un producteur existe)
	var avant := float(f["ronrons"])
	Purrs.tick_passif(f)
	t.eq(float(f["ronrons"]) - avant, 0.7, "tick passif ajoute le taux aux ronrons")
	t.ok(float(f["ronrons"]) > avant, "ronrons strictement croissants au tick passif")
