# game_state.gd — etat de jeu PUR + BLOC DE PARAMETRES + invariant no-defeat.
#
# Logique pure : ne connait ni scene, ni noeud, ni Input, ni rendu (garde-fou c).
# BLOC DE PARAMETRES (garde-fou d, ratifie Pierre 2026-07-28) : tous les litteraux de
# gameplay du jeu vivent ICI et nulle part ailleurs — les autres regles les lisent.
# Determinisme (garde-fou b) : aucune source d'alea ni de temps ; l'etat est un
# Dictionary a cles nommees, jamais itere dans un ordre dependant du Dictionary.
extends RefCounted

# --- BLOC DE PARAMETRES (source unique des grandeurs de gameplay) ---
const CLIC_GAIN := 1.0                     # ronrons gagnes par clic (avant multiplicateur)
const CHATON_COUT_BASE := 10.0             # cout du 1er chaton
const CHATON_COUT_CROISSANCE := 1.5        # facteur de cout par chaton deja possede
const CHATON_PROD := 0.2                   # production/tick ajoutee par chaton
const AMELIORATION_COUT_BASE := 5.0        # cout de la 1ere amelioration
const AMELIORATION_COUT_CROISSANCE := 1.5  # facteur de cout par amelioration deja achetee
const AMELIORATION_PROD_PLATE := 0.5       # production/tick PLATE ajoutee par amelioration
const PRESTIGE_SEUIL := 30.0               # cumul de ronrons requis pour prestige
const PRESTIGE_MULT_BASE := 1.0            # multiplicateur permanent de depart
const PRESTIGE_MULT_PAS := 1.5             # facteur applique au multiplicateur a chaque prestige
const LIEUX_DEPART := 1                    # nombre de lieux au demarrage
const LIEUX_MAX := 2                       # nombre de lieux maximum (refuge + jardin)
const PALIER_SEUILS := [5.0, 15.0, 30.0]   # 3 seuils DISTINCTS strictement croissants
const PHASE_JEU := "jeu"                   # unique phase — aucun etat de defaite

# Etat neuf. `nb_types` = nombre de types de chatons du registre (pour "possedes/total").
static func nouvel_etat(nb_types: int) -> Dictionary:
	return {
		"ronrons": 0.0,          # monnaie courante
		"cumul": 0.0,            # ronrons cumules a vie (ne baisse jamais) -> pilote les paliers
		"chatons": 0,            # nombre de chatons possedes (total achats)
		"types": 0,              # nombre de TYPES distincts possedes (collection)
		"nb_types": maxi(0, nb_types),
		"ameliorations": 0,      # nombre d'ameliorations achetees
		"prestige": 0,           # nombre de prestiges effectues
		"multiplicateur": PRESTIGE_MULT_BASE,  # bonus permanent (conserve au prestige)
		"lieux": LIEUX_DEPART,   # nombre de lieux debloques
		"phase": PHASE_JEU,      # jamais "defeat"/"game_over"
	}

# --- INVARIANT NO-DEFEAT (core.no_defeat / core.end_condition / core.error_handling) ---

# Vocabulaire FERME des phases atteignables : aucune n'est une defaite.
static func phases_possibles() -> Array:
	return [PHASE_JEU]

# Ce genre n'a AUCUN etat de defaite (charter : aucun etat de defaite).
static func est_defaite(e: Dictionary) -> bool:
	return String(e.get("phase", PHASE_JEU)) == "defeat" or String(e.get("phase", PHASE_JEU)) == "game_over"

# Phase courante lisible a tout instant.
static func phase(e: Dictionary) -> String:
	return String(e.get("phase", PHASE_JEU))

# Une entree hors domaine ne casse jamais la partie : l'etat reste valide.
static func etat_valide(e: Dictionary) -> bool:
	if not (phase(e) in phases_possibles()):
		return false
	if est_defaite(e):
		return false
	return float(e.get("ronrons", 0.0)) >= 0.0 and float(e.get("cumul", 0.0)) >= 0.0

# Compteur de collection lisible "possedes/total".
static func collection_texte(e: Dictionary) -> String:
	return "%d/%d" % [int(e.get("types", 0)), int(e.get("nb_types", 0))]
