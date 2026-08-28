# events.gd — NOMME et DERIVE les 4 evenements sonores des transitions d'etat (game.events).
#
# La logique SIGNALE ; elle n'entend rien. Ce module ne joue aucun son et ne connait aucune
# API audio : il traduit une action de jeu (et ses drapeaux de resultat) en une liste
# d'evenements NOMMES, que l'adaptateur audio consomme. Direction : logique -> audio.
#
# Deps declarees : game_state (pour le vocabulaire), params (noms des evenements).
# PURETE : fonctions totales, aucun effet de bord, aucun alea/temps.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")

# Les 4 evenements sonores, dans un ordre stable. Vocabulaire ferme.
const TOUS: Array = [P.EV_CLICK, P.EV_BUY, P.EV_UNLOCK, P.EV_PRESTIGE]


# Un clic -> evenement "click".
static func pour_clic() -> Array:
	return [P.EV_CLICK]


# Un achat de chaton -> "buy", plus "unlock" si l'achat a debloque un chaton DISTINCT neuf.
static func pour_achat(unlocked_new: bool) -> Array:
	if unlocked_new:
		return [P.EV_BUY, P.EV_UNLOCK]
	return [P.EV_BUY]


# Un prestige -> evenement "prestige".
static func pour_prestige() -> Array:
	return [P.EV_PRESTIGE]


# Un franchissement de palier qui debloque le 2e lieu -> "unlock".
static func pour_deblocage_lieu() -> Array:
	return [P.EV_UNLOCK]


# Un nom d'evenement est-il du vocabulaire ferme ? Sert de garde a l'adaptateur audio.
static func connu(nom: String) -> bool:
	return nom in TOUS
