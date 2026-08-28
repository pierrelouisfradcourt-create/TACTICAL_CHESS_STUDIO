# collection.gd — SUIVI DE COLLECTION : compte les chatons DISTINCTS debloques sur le total.
#
# Deps declarees : game_state. Le deblocage lui-meme est fait par economy (achat) qui remplit
# s.unlocked ; ce module ne fait que LIRE et exposer le compteur X/T affiche a l'ecran.
#
# PURETE : aucune mutation, aucun alea/temps.
extends RefCounted


# Nombre de chatons DISTINCTS debloques (X).
static func distincts(s) -> int:
	return s.unlocked.size()


# Total du registre (T).
static func total(s) -> int:
	return s.total_kittens


# Texte du compteur "X/T" affiche par le rendu de galerie.
static func texte(s) -> String:
	return "%d/%d" % [distincts(s), total(s)]


# La collection est-elle complete ?
static func complete(s) -> bool:
	return distincts(s) >= total(s)
