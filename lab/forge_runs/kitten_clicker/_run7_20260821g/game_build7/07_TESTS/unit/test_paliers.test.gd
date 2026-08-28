# Tests de la courbe de paliers (regle de variance des metriques).
extends RefCounted

const Paliers := preload("res://05_SYSTEMS/core/paliers.gd")

func run(t) -> void:
	t.ok(Paliers.seuils() == [5.0, 15.0, 30.0], "seuils = [5,15,30]")
	t.ok(Paliers.seuils().size() == 3, "3 seuils")

	# palier = nombre de seuils atteints (bornes STRICTES, jamais un >= tautologique).
	t.ok(Paliers.palier(0.0) == 0, "palier 0 a cumul 0")
	t.ok(Paliers.palier(4.99) == 0, "palier 0 juste sous 5")
	t.ok(Paliers.palier(5.0) == 1, "palier 1 a 5 (seuil atteint)")
	t.ok(Paliers.palier(14.99) == 1, "palier 1 juste sous 15")
	t.ok(Paliers.palier(15.0) == 2, "palier 2 a 15")
	t.ok(Paliers.palier(29.99) == 2, "palier 2 juste sous 30")
	t.ok(Paliers.palier(30.0) == 3, "palier 3 a 30")
	t.ok(Paliers.palier(1000.0) == 3, "palier 3 borne au sommet")

	t.eq(Paliers.prochain_seuil(0.0), 5.0, "prochain seuil a 0 = 5")
	t.eq(Paliers.prochain_seuil(5.0), 15.0, "prochain seuil a 5 = 15")
	t.eq(Paliers.prochain_seuil(15.0), 30.0, "prochain seuil a 15 = 30")
	t.eq(Paliers.prochain_seuil(30.0), -1.0, "aucun prochain seuil a 30")

	t.ok(Paliers.seuils_distincts_croissants() == true, "seuils distincts strictement croissants")
