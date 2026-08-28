# events.test.gd — nomme et derive les 4 evenements sonores des transitions d'etat.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")
const Events = preload("res://05_SYSTEMS/events/events.gd")


func run(h) -> void:
	# les 4 evenements existent et sont DISTINCTS
	h.eq(Events.TOUS.size(), 4, "events: 4 evenements sonores")
	var distincts := {}
	for e in Events.TOUS:
		distincts[e] = true
	h.eq(distincts.size(), 4, "events: les 4 sont deux a deux distincts")

	# clic -> ["click"]
	var c: Array = Events.pour_clic()
	h.eq(c.size(), 1, "events: un clic emet un evenement")
	h.eq(String(c[0]), P.EV_CLICK, "events: clic -> 'click'")

	# achat SANS deblocage -> ["buy"] ; achat AVEC deblocage -> ["buy","unlock"]
	var b: Array = Events.pour_achat(false)
	h.eq(b.size(), 1, "events: achat simple -> 1 evenement")
	h.eq(String(b[0]), P.EV_BUY, "events: achat -> 'buy'")
	var bu: Array = Events.pour_achat(true)
	h.eq(bu.size(), 2, "events: achat qui debloque -> 2 evenements")
	h.ok(P.EV_BUY in bu and P.EV_UNLOCK in bu, "events: 'buy' ET 'unlock' sur un achat debloquant")

	# prestige -> ["prestige"]
	var pr: Array = Events.pour_prestige()
	h.eq(String(pr[0]), P.EV_PRESTIGE, "events: prestige -> 'prestige'")

	# deblocage de lieu -> ["unlock"]
	var dl: Array = Events.pour_deblocage_lieu()
	h.eq(String(dl[0]), P.EV_UNLOCK, "events: deblocage de lieu -> 'unlock'")

	# connu : vocabulaire ferme
	h.ok(Events.connu(P.EV_CLICK), "events: 'click' est connu")
	h.ok(not Events.connu("inconnu"), "events: un nom hors vocabulaire n'est pas connu")
