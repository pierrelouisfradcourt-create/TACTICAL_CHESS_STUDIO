# Oracle tranche 1 — harnais de test headless (sans addon).
# Lancer : Godot_console.exe --headless --path <projet> --script res://tests/run_tests.gd
# exit code 0 = tous verts, 1 = au moins un échec.
extends SceneTree

const Piece = preload("res://core/piece.gd")
const Board = preload("res://core/board.gd")
const Moves = preload("res://core/moves.gd")
const Rules = preload("res://core/rules.gd")
const PieceDefs = preload("res://core/piece_defs.gd")
const Match = preload("res://core/match.gd")
const AI = preload("res://core/ai.gd")
const Cards = preload("res://core/cards.gd")

# Nombre d'assertions attendu — garde anti-FAUX-VERT : si le coeur ne compile pas,
# des tests avortent en silence ; ce total ne serait pas atteint -> échec forcé.
const EXPECTED_ASSERTS := 83

var _passed := 0
var _failed := 0
var _fails: Array = []

func _initialize() -> void:
	test_damage_formula()
	test_board_basics()
	test_knight_moves()
	test_rook_slide_and_block()
	test_pawn_moves()
	test_combat_kill_takes_square()
	test_combat_survive_no_take()
	test_damage_floor_min_one()
	test_illegal_move_rejected()
	test_victory_king_kill()
	test_victory_pressure_collapse()
	test_promotion_pawn()
	test_no_victory_ongoing()
	# --- tranche 2 ---
	test_traversal_counterattack()
	test_traversal_kills_mover()
	test_retaliation_on_survive()
	test_knight_exempt_from_traversal()
	# --- tranche 3 : mise en place + BRAWL + partie ---
	test_initial_board()
	test_brawl_attrition()
	test_brawl_snapshot_simultaneous()
	test_match_turn_flow()
	test_match_rejects_wrong_side()
	# --- tranche 4 + IA ---
	test_board_clone()
	test_fatigue_curve()
	test_ai_returns_legal_move()
	test_ai_takes_free_capture()
	# --- tranche 5 : cartes ---
	test_card_effects()
	test_match_card_flow()
	var total := _passed + _failed
	if total != EXPECTED_ASSERTS:
		_failed += 1
		_fails.append("META: %d/%d assertions exécutées (coeur non chargé ?)" % [total, EXPECTED_ASSERTS])
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

func mk(type: int, side: int, hp: int, atk: int, arm: int):
	return Piece.new(type, side, hp, atk, arm)

# --- tests ---

func test_damage_formula() -> void:
	ok(Rules.damage(3, 1) == 2, "damage 3-1=2")
	ok(Rules.damage(1, 5) == 1, "damage floor -> 1")
	ok(Rules.damage(4, 0) == 4, "damage 4-0=4")

func test_board_basics() -> void:
	var b = Board.new()
	ok(b.is_empty(Vector2i(0, 0)), "board empty at 0,0")
	ok(Board.in_bounds(Vector2i(7, 7)), "7,7 in bounds")
	ok(not Board.in_bounds(Vector2i(8, 0)), "8,0 out of bounds")
	ok(not Board.in_bounds(Vector2i(-1, 3)), "-1,3 out of bounds")
	var p = mk(Piece.Type.ROOK, 0, 7, 2, 1)
	b.set_piece(Vector2i(3, 3), p)
	ok(b.get_piece(Vector2i(3, 3)) == p, "get returns placed piece")
	ok(not b.is_empty(Vector2i(3, 3)), "cell now occupied")
	b.remove(Vector2i(3, 3))
	ok(b.is_empty(Vector2i(3, 3)), "cell empty after remove")

func test_knight_moves() -> void:
	var b = Board.new()
	b.set_piece(Vector2i(4, 4), mk(Piece.Type.KNIGHT, 0, 6, 2, 0))
	var d = Moves.destinations(b, Vector2i(4, 4))
	ok(Vector2i(5, 6) in d, "knight reaches 5,6")
	ok(Vector2i(2, 3) in d, "knight reaches 2,3")
	ok(not (Vector2i(4, 5) in d), "knight cannot reach adjacent 4,5")
	ok(d.size() == 8, "knight open board = 8 moves")

func test_rook_slide_and_block() -> void:
	var b = Board.new()
	b.set_piece(Vector2i(0, 0), mk(Piece.Type.ROOK, 0, 7, 2, 1))
	b.set_piece(Vector2i(0, 3), mk(Piece.Type.PAWN, 0, 3, 1, 0))   # allié bloque
	b.set_piece(Vector2i(3, 0), mk(Piece.Type.PAWN, 1, 3, 1, 0))   # ennemi
	var d = Moves.destinations(b, Vector2i(0, 0))
	ok(Vector2i(0, 1) in d and Vector2i(0, 2) in d, "rook slides to 0,1 0,2")
	ok(not (Vector2i(0, 3) in d), "rook blocked by ally (no include)")
	ok(Vector2i(3, 0) in d, "rook can attack enemy 3,0")
	ok(not (Vector2i(4, 0) in d), "rook stops after enemy")

func test_pawn_moves() -> void:
	var b = Board.new()
	b.set_piece(Vector2i(3, 1), mk(Piece.Type.PAWN, 0, 3, 1, 0))   # start rank side0
	b.set_piece(Vector2i(4, 2), mk(Piece.Type.PAWN, 1, 3, 1, 0))   # ennemi en diagonale
	var d = Moves.destinations(b, Vector2i(3, 1))
	ok(Vector2i(3, 2) in d, "pawn forward 1")
	ok(Vector2i(3, 3) in d, "pawn double from start")
	ok(Vector2i(4, 2) in d, "pawn diagonal capture")
	ok(not (Vector2i(2, 2) in d), "pawn no move to empty diagonal")
	# capture avant interdite
	var b2 = Board.new()
	b2.set_piece(Vector2i(3, 1), mk(Piece.Type.PAWN, 0, 3, 1, 0))
	b2.set_piece(Vector2i(3, 2), mk(Piece.Type.PAWN, 1, 3, 1, 0))  # ennemi devant
	ok(not (Vector2i(3, 2) in Moves.destinations(b2, Vector2i(3, 1))), "pawn cannot capture forward")

func test_combat_kill_takes_square() -> void:
	var b = Board.new()
	b.set_piece(Vector2i(4, 0), mk(Piece.Type.ROOK, 0, 7, 3, 0))
	b.set_piece(Vector2i(4, 3), mk(Piece.Type.KNIGHT, 1, 2, 2, 0))
	var r = Rules.resolve(b, Vector2i(4, 0), Vector2i(4, 3))
	ok(r.get("killed", false), "attack kills low-hp target")
	ok(b.is_empty(Vector2i(4, 0)), "attacker left origin")
	var moved = b.get_piece(Vector2i(4, 3))
	ok(moved != null and moved.type == Piece.Type.ROOK, "attacker took the square")
	ok(moved.kills == 1, "kill counted")

func test_combat_survive_no_take() -> void:
	var b = Board.new()
	b.set_piece(Vector2i(4, 0), mk(Piece.Type.ROOK, 0, 7, 3, 0))
	b.set_piece(Vector2i(4, 3), mk(Piece.Type.KNIGHT, 1, 5, 2, 0))
	var r = Rules.resolve(b, Vector2i(4, 0), Vector2i(4, 3))
	ok(r.get("attacked", false) and not r.get("killed", true), "target survives")
	ok(b.get_piece(Vector2i(4, 0)) != null, "attacker stayed (no take)")
	ok(b.get_piece(Vector2i(4, 3)).hp == 2, "target hp reduced 5-3=2")

func test_damage_floor_min_one() -> void:
	var b = Board.new()
	b.set_piece(Vector2i(4, 0), mk(Piece.Type.ROOK, 0, 7, 1, 0))
	b.set_piece(Vector2i(4, 3), mk(Piece.Type.KNIGHT, 1, 10, 2, 5))  # arm 5
	var r = Rules.resolve(b, Vector2i(4, 0), Vector2i(4, 3))
	ok(r.get("damage", -1) == 1, "min 1 damage through high arm")
	ok(b.get_piece(Vector2i(4, 3)).hp == 9, "target 10-1=9")

func test_illegal_move_rejected() -> void:
	var b = Board.new()
	b.set_piece(Vector2i(0, 0), mk(Piece.Type.ROOK, 0, 7, 2, 0))
	b.set_piece(Vector2i(0, 3), mk(Piece.Type.PAWN, 0, 3, 1, 0))  # allié bloque
	var r = Rules.resolve(b, Vector2i(0, 0), Vector2i(0, 5))       # au-delà du blocage
	ok(not r.get("ok", true), "illegal move rejected")

func test_victory_king_kill() -> void:
	var b = Board.new()
	b.set_piece(Vector2i(4, 4), mk(Piece.Type.KING, 0, 1, 2, 0))
	b.set_piece(Vector2i(0, 0), mk(Piece.Type.KING, 1, 10, 2, 2))
	b.set_piece(Vector2i(4, 0), mk(Piece.Type.ROOK, 1, 7, 3, 0))
	Rules.resolve(b, Vector2i(4, 0), Vector2i(4, 4))   # tue le roi 0
	ok(not Rules.king_alive(b, 0), "king 0 removed")
	ok(Rules.check_victory(b) == 1, "side 1 wins by king kill")

func test_victory_pressure_collapse() -> void:
	var b = Board.new()
	b.set_piece(Vector2i(4, 4), mk(Piece.Type.KING, 0, 3, 2, 0))   # roi fragile
	b.set_piece(Vector2i(0, 0), mk(Piece.Type.KING, 1, 20, 2, 0))
	# 5 cavaliers ennemis menaçant la case du roi 0 (4,4)
	for c in [Vector2i(5, 6), Vector2i(6, 5), Vector2i(3, 6), Vector2i(6, 3), Vector2i(2, 5)]:
		b.set_piece(c, mk(Piece.Type.KNIGHT, 1, 6, 2, 0))
	ok(Rules.king_collapsed(b, 0, 0), "king 0 collapses (pressure >= hp + bonus)")
	ok(Rules.check_victory(b) == 1, "side 1 wins by pressure collapse")

func test_promotion_pawn() -> void:
	var b = Board.new()
	var p = mk(Piece.Type.PAWN, 0, 3, 1, 0)
	b.set_piece(Vector2i(3, 6), p)
	Rules.resolve(b, Vector2i(3, 6), Vector2i(3, 7))   # atteint la dernière rangée
	ok(p.type == Piece.Type.QUEEN, "pawn promoted to queen")
	ok(p.can_attack == false, "promoted piece cannot attack this turn")
	ok(b.get_piece(Vector2i(3, 7)) == p, "promoted piece on last rank")

func test_no_victory_ongoing() -> void:
	var b = Board.new()
	b.set_piece(Vector2i(4, 4), mk(Piece.Type.KING, 0, 10, 2, 0))
	b.set_piece(Vector2i(0, 0), mk(Piece.Type.KING, 1, 10, 2, 0))
	ok(Rules.check_victory(b) == -1, "no victory while both kings safe")

# --- Tranche 2 : traversée + riposte ---

func test_traversal_counterattack() -> void:
	# Cavalier ennemi en (2,2) contrôle (0,1) et (0,3) -> 2 contre-attaques sur la colonne 0.
	var b = Board.new()
	b.set_piece(Vector2i(0, 0), mk(Piece.Type.ROOK, 0, 7, 3, 0))
	b.set_piece(Vector2i(2, 2), mk(Piece.Type.KNIGHT, 1, 6, 2, 0))
	var r = Rules.resolve(b, Vector2i(0, 0), Vector2i(0, 7))
	ok(r.get("moved", false), "mover survives traversal and arrives")
	ok(b.get_piece(Vector2i(0, 7)) != null, "mover reached destination")
	ok(b.get_piece(Vector2i(0, 7)).hp == 3, "took 2 counterattacks of 2 (7-4=3)")
	ok(b.is_empty(Vector2i(0, 0)), "mover left origin")

func test_traversal_kills_mover() -> void:
	# Même contrôle, mais mover fragile (hp3) -> meurt en route, mouvement annulé.
	var b = Board.new()
	b.set_piece(Vector2i(0, 0), mk(Piece.Type.ROOK, 0, 3, 3, 0))
	b.set_piece(Vector2i(2, 2), mk(Piece.Type.KNIGHT, 1, 6, 2, 0))
	var r = Rules.resolve(b, Vector2i(0, 0), Vector2i(0, 7))
	ok(r.get("mover_died", false), "mover dies during traversal")
	ok(not r.get("moved", true), "movement cancelled")
	ok(b.is_empty(Vector2i(0, 0)) and b.is_empty(Vector2i(0, 7)), "mover removed, never arrived")

func test_retaliation_on_survive() -> void:
	var b = Board.new()
	b.set_piece(Vector2i(4, 0), mk(Piece.Type.ROOK, 0, 7, 3, 0))
	b.set_piece(Vector2i(4, 3), mk(Piece.Type.KNIGHT, 1, 5, 4, 0))  # atk4 -> riposte forte
	var r = Rules.resolve(b, Vector2i(4, 0), Vector2i(4, 3))
	ok(r.get("retaliated", false), "surviving target retaliates")
	ok(not r.get("killed", true), "target not killed (hp 5-3=2)")
	ok(b.get_piece(Vector2i(4, 0)).hp == 3, "attacker took retaliation 4 (7-4=3)")
	ok(b.get_piece(Vector2i(4, 3)) != null, "attacker did not take the square")

func test_knight_exempt_from_traversal() -> void:
	# Cavalier saute : aucune contre-attaque de traversée même avec ennemis autour.
	var b = Board.new()
	b.set_piece(Vector2i(4, 4), mk(Piece.Type.KNIGHT, 0, 6, 2, 0))
	b.set_piece(Vector2i(4, 0), mk(Piece.Type.ROOK, 1, 7, 3, 0))  # contrôle la colonne 4
	var r = Rules.resolve(b, Vector2i(4, 4), Vector2i(5, 6))
	ok(r.get("moved", false), "knight moved")
	ok(b.get_piece(Vector2i(5, 6)) != null and b.get_piece(Vector2i(5, 6)).hp == 6, "knight took no traversal damage")

# --- Tranche 3 : mise en place + BRAWL + partie ---

func test_initial_board() -> void:
	var b = PieceDefs.initial_board()
	ok(b.find_king(0) == Vector2i(4, 0), "king side0 at e1")
	ok(b.find_king(1) == Vector2i(4, 7), "king side1 at e8")
	var count := 0
	for x in Board.SIZE:
		for y in Board.SIZE:
			if not b.is_empty(Vector2i(x, y)):
				count += 1
	ok(count == 32, "32 pieces at start")
	ok(b.get_piece(Vector2i(0, 1)).type == Piece.Type.PAWN, "pawn on rank 2")
	ok(Rules.check_victory(b) == -1, "no winner at start")

func test_brawl_attrition() -> void:
	var b = Board.new()
	b.set_piece(Vector2i(3, 3), mk(Piece.Type.KNIGHT, 0, 6, 2, 0))
	b.set_piece(Vector2i(3, 4), mk(Piece.Type.KNIGHT, 1, 6, 2, 0))  # adjacents ennemis
	var ev = Rules.resolve_brawl(b)
	ok(ev.size() == 2, "both adjacent enemies take brawl damage")
	ok(b.get_piece(Vector2i(3, 3)).hp == 4 and b.get_piece(Vector2i(3, 4)).hp == 4, "each took 2 (6-2)")

func test_brawl_snapshot_simultaneous() -> void:
	# Dégâts mutuellement létaux calculés sur snapshot -> les deux meurent.
	var b = Board.new()
	b.set_piece(Vector2i(3, 3), mk(Piece.Type.PAWN, 0, 2, 3, 0))
	b.set_piece(Vector2i(3, 4), mk(Piece.Type.PAWN, 1, 2, 3, 0))
	Rules.resolve_brawl(b)
	ok(b.is_empty(Vector2i(3, 3)) and b.is_empty(Vector2i(3, 4)), "mutually lethal brawl removes both")

func test_match_turn_flow() -> void:
	var m = Match.new()
	ok(m.current == 0, "side 0 starts")
	var r = m.play(Vector2i(4, 1), Vector2i(4, 3))  # pion e2->e4 (double)
	ok(r.get("ok", false), "legal opening move accepted")
	ok(m.current == 1, "turn passes to side 1")
	ok(m.winner == -1, "game continues")

func test_match_rejects_wrong_side() -> void:
	var m = Match.new()
	var r = m.play(Vector2i(4, 6), Vector2i(4, 4))  # pion de side1 alors que c'est à side0
	ok(not r.get("ok", true), "cannot move opponent piece")

# --- Tranche 4 (fatigue) + IA ---

func test_board_clone() -> void:
	var b = Board.new()
	b.set_piece(Vector2i(2, 2), mk(Piece.Type.ROOK, 0, 7, 2, 1))
	var c = b.clone()
	c.get_piece(Vector2i(2, 2)).hp -= 5
	ok(b.get_piece(Vector2i(2, 2)).hp == 7, "original unchanged by clone edit")
	ok(c.get_piece(Vector2i(2, 2)).hp == 2, "clone modified independently")

func test_fatigue_curve() -> void:
	ok(Rules.fatigue_reduction(47) == 0, "no fatigue before turn 48")
	ok(Rules.fatigue_reduction(48) == 1, "fatigue 1 at turn 48")
	ok(Rules.fatigue_reduction(66) == 2, "fatigue 2 at turn 66")
	ok(Rules.fatigue_reduction(999) == 2, "fatigue capped at 2")

func test_ai_returns_legal_move() -> void:
	var b = PieceDefs.initial_board()
	var mv = AI.choose_move(b, 1)
	ok(not mv.is_empty(), "AI returns a move")
	ok(mv.to in Moves.destinations(b, mv.from), "AI move is legal")

func test_ai_takes_free_capture() -> void:
	var b = Board.new()
	b.set_piece(Vector2i(0, 0), mk(Piece.Type.KING, 0, 10, 2, 2))
	b.set_piece(Vector2i(7, 7), mk(Piece.Type.KING, 1, 10, 2, 2))
	b.set_piece(Vector2i(4, 4), mk(Piece.Type.ROOK, 1, 7, 2, 1))   # IA
	b.set_piece(Vector2i(4, 1), mk(Piece.Type.PAWN, 0, 2, 1, 0))   # proie (2 PV -> mort nette)
	var mv = AI.choose_move(b, 1)
	ok(mv.get("to", Vector2i(-1, -1)) == Vector2i(4, 1), "AI takes the free capture")

# --- Tranche 5 : cartes ---

func test_card_effects() -> void:
	var b = Board.new()
	var ally = mk(Piece.Type.KNIGHT, 0, 6, 2, 0)
	b.set_piece(Vector2i(2, 2), ally)
	Cards.apply(b, "affutage", Vector2i(2, 2))
	ok(ally.atk == 3, "affutage +1 ATK")
	Cards.apply(b, "bastion", Vector2i(2, 2))
	ok(ally.arm == 1, "bastion +1 ARM")
	Cards.apply(b, "renfort", Vector2i(2, 2))
	ok(ally.hp == 8, "renfort +2 PV")
	b.set_piece(Vector2i(5, 5), mk(Piece.Type.PAWN, 1, 2, 1, 0))
	var r = Cards.apply(b, "frappe", Vector2i(5, 5))
	ok(r.get("killed", false) and b.is_empty(Vector2i(5, 5)), "frappe tue une cible à 2 PV")

func test_match_card_flow() -> void:
	var m = Match.new()
	var r = m.play_card("affutage", Vector2i(1, 0))   # cavalier b1 du camp 0
	ok(r.get("ok", false), "card played on own piece")
	ok(not ("affutage" in m.hand[0]), "card removed from hand")
	var r2 = m.play_card("renfort", Vector2i(1, 0))
	ok(not r2.get("ok", true), "only one card per turn")
