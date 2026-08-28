# state.test.gd — assertions strictes sur game.state (aggregate_rate, click_value).
extends RefCounted

const State = preload("res://05_SYSTEMS/game_state/state.gd")


func run(h) -> void:
	var s = State.new()
	# Etat initial.
	h.ok(s.ronrons == 0.0, "state: ronrons initial 0")
	h.ok(s.base_production == 0.0, "state: base_production initial 0")
	h.ok(s.prestige_mult == 1.0, "state: prestige_mult initial 1")
	h.ok(s.upgrade_bonus == 1.0, "state: upgrade_bonus initial 1")
	h.ok(s.kitten_count() == 0, "state: kitten_count initial 0")

	# click_value = BASE_CLICK * prestige_mult.
	h.ok(s.click_value() == 1.0, "state: click_value defaut 1.0")
	s.prestige_mult = 3.0
	h.ok(s.click_value() == 3.0, "state: click_value avec prestige_mult 3")

	# aggregate_rate = base_production * prestige_mult * upgrade_bonus.
	var s2 = State.new()
	h.ok(s2.aggregate_rate() == 0.0, "state: aggregate_rate a 0 sans production")
	s2.base_production = 10.0
	s2.prestige_mult = 2.0
	s2.upgrade_bonus = 3.0
	# 10 * 2 * 3 = 60 ; toute mutation d'un operateur (*/+ etc.) donne un autre nombre.
	h.ok(s2.aggregate_rate() == 60.0, "state: aggregate_rate 10*2*3 == 60")
	var s3 = State.new()
	s3.base_production = 5.0
	h.ok(s3.aggregate_rate() == 5.0, "state: aggregate_rate 5*1*1 == 5")

	# kitten_count somme les valeurs, independamment de l'ordre.
	var s4 = State.new()
	s4.kittens = {"common": 2, "rare": 1}
	h.ok(s4.kitten_count() == 3, "state: kitten_count somme == 3")
