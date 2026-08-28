# prestige.test.gd — meta-progression : gating, bonus permanent, et la propriete qui compte :
# reatteindre un palier prend STRICTEMENT moins de ticks apres prestige.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")
const Prestige = preload("res://05_SYSTEMS/meta/prestige.gd")
const Economy = preload("res://05_SYSTEMS/economy/economy.gd")
const End = preload("res://05_SYSTEMS/game_state/end_conditions.gd")
const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")


# Nombre de ticks de CLIC PUR pour franchir le 1er palier depuis l'etat courant.
func _ticks_pour_palier1(s) -> int:
	var t: int = 0
	while not End.palier_franchi(s, 1) and t < 100000:
		Economy.clic(s)
		t += 1
	return t


func run(h) -> void:
	# gating : sans palier requis, pas de prestige
	var s0 = GameState.initial(6)
	h.ok(not Prestige.peut_prestige(s0), "prestige: interdit avant le palier requis")
	h.ok(not Prestige.effectuer(s0), "prestige: effectuer refuse si non permis")
	h.eq(s0.prestige_units, 0, "prestige: aucun bonus ajoute sur refus")

	# franchir le 1er palier par clic pur, compter les ticks AVANT prestige
	var s = GameState.initial(6)
	var t_avant: int = _ticks_pour_palier1(s)
	h.gt(t_avant, 0, "prestige: le 1er palier demande des ticks")
	h.ok(End.palier_franchi(s, 1), "prestige: 1er palier franchi avant prestige")

	# prestige permis maintenant
	h.ok(Prestige.peut_prestige(s), "prestige: permis une fois le palier atteint")
	var units_avant: int = s.prestige_units
	h.ok(Prestige.effectuer(s), "prestige: effectue")
	h.eq(s.prestige_units, units_avant + 1, "prestige: bonus permanent +1")
	h.eq(s.prestige_count, 1, "prestige: compte de prestiges +1")
	h.eq(s.ronrons, 0.0, "prestige: la production courante est remise a zero")
	h.eq(s.palier, 0, "prestige: le palier repart de zero")
	h.gt(s.prestige_mult(), 1.0, "prestige: le multiplicateur permanent a grandi")

	# reatteindre le 1er palier : STRICTEMENT moins de ticks (bonus effectif)
	var t_apres: int = _ticks_pour_palier1(s)
	h.gt(t_apres, 0, "prestige: reatteindre demande des ticks")
	h.lt(t_apres, t_avant, "prestige: reatteindre le palier prend MOINS de ticks (bonus effectif)")
