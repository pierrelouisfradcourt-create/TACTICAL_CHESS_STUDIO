# collection.gd — module `collection` (blueprint s4-archi). Detient le MODELE DE DONNEES de la
# galerie : chaque chaton porte un etat (verrouille/debloque) et un palier de rarete. Le
# deblocage est PERMANENT : aucune transition subie (temps, absence, action) ne retire un chaton
# deja debloque, et aucun etat game_over n'est representable.
#
# Invariant de MONOTONIE NON DECROISSANTE encode structurellement (R3) : `refresh_unlocks`
# ne fait que passer des `false` a `true`, jamais l'inverse. Fonctions PURES (deps: []).
extends RefCounted

# --- Parametres du domaine collection (proprietaire: collection) ---
# Roster ORDONNE de chatons : nom, rarete (0=commun,1=rare,2=legendaire), seuil de ronrons de
# deblocage. Le chaton 0 est debloque des le depart (seuil 0). L'ordre est l'identite.
const KITTEN_IDS: Array = ["mochi", "biscuit", "sushi", "ombre", "neige"]
const KITTEN_RARITY: Array = [0, 0, 1, 1, 2]
const UNLOCK_THRESHOLD: Array = [0.0, 20.0, 60.0, 150.0, 400.0]

static func kitten_count() -> int:
	return KITTEN_IDS.size()

static func rarity(index: int) -> int:
	if index < 0 or index >= KITTEN_RARITY.size():
		return -1
	return KITTEN_RARITY[index]

# Etat de deblocage initial : tout verrouille, sauf ceux de seuil 0 (appliques ensuite par
# refresh_unlocks au demarrage).
static func unlocked_initial() -> Array:
	var a: Array = []
	for _i in range(KITTEN_IDS.size()):
		a.append(false)
	return a

# Nombre de chatons debloques (taille observable de la collection).
static func unlocked_count(state) -> int:
	var n: int = 0
	for i in range(state.collection_unlocked.size()):
		if state.collection_unlocked[i]:
			n += 1
	return n

# Applique les seuils de deblocage selon le total courant de ronrons : tout chaton dont le seuil
# est atteint passe a debloque. ADD-ONLY : un `true` n'est jamais remis a `false` (monotonie).
static func refresh_unlocks(state):
	var s = state.clone()
	for i in range(s.collection_unlocked.size()):
		if not s.collection_unlocked[i] and s.purrs >= float(UNLOCK_THRESHOLD[i]):
			s.collection_unlocked[i] = true
	return s

# Deblocage explicite et permanent d'un chaton (add-only). Aucun deblocage ne peut etre annule.
static func unlock(state, index: int):
	var s = state.clone()
	if index >= 0 and index < s.collection_unlocked.size():
		s.collection_unlocked[index] = true
	return s

# Aucun etat de defaite n'est representable : structurellement toujours false.
static func is_game_over(_state) -> bool:
	return false
