# thresholds_variance.test.gd — la courbe de paliers porte une INFORMATION VARIABLE.
# Regle de variance (ratifie Pierre 2026-07-21) : >=2 valeurs distinctes non triviales, ici
# >=3 seuils STRICTEMENT croissants et deux a deux distincts.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")


func run(h) -> void:
	var paliers: Array = P.PALIERS
	h.gt(paliers.size(), 2, "variance: au moins 3 seuils de palier")

	# distinction reelle : autant de valeurs distinctes que d'entrees (aucune egalite cachee)
	var distincts := {}
	for v in paliers:
		distincts[v] = true
	h.eq(distincts.size(), paliers.size(), "variance: tous les seuils sont DISTINCTS")
	h.gt(distincts.size(), 2, "variance: >=3 valeurs de seuil distinctes")

	# strictement croissants (une courbe, pas un plateau)
	for i in range(1, paliers.size()):
		h.gt(float(paliers[i]), float(paliers[i - 1]),
			"variance: seuil %d strictement > seuil %d" % [i, i - 1])

	# non triviaux : aucun seuil a 0 ou 1
	for v in paliers:
		h.gt(float(v), 1.0, "variance: seuil non trivial (>1) : %s" % str(v))

	# gain au clic strictement positif (la mecanique n'est pas morte)
	h.gt(P.CLICK_GAIN, 0.0, "variance: le gain au clic est strictement positif")
	h.gt(P.PRESTIGE_BONUS_PER, 0.0, "variance: le bonus de prestige est strictement positif")
