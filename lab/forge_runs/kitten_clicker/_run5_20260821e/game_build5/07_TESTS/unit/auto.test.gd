# auto.test.gd — assertions strictes sur production.auto (R4).
extends RefCounted

const State = preload("res://05_SYSTEMS/game_state/state.gd")
const Auto = preload("res://05_SYSTEMS/production/auto.gd")
const Contribution = preload("res://05_SYSTEMS/economy/contribution.gd")


func run(h) -> void:
	# Un tick ajoute exactement le taux agrege.
	var s = State.new()
	s.base_production = 4.0
	var gain = Auto.tick_production(s)
	h.ok(gain == 4.0, "auto: tick rend le taux agrege (4.0)")
	h.ok(s.ronrons == 4.0, "auto: un tick -> ronrons == 4.0")

	# Bot achete 1 chaton commun puis T ticks sans interaction : +production_rate*T STRICT.
	var s2 = State.new()
	Contribution.buy_kitten(s2, "common")   # base_production == 1.0
	var rate = s2.aggregate_rate()
	h.ok(rate == 1.0, "auto: taux apres 1 chaton commun == 1.0")
	Auto.run_ticks(s2, 10)
	h.ok(s2.ronrons == 10.0, "auto: 10 ticks a taux 1.0 -> ronrons == 10.0 (strict)")

	# run_ticks 0 n'ajoute rien.
	var s3 = State.new()
	s3.base_production = 99.0
	Auto.run_ticks(s3, 0)
	h.ok(s3.ronrons == 0.0, "auto: 0 tick -> ronrons inchange")

	# Le taux tient compte des multiplicateurs pendant les ticks.
	var s4 = State.new()
	s4.base_production = 2.0
	s4.prestige_mult = 3.0
	Auto.run_ticks(s4, 4)
	# 2 * 3 * 1 == 6 par tick, 4 ticks -> 24.
	h.ok(s4.ronrons == 24.0, "auto: 4 ticks a 2*3 -> ronrons == 24.0 (strict)")

	# La valeur RENDUE par run_ticks == somme des gains (accumulateur teste, pas seulement
	# l'effet de bord sur ronrons).
	var s6 = State.new()
	s6.base_production = 3.0
	var retour = Auto.run_ticks(s6, 4)
	h.ok(retour == 12.0, "auto: run_ticks rend la somme des gains == 12.0 (strict)")
