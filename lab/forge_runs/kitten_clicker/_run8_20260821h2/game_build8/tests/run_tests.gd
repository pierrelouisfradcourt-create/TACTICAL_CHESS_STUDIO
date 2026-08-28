# run_tests.gd — HARNAIS DE PREUVE (categorie godot.project_tests). Patron chess_tcg.
# Lancer : Godot --headless --path games/kitten_clicker --script res://tests/run_tests.gd
# exit 0 = tous verts, 1 = au moins un echec.
#
# Cible du GATE DE MUTATION (game_contract.proof.mutation.seals.test_scripts) : les
# fichiers de LOGIQUE PURE (05_SYSTEMS/economy/*.gd) sont mutes par le driver, ce
# harnais est re-execute, un mutant survivant SANS assertion cassee est un trou.
# Les assertions sont donc STRICTES et sur des valeurs EXACTES (jamais un `>=`
# tautologique) : un increment strict, une table de couts, une formule de production.
#
# GARDE ANTI-FAUX-VERT (patron chess_tcg) : EXPECTED_ASSERTS. Si le coeur ne compile
# pas, des tests avortent en silence ; ce total n'est pas atteint -> echec force.
extends SceneTree

const CostCurve = preload("res://05_SYSTEMS/economy/cost_curve.gd")
const ClickEconomy = preload("res://05_SYSTEMS/economy/click_economy.gd")
const PurchaseKitten = preload("res://05_SYSTEMS/economy/purchase_kitten.gd")
const Production = preload("res://05_SYSTEMS/economy/production.gd")
const Upgrade = preload("res://05_SYSTEMS/economy/upgrade.gd")
const MetaUnlock = preload("res://05_SYSTEMS/economy/meta_unlock.gd")
const Prestige = preload("res://05_SYSTEMS/economy/prestige.gd")

const EXPECTED_ASSERTS := 51

var _passed := 0
var _failed := 0
var _fails: Array = []


func _initialize() -> void:
	test_initial_state()
	test_click_strict()
	test_click_scales_with_prestige()
	test_cost_curve_variance()
	test_cost_indices()
	test_purchase_kitten()
	test_production_after_kitten()
	test_production_warmth_rises()
	test_production_zero_without_kitten()
	test_upgrade_raises_rate_strict()
	test_meta_unlock()
	test_prestige()
	test_palier_ladder()
	var total := _passed + _failed
	if total != EXPECTED_ASSERTS:
		_failed += 1
		_fails.append("META: %d/%d assertions executees (coeur non charge ?)" % [total, EXPECTED_ASSERTS])
	print("\n=== RESULT: %d passed, %d failed ===" % [_passed, _failed])
	for f in _fails:
		print("  FAIL: ", f)
	quit(0 if _failed == 0 else 1)


func ok(cond: bool, name: String) -> void:
	if cond:
		_passed += 1
	else:
		_failed += 1
		_fails.append(name)


# --- tests ---

func test_initial_state() -> void:
	var s := CostCurve.initial_state()
	ok(float(s["ronrons"]) == 0.0, "etat neuf : 0 ronron")
	ok(int(s["collection"]) == 0, "etat neuf : 0 chaton")
	ok(int(s["locations"]) == 1, "etat neuf : 1 lieu (refuge)")
	ok(float(s["prestige_mult"]) == 1.0, "etat neuf : multiplicateur 1.0")


func test_click_strict() -> void:
	# STRICT : apres n clics depuis 0, ronrons vaut EXACTEMENT n (jamais un >=).
	var s := CostCurve.initial_state()
	ok(CostCurve.click_value(s) == 1.0, "valeur de clic de base == 1.0")
	for i in range(5):
		ClickEconomy.click(s)
	ok(float(s["ronrons"]) == 5.0, "5 clics -> ronrons == 5 (strict)")
	ok(float(s["earned"]) == 5.0, "5 clics -> earned == 5")
	# un 6e clic ajoute EXACTEMENT 1
	var before := float(s["ronrons"])
	var gain := ClickEconomy.click(s)
	ok(gain == 1.0, "un clic rapporte exactement 1.0")
	ok(float(s["ronrons"]) == before + 1.0, "un clic incremente de +1 exactement")


func test_click_scales_with_prestige() -> void:
	# Apres prestige, le clic vaut PRESTIGE_FACTOR (maillon ADVANTAGE mesurable).
	var s := CostCurve.initial_state()
	s["ronrons"] = CostCurve.PRESTIGE_THRESHOLD
	Prestige.prestige(s)
	ok(CostCurve.click_value(s) == CostCurve.PRESTIGE_FACTOR, "clic apres prestige == PRESTIGE_FACTOR")
	var g := ClickEconomy.click(s)
	ok(g == CostCurve.PRESTIGE_FACTOR, "gain de clic apres prestige == PRESTIGE_FACTOR")


func test_cost_curve_variance() -> void:
	# Regle de variance : >=3 couts distincts non triviaux.
	ok(CostCurve.distinct_cost_count() >= 3, "au moins 3 couts distincts non triviaux")
	var ladder: Array = CostCurve.cost_ladder()
	ok(ladder == [6, 15, 34, 72, 150], "echelle des couts exacte")
	ok(ladder[0] != ladder[1], "couts distincts (variance non nulle)")


func test_cost_indices() -> void:
	var s := CostCurve.initial_state()
	ok(CostCurve.kitten_cost(s) == 0, "premier chaton gratuit")
	s["collection"] = 1
	ok(CostCurve.kitten_cost(s) == 6, "2e chaton coute 6")
	s["collection"] = 2
	ok(CostCurve.kitten_cost(s) == 15, "3e chaton coute 15")
	var s2 := CostCurve.initial_state()
	ok(CostCurve.upgrade_cost(s2) == 10, "1re amelioration coute 10")
	ok(CostCurve.unlock_cost(s2) == 20, "1er deblocage coute 20")


func test_purchase_kitten() -> void:
	var s := CostCurve.initial_state()
	ok(PurchaseKitten.buy(s), "premier chaton adoptable a 0 ronron")
	ok(int(s["collection"]) == 1, "collection == 1 apres achat")
	# 2e chaton coute 6 : indisponible a 5, disponible a 6
	s["ronrons"] = 5.0
	ok(not PurchaseKitten.buy(s), "2e chaton refuse a 5 ronrons")
	ok(int(s["collection"]) == 1, "collection inchangee sur refus")
	s["ronrons"] = 6.0
	ok(PurchaseKitten.buy(s), "2e chaton adopte a 6 ronrons")
	ok(int(s["collection"]) == 2, "collection == 2")
	ok(float(s["ronrons"]) == 0.0, "cout debite exactement (6-6=0)")


func test_production_after_kitten() -> void:
	var s := CostCurve.initial_state()
	s["collection"] = 1
	# taux de base a ticks=0 : 1 * 0.5 * (1+0) * 1 + 0 = 0.5
	ok(is_equal_approx(Production.taux(s), 0.5), "taux de base a ticks=0 == 0.5")
	var before := float(s["ronrons"])
	Production.tick(s)
	ok(float(s["ronrons"]) > before, "un tick produit des ronrons (>0)")
	ok(int(s["ticks"]) == 1, "un tick incremente le compteur")


func test_production_warmth_rises() -> void:
	# Le ronronnement s'intensifie : a chaton constant, le taux CROIT tick apres tick.
	var s := CostCurve.initial_state()
	s["collection"] = 1
	var t0 := Production.taux(s)
	s["ticks"] = 10
	var t10 := Production.taux(s)
	ok(t10 > t0, "taux(ticks=10) > taux(ticks=0) (affinite croissante)")
	# increment d'affinite exact : 1 * 0.05 * 10 = 0.5
	ok(is_equal_approx(t10 - t0, 0.5), "increment d'affinite exact sur 10 ticks == 0.5")


func test_production_zero_without_kitten() -> void:
	var s := CostCurve.initial_state()
	ok(Production.taux(s) == 0.0, "taux == 0 sans chaton")
	s["ticks"] = 100
	ok(Production.taux(s) == 0.0, "taux reste 0 sans chaton, meme apres 100 ticks")


func test_upgrade_raises_rate_strict() -> void:
	# A ticks CONSTANT, une amelioration releve STRICTEMENT le taux.
	var s := CostCurve.initial_state()
	s["collection"] = 1
	s["ticks"] = 5
	s["ronrons"] = 1000.0
	var before := Production.taux(s)
	ok(Upgrade.buy_upgrade(s), "amelioration achetee")
	ok(int(s["upgrade_level"]) == 1, "niveau d'amelioration == 1")
	var after := Production.taux(s)
	ok(after > before, "taux_apres > taux_avant (strict)")
	# effet exact : base passe de 0.5 a 0.75 (x1.5) -> +0.25 sur le terme de base
	ok(is_equal_approx(after - before, 0.25), "amelioration ajoute exactement +0.25 a la base")


func test_meta_unlock() -> void:
	var s := CostCurve.initial_state()
	s["ronrons"] = 20.0
	ok(MetaUnlock.unlock(s), "deblocage a 20 ronrons")
	ok(int(s["locations"]) == 2, "un nouveau lieu (jardin) debloque")
	ok(float(s["ronrons"]) == 0.0, "cout de deblocage debite (20-20=0)")
	ok(not MetaUnlock.unlock(s), "second deblocage refuse sans ronrons")


func test_prestige() -> void:
	var s := CostCurve.initial_state()
	s["collection"] = 3
	s["ronrons"] = 50.0
	ok(not Prestige.can_prestige(s), "prestige refuse sous le seuil (50 < 100)")
	ok(not Prestige.prestige(s), "prestige n'a pas lieu sous le seuil")
	s["ronrons"] = CostCurve.PRESTIGE_THRESHOLD
	ok(Prestige.prestige(s), "prestige au seuil")
	ok(float(s["ronrons"]) == 0.0, "ronrons remis a 0 par le prestige")
	ok(int(s["collection"]) == 0, "collection remise a 0 par le prestige")
	ok(float(s["prestige_mult"]) == CostCurve.PRESTIGE_FACTOR, "multiplicateur == PRESTIGE_FACTOR")
	ok(int(s["prestige_count"]) == 1, "un prestige comptabilise")


func test_palier_ladder() -> void:
	# earned monotone -> palier monotone -> objectifs distincts.
	var s := CostCurve.initial_state()
	ok(CostCurve.palier(s) == 0, "palier 0 a l'etat neuf")
	s["earned"] = CostCurve.PALIER_STEP * 3.0
	ok(CostCurve.palier(s) == 3, "palier 3 apres 3 tranches franchies")
	s["earned"] = CostCurve.PALIER_STEP * 3.0 + 1.0
	ok(CostCurve.palier(s) == 3, "palier stable dans une tranche")
