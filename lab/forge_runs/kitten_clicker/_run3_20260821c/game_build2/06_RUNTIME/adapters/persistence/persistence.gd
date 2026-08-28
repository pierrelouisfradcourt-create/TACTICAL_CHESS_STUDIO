# persistence.gd — adaptateur `persistence` (blueprint s4-archi). Serialise/deserialise l'etat
# sur disque et LIT l'horloge de plateforme pour calculer la duree D entre fermeture et
# reouverture, remise en argument a offline_gains. SEUL module a lire l'horloge reelle et le
# systeme de fichiers ; ne calcule AUCUNE valeur de jeu (delegue le calcul des gains a
# offline_gains).
#
# Deps (blueprint) : game_state, offline_gains. Le NOYAU de calcul (apply_offline_for_duration)
# est PUR — D lui est remise — et c'est lui que les oracles testent ; les acces horloge/fichier
# sont des enveloppes minces isolees en bas de fichier.
extends RefCounted

const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")
const OfflineGains = preload("res://05_SYSTEMS/offline_gains/offline_gains.gd")

const SAVE_PATH := "user://kitten_clicker_save.json"

# --- NOYAU PUR (teste par les oracles) ---

# Serialise l'etat en dictionnaire JSON-able (grandeurs uniquement, aucune reference de noeud).
static func to_dict(state) -> Dictionary:
	return {
		"purrs": state.purrs,
		"base_gain": state.base_gain,
		"prestige_mult": state.prestige_mult,
		"producer_counts": state.producer_counts.duplicate(),
		"collection_unlocked": state.collection_unlocked.duplicate(),
		"time_s": state.time_s,
		"seed_value": state.seed_value,
		"tick_index": state.tick_index,
		"closed_at_unix": 0.0,
	}

# Reconstruit un etat depuis un dictionnaire (deserialisation pure).
static func from_dict(d: Dictionary):
	var s = GameState.initial(int(d.get("seed_value", 1)))
	s.purrs = float(d.get("purrs", 0.0))
	s.base_gain = float(d.get("base_gain", 1.0))
	s.prestige_mult = float(d.get("prestige_mult", 1.0))
	s.producer_counts = (d.get("producer_counts", s.producer_counts) as Array).duplicate()
	s.collection_unlocked = (d.get("collection_unlocked", s.collection_unlocked) as Array).duplicate()
	s.time_s = float(d.get("time_s", 0.0))
	s.tick_index = int(d.get("tick_index", 0))
	return s

# Applique a la reouverture les gains hors-ligne pour une duree D REMISE EN ARGUMENT : calcule
# le montant via offline_gains, l'ajoute au total, l'enregistre dans last_offline_gain, et rend
# un NOUVEL etat. Ne lit aucune horloge (D fournie). C'est le noyau teste par R4.
static func apply_offline_for_duration(state, duration_s: float):
	var s = state.clone()
	var gain: float = OfflineGains.compute_for_state(s, duration_s)
	s.purrs += gain
	s.last_offline_gain = gain
	return s

# --- ENVELOPPES IMPURES (horloge + fichier) — non testees par les oracles purs ---

# Duree ecoulee, en secondes, entre un instant de fermeture memorise et maintenant (horloge
# reelle). SEUL point de lecture de l'horloge de plateforme.
static func elapsed_since(closed_at_unix: float) -> float:
	var now: float = Time.get_unix_time_from_system()
	var d: float = now - closed_at_unix
	return d if d > 0.0 else 0.0

# Ecrit l'etat sur disque avec l'instant de fermeture (horloge reelle). Encodage utf-8 par
# defaut de FileAccess/JSON.
static func save(state, path: String = SAVE_PATH) -> bool:
	var d := to_dict(state)
	d["closed_at_unix"] = Time.get_unix_time_from_system()
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(d))
	f.close()
	return true

# Charge l'etat depuis le disque et applique les gains hors-ligne pour la duree reelle ecoulee.
# Rend null si aucun fichier. Compose enveloppe impure (horloge/fichier) + noyau pur.
static func load_with_offline(path: String = SAVE_PATH):
	if not FileAccess.file_exists(path):
		return null
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return null
	var txt := f.get_as_text()
	f.close()
	var parsed = JSON.parse_string(txt)
	if typeof(parsed) != TYPE_DICTIONARY:
		return null
	var s = from_dict(parsed)
	var d: float = elapsed_since(float(parsed.get("closed_at_unix", 0.0)))
	return apply_offline_for_duration(s, d)
