# Tests de la regle economique (cout croissant + effet STRICT des achats).
extends RefCounted

const GS := preload("res://05_SYSTEMS/core/game_state.gd")
const Shop := preload("res://05_SYSTEMS/core/shop.gd")
const Purrs := preload("res://05_SYSTEMS/core/purrs.gd")

func run(t) -> void:
	var e = GS.nouvel_etat(6)
	t.eq(Shop.cout_chaton(e), 10.0, "cout 1er chaton 10")
	t.eq(Shop.cout_amelioration(e), 5.0, "cout 1ere amelioration 5")

	# achat refuse si ronrons insuffisants (borne STRICTE) : aucun changement.
	e["ronrons"] = 9.99
	t.ok(Shop.acheter_chaton(e) == false, "achat chaton refuse a 9.99 (< 10)")
	t.eq(float(e["ronrons"]), 9.99, "ronrons inchanges apres refus")
	t.ok(int(e["chatons"]) == 0, "chatons inchanges apres refus")

	# achat exactement au cout : accepte.
	e["ronrons"] = 10.0
	var taux_avant := Purrs.taux(e)
	t.ok(Shop.acheter_chaton(e) == true, "achat chaton accepte a 10 (== cout)")
	t.eq(float(e["ronrons"]), 0.0, "cout debite exactement")
	t.ok(int(e["chatons"]) == 1, "chatons == 1 apres achat")
	t.ok(int(e["types"]) == 1, "types == 1 apres achat (collection)")
	t.ok(Purrs.taux(e) > taux_avant, "production/s STRICTEMENT superieure apres achat chaton")
	t.eq(Purrs.taux(e), 0.2, "taux 0.2 apres 1 chaton")

	# cout croissant du 2e chaton.
	t.eq(Shop.cout_chaton(e), 15.0, "cout 2e chaton 15 (10*1.5)")

	# collection plafonne a nb_types.
	var c = GS.nouvel_etat(1)
	c["ronrons"] = 1000.0
	Shop.acheter_chaton(c)
	Shop.acheter_chaton(c)
	t.ok(int(c["chatons"]) == 2, "2 chatons achetes")
	t.ok(int(c["types"]) == 1, "types plafonne a nb_types (1)")

	# amelioration : effet STRICT meme sans chaton (production PLATE).
	var u = GS.nouvel_etat(6)
	u["ronrons"] = 4.99
	t.ok(Shop.acheter_amelioration(u) == false, "amelioration refusee a 4.99 (< 5)")
	u["ronrons"] = 5.0
	var tu_avant := Purrs.taux(u)
	t.ok(Shop.acheter_amelioration(u) == true, "amelioration acceptee a 5")
	t.eq(float(u["ronrons"]), 0.0, "cout amelioration debite")
	t.ok(int(u["ameliorations"]) == 1, "ameliorations == 1")
	t.ok(Purrs.taux(u) > tu_avant, "production/s STRICTEMENT superieure apres amelioration")
	t.eq(Purrs.taux(u), 0.5, "taux 0.5 apres 1 amelioration (production plate)")
	t.eq(Shop.cout_amelioration(u), 7.5, "cout 2e amelioration 7.5 (5*1.5)")
