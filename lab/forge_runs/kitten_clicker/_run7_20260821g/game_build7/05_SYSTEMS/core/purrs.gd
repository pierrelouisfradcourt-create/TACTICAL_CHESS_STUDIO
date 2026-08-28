# purrs.gd — regle PURE des ronrons : increment strict au clic (clk_click_increment) et
# accumulation passive strictement croissante des qu'un producteur existe
# (prod_passive_ronrons). N'importe aucun adaptateur.
extends RefCounted

const GS := preload("res://05_SYSTEMS/core/game_state.gd")

# Gain d'un clic, module par le bonus de prestige permanent.
static func gain_clic(e: Dictionary) -> float:
	return GS.CLIC_GAIN * float(e["multiplicateur"])

# Increment STRICT au clic : ronrons et cumul montent du gain (jamais >=).
static func clic(e: Dictionary) -> void:
	var g := gain_clic(e)
	e["ronrons"] = float(e["ronrons"]) + g
	e["cumul"] = float(e["cumul"]) + g

# Taux de production passive par tick : (chatons + ameliorations) * multiplicateur.
static func taux(e: Dictionary) -> float:
	var base := GS.CHATON_PROD * float(e["chatons"]) + GS.AMELIORATION_PROD_PLATE * float(e["ameliorations"])
	return base * float(e["multiplicateur"])

# Accumulation passive d'UN tick : strictement croissante des qu'un producteur existe.
static func tick_passif(e: Dictionary) -> void:
	var t := taux(e)
	e["ronrons"] = float(e["ronrons"]) + t
	e["cumul"] = float(e["cumul"]) + t
