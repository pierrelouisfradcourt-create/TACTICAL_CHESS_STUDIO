# upgrade.gd — LOGIQUE PURE (categorie `system`). Regle `rule.upgrade_rate`.
#
# Une amelioration achetee releve STRICTEMENT le taux de production : elle
# incremente le niveau d'amelioration, ce qui multiplie la base de production
# (Production.taux lit `upgrade_level`). A ticks constant, taux_apres > taux_avant.
extends RefCounted

const CostCurve = preload("res://05_SYSTEMS/economy/cost_curve.gd")


# Achete la prochaine amelioration si elle est finançable. Rend true si l'achat a lieu.
static func buy_upgrade(state: Dictionary) -> bool:
	var cost: int = CostCurve.upgrade_cost(state)
	if float(state["ronrons"]) < float(cost):
		return false
	state["ronrons"] = float(state["ronrons"]) - float(cost)
	state["upgrade_level"] = int(state["upgrade_level"]) + 1
	return true


static func can_upgrade(state: Dictionary) -> bool:
	return float(state["ronrons"]) >= float(CostCurve.upgrade_cost(state))
