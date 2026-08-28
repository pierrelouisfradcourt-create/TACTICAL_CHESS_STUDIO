# prestige.gd — meta-progression (capacite progression.prestige, couvre R17).
#
# Depend de game_state et de tiers (meme systeme progression). Le prestige remet a zero
# ronrons ET chatons, mais AUGMENTE de facon PERMANENTE le multiplicateur (> 1.0
# persistant) et debloque un second lieu — jamais un ecran de defaite (ton sans-echec).
extends RefCounted

const Tiers = preload("res://05_SYSTEMS/progression/tiers.gd")

const PRESTIGE_BONUS: float = 1.0   # increment du multiplicateur permanent a chaque prestige
const PRESTIGE_TIER: int = 3        # palier requis pour prestiger (le 3e)
const SECOND_PLACE: String = "veranda"


# Le prestige est-il possible ? (le 3e palier doit etre atteint).
static func can_prestige(state) -> bool:
	return Tiers.is_reachable(state.ronrons, PRESTIGE_TIER)


# Effectue le prestige : reset ronrons + chatons + ameliorations, multiplicateur augmente
# de facon permanente, second lieu debloque. Rend true si effectue, false si non eligible.
static func do_prestige(state) -> bool:
	if not can_prestige(state):
		return false
	state.prestige_mult += PRESTIGE_BONUS
	state.ronrons = 0.0
	state.base_production = 0.0
	state.upgrade_bonus = 1.0
	state.kittens = {}
	if not state.unlocked_places.has(SECOND_PLACE):
		state.unlocked_places.append(SECOND_PLACE)
	return true
