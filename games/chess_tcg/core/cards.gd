# Cards — couche cartes minimale (T5). Effets instantanés déterministes, ciblés.
# 1 carte optionnelle par tour, AVANT le déplacement (boucle : carte -> mouvement -> brawl).
extends RefCounted

const CATALOG := {
	"affutage": {"name": "Affûtage", "target": "ally", "desc": "+1 ATK"},
	"renfort":  {"name": "Renfort",  "target": "ally", "desc": "+2 PV"},
	"bastion":  {"name": "Bastion",  "target": "ally", "desc": "+1 ARM"},
	"frappe":   {"name": "Frappe",   "target": "enemy", "desc": "2 dégâts"},
}

static func starting_hand() -> Array:
	return ["affutage", "renfort", "bastion", "frappe"]

static func valid_target(board, id: String, side: int, pos: Vector2i) -> bool:
	var p = board.get_piece(pos)
	if p == null:
		return false
	if CATALOG[id].target == "ally":
		return p.side == side
	return p.side != side

# Applique l'effet, mute le board. Retourne {ok, killed}.
static func apply(board, id: String, pos: Vector2i) -> Dictionary:
	var p = board.get_piece(pos)
	if p == null:
		return {"ok": false}
	match id:
		"affutage":
			p.atk += 1
		"renfort":
			p.hp += 2
			if p.hp > p.max_hp:
				p.max_hp = p.hp
		"bastion":
			p.arm += 1
		"frappe":
			p.hp -= 2
			if p.hp <= 0:
				board.remove(pos)
				return {"ok": true, "killed": true}
	return {"ok": true, "killed": false}
