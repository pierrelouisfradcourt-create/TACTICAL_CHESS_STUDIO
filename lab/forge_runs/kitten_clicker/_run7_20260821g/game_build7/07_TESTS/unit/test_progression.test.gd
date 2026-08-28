# Tests de la progression (objectif courant permanent + palier courant).
extends RefCounted

const GS := preload("res://05_SYSTEMS/core/game_state.gd")
const Progression := preload("res://05_SYSTEMS/core/progression.gd")

func run(t) -> void:
	var e = GS.nouvel_etat(6)
	var obj0 := Progression.objectif_courant(e)
	t.ok(obj0 != "", "objectif non vide au boot")
	t.ok(obj0.find("5") != -1, "objectif initial cite le seuil 5")
	t.ok(obj0.find("palier 1") != -1, "objectif initial cite palier 1")

	# l'objectif CHANGE vers un seuil superieur au franchissement d'un palier.
	e["cumul"] = 5.0
	var obj1 := Progression.objectif_courant(e)
	t.ok(obj1 != obj0, "objectif change apres franchissement du 1er palier")
	t.ok(obj1.find("15") != -1, "objectif suivant cite le seuil 15")
	t.ok(obj1.find("palier 2") != -1, "objectif suivant cite palier 2")

	e["cumul"] = 15.0
	t.ok(Progression.objectif_courant(e).find("30") != -1, "objectif cite le seuil 30 au palier 2")

	# tous seuils atteints -> objectif final.
	e["cumul"] = 30.0
	t.ok(Progression.objectif_courant(e) == Progression.OBJECTIF_FINAL, "objectif final quand tous seuils atteints")

	# palier courant delegue a la courbe.
	t.ok(Progression.palier_courant(GS.nouvel_etat(6)) == 0, "palier courant 0 a cumul 0")
	var p = GS.nouvel_etat(6)
	p["cumul"] = 30.0
	t.ok(Progression.palier_courant(p) == 3, "palier courant 3 a cumul 30")
