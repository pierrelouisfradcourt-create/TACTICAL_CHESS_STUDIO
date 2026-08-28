# purchase_kitten.gd — LOGIQUE PURE (categorie `system`). Regle `rule.buy_kitten`.
#
# Achete un chaton SI le joueur a assez de ronrons. Le premier chaton coute 0
# (CostCurve.KITTEN_COSTS[0]) : la boucle-joueur l'adopte avant tout clic.
# Effet observable : la collection augmente STRICTEMENT de 1.
extends RefCounted

const CostCurve = preload("res://05_SYSTEMS/economy/cost_curve.gd")


# Adopte le prochain chaton. Rend true si l'achat a eu lieu.
static func buy(state: Dictionary) -> bool:
	var cost: int = CostCurve.kitten_cost(state)
	if float(state["ronrons"]) < float(cost):
		return false
	state["ronrons"] = float(state["ronrons"]) - float(cost)
	state["collection"] = int(state["collection"]) + 1
	return true


# Le prochain chaton est-il adoptable dans l'etat courant ?
static func can_buy(state: Dictionary) -> bool:
	return float(state["ronrons"]) >= float(CostCurve.kitten_cost(state))
