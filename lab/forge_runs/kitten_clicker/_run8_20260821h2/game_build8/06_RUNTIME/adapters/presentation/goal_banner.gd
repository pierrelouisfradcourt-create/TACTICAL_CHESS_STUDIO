# goal_banner.gd — ADAPTATEUR DE PRESENTATION (categorie `system.adapter`).
# Fournit `render.goal` : le texte de la banniere d'objectif.
#
# LIT l'etat (CostCurve.palier + jalons), n'en MUTE aucun (separation garde-fou (c)).
# Le texte est prefixe du numero de PALIER (monotone) : deux paliers distincts
# donnent donc deux textes distincts — c'est ce qui garantit le maillon NEXT_GOAL
# (objectifs successifs textuellement distincts, etapes 8-9 de loop.json). La phrase
# guide le joueur en une ligne (garde-fou (j) GUIDAGE).
extends RefCounted

const CostCurve = preload("res://05_SYSTEMS/economy/cost_curve.gd")


# Phrase contextuelle selon l'etat de progression (guidage joueur).
static func _phrase(state: Dictionary) -> String:
	if int(state["collection"]) <= 0:
		return "Caresse la pelote et adopte ton premier chaton"
	if int(state["locations"]) <= 1:
		return "Amenage ton refuge et ouvre le jardin"
	if int(state["prestige_count"]) <= 0 and float(state["ronrons"]) < CostCurve.PRESTIGE_THRESHOLD:
		return "Fais prosperer ta colonie et vise un chaton legendaire"
	if int(state["prestige_count"]) <= 0:
		return "Le prestige est a portee : recommence plus fort !"
	return "Colonie prestigieuse : agrandis-la encore"


# Texte complet de la banniere pour l'etat courant.
static func text_for(state: Dictionary) -> String:
	return "Palier %d — %s" % [CostCurve.palier(state), _phrase(state)]
