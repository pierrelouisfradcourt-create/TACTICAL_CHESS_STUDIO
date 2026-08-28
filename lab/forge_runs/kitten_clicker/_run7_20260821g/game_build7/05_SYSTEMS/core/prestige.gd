# prestige.gd — cycle de prestige PUR (meta_prestige_unlock_place,
# meta_prestige_permanent_bonus, core.restart). Le multiplicateur permanent monte
# STRICTEMENT, un second lieu se debloque (1->2), et les ronrons COURANTS sont remis a la
# base tandis que le bonus permanent est conserve.
extends RefCounted

const GS := preload("res://05_SYSTEMS/core/game_state.gd")

# Le prestige est disponible quand le cumul atteint le seuil.
static func peut_prestige(e: Dictionary) -> bool:
	return float(e["cumul"]) >= GS.PRESTIGE_SEUIL

# Effectue un prestige : +1 niveau, multiplicateur *= pas (strict), lieux 1->2 (borne),
# ronrons courants remis a la base. Rend true si effectue.
static func prestige(e: Dictionary) -> bool:
	if not peut_prestige(e):
		return false
	e["prestige"] = int(e["prestige"]) + 1
	e["multiplicateur"] = float(e["multiplicateur"]) * GS.PRESTIGE_MULT_PAS
	reset_courant(e)
	if int(e["lieux"]) < GS.LIEUX_MAX:
		e["lieux"] = int(e["lieux"]) + 1
	return true

# core.restart : relance dans un etat de ronrons COURANTS propre (remis a la base). Le
# cumul et le bonus permanent ne sont pas touches — c'est le sens du prestige.
static func reset_courant(e: Dictionary) -> void:
	e["ronrons"] = 0.0
