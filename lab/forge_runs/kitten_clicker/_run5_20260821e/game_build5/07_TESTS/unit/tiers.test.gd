# tiers.test.gd — assertions strictes sur progression.tiers (R15) et is_reachable (R16).
extends RefCounted

const Tiers = preload("res://05_SYSTEMS/progression/tiers.gd")


func run(h) -> void:
	var courbe = Tiers.tier_thresholds()
	# Au moins 3 valeurs de seuil strictement distinctes (regle de variance).
	h.ok(courbe.size() >= 3, "tiers: >= 3 seuils")
	var distinctes := {}
	for v in courbe:
		distinctes[v] = true
	h.ok(distinctes.size() == courbe.size(), "tiers: tous les seuils distincts")
	# Strictement croissants.
	var croissant := true
	for i in range(1, courbe.size()):
		if not (courbe[i] > courbe[i - 1]):
			croissant = false
	h.ok(croissant, "tiers: seuils strictement croissants")
	# Non triviaux (pas 1,2,3...).
	h.ok(int(courbe[0]) >= 10, "tiers: premier seuil non trivial (>= 10)")

	# tier_reached : comptage exact aux bornes.
	h.ok(Tiers.tier_reached(0.0) == 0, "tiers: reached(0) == 0")
	h.ok(Tiers.tier_reached(49.0) == 0, "tiers: reached(49) == 0")
	h.ok(Tiers.tier_reached(50.0) == 1, "tiers: reached(50) == 1 (borne)")
	h.ok(Tiers.tier_reached(249.0) == 1, "tiers: reached(249) == 1")
	h.ok(Tiers.tier_reached(250.0) == 2, "tiers: reached(250) == 2")
	h.ok(Tiers.tier_reached(1000.0) == 3, "tiers: reached(1000) == 3")
	h.ok(Tiers.tier_reached(1000000.0) == 4, "tiers: reached(grand) == 4 (plafonne)")

	# is_reachable : `>=` est la definition d'atteinte -> au seuil EXACT, atteint.
	h.ok(Tiers.is_reachable(50.0, 1) == true, "tiers: reachable(50,1) au seuil exact")
	h.ok(Tiers.is_reachable(49.0, 1) == false, "tiers: reachable(49,1) sous le seuil")
	h.ok(Tiers.is_reachable(1000.0, 3) == true, "tiers: reachable(1000,3) au seuil exact")
	h.ok(Tiers.is_reachable(999.0, 3) == false, "tiers: reachable(999,3) sous le seuil")
	h.ok(Tiers.is_reachable(1e9, 0) == false, "tiers: tier 0 hors bornes")
	h.ok(Tiers.is_reachable(1e9, 99) == false, "tiers: tier > taille hors bornes")
