class_name DonneesQuiVaOu
extends RefCounted

## Chargement des données de jeu. Les niveaux sont des fichiers JSON : aucun
## niveau n'est écrit en code, c'est ce qui rend 60 tableaux envisageables.
##
## L'ordre des niveaux vient de data/niveaux.json et NON d'un parcours de
## dossier : dans un export .pck, lister un répertoire n'est pas fiable.

const DOSSIER := "res://data/"


static func charger_json(chemin: String) -> Dictionary:
	if not FileAccess.file_exists(chemin):
		push_error("Introuvable : %s" % chemin)
		return {}
	var fichier := FileAccess.open(chemin, FileAccess.READ)
	if fichier == null:
		push_error("Illisible (%d) : %s" % [FileAccess.get_open_error(), chemin])
		return {}
	var texte := fichier.get_as_text()
	fichier.close()

	var json := JSON.new()
	if json.parse(texte) != OK:
		push_error("JSON invalide %s ligne %d : %s" % [chemin, json.get_error_line(), json.get_error_message()])
		return {}
	if typeof(json.data) != TYPE_DICTIONARY:
		push_error("Racine JSON non-objet : %s" % chemin)
		return {}
	return json.data as Dictionary


static func charger_roster() -> Dictionary:
	return charger_json(DOSSIER + "chats.json")


static func ordre_des_niveaux() -> Array:
	return charger_json(DOSSIER + "niveaux.json").get("ordre", [])


static func charger_niveau(fichier: String) -> Dictionary:
	return charger_json(DOSSIER + "niveaux/" + fichier)


static func robe(roster: Dictionary, chat_id: String) -> Dictionary:
	for chat: Variant in roster.get("chats", []):
		var c: Dictionary = chat
		if String(c["id"]) == chat_id:
			return c["robe"]
	return roster.get("robes_prisonniers", {}).get(chat_id, {})


static func chat(roster: Dictionary, chat_id: String) -> Dictionary:
	for c: Variant in roster.get("chats", []):
		var d: Dictionary = c
		if String(d["id"]) == chat_id:
			return d
	return {}
