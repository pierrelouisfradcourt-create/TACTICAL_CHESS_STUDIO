# restart.test.gd — le prestige EST le restart : remise a la base + residu bonus conserve.
extends RefCounted

const Restart = preload("res://05_SYSTEMS/game_state/restart.gd")
const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")


func run(h) -> void:
	var s = GameState.initial(6)
	s.ronrons = 500.0
	s.total_earned = 1200.0
	s.kittens = ["a", "b", "c"]
	s.unlocked = ["a", "b"]
	s.upgrade_level = 4
	s.palier = 3
	s.place_unlocked = true
	s.prestige_units = 2
	s.prestige_count = 2

	Restart.reset(s)

	# remis a la base
	h.eq(s.ronrons, 0.0, "restart: ronrons remis a zero")
	h.eq(s.total_earned, 0.0, "restart: total gagne remis a zero")
	h.eq(s.taux, 0.0, "restart: taux remis a zero")
	h.eq(s.kittens.size(), 0, "restart: colonie videe")
	h.eq(s.upgrade_level, 0, "restart: ameliorations remises a zero")
	h.eq(s.palier, 0, "restart: palier remis a zero")
	h.eq(s.place_unlocked, false, "restart: 2e lieu re-verrouille")

	# residu conserve (bonus permanent + collection distincte + comptes)
	h.eq(s.prestige_units, 2, "restart: le bonus permanent SURVIT")
	h.eq(s.prestige_count, 2, "restart: le compte de prestiges survit")
	h.eq(s.unlocked.size(), 2, "restart: la collection distincte deja vue survit")

	h.ok(Restart.est_base(s), "restart: l'etat reset est bien 'a la base'")

	# un etat non-base n'est pas confondu avec la base
	s.ronrons = 1.0
	h.ok(not Restart.est_base(s), "restart: un solde non nul n'est pas la base")
