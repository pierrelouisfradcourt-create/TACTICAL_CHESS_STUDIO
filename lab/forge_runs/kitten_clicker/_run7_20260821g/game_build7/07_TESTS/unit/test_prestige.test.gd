# Tests du cycle de prestige (deblocage lieu + bonus permanent + reset ronrons courants).
extends RefCounted

const GS := preload("res://05_SYSTEMS/core/game_state.gd")
const Prestige := preload("res://05_SYSTEMS/core/prestige.gd")

func run(t) -> void:
	var e = GS.nouvel_etat(6)
	# borne STRICTE du seuil de prestige.
	e["cumul"] = 29.99
	t.ok(Prestige.peut_prestige(e) == false, "prestige indisponible sous 30")
	e["cumul"] = 30.0
	t.ok(Prestige.peut_prestige(e) == true, "prestige disponible a 30")
	e["cumul"] = 45.0
	t.ok(Prestige.peut_prestige(e) == true, "prestige disponible au-dela de 30")

	# prestige refuse quand indisponible : aucun changement.
	var f = GS.nouvel_etat(6)
	f["cumul"] = 10.0
	f["ronrons"] = 8.0
	t.ok(Prestige.prestige(f) == false, "prestige refuse sous le seuil")
	t.eq(float(f["ronrons"]), 8.0, "ronrons inchanges apres refus prestige")
	t.ok(int(f["prestige"]) == 0, "compteur prestige inchange apres refus")

	# prestige effectue : mult *1.5 (strict), lieux 1->2, ronrons COURANTS remis a la base,
	# bonus permanent conserve.
	var g = GS.nouvel_etat(6)
	g["cumul"] = 40.0
	g["ronrons"] = 40.0
	var mult_avant := float(g["multiplicateur"])
	t.ok(Prestige.prestige(g) == true, "prestige effectue au seuil")
	t.ok(int(g["prestige"]) == 1, "compteur prestige == 1")
	t.eq(float(g["multiplicateur"]), 1.5, "multiplicateur *1.5 apres prestige")
	t.ok(float(g["multiplicateur"]) > mult_avant, "multiplicateur STRICTEMENT superieur (bonus permanent)")
	t.eq(float(g["ronrons"]), 0.0, "ronrons courants remis a la base")
	t.ok(int(g["lieux"]) == 2, "second lieu debloque (1->2)")

	# 2e prestige : mult 1.5->2.25, lieux plafonne a 2.
	g["cumul"] = 100.0
	t.ok(Prestige.prestige(g) == true, "2e prestige effectue")
	t.eq(float(g["multiplicateur"]), 2.25, "multiplicateur 2.25 apres 2 prestiges")
	t.ok(int(g["lieux"]) == 2, "lieux plafonne a 2")

	# reset_courant remet uniquement les ronrons courants.
	var h = GS.nouvel_etat(6)
	h["ronrons"] = 50.0
	h["cumul"] = 50.0
	Prestige.reset_courant(h)
	t.eq(float(h["ronrons"]), 0.0, "reset_courant : ronrons a 0")
	t.eq(float(h["cumul"]), 50.0, "reset_courant : cumul conserve")
