# Match — contrôleur de partie (hotseat 2 joueurs). Pur, sans scène.
# Boucle d'un tour : jouer (déplacement/attaque + traversée/riposte) -> BRAWL -> victoire -> changer de camp.
extends RefCounted

const Board = preload("res://core/board.gd")
const Moves = preload("res://core/moves.gd")
const Rules = preload("res://core/rules.gd")
const PieceDefs = preload("res://core/piece_defs.gd")
const AI = preload("res://core/ai.gd")
const Cards = preload("res://core/cards.gd")

var board
var current: int = 0
var winner: int = -1
var turn_count: int = 0
var last_from: Vector2i = Vector2i(-1, -1)
var last_to: Vector2i = Vector2i(-1, -1)
var feed: Array = []   # messages récents pour l'UI
var hand: Array = [[], []]     # main de chaque camp
var card_played: bool = false  # 1 carte max par tour

func _init() -> void:
	reset()

func reset() -> void:
	board = PieceDefs.initial_board()
	current = 0
	winner = -1
	turn_count = 0
	last_from = Vector2i(-1, -1)
	last_to = Vector2i(-1, -1)
	feed = []
	hand = [Cards.starting_hand(), Cards.starting_hand()]
	card_played = false

# Joue une carte du camp courant sur une cible (optionnel, avant le déplacement).
func play_card(id: String, target: Vector2i) -> Dictionary:
	if winner != -1 or card_played:
		return {"ok": false, "reason": "unavailable"}
	if not (id in hand[current]):
		return {"ok": false, "reason": "not_in_hand"}
	if not Cards.valid_target(board, id, current, target):
		return {"ok": false, "reason": "bad_target"}
	var res = Cards.apply(board, id, target)
	hand[current].erase(id)
	card_played = true
	feed.push_front("Carte : %s" % Cards.CATALOG[id].name)
	winner = Rules.check_victory(board, turn_count)
	return {"ok": true, "res": res, "winner": winner}

func legal_for(from: Vector2i) -> Array:
	var p = board.get_piece(from)
	if p == null or p.side != current or winner != -1:
		return []
	return Moves.destinations(board, from)

func play(from: Vector2i, to: Vector2i) -> Dictionary:
	if winner != -1:
		return {"ok": false, "reason": "game_over"}
	var p = board.get_piece(from)
	if p == null or p.side != current:
		return {"ok": false, "reason": "not_your_piece"}
	if not (to in Moves.destinations(board, from)):
		return {"ok": false, "reason": "illegal"}
	var res = Rules.resolve(board, from, to)
	if not res.get("ok", false):
		return res
	var brawl = Rules.resolve_brawl(board)
	last_from = from
	last_to = to
	turn_count += 1
	winner = Rules.check_victory(board, turn_count)
	_log(res, brawl)
	if winner == -1:
		current = 1 - current
		card_played = false   # nouveau tour : carte à nouveau disponible
	return {"ok": true, "res": res, "brawl": brawl, "winner": winner}

# Fait jouer l'IA pour le camp courant. Retourne le résultat du coup (ou {} si aucun).
func play_ai() -> Dictionary:
	if winner != -1:
		return {}
	var mv := AI.choose_move(board, current)
	if mv.is_empty():
		return {}
	return play(mv.from, mv.to)

# Choix de l'IA SANS jouer (pour que l'UI anime le coup elle-même).
func ai_pick() -> Dictionary:
	if winner != -1:
		return {}
	return AI.choose_move(board, current)

func _log(res: Dictionary, brawl: Array) -> void:
	var msg := ""
	if res.get("killed", false):
		msg = "Capture !"
	elif res.get("mover_died", false):
		msg = "Pièce perdue en traversée"
	elif res.get("attacked", false):
		msg = "Attaque (%d dégâts)" % res.get("damage", 0)
	else:
		msg = "Déplacement"
	if brawl.size() > 0:
		var deaths := 0
		for b in brawl:
			if b.died:
				deaths += 1
		msg += " · Brawl : %d touchée(s)" % brawl.size()
		if deaths > 0:
			msg += ", %d éliminée(s)" % deaths
	feed.push_front(msg)
	if feed.size() > 7:
		feed.pop_back()
