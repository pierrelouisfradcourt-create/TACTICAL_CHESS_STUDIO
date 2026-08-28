# prestige.test.gd — assertions strictes sur progression.prestige (R17).
extends RefCounted

const State = preload("res://05_SYSTEMS/game_state/state.gd")
const Prestige = preload("res://05_SYSTEMS/progression/prestige.gd")
const Contribution = preload("res://05_SYSTEMS/economy/contribution.gd")


func run(h) -> void:
	# Non eligible sous le 3e palier (1000).
	var s0 = State.new()
	s0.ronrons = 999.0
	h.ok(Prestige.can_prestige(s0) == false, "prestige: non eligible a 999 ronrons")
	h.ok(Prestige.do_prestige(s0) == false, "prestige: do_prestige refuse sous le seuil")
	h.ok(s0.prestige_mult == 1.0, "prestige: multiplicateur inchange si refuse")

	# Eligible au 3e palier (1000).
	var s = State.new()
	s.ronrons = 1000.0
	Contribution.buy_kitten(s, "common")   # base_production 1.0
	s.upgrade_bonus = 2.0
	h.ok(Prestige.can_prestige(s) == true, "prestige: eligible a 1000 ronrons")

	var done = Prestige.do_prestige(s)
	h.ok(done == true, "prestige: do_prestige effectue rend true")
	# Reset ronrons + chatons + ameliorations.
	h.ok(s.ronrons == 0.0, "prestige: ronrons remis a 0")
	h.ok(s.base_production == 0.0, "prestige: base_production remis a 0")
	h.ok(s.upgrade_bonus == 1.0, "prestige: upgrade_bonus remis a 1")
	h.ok(s.kitten_count() == 0, "prestige: chatons remis a 0")
	# Multiplicateur permanent > 1 persistant.
	h.ok(s.prestige_mult == 2.0, "prestige: multiplicateur passe a 2.0 (permanent)")
	h.ok(s.prestige_mult > 1.0, "prestige: multiplicateur > 1 persistant")
	# Second lieu debloque.
	h.ok(s.unlocked_places.has("veranda"), "prestige: veranda debloquee")

	# Production de depart post-prestige > production de depart initiale (memes chatons).
	var avant = State.new()
	Contribution.buy_kitten(avant, "common")
	var rate_initial = avant.aggregate_rate()   # 1 * 1 * 1 == 1
	# s a maintenant mult 2 ; on lui redonne 1 common.
	Contribution.buy_kitten(s, "common")
	var rate_post = s.aggregate_rate()           # 1 * 2 * 1 == 2
	h.ok(rate_post > rate_initial, "prestige: taux post-prestige > taux initial (memes chatons, strict)")
	h.ok(rate_post == 2.0 and rate_initial == 1.0, "prestige: 1.0 initial vs 2.0 post-prestige")
