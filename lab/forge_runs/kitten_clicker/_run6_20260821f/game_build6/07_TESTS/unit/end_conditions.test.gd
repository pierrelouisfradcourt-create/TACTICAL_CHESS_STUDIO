# end_conditions.test.gd — franchissement de paliers (game.end), sur le TOTAL gagne.
# Bornes STRICTES : un seuil est franchi a l'egalite, pas un cran avant.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")
const End = preload("res://05_SYSTEMS/game_state/end_conditions.gd")
const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")


func run(h) -> void:
	# palier_atteint : comptage arithmetique aux bornes exactes (PALIERS = [50,250,1000,5000])
	h.eq(End.palier_atteint(0.0), 0, "end: 0 ronron -> palier 0")
	h.eq(End.palier_atteint(49.0), 0, "end: juste sous le 1er seuil -> palier 0")
	h.eq(End.palier_atteint(50.0), 1, "end: AU 1er seuil (50) -> palier 1 (borne inclusive)")
	h.eq(End.palier_atteint(249.0), 1, "end: sous le 2e seuil -> palier 1")
	h.eq(End.palier_atteint(250.0), 2, "end: AU 2e seuil (250) -> palier 2")
	h.eq(End.palier_atteint(1000.0), 3, "end: AU 3e seuil (1000) -> palier 3")
	h.eq(End.palier_atteint(5000.0), 4, "end: AU 4e seuil (5000) -> palier 4")

	# update_palier : monotone, base sur total_earned, debloque le 2e lieu au 1er palier
	var s = GameState.initial(6)
	s.total_earned = 60.0
	h.ok(End.update_palier(s), "end: franchir le 1er palier renvoie true")
	h.eq(s.palier, 1, "end: palier passe a 1")
	h.eq(s.place_unlocked, true, "end: le 2e lieu se debloque au 1er palier")
	h.ok(not End.update_palier(s), "end: sans nouveau franchissement -> false")

	# depenser (ronrons baisse) ne fait PAS reculer le palier : il suit total_earned
	s.ronrons = 0.0
	h.ok(not End.update_palier(s), "end: solde a zero ne fait pas reculer le palier")
	h.eq(s.palier, 1, "end: palier reste a 1 malgre solde nul")

	# palier_franchi : strict
	h.ok(End.palier_franchi(s, 1), "end: palier 1 franchi")
	h.ok(not End.palier_franchi(s, 2), "end: palier 2 pas encore franchi")

	s.total_earned = 1000.0
	End.update_palier(s)
	h.ok(End.palier_franchi(s, 3), "end: le 3e palier est franchi a 1000")
	h.eq(End.statut_valide(s), true, "end: statut toujours valide (jamais de defaite)")
