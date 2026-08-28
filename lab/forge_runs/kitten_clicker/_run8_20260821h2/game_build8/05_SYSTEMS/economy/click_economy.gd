# click_economy.gd — LOGIQUE PURE (categorie `system`). Regle `rule.click_ronron`.
#
# Un clic sur la pelote rapporte STRICTEMENT la valeur de clic de l'etat courant.
# A l'etat neuf, cette valeur vaut exactement 1.0 -> apres n clics, ronrons == n.
# L'oracle de mutation asserte cette EGALITE (jamais un `>=`) : un mutant qui
# remplace `+=` par une borne, ou 1 par 2, brise l'egalite et est TUE.
#
# Aucun litteral de gameplay ici : la valeur vient de CostCurve (garde-fou (d)).
extends RefCounted

const CostCurve = preload("res://05_SYSTEMS/economy/cost_curve.gd")


# Applique un clic : incremente ronrons et le cumul `earned`. Rend le nombre de
# ronrons gagnes par ce clic (jamais un booleen nu).
static func click(state: Dictionary) -> float:
	var gain: float = CostCurve.click_value(state)
	state["ronrons"] = float(state["ronrons"]) + gain
	state["earned"] = float(state["earned"]) + gain
	return gain
