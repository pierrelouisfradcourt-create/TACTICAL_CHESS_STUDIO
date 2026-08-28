# end_conditions.gd — CONDITION DE FIN par les regles (game.end).
#
# Le genre incremental n'a PAS de game-over : la "fin" est le franchissement d'un palier
# de meta-progression. On expose le palier atteint ; jamais un etat 'perdu'.
#
# PURETE : lit un etat et des seuils, ne mute rien (sauf update_palier qui fait monter le
# compteur de facon MONOTONE). Aucun alea, aucun temps.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")


# Nombre de seuils STRICTEMENT franchis par une valeur de ronrons. Compte arithmetique,
# jamais un juge.
static func palier_atteint(ronrons: float) -> int:
	var n: int = 0
	for seuil in P.PALIERS:
		if ronrons >= float(seuil):
			n += 1
	return n


# Fait monter le palier de l'etat de facon MONOTONE (jamais redescendre en cours de run).
# Classe sur le TOTAL gagne (total_earned), pas sur le solde : depenser des ronrons ne fait
# jamais reculer la progression. Rend true si le palier a change. Debloque le 2e lieu au 1er.
static func update_palier(s) -> bool:
	var atteint: int = palier_atteint(s.total_earned)
	if atteint > s.palier:
		s.palier = atteint
		if s.palier >= 1:
			s.place_unlocked = true
		return true
	return false


# Le palier n vise est-il atteint ? Strict : "atteindre le 3e palier" == palier >= 3.
static func palier_franchi(s, n: int) -> bool:
	return s.palier >= n


# Le statut ne prend qu'une valeur declaree — invariant du genre (jamais de defaite).
static func statut_valide(s) -> bool:
	return s.statut == P.STATUT_EN_COURS
