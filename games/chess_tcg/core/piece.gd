# Piece — unité du plateau (lignée T : HP/ATK/ARM). Classe pure, sans scène.
# Réf canon : repos/games/ChessTCG/MASTER_DOCS/09_DECISIONS_RATIFIED_2026-07-06.md
extends RefCounted

enum Type { PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING }

var type: int
var side: int          # 0 ou 1
var hp: int
var max_hp: int
var atk: int
var arm: int
var can_attack: bool = true
var can_brawl: bool = true
var can_control: bool = true
var is_summon: bool = false
var kills: int = 0

func _init(p_type: int, p_side: int, p_hp: int, p_atk: int, p_arm: int) -> void:
	type = p_type
	side = p_side
	hp = p_hp
	max_hp = p_hp
	atk = p_atk
	arm = p_arm

func is_alive() -> bool:
	return hp > 0

func clone() -> RefCounted:
	var p = get_script().new(type, side, hp, atk, arm)
	p.max_hp = max_hp
	p.can_attack = can_attack
	p.can_brawl = can_brawl
	p.can_control = can_control
	p.is_summon = is_summon
	p.kills = kills
	return p
