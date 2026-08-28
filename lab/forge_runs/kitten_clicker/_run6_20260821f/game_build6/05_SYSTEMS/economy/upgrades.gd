# upgrades.gd — AMELIORATIONS : acheter une amelioration augmente STRICTEMENT le taux.
#
# Deps declarees : params, game_state. Modifie le niveau d'amelioration puis recalcule le
# taux via economy — le taux apres est strictement superieur au taux avant DES qu'au moins
# un chaton produit (un multiplicateur sur zero reste zero, ce n'est pas un mensonge : sans
# producteur il n'y a rien a multiplier).
#
# DETERMINISME : aucun alea, aucun temps.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")
const Guard = preload("res://05_SYSTEMS/game_state/error_guard.gd")
const Economy = preload("res://05_SYSTEMS/economy/economy.gd")


# Cout de la PROCHAINE amelioration : croissance geometrique sur le niveau courant.
static func cout(s) -> float:
	return P.UPGRADE_BASE_COST * pow(P.UPGRADE_COST_GROWTH, float(s.upgrade_level))


# ACHAT d'une amelioration. Non finançable -> IGNORE (etat inchange). Rend {ok, taux_avant,
# taux_apres} : les deux taux permettent d'asserter la hausse STRICTE sans supposer sa cause.
static func acheter(s) -> Dictionary:
	var c: float = cout(s)
	if not Guard.peut_payer(s.ronrons, c):
		return {"ok": false, "taux_avant": s.taux, "taux_apres": s.taux}
	var avant: float = Economy.recalculer_taux(s)
	s.ronrons -= c
	s.upgrade_level += 1
	var apres: float = Economy.recalculer_taux(s)
	return {"ok": true, "taux_avant": avant, "taux_apres": apres}
