class_name MoteurQuiVaOu
extends RefCounted

## Règles pures de « Qui va où ». Aucune dépendance à une scène, à un noeud ou à
## un rendu : tout est testable en headless. La présentation lit cet état, elle
## ne le calcule jamais.
##
## Invariant : une action ne fait qu'AJOUTER des drapeaux et des chats. Rien
## n'est jamais retiré, donc aucune partie ne peut se bloquer définitivement.

enum Resultat { SUCCES, REFUS, BLOQUE, OCCUPEE, RIEN_EN_MAIN, INCONNUE }

var niveau: Dictionary = {}
var verbe_par_chat: Dictionary = {}
var drapeaux: Dictionary = {}
var disponibles: Array[String] = []
var occupees: Dictionary = {}
var en_main: String = ""
var libere: bool = false


func charger(niveau_source: Dictionary, roster: Dictionary) -> void:
	niveau = niveau_source
	verbe_par_chat = {}
	for chat: Variant in roster.get("chats", []):
		var c: Dictionary = chat
		verbe_par_chat[String(c["id"])] = String(c["verbe"])
	drapeaux = {}
	occupees = {}
	en_main = ""
	libere = false
	disponibles = []
	for c: Variant in niveau.get("equipe", []):
		disponibles.append(String(c))


func zones() -> Array:
	return niveau.get("zones", [])


func zone(zone_id: String) -> Dictionary:
	for z: Variant in zones():
		var d: Dictionary = z
		if String(d["id"]) == zone_id:
			return d
	return {}


func verbe_du_chat(chat_id: String) -> String:
	return String(verbe_par_chat.get(chat_id, ""))


func drapeaux_poses(requis: Array) -> bool:
	for d: Variant in requis:
		if not drapeaux.has(String(d)):
			return false
	return true


func zone_ouverte(z: Dictionary) -> bool:
	return drapeaux_poses(z.get("requiert", [])) and not occupees.has(String(z["id"]))


func texte_de_blocage(z: Dictionary) -> String:
	for b: Variant in z.get("bloque", []):
		var regle: Dictionary = b
		if not drapeaux.has(String(regle["sans"])):
			return String(regle["texte"])
	return "Pas encore."


func prendre(chat_id: String) -> bool:
	if not disponibles.has(chat_id):
		return false
	if en_main == chat_id:
		en_main = ""
		return true
	en_main = chat_id
	for zone_id: Variant in occupees.keys():
		if String(occupees[zone_id]) == chat_id:
			occupees.erase(zone_id)
			break
	return true


func lacher() -> void:
	en_main = ""


## Pose le chat tenu en main sur une zone. Renvoie ce qui s'est passé, pour que
## la présentation n'ait qu'à l'afficher.
func poser(zone_id: String) -> Dictionary:
	if en_main == "":
		return _issue(Resultat.RIEN_EN_MAIN, "Prends d'abord un chaton.")

	var z := zone(zone_id)
	if z.is_empty():
		return _issue(Resultat.INCONNUE, "Cet endroit n'existe pas.")

	if occupees.has(zone_id):
		return _issue(Resultat.OCCUPEE, "Quelqu'un s'en occupe déjà.")

	if not drapeaux_poses(z.get("requiert", [])):
		return _issue(Resultat.BLOQUE, texte_de_blocage(z))

	var chat := en_main
	if verbe_du_chat(chat) != String(z["verbe"]):
		en_main = ""
		return _issue(Resultat.REFUS, "Ce n'est pas lui qu'il faut ici.")

	en_main = ""
	occupees[zone_id] = chat
	if z.has("pose"):
		drapeaux[String(z["pose"])] = true
	if bool(z.get("libere", false)):
		libere = true

	var arrivee := _convoquer()
	return {
		"resultat": Resultat.SUCCES,
		"chat": chat,
		"geste": String(z.get("geste", "")),
		"effet": String(z.get("effet", "")),
		"libere": libere,
		"arrivee": arrivee,
		"texte": String(z.get("effet", "")),
	}


## Fait entrer les renforts dont les conditions viennent d'être réunies.
func _convoquer() -> String:
	var entre := ""
	for z: Variant in zones():
		var d: Dictionary = z
		if not d.has("appelle"):
			continue
		var appel: Dictionary = d["appelle"]
		var chat := String(appel["chat"])
		if disponibles.has(chat):
			continue
		if drapeaux_poses(appel.get("si", [])):
			disponibles.append(chat)
			entre = chat
	return entre


func _issue(code: Resultat, texte: String) -> Dictionary:
	return {
		"resultat": code,
		"chat": "",
		"geste": "",
		"effet": "",
		"libere": libere,
		"arrivee": "",
		"texte": texte,
	}
