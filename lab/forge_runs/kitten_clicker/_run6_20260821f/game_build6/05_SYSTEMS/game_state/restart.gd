# restart.gd — RELANCE dans un etat initial propre (game.restart).
#
# Dans le genre incremental, le PRESTIGE EST le restart : on repart de zero pour la
# production courante, mais un bonus permanent survit. Ce module tient la MECANIQUE DE
# RESET ; la POLITIQUE du prestige (quand, combien de bonus) vit dans 05_SYSTEMS/meta.
#
# CE QUI EST REMIS A LA BASE : ronrons, taux, colonie, ameliorations, palier, lieu.
# CE QUI SURVIT (residu bonus, aucun autre) : prestige_units, prestige_count, la
# collection distincte deja debloquee (un chaton vu reste vu), et total_kittens.
#
# PURETE : aucune connaissance de scene/temps/alea.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")


# Remet l'etat a la base pour une nouvelle montee, en conservant EXACTEMENT le residu bonus.
static func reset(s) -> void:
	s.ronrons = 0.0
	s.total_earned = 0.0
	s.taux = 0.0
	s.kittens = []
	s.upgrade_level = 0
	s.palier = 0
	s.place_unlocked = false
	s.statut = P.STATUT_EN_COURS
	# prestige_units, prestige_count, unlocked (collection), total_kittens : conserves.


# Un etat fraichement reset est-il identique au premier demarrage, hormis le residu bonus ?
# Sert au test : aucun autre residu que le bonus permanent et la collection.
static func est_base(s) -> bool:
	return s.ronrons == 0.0 and s.total_earned == 0.0 and s.taux == 0.0 and s.kittens.is_empty() \
		and s.upgrade_level == 0 and s.palier == 0 and not s.place_unlocked \
		and s.statut == P.STATUT_EN_COURS
