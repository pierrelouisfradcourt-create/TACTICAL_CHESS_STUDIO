# Tests de la regle pure game_state (etat neuf + invariant no-defeat).
extends RefCounted

const GS := preload("res://05_SYSTEMS/core/game_state.gd")

func run(t) -> void:
	var e = GS.nouvel_etat(6)
	t.eq(float(e["ronrons"]), 0.0, "etat neuf ronrons 0")
	t.eq(float(e["cumul"]), 0.0, "etat neuf cumul 0")
	t.ok(int(e["chatons"]) == 0, "etat neuf chatons 0")
	t.ok(int(e["types"]) == 0, "etat neuf types 0")
	t.ok(int(e["nb_types"]) == 6, "etat neuf nb_types 6")
	t.ok(int(e["ameliorations"]) == 0, "etat neuf ameliorations 0")
	t.ok(int(e["prestige"]) == 0, "etat neuf prestige 0")
	t.eq(float(e["multiplicateur"]), 1.0, "etat neuf multiplicateur 1")
	t.ok(int(e["lieux"]) == 1, "etat neuf lieux 1")
	t.ok(String(e["phase"]) == "jeu", "etat neuf phase jeu")

	t.ok(GS.nouvel_etat(-3)["nb_types"] == 0, "nb_types negatif borne a 0")

	# invariant no-defeat
	t.ok(GS.phases_possibles() == ["jeu"], "phases possibles = [jeu]")
	t.ok(GS.phases_possibles().size() == 1, "une seule phase possible")
	t.ok(GS.est_defaite(e) == false, "etat neuf non defaite")
	t.ok(GS.est_defaite({"phase": "defeat"}) == true, "phase defeat = defaite")
	t.ok(GS.est_defaite({"phase": "game_over"}) == true, "phase game_over = defaite")
	t.ok(GS.est_defaite({"phase": "jeu"}) == false, "phase jeu non defaite")
	t.ok(GS.phase(e) == "jeu", "phase() lit jeu")

	t.ok(GS.etat_valide(e) == true, "etat neuf valide")
	t.ok(GS.etat_valide({"phase": "defeat", "ronrons": 0.0, "cumul": 0.0}) == false, "defeat invalide")
	t.ok(GS.etat_valide({"phase": "jeu", "ronrons": -1.0, "cumul": 0.0}) == false, "ronrons negatifs invalides")
	t.ok(GS.etat_valide({"phase": "jeu", "ronrons": 0.0, "cumul": -1.0}) == false, "cumul negatif invalide")

	t.ok(GS.collection_texte(e) == "0/6", "collection 0/6")
	e["types"] = 2
	t.ok(GS.collection_texte(e) == "2/6", "collection 2/6")
