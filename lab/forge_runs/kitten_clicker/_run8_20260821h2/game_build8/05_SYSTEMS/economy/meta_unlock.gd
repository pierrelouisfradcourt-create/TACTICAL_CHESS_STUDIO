# meta_unlock.gd — LOGIQUE PURE (categorie `system`). Regle `rule.meta_unlock`.
#
# Deblocage de lieu par meta-progression : au seuil, incremente le nombre de lieux
# debloques (le premier au-dela du refuge est le jardin). Effet observable : un
# nouveau lieu devient present et selectionnable.
extends RefCounted

const CostCurve = preload("res://05_SYSTEMS/economy/cost_curve.gd")


# Debloque le prochain lieu si finançable. Rend true si le deblocage a lieu.
static func unlock(state: Dictionary) -> bool:
	var cost: int = CostCurve.unlock_cost(state)
	if float(state["ronrons"]) < float(cost):
		return false
	state["ronrons"] = float(state["ronrons"]) - float(cost)
	state["locations"] = int(state["locations"]) + 1
	return true


static func can_unlock(state: Dictionary) -> bool:
	return float(state["ronrons"]) >= float(CostCurve.unlock_cost(state))
