# upgrade_rate.test.gd — acheter une amelioration augmente STRICTEMENT le taux (jamais >=).
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")
const Upgrades = preload("res://05_SYSTEMS/economy/upgrades.gd")
const Economy = preload("res://05_SYSTEMS/economy/economy.gd")
const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")

const IDS := ["k1", "k2"]


func run(h) -> void:
	# cout : base puis croissance
	var s = GameState.initial(6)
	h.eq(Upgrades.cout(s), P.UPGRADE_BASE_COST, "upgrade: 1re amelioration au cout de base")
	s.upgrade_level = 1
	h.gt(Upgrades.cout(s), P.UPGRADE_BASE_COST, "upgrade: la 2e amelioration coute plus")

	# avec >=1 chaton : taux_apres > taux_avant STRICT
	var s2 = GameState.initial(6)
	s2.ronrons = 1000.0
	Economy.acheter_chaton(s2, IDS)               # 1 chaton -> taux de base > 0
	var r: Dictionary = Upgrades.acheter(s2)
	h.ok(r["ok"], "upgrade: amelioration finançable achetee")
	h.gt(float(r["taux_apres"]), float(r["taux_avant"]), "upgrade: le taux MONTE strictement")
	h.eq(s2.upgrade_level, 1, "upgrade: le niveau d'amelioration passe a 1")
	# valeur exacte : taux = n * prod * (1 + step)
	h.eq(s2.taux, 1.0 * P.KITTEN_PROD_PER * (1.0 + P.UPGRADE_STEP),
		"upgrade: taux apres = n*prod*(1+step)")

	# cout deduit : 1er chaton au cout de base, puis 1re amelioration au cout de base
	h.eq(s2.ronrons, 1000.0 - P.KITTEN_BASE_COST - P.UPGRADE_BASE_COST,
		"upgrade: cout de l'amelioration deduit du solde")

	# non finançable : IGNORE (etat inchange)
	var s3 = GameState.initial(6)
	s3.ronrons = 5.0
	Economy.acheter_chaton(s3, IDS)   # depense possible ? cout base 15 > 5 -> pas de chaton
	var lvl_avant: int = s3.upgrade_level
	var r3: Dictionary = Upgrades.acheter(s3)
	h.ok(not r3["ok"], "upgrade: non finançable -> refuse")
	h.eq(s3.upgrade_level, lvl_avant, "upgrade: niveau inchange si refuse")
