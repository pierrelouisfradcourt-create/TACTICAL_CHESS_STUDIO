# Tests du demarrage (etat initial observable + objectif non vide au boot).
extends RefCounted

const GS := preload("res://05_SYSTEMS/core/game_state.gd")
const Boot := preload("res://05_SYSTEMS/core/boot.gd")

func run(t) -> void:
	var e = Boot.etat_initial(6)
	t.eq(float(e["ronrons"]), 0.0, "etat initial ronrons 0")
	t.ok(int(e["nb_types"]) == 6, "etat initial nb_types 6")
	t.ok(String(e["phase"]) == "jeu", "etat initial phase jeu")
	t.ok(GS.etat_valide(e) == true, "etat initial valide")

	var obj := Boot.objectif_initial(e)
	t.ok(obj != "", "objectif initial non vide (HUD observable au boot)")
	t.ok(obj.find("palier 1") != -1, "objectif initial guide vers palier 1")
