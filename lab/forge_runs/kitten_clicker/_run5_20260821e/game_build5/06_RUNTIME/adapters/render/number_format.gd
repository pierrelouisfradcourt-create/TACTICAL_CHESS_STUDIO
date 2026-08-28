# number_format.gd — abreviation des grands nombres (capacite render.number_format, R19).
#
# Adaptateur de presentation : depend au plus de game_state (ici, d'aucun systeme).
# Ne mute JAMAIS l'etat — transforme une valeur en chaine affichable.
extends RefCounted


# Abrege un nombre : < 1000 tel quel, sinon K / M / B avec une decimale.
# abbreviate(12345678) -> "12.3M" (jamais 8 chiffres bruts).
static func abbreviate(value) -> String:
	var v: float = float(value)
	if v < 1000.0:
		return str(int(v))
	if v < 1000000.0:
		return _one_decimal(v / 1000.0) + "K"
	if v < 1000000000.0:
		return _one_decimal(v / 1000000.0) + "M"
	return _one_decimal(v / 1000000000.0) + "B"


# Une decimale, sans zero final superflu (12.0 -> "12", 12.30 -> "12.3").
static func _one_decimal(x: float) -> String:
	var rounded: float = floor(x * 10.0) / 10.0
	return String.num(rounded, 1)
