# production.gd — LOGIQUE PURE (categorie `system`). Regle `rule.auto_production`.
#
# Production automatique par tick, une fois au moins un chaton adopte. Deux termes :
#   - une base par chaton (KITTEN_PROD_BASE), relevee par les ameliorations et le
#     multiplicateur de prestige ;
#   - un terme d'AFFINITE croissant (WARMTH_PER_TICK * ticks) : le ronronnement
#     s'intensifie avec le temps. C'est lui qui fait monter `taux_production` a
#     chaque tick SANS aucune action du joueur.
#
# DETERMINISME (garde-fou (b)) : `ticks` est un compteur de trames, jamais une
# horloge. Deux runs de meme longueur produisent le meme taux.
extends RefCounted

const CostCurve = preload("res://05_SYSTEMS/economy/cost_curve.gd")


# Taux de production courant (ronrons par tick). Croit a chaque tick tant qu'un
# chaton existe ; a zero chaton, vaut exactement 0.
static func taux(state: Dictionary) -> float:
	var kittens: int = int(state["collection"])
	if kittens <= 0:
		return 0.0
	var mult: float = float(state["prestige_mult"])
	var upgraded: float = 1.0 + float(state["upgrade_level"]) * CostCurve.UPGRADE_MULT
	var base: float = float(kittens) * CostCurve.KITTEN_PROD_BASE * upgraded * mult
	var warmth: float = float(kittens) * CostCurve.WARMTH_PER_TICK * float(state["ticks"]) * mult
	return base + warmth


# Avance d'un tick : incremente le compteur puis credite le taux courant.
# Rend les ronrons produits par ce tick.
static func tick(state: Dictionary) -> float:
	state["ticks"] = int(state["ticks"]) + 1
	var gain: float = taux(state)
	state["ronrons"] = float(state["ronrons"]) + gain
	state["earned"] = float(state["earned"]) + gain
	return gain
