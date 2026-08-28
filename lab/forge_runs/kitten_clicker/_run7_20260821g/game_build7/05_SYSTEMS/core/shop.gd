# shop.gd — regle economique PURE : l'achat d'un chaton et l'achat d'une amelioration
# augmentent STRICTEMENT le taux de production/tick (shop_buy_kitten_effect,
# shop_buy_upgrade_effect). Cout debite, effet strict, aucune tautologie.
extends RefCounted

const GS := preload("res://05_SYSTEMS/core/game_state.gd")

# Cout du PROCHAIN chaton : croit avec le nombre deja possede.
static func cout_chaton(e: Dictionary) -> float:
	return GS.CHATON_COUT_BASE * pow(GS.CHATON_COUT_CROISSANCE, float(e["chatons"]))

# Cout de la PROCHAINE amelioration : croit avec le nombre deja achete.
static func cout_amelioration(e: Dictionary) -> float:
	return GS.AMELIORATION_COUT_BASE * pow(GS.AMELIORATION_COUT_CROISSANCE, float(e["ameliorations"]))

# Achat d'un chaton : debite le cout, +1 chaton (taux strictement augmente), et +1 type
# distinct tant que la collection n'est pas complete. Rend true si l'achat a eu lieu.
static func acheter_chaton(e: Dictionary) -> bool:
	var c := cout_chaton(e)
	if float(e["ronrons"]) < c:
		return false
	e["ronrons"] = float(e["ronrons"]) - c
	e["chatons"] = int(e["chatons"]) + 1
	if int(e["types"]) < int(e["nb_types"]):
		e["types"] = int(e["types"]) + 1
	return true

# Achat d'une amelioration : debite le cout, +1 amelioration (taux strictement augmente,
# meme sans aucun chaton, via la production PLATE). Rend true si l'achat a eu lieu.
static func acheter_amelioration(e: Dictionary) -> bool:
	var c := cout_amelioration(e)
	if float(e["ronrons"]) < c:
		return false
	e["ronrons"] = float(e["ronrons"]) - c
	e["ameliorations"] = int(e["ameliorations"]) + 1
	return true
