# pricing.test.gd — assertions strictes sur economy.pricing (R6).
extends RefCounted

const Pricing = preload("res://05_SYSTEMS/economy/pricing.gd")


func run(h) -> void:
	# Cout du premier exemplaire (owned == 0) == cout de base.
	h.ok(Pricing.next_cost(15, 0) == 15, "pricing: next_cost(15,0) == 15")

	# Sequence STRICTEMENT croissante sur les exemplaires suivants.
	var previous = Pricing.next_cost(15, 0)
	var strictement_croissant := true
	for owned in range(1, 9):
		var cost = Pricing.next_cost(15, owned)
		if not (cost > previous):
			strictement_croissant = false
		previous = cost
	h.ok(strictement_croissant, "pricing: cout[i] > cout[i-1] pour tout i (strict)")

	# Ratio >= 1.10 : le 2e exemplaire coute au moins 1.10x le premier.
	h.ok(Pricing.next_cost(1000, 1) >= 1100, "pricing: ratio >= 1.10 (1000 -> >= 1100)")
	# Valeur exacte du ratio 1.15.
	h.ok(Pricing.next_cost(1000, 1) == 1150, "pricing: next_cost(1000,1) == 1150 (ratio 1.15)")
	h.ok(Pricing.next_cost(1000, 2) == 1322, "pricing: next_cost(1000,2) == 1322")
