# click.test.gd — assertions strictes sur production.click (R1).
extends RefCounted

const State = preload("res://05_SYSTEMS/game_state/state.gd")
const Click = preload("res://05_SYSTEMS/production/click.gd")


func run(h) -> void:
	var s = State.new()
	var gain = Click.on_click(s)
	h.ok(gain == 1.0, "click: gain d'un clic == click_value (1.0)")
	h.ok(s.ronrons == 1.0, "click: 1 clic -> ronrons == 1.0")

	# N clics sans achat -> ronrons == N * click_value (assertion STRICTE ==).
	var s2 = State.new()
	for _i in range(5):
		Click.on_click(s2)
	h.ok(s2.ronrons == 5.0, "click: 5 clics -> ronrons == 5.0 (strict)")

	# Le multiplicateur de prestige amplifie chaque clic.
	var s3 = State.new()
	s3.prestige_mult = 2.0
	for _i in range(5):
		Click.on_click(s3)
	h.ok(s3.ronrons == 10.0, "click: 5 clics * mult 2 -> ronrons == 10.0 (strict)")

	# La valeur rendue egale exactement l'increment applique.
	var s4 = State.new()
	s4.prestige_mult = 4.0
	var before = s4.ronrons
	var g = Click.on_click(s4)
	h.ok(s4.ronrons - before == g, "click: increment applique == gain rendu")
	h.ok(g == 4.0, "click: gain avec mult 4 == 4.0")
