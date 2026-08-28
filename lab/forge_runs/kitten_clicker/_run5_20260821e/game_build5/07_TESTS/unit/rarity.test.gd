# rarity.test.gd — assertions strictes sur chatons.rarity_dist (R9).
# DETERMINISME : RandomNumberGenerator SEEDE, jamais l'alea global.
extends RefCounted

const Rarity = preload("res://05_SYSTEMS/chatons/rarity.gd")


func run(h) -> void:
	h.ok(Rarity.total_weight() == 100, "rarity: total_weight == 100")

	# 200 acquisitions seedees : compte par rarete.
	var rng := RandomNumberGenerator.new()
	rng.seed = 12345
	var counts := {}
	for _i in range(200):
		var r = Rarity.roll_rarity(rng)
		counts[r] = int(counts.get(r, 0)) + 1

	var common = int(counts.get("common", 0))
	var rare = int(counts.get("rare", 0))
	# freq(common) > freq(rare) STRICT (poids 60 vs 10).
	h.ok(common > rare, "rarity: freq(common) > freq(rare) (strict)")
	# Au moins 2 frequences distinctes non triviales.
	h.ok(counts.size() >= 2, "rarity: >= 2 raretes distinctes observees")
	h.ok(common > 0 and rare > 0, "rarity: common et rare tous deux observes (non triviaux)")

	# Determinisme : meme graine -> meme premier tirage.
	var rng_a := RandomNumberGenerator.new()
	rng_a.seed = 777
	var rng_b := RandomNumberGenerator.new()
	rng_b.seed = 777
	h.ok(Rarity.roll_rarity(rng_a) == Rarity.roll_rarity(rng_b), "rarity: meme graine -> meme tirage")

	# Le tirage rend toujours une rarete du vocabulaire declare.
	var rng_c := RandomNumberGenerator.new()
	rng_c.seed = 3
	var vocab := ["common", "uncommon", "rare", "epic", "legendary"]
	h.ok(vocab.has(Rarity.roll_rarity(rng_c)), "rarity: tirage dans le vocabulaire declare")

	# Bornes EXACTES du parcours cumulatif (cumules 60/85/95/99/100). Au seuil exact, le
	# tirage appartient a CE bucket : c'est ce qui rend le `<=` mesurable (roll == cumul).
	h.ok(Rarity.rarity_for_roll(1) == "common", "rarity: roll 1 == common")
	h.ok(Rarity.rarity_for_roll(60) == "common", "rarity: roll 60 (borne cumulee) == common")
	h.ok(Rarity.rarity_for_roll(61) == "uncommon", "rarity: roll 61 == uncommon")
	h.ok(Rarity.rarity_for_roll(85) == "uncommon", "rarity: roll 85 (borne) == uncommon")
	h.ok(Rarity.rarity_for_roll(86) == "rare", "rarity: roll 86 == rare")
	h.ok(Rarity.rarity_for_roll(100) == "legendary", "rarity: roll 100 == legendary")
