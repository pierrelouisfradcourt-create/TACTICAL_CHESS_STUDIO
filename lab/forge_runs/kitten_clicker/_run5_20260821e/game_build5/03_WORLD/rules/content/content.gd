# content.gd — chargeur des registres de contenu (capacite content.registry).
#
# Categorie world.rules, allowed_deps == [] : ne depend d'aucun systeme. Lit les quatre
# fichiers JSON de donnees (chatons / lieux / objets / quetes) et les rend au jeu. Les
# donnees ELLES-MEMES vivent dans les .json a cote ; ce fichier n'est que le point de
# lecture (la fonction load_registries que la wiremap attend).
extends RefCounted

const DIR: String = "res://03_WORLD/rules/content/"


# Lit un fichier JSON du dossier de contenu. Rend la valeur parsee, ou null si absent/illisible.
static func _load_json(filename: String):
	var path: String = DIR + filename
	if not FileAccess.file_exists(path):
		return null
	var f = FileAccess.open(path, FileAccess.READ)
	if f == null:
		return null
	var text: String = f.get_as_text()
	f.close()
	return JSON.parse_string(text)


# Charge les quatre registres de contenu lus par le jeu. Un registre absent vaut null
# (le jeu decide quoi en faire) — jamais une exception.
static func load_registries() -> Dictionary:
	return {
		"chatons": _load_json("chatons.json"),
		"lieux": _load_json("lieux.json"),
		"objets": _load_json("objets.json"),
		"quetes": _load_json("quetes.json"),
	}
