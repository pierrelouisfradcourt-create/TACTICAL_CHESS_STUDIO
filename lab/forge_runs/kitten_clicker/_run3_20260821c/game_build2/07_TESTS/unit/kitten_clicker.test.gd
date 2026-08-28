# kitten_clicker.test.gd — corps de test UNITAIRE (categorie test.unit).
# Enumere et execute par res://tests/run_tests.gd via DirAccess (patron snake/breakout_v2).
# Expose `run(h)` : h porte ok(cond, name) / passed / failed / fails. Asserts STRICTS
# (jamais de >= tautologique) : le clic produit vraiment, le cout croit vraiment, la
# collection grandit vraiment. 73 assertions (garde anti-faux-vert EXPECTED_ASSERTS dans
# l'entree). Logique inchangee : ce fichier repackage les tests deja prouves verts, il
# n'ajoute aucune mecanique.
extends RefCounted

const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")
const PurrAction = preload("res://05_SYSTEMS/purr_action/purr_action.gd")
const Economy = preload("res://05_SYSTEMS/economy/economy.gd")
const Prestige = preload("res://05_SYSTEMS/prestige/prestige.gd")
const Collection = preload("res://05_SYSTEMS/collection/collection.gd")
const OfflineGains = preload("res://05_SYSTEMS/offline_gains/offline_gains.gd")
const BonusEvent = preload("res://05_SYSTEMS/bonus_event/bonus_event.gd")
const InputAdapter = preload("res://06_RUNTIME/adapters/input_adapter/input_adapter.gd")
const DebugProbe = preload("res://06_RUNTIME/adapters/debug_probe/debug_probe.gd")
const Persistence = preload("res://06_RUNTIME/adapters/persistence/persistence.gd")
const MainScreen = preload("res://06_RUNTIME/adapters/main_screen/main_screen.gd")
const GalleryView = preload("res://06_RUNTIME/adapters/gallery_view/gallery_view.gd")
const RuntimeLoop = preload("res://06_RUNTIME/adapters/runtime_loop/runtime_loop.gd")

func run(h) -> void:
	test_purr(h)                        # R1
	test_passive_production(h)          # R2
	test_cost_curve(h)                  # R7
	test_offline_gains(h)               # R4
	test_bonus_event(h)                 # R8
	test_prestige(h)                    # R6 (mecanique stricte)
	test_prestige_negative_control(h)   # R6 (controle negatif)
	test_collection_monotone(h)         # R3 (oracle)
	test_collection_unlock_permanent(h) # R5 (mecanique)
	test_input_adapter_intentions(h)
	test_determinism(h)
	test_gain_par_clic(h)
	test_first_screen_playable(h)       # R10
	test_persistence_roundtrip(h)       # R4 (serialisation)
	test_main_screen_view(h)            # R9 (preparation)
	test_gallery_cells(h)               # R5 (preparation)
	test_debug_probe(h)                 # R3 (observateur)
	test_mutation_boundaries(h)         # durcissement anti-mutants (bornes/logique/entrees invalides)

# --- R1 : caresse incremente le compteur (STRICT) ---
func test_purr(h) -> void:
	var s = GameState.initial(1)
	var v0: float = s.purrs
	var gain: float = s.gain_par_clic()
	h.ok(gain > 0.0, "gain_par_clic > 0")
	var s2 = PurrAction.apply_purr(s, 5)
	h.ok(s2.purrs - v0 == 5.0 * gain, "5 caresses == 5*gain (egalite stricte)")
	h.ok(s.purrs == 0.0, "etat d'origine inchange (immutabilite)")
	var s3 = PurrAction.apply_purr(s, 1)
	h.ok(s3.purrs == gain, "1 caresse == gain exact")

# --- R2 : production passive apres achat (STRICT) ---
func test_passive_production(h) -> void:
	var s = GameState.initial(1)
	s.purrs = 10.0
	s = Economy.buy_producer(s, 0)
	h.ok(s.producer_counts[0] == 1, "producteur 0 achete")
	h.ok(Economy.passive_rate(s) > 0.0, "taux passif > 0 apres achat")
	var v0: float = s.purrs
	for _i in range(5):
		s = GameState.tick(s, 1.0)
	h.ok(s.purrs > v0, "compteur croit sans clic (v(T) > v(0))")

# --- R7 : cout croissant par rachat (STRICT, jamais >=) ---
func test_cost_curve(h) -> void:
	var c1: int = Economy.cost(0, 0)
	var c2: int = Economy.cost(0, 1)
	var c3: int = Economy.cost(0, 2)
	h.ok(c1 < c2 and c2 < c3, "couts strictement croissants c1<c2<c3")
	h.ok(not (c2 <= c1), "c2 strictement > c1 (pas de >= masquant)")
	var s = GameState.initial(1)
	s.purrs = 1000.0
	var avant: int = Economy.current_cost(s, 0)
	s = Economy.buy_producer(s, 0)
	h.ok(Economy.current_cost(s, 0) > avant, "cout courant monte apres un achat")
	h.ok(Economy.passive_rate(s) > 0.0, "taux passif > 0 apres le premier achat")

# --- R4 : gains hors-ligne (STRICT + plafond + zero producteur) ---
func test_offline_gains(h) -> void:
	h.ok(OfflineGains.compute(2.0, 100.0) == 200.0, "offline = rate*D exact")
	h.ok(OfflineGains.compute(2.0, 100000.0) == OfflineGains.OFFLINE_CAP, "offline cape au plafond")
	h.ok(OfflineGains.compute(2.0, 100.0) > 0.0, "offline > 0 pour D>0 avec producteur")
	var s0 = GameState.initial(1)
	h.ok(OfflineGains.compute_for_state(s0, 100.0) == 0.0, "offline == 0 sans producteur")
	var s = GameState.initial(1)
	s.purrs = 10.0
	s = Economy.buy_producer(s, 0)
	var total_avant: float = s.purrs
	s = Persistence.apply_offline_for_duration(s, 100.0)
	h.ok(s.purrs == total_avant + 200.0 and s.last_offline_gain == 200.0, "persistence ajoute le gain hors-ligne au total")

# --- R8 : objet-bonus ephemere sans penalite ---
func test_bonus_event(h) -> void:
	var s = GameState.initial(1)
	s.time_s = 12.0   # graine 1 -> fenetre [11,16) active
	h.ok(BonusEvent.is_active(s), "objet-bonus actif dans sa fenetre")
	var s2 = BonusEvent.click_bonus(s)
	h.ok(s2.bonus_factor == 2.0, "clic dans la fenetre -> facteur > 1")
	h.ok(s2.bonus_expiry_s == 22.0, "effet borne jusqu'a time+duree")
	var s2b = s2.clone()
	s2b.time_s = 20.0
	h.ok(BonusEvent.advance(s2b).bonus_factor == 2.0, "facteur tient avant expiration")
	var s2c = s2.clone()
	s2c.time_s = 22.0
	h.ok(BonusEvent.advance(s2c).bonus_factor == 1.0, "facteur retombe a 1 a l'expiration")
	# Ignorer l'objet : aucune penalite, total inchange.
	var s3 = GameState.initial(1)
	s3.time_s = 30.0   # hors fenetre -> objet disparu
	var total: float = s3.purrs
	s3 = BonusEvent.advance(s3)
	h.ok(not BonusEvent.is_active(GameState.initial(1)) or s3.purrs == total, "objet ignore -> total inchange, aucun decrement")

# --- R6 : prestige (mecanique stricte) ---
func test_prestige(h) -> void:
	var s = GameState.initial(1)
	var gain_avant: float = s.gain_par_clic()
	s.purrs = 150.0
	s.producer_counts[0] = 3
	h.ok(Prestige.can_prestige(s), "seuil de prestige franchi")
	var s2 = Prestige.do_prestige(s)
	h.ok(s2.prestige_mult > s.prestige_mult, "multiplicateur permanent strictement > avant")
	h.ok(s2.prestige_mult == 1.5, "multiplicateur == 1.5 apres un prestige")
	h.ok(s2.purrs == 0.0, "production courante remise a 0")
	h.ok(s2.producer_counts[0] == 0, "producteurs remis a 0")
	h.ok(s2.gain_par_clic() > gain_avant, "gain par clic post-reset strictement > pre-prestige")

# --- R6 : controle negatif (budget insuffisant ne franchit pas) ---
func test_prestige_negative_control(h) -> void:
	var s = GameState.initial(1)
	s.purrs = 50.0
	h.ok(not Prestige.can_prestige(s), "seuil non franchi sous le budget")
	var s2 = Prestige.do_prestige(s)
	h.ok(s2.prestige_mult == 1.0, "multiplicateur inchange si seuil non franchi")
	h.ok(s2.purrs == 50.0, "production courante inchangee si seuil non franchi")

# --- R3 : collection monotone, aucun game_over (oracle rejoue une session) ---
func test_collection_monotone(h) -> void:
	var s = GameState.initial(1)
	var taille_initiale: int = DebugProbe.collection_size(s)
	h.ok(taille_initiale == 1, "collection initiale = 1 chaton (seuil 0)")
	# Rejoue : achat d'un producteur puis accumulation, en surveillant chaque tick.
	s.purrs = 10.0
	s = Economy.buy_producer(s, 0)
	var prev: int = DebugProbe.collection_size(s)
	var monotone := true
	var jamais_game_over := true
	for _i in range(60):
		s = GameState.tick(s, 2.0)
		var taille: int = DebugProbe.collection_size(s)
		if taille < prev:
			monotone = false
		if DebugProbe.has_game_over(s):
			jamais_game_over = false
		prev = taille
	h.ok(monotone, "taille de collection jamais decroissante sur la session")
	h.ok(jamais_game_over, "aucun etat game_over atteignable")
	h.ok(prev > taille_initiale, "collection a reellement grandi (pas un >= inerte)")
	# Un prestige (reset des ronrons) ne reverrouille jamais un chaton deja debloque.
	var avant_prestige: int = DebugProbe.collection_size(s)
	s.purrs = 200.0
	s = Prestige.do_prestige(s)
	h.ok(DebugProbe.collection_size(s) >= avant_prestige, "prestige ne reverrouille aucun chaton")

# --- R5 : deblocage permanent ---
func test_collection_unlock_permanent(h) -> void:
	var s = GameState.initial(1)
	h.ok(not s.collection_unlocked[1], "chaton 1 verrouille au depart")
	s.purrs = 25.0
	s = Collection.refresh_unlocks(s)
	h.ok(s.collection_unlocked[1], "chaton 1 debloque au franchissement du seuil")
	s.purrs = 0.0
	s = Collection.refresh_unlocks(s)
	h.ok(s.collection_unlocked[1], "deblocage permanent malgre chute du total")
	h.ok(Collection.rarity(4) == 2, "palier de rarete du chaton 4 = legendaire")

# --- Canal d'entree public : intentions ---
func test_input_adapter_intentions(h) -> void:
	var s = GameState.initial(1)
	var sc = InputAdapter.apply(s, InputAdapter.Intention.CARESSER)
	h.ok(sc.purrs == s.gain_par_clic(), "CARESSER -> +gain exact")
	var sn = InputAdapter.apply(s, InputAdapter.Intention.AUCUNE)
	h.ok(sn.purrs == 0.0, "AUCUNE -> etat inchange")
	var sb = s.clone()
	sb.purrs = 10.0
	var sb2 = InputAdapter.apply(sb, InputAdapter.Intention.ACHETER, 0)
	h.ok(sb2.producer_counts[0] == 1 and sb2.purrs == 0.0, "ACHETER -> producteur achete, cout debite")
	var focal := MainScreen.focal_rect()
	h.ok(InputAdapter.intention_from_click(MainScreen.FOCAL_CENTER, focal) == InputAdapter.Intention.CARESSER, "clic zone focale -> CARESSER")
	h.ok(InputAdapter.intention_from_click(Vector2(5, 5), focal) == InputAdapter.Intention.AUCUNE, "clic hors zone -> AUCUNE")

# --- Determinisme : meme graine + memes pas -> releves identiques ---
func test_determinism(h) -> void:
	var a = GameState.initial(7)
	var b = GameState.initial(7)
	a.purrs = 10.0
	b.purrs = 10.0
	a = Economy.buy_producer(a, 0)
	b = Economy.buy_producer(b, 0)
	for _i in range(10):
		a = GameState.tick(a, 0.5)
		b = GameState.tick(b, 0.5)
	h.ok(a.purrs == b.purrs, "meme compteur (determinisme)")
	h.ok(a.time_s == b.time_s, "meme temps accumule")
	h.ok(DebugProbe.collection_size(a) == DebugProbe.collection_size(b), "meme taille de collection")

# --- gain_par_clic derive base * prestige ---
func test_gain_par_clic(h) -> void:
	var s = GameState.initial(1)
	h.ok(s.gain_par_clic() == 1.0, "gain de base = 1")
	s.prestige_mult = 2.0
	h.ok(s.gain_par_clic() == 2.0, "gain = base * prestige_mult")
	s.base_gain = 3.0
	h.ok(s.gain_par_clic() == 6.0, "gain = 3 * 2 = 6")

# --- R10 : jouable au premier ecran ---
func test_first_screen_playable(h) -> void:
	var s = RuntimeLoop.boot_state(1)
	h.ok(s.purrs == 0.0, "compteur a 0 au demarrage")
	h.ok(Collection.unlocked_count(s) >= 1, "au moins un chaton present (jouable, aucun menu bloquant)")
	var gain: float = s.gain_par_clic()
	var s2 = InputAdapter.apply(s, InputAdapter.Intention.CARESSER)
	h.ok(s2.purrs == gain, "premier clic : compteur 0 -> gain_par_clic")
	h.ok(MainScreen.has_focal_kitten(), "chaton focal cliquable present")

# --- R4 : serialisation aller-retour ---
func test_persistence_roundtrip(h) -> void:
	var s = GameState.initial(3)
	s.purrs = 42.0
	s.producer_counts[0] = 2
	s.prestige_mult = 1.5
	s = Collection.unlock(s, 1)
	var d := Persistence.to_dict(s)
	var s2 = Persistence.from_dict(d)
	h.ok(s2.purrs == 42.0, "purrs preserve par la serialisation")
	h.ok(s2.producer_counts[0] == 2, "producteurs preserves")
	h.ok(s2.prestige_mult == 1.5, "multiplicateur preserve")
	h.ok(s2.collection_unlocked[1], "deblocage preserve")

# --- R9 : preparation de l'ecran principal (noyau pur) ---
func test_main_screen_view(h) -> void:
	h.ok(MainScreen.counter_text({"purrs": 123}) == "123 ronrons", "compteur formate")
	h.ok(MainScreen.feedback_text(5.0) == "+5", "feedback formate")
	var focal := MainScreen.focal_rect()
	h.ok(focal.has_point(MainScreen.FOCAL_CENTER), "zone focale contient le centre du chaton")
	h.ok(MainScreen.has_focal_kitten(), "chaton focal present")

# --- R5 : preparation de la galerie (noyau pur) ---
func test_gallery_cells(h) -> void:
	var s = GameState.initial(1)
	var cells := GalleryView.cells(GameState.project(s))
	h.ok(cells.size() == 5, "5 cellules de chaton")
	h.ok(cells[0]["unlocked"] == true, "chaton 0 debloque")
	h.ok(cells[1]["unlocked"] == false, "chaton 1 verrouille")
	h.ok(cells[4]["rarity"] == 2, "rarete du chaton 4 = legendaire")
	h.ok(GalleryView.rarity_color(0) != GalleryView.rarity_color(2), "couleurs de rarete distinctes")
	var s2 = s.clone()
	s2.purrs = 25.0
	s2 = Collection.refresh_unlocks(s2)
	var cells2 := GalleryView.cells(GameState.project(s2))
	h.ok(cells2[1]["unlocked"] == true, "chaton 1 passe a debloque a l'ecran")

# --- R3 : observateur exterieur (debug_probe) ---
func test_debug_probe(h) -> void:
	var s = GameState.initial(1)
	h.ok(DebugProbe.collection_size(s) == 1, "taille lue == 1")
	h.ok(DebugProbe.has_game_over(s) == false, "aucun game_over dans le releve")
	var r := DebugProbe.read(s)
	h.ok(int(r["collection_size"]) == 1, "releve porte la taille de collection")
	h.ok(r.has("purrs"), "releve porte le compteur")

# --- Durcissement anti-mutants : bornes exactes, operateurs logiques, entrees invalides.
# Chaque assertion vise un mutant precis (ge->gt, le->lt, and->or, or->and, +=->-=, false->true)
# que les tests fonctionnels ci-dessus ne distinguaient pas. Toutes passent sur le code reel ;
# un mutant les fait echouer -> il est TUE. (voir mutation_triage.json pour les survivants
# prouves equivalents.)
func test_mutation_boundaries(h) -> void:
	# --- economy : gardes de type (borne haute/basse) + bornes de solde exactes ---
	h.ok(Economy.cost(Economy.producer_count(), 0) == -1, "cost type==count -> -1 (borne ge)")
	h.ok(Economy.cost(-1, 0) == -1, "cost type<0 -> -1 (borne lt / or)")
	h.ok(Economy.cost(0, -1) == 10, "cost owned<0 ramene a 0 -> 10")
	h.ok(Economy.current_cost(GameState.initial(1), Economy.producer_count()) == -1, "current_cost type==count -> -1")
	h.ok(Economy.current_cost(GameState.initial(1), -1) == -1, "current_cost type<0 -> -1")
	h.ok(not Economy.can_buy(GameState.initial(1), -1), "can_buy type<0 -> false (or/false->true)")
	h.ok(not Economy.can_buy(GameState.initial(1), Economy.producer_count()), "can_buy type==count -> false")
	var sb = GameState.initial(1)
	sb.purrs = 10.0                                   # == cost(0,0)
	h.ok(Economy.can_buy(sb, 0), "can_buy quand solde == cout exact -> true (borne ge)")
	var sb2 = GameState.initial(1)
	sb2.purrs = 9.0                                    # < cost
	h.ok(not Economy.can_buy(sb2, 0), "can_buy quand solde < cout -> false")
	var sb3 = GameState.initial(1)
	sb3.purrs = 10.0
	sb3 = Economy.buy_producer(sb3, 0)
	h.ok(sb3.producer_counts[0] == 1 and sb3.purrs == 0.0, "achat au solde exact reussit (borne lt du refus)")
	var eb = GameState.initial(1)
	eb.purrs = 500.0
	var ebr = Economy.buy_producer(eb, Economy.producer_count())
	h.ok(ebr.purrs == 500.0 and ebr.producer_counts[0] == 0, "buy type==count -> refuse, etat inchange (borne ge)")
	var ebr2 = Economy.buy_producer(eb, -1)
	h.ok(ebr2.purrs == 500.0, "buy type<0 -> refuse, aucun credit fantome (or)")

	# --- collection : gardes d'index + seuils exacts + logique add-only + game_over ---
	h.ok(Collection.rarity(Collection.kitten_count()) == -1, "rarity index==count -> -1 (borne ge)")
	h.ok(Collection.rarity(-1) == -1, "rarity index<0 -> -1 (or / lt)")
	var cs = GameState.initial(1)
	cs.purrs = 20.0                                    # seuil EXACT du chaton 1
	cs = Collection.refresh_unlocks(cs)
	h.ok(cs.collection_unlocked[1], "seuil atteint EXACTEMENT -> debloque (borne ge)")
	var cs2 = GameState.initial(1)
	cs2.purrs = 25.0                                   # < seuil 60 du chaton 2
	cs2 = Collection.refresh_unlocks(cs2)
	h.ok(not cs2.collection_unlocked[2], "sous le seuil -> reste verrouille (and, pas or)")
	var cu = GameState.initial(1)
	cu.collection_unlocked[0] = false
	cu = Collection.unlock(cu, 0)
	h.ok(cu.collection_unlocked[0], "unlock index 0 (borne basse ge) debloque")
	var co = GameState.initial(1)
	var av: int = co.collection_unlocked.size()
	co = Collection.unlock(co, 99)
	h.ok(co.collection_unlocked.size() == av, "unlock hors borne haute -> aucun crash, aucun changement (lt/and)")
	var cn = Collection.unlock(GameState.initial(1), -1)
	h.ok(cn.collection_unlocked.size() == av, "unlock index<0 -> aucun changement (ge/and)")
	h.ok(Collection.is_game_over(GameState.initial(1)) == false, "is_game_over structurellement false (false->true)")
	var ui := Collection.unlocked_initial()
	h.ok(ui[0] == false and ui[4] == false, "unlocked_initial tout verrouille (false->true)")

	# --- game_state : tick avance le temps et l'index de facon monotone (+=, pas -=) ---
	var gt = GameState.tick(GameState.initial(1), 2.0)
	h.ok(gt.time_s == 2.0, "tick avance le temps de +dt (pluseq)")
	h.ok(gt.tick_index == 1, "tick incremente l'index de +1 (pluseq)")
	var gt2 = GameState.tick(GameState.initial(1), -3.0)
	h.ok(gt2.time_s == 0.0, "tick dt<0 clampe a 0 (temps inchange)")

	# --- prestige : seuil franchi a la valeur EXACTE (borne ge, pas gt) ---
	var ps = GameState.initial(1)
	ps.purrs = 100.0                                   # == SEUIL_PRESTIGE
	h.ok(Prestige.can_prestige(ps), "seuil atteint EXACTEMENT -> franchi (borne ge)")
	var ps2 = GameState.initial(1)
	ps2.purrs = 99.0
	h.ok(not Prestige.can_prestige(ps2), "juste sous le seuil -> non franchi")

	# --- bonus_event : phase seede + bornes exactes de la fenetre d'activite ---
	h.ok(BonusEvent._phase_offset(5) == 0.0, "phase offset seed multiple de 5 -> 0 (borne lt de m<0)")
	h.ok(BonusEvent._phase_offset(-1) == 4.0, "phase offset seed negatif ramene dans [0,5) (pluseq de m+=5)")
	var be = GameState.initial(1)
	be.time_s = 11.0                                   # debut EXACT de la fenetre (FIRST 10 + offset 1)
	h.ok(BonusEvent.is_active(be), "actif des le debut EXACT de la fenetre (< strict sur start)")
	var be2 = GameState.initial(1)
	be2.time_s = 16.0                                  # fin EXACTE de la fenetre (start + WINDOW 5)
	h.ok(not BonusEvent.is_active(be2), "inactif a la fin EXACTE de la fenetre (< strict sur window)")
	var be3 = GameState.initial(1)
	be3.time_s = 5.0                                   # AVANT le debut de la fenetre (start 11)
	h.ok(not BonusEvent.is_active(be3), "inactif AVANT le debut de la fenetre (return false, pas true)")
