# game_state.test.gd — l'etat de partie pur : valeurs initiales, vocabulaire ferme,
# multiplicateurs, clone independant, snapshot.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")
const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")


func run(h) -> void:
	var s = GameState.initial(6)
	h.eq(s.ronrons, 0.0, "state: ronrons initiaux nuls")
	h.eq(s.total_earned, 0.0, "state: total gagne initial nul")
	h.eq(s.kittens.size(), 0, "state: colonie vide au depart")
	h.eq(s.unlocked.size(), 0, "state: aucune collection au depart")
	h.eq(s.palier, 0, "state: palier initial 0")
	h.eq(s.upgrade_level, 0, "state: aucune amelioration")
	h.eq(s.prestige_units, 0, "state: aucun bonus de prestige")
	h.eq(s.statut, P.STATUT_EN_COURS, "state: statut = en_cours (vocabulaire ferme)")
	h.eq(s.total_kittens, 6, "state: total registre porte")
	h.eq(s.place_unlocked, false, "state: 2e lieu verrouille au depart")

	# multiplicateurs : formules exactes (tuent une mutation d'operateur/coefficient)
	h.eq(s.prestige_mult(), 1.0, "state: prestige_mult vaut 1 sans bonus")
	s.prestige_units = 2
	h.eq(s.prestige_mult(), 1.0 + 2.0 * P.PRESTIGE_BONUS_PER, "state: prestige_mult = 1 + n*bonus")
	h.eq(s.upgrade_mult(), 1.0, "state: upgrade_mult vaut 1 sans amelioration")
	s.upgrade_level = 3
	h.eq(s.upgrade_mult(), 1.0 + 3.0 * P.UPGRADE_STEP, "state: upgrade_mult = 1 + n*step")

	# total minimum 1 (une entree nulle ne casse pas)
	var z = GameState.initial(0)
	h.eq(z.total_kittens, 1, "state: total borne a >=1")

	# clone INDEPENDANT : muter le clone ne touche pas l'original
	var a = GameState.initial(6)
	a.ronrons = 42.0
	a.kittens = ["x"]
	var c = a.clone()
	c.ronrons = 7.0
	c.kittens.append("y")
	h.eq(a.ronrons, 42.0, "state: clone n'altere pas l'original (ronrons)")
	h.eq(a.kittens.size(), 1, "state: clone duplique le tableau (pas de partage)")
	h.eq(c.ronrons, 7.0, "state: clone modifie independamment")

	# snapshot : lisible, comptes exacts
	var snap: Dictionary = a.snapshot()
	h.eq(snap["ronrons"], 42.0, "state: snapshot porte les ronrons")
	h.eq(snap["kittens"], 1, "state: snapshot compte la colonie")
	h.eq(snap["statut"], P.STATUT_EN_COURS, "state: snapshot porte le statut")
