# error_guard.gd — ABSORBE les entrees invalides sans invalider l'etat (error.guard).
#
# Le genre incremental ne perd jamais sa colonie : un achat impossible est IGNORE, pas une
# erreur ; une valeur hors bornes est ramenee dans son domaine. Ce module ne mute pas l'etat
# de jeu, il REPOND a des questions de validite que les autres systemes lui posent.
#
# PURETE : fonctions totales, aucun effet de bord, aucun alea/temps.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")


# Un achat au cout `cout` est-il finançable avec `ronrons` ? Un cout <=0 ou des ronrons
# insuffisants rendent false — jamais une exception.
static func peut_payer(ronrons: float, cout: float) -> bool:
	if cout <= 0.0:
		return false
	return ronrons >= cout


# Ramene une valeur dans [bas, haut]. Une entree nulle/NaN retombe sur `bas`.
static func borner(v: float, bas: float, haut: float) -> float:
	if is_nan(v):
		return bas
	return clampf(v, bas, haut)


# Un gain de clic est-il valide (STRICTEMENT positif) ? Garde-fou contre un gain nul/negatif
# qui rendrait la mecanique morte.
static func gain_valide(gain: float) -> bool:
	return gain > 0.0


# L'etat reste-t-il coherent apres une entree ? Colonie jamais negative, ronrons finis,
# statut declare. Sert de sentinelle aux tests d'entrees hors domaine.
static func etat_coherent(s) -> bool:
	if s.ronrons < 0.0 or is_nan(s.ronrons) or is_inf(s.ronrons):
		return false
	if s.kittens.size() < 0 or s.upgrade_level < 0 or s.palier < 0:
		return false
	return s.statut == P.STATUT_EN_COURS
