# collection.test.gd — suivi de collection : X distincts sur T, progression a chaque
# deblocage, texte "X/T".
extends RefCounted

const Collection = preload("res://05_SYSTEMS/collection/collection.gd")
const Economy = preload("res://05_SYSTEMS/economy/economy.gd")
const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")

const IDS := ["a", "b", "c"]


func run(h) -> void:
	var s = GameState.initial(3)
	h.eq(Collection.distincts(s), 0, "collection: 0 distinct au depart")
	h.eq(Collection.total(s), 3, "collection: total = taille du registre")
	h.eq(Collection.texte(s), "0/3", "collection: texte initial 0/3")
	h.ok(not Collection.complete(s), "collection: incomplete au depart")

	# un achat debloque un distinct -> X passe de 0 a 1
	s.ronrons = 100000.0
	Economy.acheter_chaton(s, IDS)
	h.eq(Collection.distincts(s), 1, "collection: X passe a 1 apres un deblocage")
	h.eq(Collection.texte(s), "1/3", "collection: texte 1/3")

	Economy.acheter_chaton(s, IDS)
	Economy.acheter_chaton(s, IDS)
	h.eq(Collection.distincts(s), 3, "collection: X atteint le total")
	h.ok(Collection.complete(s), "collection: complete a X==T")

	# un achat au-dela du registre n'augmente PLUS le distinct
	Economy.acheter_chaton(s, IDS)
	h.eq(Collection.distincts(s), 3, "collection: plafonne au total (pas de faux distinct)")
