# error_guard.test.gd — absorbe les entrees invalides sans invalider l'etat.
extends RefCounted

const Guard = preload("res://05_SYSTEMS/game_state/error_guard.gd")
const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")


func run(h) -> void:
	# peut_payer : cout <=0 refuse, insuffisant refuse, EXACT accepte (borne inclusive)
	h.ok(not Guard.peut_payer(100.0, 0.0), "guard: un cout nul n'est pas payable")
	h.ok(not Guard.peut_payer(100.0, -5.0), "guard: un cout negatif n'est pas payable")
	h.ok(not Guard.peut_payer(9.0, 10.0), "guard: solde insuffisant refuse")
	h.ok(Guard.peut_payer(10.0, 10.0), "guard: solde EXACTEMENT egal au cout paie (borne)")
	h.ok(Guard.peut_payer(11.0, 10.0), "guard: solde superieur paie")

	# borner : nan -> bas, clamp haut/bas
	h.eq(Guard.borner(5.0, 0.0, 10.0), 5.0, "guard: valeur dans les bornes inchangee")
	h.eq(Guard.borner(-3.0, 0.0, 10.0), 0.0, "guard: sous la borne basse -> bas")
	h.eq(Guard.borner(99.0, 0.0, 10.0), 10.0, "guard: au-dessus de la borne haute -> haut")
	h.eq(Guard.borner(NAN, 2.0, 10.0), 2.0, "guard: NaN retombe sur la borne basse")

	# gain_valide : strictement positif
	h.ok(Guard.gain_valide(0.5), "guard: un gain positif est valide")
	h.ok(not Guard.gain_valide(0.0), "guard: un gain nul est invalide")
	h.ok(not Guard.gain_valide(-1.0), "guard: un gain negatif est invalide")

	# etat_coherent : sentinelle. CHAQUE operande des OR est exerce ISOLEMENT (les autres
	# restant faux) pour tuer les mutants or->and : sous `and`, un seul operande vrai ne
	# suffit plus a rendre l'etat incoherent, l'assertion bascule.
	var s = GameState.initial(6)
	h.ok(Guard.etat_coherent(s), "guard: etat neuf coherent")
	# --- ligne des ronrons : chaque cause isolee rend incoherent ---
	s.ronrons = -1.0
	h.ok(not Guard.etat_coherent(s), "guard: ronrons negatifs (seuls) -> incoherent")
	s.ronrons = NAN
	h.ok(not Guard.etat_coherent(s), "guard: ronrons NaN (seuls) -> incoherent")
	s.ronrons = INF
	h.ok(not Guard.etat_coherent(s), "guard: ronrons infinis (seuls) -> incoherent")
	s.ronrons = 10.0
	h.ok(Guard.etat_coherent(s), "guard: ronrons positifs finis -> coherent")
	# --- ligne des compteurs : chaque compteur negatif isole rend incoherent
	# (tue les deux or->and de la ligne ET le `return false` false->true qui suit) ---
	s.upgrade_level = -1
	h.ok(not Guard.etat_coherent(s), "guard: upgrade_level negatif (seul) -> incoherent")
	s.upgrade_level = 0
	s.palier = -1
	h.ok(not Guard.etat_coherent(s), "guard: palier negatif (seul) -> incoherent")
	s.palier = 0
	h.ok(Guard.etat_coherent(s), "guard: compteurs remis a zero -> coherent")
	# --- statut hors vocabulaire ferme -> incoherent (tue une mutation du == final) ---
	s.statut = "defaite"
	h.ok(not Guard.etat_coherent(s), "guard: statut hors vocabulaire -> incoherent")
