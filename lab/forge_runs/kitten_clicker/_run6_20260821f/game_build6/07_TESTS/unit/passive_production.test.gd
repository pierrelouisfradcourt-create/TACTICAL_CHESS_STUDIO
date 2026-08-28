# passive_production.test.gd — economy.gd : clic (gain STRICT), production passive (delta
# STRICT), achat de chaton (cout deduit, deblocage distinct). Tue les mutants d'operateur.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")
const Economy = preload("res://05_SYSTEMS/economy/economy.gd")
const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")

const IDS := ["k1", "k2", "k3"]


func run(h) -> void:
	# ---------- CLIC : gain strict, N clics == N*gain (jamais un >=) ----------
	var s0 = GameState.initial(6)
	var g: float = Economy.clic(s0)
	h.eq(g, P.CLICK_GAIN, "clic: gain de base sans prestige")
	h.eq(s0.ronrons, P.CLICK_GAIN, "clic: 1 clic == 1 gain, depuis 0")
	var s1 = GameState.initial(6)
	for i in range(10):
		Economy.clic(s1)
	h.eq(s1.ronrons, 10.0 * P.CLICK_GAIN, "clic: 10 clics == 10*gain (strict)")
	h.eq(s1.total_earned, 10.0 * P.CLICK_GAIN, "clic: le total gagne suit le clic")
	# le bonus de prestige amplifie le clic
	var sp = GameState.initial(6)
	sp.prestige_units = 1
	var gp: float = Economy.clic(sp)
	h.eq(gp, P.CLICK_GAIN * (1.0 + P.PRESTIGE_BONUS_PER), "clic: le prestige amplifie le gain")

	# ---------- COUT du chaton : base puis croissance ----------
	var sc = GameState.initial(6)
	h.eq(Economy.cout_chaton(sc), P.KITTEN_BASE_COST, "cout: 1er chaton au cout de base")
	sc.kittens = ["x"]
	h.gt(Economy.cout_chaton(sc), P.KITTEN_BASE_COST, "cout: le 2e chaton coute PLUS que le 1er")

	# ---------- ACHAT non finançable : IGNORE, etat inchange ----------
	var s2 = GameState.initial(6)
	s2.ronrons = 1.0
	var r2: Dictionary = Economy.acheter_chaton(s2, IDS)
	h.ok(not r2["ok"], "achat: non finançable -> refuse")
	h.ok(not r2["unlocked_new"], "achat: un refus ne debloque AUCUN distinct (ok:false ET unlocked_new:false)")
	h.eq(s2.kittens.size(), 0, "achat: colonie inchangee")
	h.eq(s2.ronrons, 1.0, "achat: solde inchange")

	# ---------- ACHAT finançable : cout deduit, distinct debloque ----------
	var s3 = GameState.initial(6)
	s3.ronrons = 100.0
	var r3: Dictionary = Economy.acheter_chaton(s3, IDS)
	h.ok(r3["ok"], "achat: finançable -> accepte")
	h.ok(r3["unlocked_new"], "achat: 1er achat debloque un chaton DISTINCT")
	h.eq(String(r3["kitten_id"]), "k1", "achat: debloque le 1er du registre")
	h.eq(s3.kittens.size(), 1, "achat: colonie +1")
	h.eq(s3.unlocked.size(), 1, "achat: collection +1")
	h.eq(s3.ronrons, 100.0 - P.KITTEN_BASE_COST, "achat: cout deduit EXACTEMENT")

	# ---------- PRODUCTION PASSIVE : delta STRICT > 0 avec >=1 chaton, deterministe ----------
	var s4 = GameState.initial(6)
	s4.ronrons = 200.0
	Economy.acheter_chaton(s4, IDS)   # 1 chaton
	var avant: float = s4.ronrons
	var te_avant: float = s4.total_earned
	var d1: float = Economy.tick(s4)
	h.gt(d1, 0.0, "prod: delta strictement positif avec 1 chaton")
	h.gt(s4.ronrons, avant, "prod: les ronrons montent SANS clic")
	# le TOTAL gagne monte aussi au tick (tue le mutant += -> -= sur total_earned)
	h.gt(s4.total_earned, te_avant, "prod: le total gagne monte au tick de production")
	h.eq(s4.total_earned - te_avant, d1, "prod: le total gagne monte EXACTEMENT du delta produit")
	var d2: float = Economy.tick(s4)
	h.eq(d1, d2, "prod: production deterministe (taux constant -> meme delta)")
	h.eq(Economy.recalculer_taux(s4), 1.0 * P.KITTEN_PROD_PER, "prod: taux = n * prod_per")

	# ---------- ZERO chaton -> ZERO production (pas de production fantome) ----------
	var z = GameState.initial(6)
	z.ronrons = 50.0
	var dz: float = Economy.tick(z)
	h.eq(dz, 0.0, "prod: sans chaton, aucune production passive")
	h.eq(z.ronrons, 50.0, "prod: solde inchange sans chaton")

	# ---------- deblocage distinct BORNE au registre (pas de faux distinct au-dela) ----------
	var s5 = GameState.initial(2)
	s5.ronrons = 100000.0
	Economy.acheter_chaton(s5, ["a", "b"])
	Economy.acheter_chaton(s5, ["a", "b"])
	var r5: Dictionary = Economy.acheter_chaton(s5, ["a", "b"])  # 3e achat, registre epuise
	h.ok(not r5["unlocked_new"], "achat: au-dela du registre, aucun NOUVEAU distinct")
	h.eq(s5.unlocked.size(), 2, "achat: la collection distincte plafonne au registre")
	h.eq(s5.kittens.size(), 3, "achat: la colonie, elle, continue de grandir")
