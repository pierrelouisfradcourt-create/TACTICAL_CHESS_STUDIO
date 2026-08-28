# paliers.gd — courbe de paliers PURE (regle de variance des metriques, ratifiee Pierre
# 2026-07-21). La table des seuils vit dans le bloc de parametres (game_state) ; ici on la
# LIT et on en derive le palier courant. >=3 seuils distincts strictement croissants.
extends RefCounted

const GS := preload("res://05_SYSTEMS/core/game_state.gd")

# Table des seuils (copie, jamais mutee par l'appelant).
static func seuils() -> Array:
	return GS.PALIER_SEUILS.duplicate()

# Palier courant = nombre de seuils atteints par le cumul (0..3).
static func palier(cumul: float) -> int:
	var n := 0
	for s in GS.PALIER_SEUILS:
		if cumul >= float(s):
			n += 1
	return n

# Prochain seuil non atteint, ou -1 si tous atteints.
static func prochain_seuil(cumul: float) -> float:
	for s in GS.PALIER_SEUILS:
		if cumul < float(s):
			return float(s)
	return -1.0

# Preuve de VARIANCE : au moins 3 seuils, tous distincts et strictement croissants.
static func seuils_distincts_croissants() -> bool:
	var s: Array = GS.PALIER_SEUILS
	if s.size() < 3:
		return false
	for i in range(1, s.size()):
		if float(s[i]) <= float(s[i - 1]):
			return false
	return true
