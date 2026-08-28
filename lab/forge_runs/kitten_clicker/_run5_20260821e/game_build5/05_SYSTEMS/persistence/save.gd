# save.gd — persistance (capacite persistence.save, couvre R20).
#
# Depend de game_state (allowed_deps [game_state]) : serialise l'etat en JSON et le relit
# dans un etat NEUF ; le round-trip est verifie par une forme CANONIQUE (parse->stringify)
# qui neutralise int/float. Utilise FileAccess (IO de plateforme) — jamais scene/noeud/
# Input/rendu.
extends RefCounted

const State = preload("res://05_SYSTEMS/game_state/state.gd")

const SAVE_PATH: String = "user://kitten_clicker_save.json"


# Etat -> dictionnaire serialisable (kittens et lieux sont plats : copie simple suffit).
static func to_dict(state) -> Dictionary:
	return {
		"ronrons": state.ronrons,
		"base_production": state.base_production,
		"prestige_mult": state.prestige_mult,
		"upgrade_bonus": state.upgrade_bonus,
		"kittens": state.kittens.duplicate(),
		"unlocked_places": state.unlocked_places.duplicate(),
	}


# Dictionnaire -> etat (ecrit les champs sur un etat existant).
static func apply_dict(state, data: Dictionary) -> void:
	state.ronrons = float(data.get("ronrons", 0.0))
	state.base_production = float(data.get("base_production", 0.0))
	state.prestige_mult = float(data.get("prestige_mult", 1.0))
	state.upgrade_bonus = float(data.get("upgrade_bonus", 1.0))
	state.kittens = (data.get("kittens", {}) as Dictionary).duplicate()
	state.unlocked_places = (data.get("unlocked_places", []) as Array).duplicate()


# Ecrit l'etat sur disque (JSON). Rend true si l'ecriture a reussi (false si le chemin
# n'est pas ouvrable en ecriture — garde reellement declenchee par un chemin invalide).
static func save(state, path: String = SAVE_PATH) -> bool:
	var f = FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(to_dict(state)))
	f.close()
	return true


# Recharge l'etat depuis le disque dans `state`. Rend true si un fichier JSON-objet a ete
# lu. Utilise la lecture statique (jamais de handle null a garder) : les seules gardes sont
# l'absence de fichier et un contenu non-dictionnaire, toutes deux declenchables en test.
static func load_into(state, path: String = SAVE_PATH) -> bool:
	if not FileAccess.file_exists(path):
		return false
	var text: String = FileAccess.get_file_as_string(path)
	var parsed = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		return false
	apply_dict(state, parsed)
	return true


# Forme CANONIQUE d'un etat : to_dict passe par un cycle stringify->parse->stringify. Les
# deux cotes du round-trip subissent la MEME normalisation int/float, donc l'egalite ne
# depend pas de la maniere dont JSON.parse type les nombres.
static func canonical(state) -> String:
	return JSON.stringify(JSON.parse_string(JSON.stringify(to_dict(state))))


# ROUND-TRIP strict : ecrit l'etat, le recharge dans un etat NEUF, compare les formes
# canoniques. Un save qui echoue rend false (garde declenchable par chemin invalide) ; un
# load qui echoue laisse `fresh` par defaut -> forme canonique differente -> false, sans
# garde inatteignable. La comparaison finale `==` est fausse des qu'un champ differe.
static func save_load_roundtrip(state, path: String = SAVE_PATH) -> bool:
	if not save(state, path):
		return false
	var fresh = State.new()
	load_into(fresh, path)
	return canonical(state) == canonical(fresh)
