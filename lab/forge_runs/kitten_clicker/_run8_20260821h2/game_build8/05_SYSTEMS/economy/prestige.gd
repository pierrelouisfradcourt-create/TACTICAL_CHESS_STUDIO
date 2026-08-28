# prestige.gd — LOGIQUE PURE (categorie `system`). Regle `rule.prestige`.
#
# Au seuil (PRESTIGE_THRESHOLD), le prestige :
#   - remet les ronrons a 0 et la progression courante a zero (collection,
#     ameliorations, lieux, ticks) ;
#   - accorde un multiplicateur PERMANENT (PRESTIGE_FACTOR), applique au clic ET a
#     la production.
# Le cumul `earned` n'est PAS remis a zero (echelle d'objectifs monotone).
#
# Consequence mesurable : apres un prestige, un seul clic sur la pelote rapporte
# STRICTEMENT plus qu'avant (maillon ADVANTAGE) — le multiplicateur est reel, pas
# un texte.
extends RefCounted

const CostCurve = preload("res://05_SYSTEMS/economy/cost_curve.gd")


static func can_prestige(state: Dictionary) -> bool:
	return float(state["ronrons"]) >= CostCurve.PRESTIGE_THRESHOLD


# Effectue le prestige si le seuil est atteint. Rend true si le prestige a lieu.
static func prestige(state: Dictionary) -> bool:
	if not can_prestige(state):
		return false
	state["prestige_mult"] = float(state["prestige_mult"]) * CostCurve.PRESTIGE_FACTOR
	state["prestige_count"] = int(state["prestige_count"]) + 1
	state["ronrons"] = 0.0
	state["collection"] = 0
	state["upgrade_level"] = 0
	state["locations"] = 1
	state["ticks"] = 0
	return true
