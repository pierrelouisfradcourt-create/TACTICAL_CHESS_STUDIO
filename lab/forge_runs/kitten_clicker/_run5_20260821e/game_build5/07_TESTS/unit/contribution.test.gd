# contribution.test.gd — assertions strictes sur economy.contribution (R22).
extends RefCounted

const State = preload("res://05_SYSTEMS/game_state/state.gd")
const Contribution = preload("res://05_SYSTEMS/economy/contribution.gd")


func run(h) -> void:
	# Contributions declarees par rarete (valeurs distinctes, croissantes).
	h.ok(Contribution.kitten_contribution("common") == 1.0, "contrib: common == 1.0")
	h.ok(Contribution.kitten_contribution("uncommon") == 3.0, "contrib: uncommon == 3.0")
	h.ok(Contribution.kitten_contribution("rare") == 8.0, "contrib: rare == 8.0")
	h.ok(Contribution.kitten_contribution("epic") == 20.0, "contrib: epic == 20.0")
	h.ok(Contribution.kitten_contribution("legendary") == 50.0, "contrib: legendary == 50.0")
	h.ok(Contribution.kitten_contribution("inconnu") == 0.0, "contrib: rarete inconnue == 0.0")

	# Acheter un chaton monte base_production de sa contribution exacte + incremente le compte.
	var s = State.new()
	var applied = Contribution.buy_kitten(s, "common")
	h.ok(applied == 1.0, "contrib: buy_kitten common rend 1.0")
	h.ok(s.base_production == 1.0, "contrib: base_production == 1.0 apres 1 common")
	h.ok(int(s.kittens.get("common", 0)) == 1, "contrib: kittens[common] == 1")

	# Acheter chaque type une fois : base_production == somme des contributions declarees.
	var s2 = State.new()
	for rarity in ["common", "uncommon", "rare", "epic", "legendary"]:
		Contribution.buy_kitten(s2, rarity)
	h.ok(s2.base_production == 82.0, "contrib: 1 de chaque -> base_production == 82.0 (strict)")

	# La HAUSSE de taux (mult==1) egale exactement la contribution declaree.
	var s3 = State.new()
	var rate_avant = s3.aggregate_rate()
	Contribution.buy_kitten(s3, "rare")
	var rate_apres = s3.aggregate_rate()
	h.ok(rate_apres > rate_avant, "contrib: le taux augmente strictement apres achat")
	h.ok(rate_apres - rate_avant == 8.0, "contrib: hausse == contribution rare (8.0, strict)")
