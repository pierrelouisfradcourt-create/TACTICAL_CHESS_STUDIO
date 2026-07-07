# HUD 2D par-dessus la scène 3D (tour, main de cartes, journal, victoire).
# Purement visuel (mouse_filter IGNORE) ; toutes les entrées sont gérées par game3d.gd.
extends Control

const Cards = preload("res://core/cards.gd")

var game   # référence au Node3D game3d

const C_SIDE := [Color("efe3c2"), Color("d0566a")]
const C_NAME := ["Ordre (vous)", "Horde (IA)"]
const TYPE_NAME := ["Pion", "Cavalier", "Fou", "Tour", "Dame", "Roi"]
const TYPE_DESC := [
	"Avance tout droit, capture en diagonale. Faible seul.",
	"Saut en L. IGNORE la traversée (aucune contre-attaque en chemin).",
	"Diagonales, longue portée. Contrôle les obliques.",
	"Lignes droites, longue portée. ARM 1 : encaisse mieux.",
	"Toutes directions, longue portée. La plus offensive.",
	"1 case. Le perdre (PV 0) ou sous pression = défaite.",
]

func _draw() -> void:
	if game == null:
		return
	var font: Font = get_theme_default_font()
	var m = game.match_state
	var s: int = m.current
	# bandeau de tour
	draw_rect(Rect2(24, 20, 330, 30), C_SIDE[s], true)
	draw_string(font, Vector2(36, 42), "Au tour de : %s" % C_NAME[s], HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color("201a10"))
	draw_string(font, Vector2(24, 74), "CHESS TCG", HORIZONTAL_ALIGNMENT_LEFT, -1, 22, Color("e7edf5"))
	draw_string(font, Vector2(24, 98), "Clic pièce → case · carte → cible · R = rejouer", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color("aebccf"))
	# journal (haut droite)
	var jy := 40.0
	draw_string(font, Vector2(size.x - 330, 24), "JOURNAL", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color("e7edf5"))
	for msg in m.feed:
		draw_string(font, Vector2(size.x - 330, jy + 14), "› " + str(msg), HORIZONTAL_ALIGNMENT_LEFT, 310, 13, Color("9fb0c3"))
		jy += 20.0
	# fiche personnage (survol / sélection)
	var ic: Vector2i = game.info_cell()
	if ic.x >= 0:
		var p = m.board.get_piece(ic)
		if p != null:
			var px := size.x - 336.0
			var py := 250.0
			draw_rect(Rect2(px - 16, py - 30, 322, 176), Color(0.05, 0.07, 0.11, 0.82), true)
			draw_rect(Rect2(px - 16, py - 30, 322, 30), C_SIDE[p.side], true)
			var fac: String = "ORDRE" if p.side == 0 else "HORDE"
			draw_string(font, Vector2(px - 6, py - 9), "%s — %s" % [TYPE_NAME[p.type], fac], HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color("201a10"))
			draw_string(font, Vector2(px, py + 22), "PV %d/%d    ATK %d    ARM %d" % [p.hp, p.max_hp, p.atk, p.arm], HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color("ffe9b0"))
			draw_string(font, Vector2(px, py + 48), TYPE_DESC[p.type], HORIZONTAL_ALIGNMENT_LEFT, 306, 12, Color("cfd8e3"))
			draw_string(font, Vector2(px, py + 82), "Dégâts = ATK − ARM (min 1).", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color("9fb0c3"))
			draw_string(font, Vector2(px, py + 100), "Traverse les cases contrôlées → contre-attaques.", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color("9fb0c3"))
			draw_string(font, Vector2(px, py + 118), "Riposte + BRAWL avec les ennemis adjacents.", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color("9fb0c3"))
	# main de cartes
	var hand: Array = m.hand[0]
	if hand.size() > 0:
		var r0: Rect2 = game.hand_rect(0)
		var hint := "MAIN — clique une carte puis une cible (1/tour)"
		if m.card_played:
			hint = "MAIN — carte déjà jouée ce tour"
		draw_string(font, Vector2(r0.position.x, r0.position.y - 8), hint, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color("9fb0c3"))
	for i in hand.size():
		var r: Rect2 = game.hand_rect(i)
		draw_rect(r, Color("263241") if m.card_played else Color("35485c"), true)
		if game._card_mode == hand[i]:
			draw_rect(r, Color("f2c14e"), false, 3.0)
		var info: Dictionary = Cards.CATALOG[hand[i]]
		draw_string(font, r.position + Vector2(12, 24), info.name, HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color("e7edf5"))
		draw_string(font, r.position + Vector2(12, 44), info.desc, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color("ffd479"))
	# victoire
	if m.winner != -1:
		draw_rect(Rect2(Vector2.ZERO, size), Color(0, 0, 0, 0.62), true)
		var txt := "%s gagne !" % C_NAME[m.winner]
		var sz := font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 46)
		draw_string(font, size / 2 + Vector2(-sz.x / 2, 0), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 46, C_SIDE[m.winner])
		var sub := "Appuyez sur R pour rejouer"
		var sz2 := font.get_string_size(sub, HORIZONTAL_ALIGNMENT_LEFT, -1, 18)
		draw_string(font, size / 2 + Vector2(-sz2.x / 2, 42), sub, HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color("cfd8e3"))
