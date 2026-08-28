# prestige.gd — META-PROGRESSION : POLITIQUE du prestige (meta system).
#
# Deps declarees : params, game_state. La MECANIQUE de reset vit dans game_state/restart.gd
# (le prestige EST le restart du genre) ; ce module decide QUAND il est permis et applique le
# bonus PERMANENT. Un prestige augmente le multiplicateur permanent : reatteindre un palier
# prend alors STRICTEMENT moins de ticks.
#
# DETERMINISME : aucun alea, aucun temps.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")
const Restart = preload("res://05_SYSTEMS/game_state/restart.gd")


# Le prestige est-il permis ? Seuil : avoir franchi au moins PRESTIGE_MIN_PALIER paliers.
static func peut_prestige(s) -> bool:
	return s.palier >= P.PRESTIGE_MIN_PALIER


# EFFECTUE le prestige : incremente le bonus permanent PUIS remet la montee a la base.
# Rend true si le prestige a eu lieu, false s'il n'etait pas permis (etat inchange).
static func effectuer(s) -> bool:
	if not peut_prestige(s):
		return false
	s.prestige_units += 1
	s.prestige_count += 1
	Restart.reset(s)
	return true
