# upgrades.test.gd — assertions strictes sur economy.upgrades (R5).
extends RefCounted

const State = preload("res://05_SYSTEMS/game_state/state.gd")
const Upgrades = preload("res://05_SYSTEMS/economy/upgrades.gd")


func run(h) -> void:
	# Facteurs declares (tous > 1.0).
	h.ok(Upgrades.upgrade_factor("extra_paws") == 1.5, "upg: extra_paws == 1.5")
	h.ok(Upgrades.upgrade_factor("cozy_blankets") == 2.0, "upg: cozy_blankets == 2.0")
	h.ok(Upgrades.upgrade_factor("golden_bell") == 3.0, "upg: golden_bell == 3.0")
	h.ok(Upgrades.upgrade_factor("inconnu") == 1.0, "upg: inconnu -> facteur 1.0")

	# Amelioration inconnue : aucun effet, retour false.
	var s0 = State.new()
	var ok_unknown = Upgrades.apply_upgrade(s0, "inconnu")
	h.ok(ok_unknown == false, "upg: apply_upgrade inconnu rend false")
	h.ok(s0.upgrade_bonus == 1.0, "upg: bonus inchange apres upgrade inconnu")

	# Le taux APRES achat est strictement superieur au taux AVANT.
	var s = State.new()
	s.base_production = 10.0
	var rate_avant = s.aggregate_rate()
	var applied = Upgrades.apply_upgrade(s, "extra_paws")
	var rate_apres = s.aggregate_rate()
	h.ok(applied == true, "upg: apply_upgrade extra_paws rend true")
	h.ok(s.upgrade_bonus == 1.5, "upg: bonus == 1.5 apres extra_paws")
	h.ok(rate_apres > rate_avant, "upg: taux_apres > taux_avant (strict)")
	h.ok(rate_apres == 15.0, "upg: 10 * 1.5 == 15.0")

	# Les ameliorations se cumulent multiplicativement.
	Upgrades.apply_upgrade(s, "cozy_blankets")
	h.ok(s.upgrade_bonus == 3.0, "upg: 1.5 * 2.0 == 3.0 (cumul)")
	h.ok(s.aggregate_rate() == 30.0, "upg: 10 * 3.0 == 30.0")
