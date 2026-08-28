# tiers.gd — courbe de paliers + accessibilite (capacites progression.tiers R15
# et le support de logic.solvability R16).
#
# Depend UNIQUEMENT de game_state. La courbe porte au moins 3 valeurs de seuil
# strictement distinctes et non triviales (regle de variance des metriques Forge :
# jamais 1,2,3).
extends RefCounted

# Seuils de ronrons cumules ouvrant chaque palier (index 0 = palier 1). Quatre valeurs
# strictement croissantes, non triviales.
const THRESHOLDS: Array = [50, 250, 1000, 5000]


# Copie de la courbe de paliers (jamais la reference interne mutable).
static func tier_thresholds() -> Array:
	return THRESHOLDS.duplicate()


# Nombre de paliers REELLEMENT atteints pour un compteur donne (0 a THRESHOLDS.size()).
static func tier_reached(ronrons: float) -> int:
	var reached: int = 0
	for threshold in THRESHOLDS:
		if ronrons >= float(threshold):
			reached += 1
	return reached


# Le palier `tier` (1-based) est-il atteint pour ce compteur ? Predicat de seuil : `>=`
# est ici la DEFINITION d'atteinte (au seuil exact, le palier est ouvert), pas un
# raccourci tautologique — l'oracle de solvabilite, lui, asserte tier_reached == 3 STRICT.
static func is_reachable(ronrons: float, tier: int) -> bool:
	if tier < 1 or tier > THRESHOLDS.size():
		return false
	return ronrons >= float(THRESHOLDS[tier - 1])
