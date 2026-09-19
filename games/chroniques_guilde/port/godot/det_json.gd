# =============================================================================
#  det_json.gd — LECTURE JSON QUI REND DES ENTIERS (Godot 4)
#  Chroniques de Guilde · portage. Date : 2026-09-19.
#
#  MESURÉ SUR GODOT 4.6.stable.official, pas supposé :
#      JSON.parse_string('{"n":1000,"m":-7}')  ->  n et m sont des TYPE_FLOAT.
#  Le moteur JavaScript, lui, rend des entiers. C'est le piège n°11 du guide
#  de portage, et il est CONFIRMÉ.
#
#  Pourquoi ça compte plus qu'il n'y paraît. `DetCanonical.canonical()` ramène
#  déjà un flottant entier (3.0) à "3", donc l'empreinte d'un état qui vient
#  d'être chargé serait juste. Mais entre les deux il y a le JEU : dès que le
#  moteur calcule `hp_base + hp_per_day * jour`, deux flottants donnent un
#  flottant, `div()` ne tronque plus pareil, et la discipline entière est
#  perdue sans que rien ne le signale. Pire : les `assert` de garde sont
#  RETIRÉS en build release — sur le téléphone, la divergence serait muette.
#
#  Donc on convertit À LA LECTURE, une fois, avant que le moteur ne touche
#  quoi que ce soit. Après ça, tout est entier, comme en JavaScript.
# =============================================================================
class_name DetJson
extends RefCounted

## Lit un texte JSON et rend une structure où tout nombre entier est un TYPE_INT.
## Rend `null` si le texte n'est pas du JSON valide (le message va dans printerr).
static func parse(text: String) -> Variant:
	var out: Variant = JSON.parse_string(text)
	if out == null:
		printerr("DetJson : JSON invalide")
		return null
	return to_ints(out)

## Lit un fichier JSON du projet (res:// ou chemin utilisateur) avec la même règle.
static func parse_file(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		printerr("DetJson : fichier introuvable : " + path)
		return null
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		printerr("DetJson : lecture impossible : " + path)
		return null
	var txt := f.get_as_text()
	f.close()
	return parse(txt)

## Descente récursive : tout flottant dont la valeur est entière devient un entier.
## Un flottant VRAIMENT fractionnaire est laissé tel quel — il n'a rien à faire
## dans l'état du moteur, et le laisser visible vaut mieux que le tronquer en
## douce. `DetCanonical` le refusera bruyamment au moment du hachage.
static func to_ints(v: Variant) -> Variant:
	match typeof(v):
		TYPE_FLOAT:
			var f: float = v
			if f == floor(f) and absf(f) < 9007199254740992.0:
				return int(f)
			return f
		TYPE_ARRAY:
			var arr: Array = []
			for e in (v as Array):
				arr.append(to_ints(e))
			return arr
		TYPE_DICTIONARY:
			var d: Dictionary = {}
			for k in (v as Dictionary).keys():
				d[k] = to_ints((v as Dictionary)[k])
			return d
		_:
			return v
