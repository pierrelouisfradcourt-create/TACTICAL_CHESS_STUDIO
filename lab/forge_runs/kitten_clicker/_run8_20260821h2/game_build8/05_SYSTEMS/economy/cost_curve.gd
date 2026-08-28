# cost_curve.gd — LOGIQUE PURE (categorie `system`, module 05_SYSTEMS/economy).
#
# HUB DE PARAMETRES (garde-fou (d) ratifie Pierre 2026-07-28 : aucun litteral de
# gameplay hors du bloc de parametres declare par la carte). Tous les nombres de
# gameplay du jeu vivent ICI, en constantes nommees ; les six autres regles de
# l'economie les LISENT, n'en redeclarent aucun.
#
# PORTE AUSSI : la table des couts (regle de variance, ratifiee Pierre 2026-07-21 :
# >=3 valeurs distinctes non triviales) et le constructeur d'etat `initial_state()`
# (l'etat est une donnee pure, aucune scene ni noeud — separation garde-fou (c)).
#
# DETERMINISME (garde-fou (b)) : aucune source d'alea ni de temps. Le seul "temps"
# est `ticks`, un compteur de trames incremente par `production.tick`, jamais une
# horloge de plateforme.
extends RefCounted


# --- Parametres de clic -------------------------------------------------------
const CLICK_BASE: float = 1.0            # un clic de base rapporte STRICTEMENT +1 ronron


# --- Table des couts d'adoption de chaton (regle de variance) -----------------
# Le PREMIER chaton est GRATUIT : la boucle-joueur (loop.json) achete un chaton
# AVANT le premier clic (etape 2), donc a 0 ronron en banque. Les couts suivants
# sont distincts et non triviaux -> variance non nulle prouvee sur echantillon.
const KITTEN_COSTS: Array = [0, 6, 15, 34, 72, 150]


# --- Production ---------------------------------------------------------------
const KITTEN_PROD_BASE: float = 0.5      # production de base par chaton et par tick
# AFFINITE / RONRONNEMENT QUI S'INTENSIFIE : plus les chatons ronronnent longtemps,
# plus ils produisent. Terme croissant a chaque tick tant qu'un chaton est present.
# C'est ce qui fait monter `taux_production` sans aucune action du joueur (maillons
# GAME_RESPONSE / REWARD de loop.json, etapes 4-6).
const WARMTH_PER_TICK: float = 0.05


# --- Amelioration (releve le taux, strict) ------------------------------------
const UPGRADE_MULT: float = 0.5          # chaque amelioration ajoute +50% a la base
const UPGRADE_COSTS: Array = [10, 25, 60, 140, 320]


# --- Deblocage de lieu (meta) -------------------------------------------------
const UNLOCK_COSTS: Array = [20, 55, 130, 300]


# --- Prestige -----------------------------------------------------------------
const PRESTIGE_THRESHOLD: float = 100.0  # ronrons requis pour le prestige
# Multiplicateur permanent gagne a CHAQUE prestige. Applique au clic ET a la
# production. Grand a dessein : apres un prestige, un seul clic doit rapporter
# STRICTEMENT plus que toute une salve de clics d'avant (maillon ADVANTAGE, etape 12).
const PRESTIGE_FACTOR: float = 100.0


# --- Echelle d'objectifs (paliers) --------------------------------------------
# `palier` = nombre de tranches de PALIER_STEP de ronrons cumules (`earned`) franchies.
# Monotone (earned ne diminue jamais), ce qui garantit des objectifs successifs
# textuellement distincts (maillon NEXT_GOAL, etapes 8-9).
const PALIER_STEP: float = 40.0


# Valeur d'un clic dans l'etat courant : base * multiplicateur de prestige.
# A l'etat neuf (prestige_mult == 1.0) vaut exactement CLICK_BASE == 1.0 -> l'oracle
# de mutation asserte `ronrons == n` apres n clics, jamais un `>=`.
static func click_value(state: Dictionary) -> float:
	return CLICK_BASE * float(state["prestige_mult"])


# Cout d'adoption du prochain chaton (indexe par la taille de la collection).
# Au-dela de la table, le dernier cout est reconduit (jamais un plantage d'index).
static func kitten_cost(state: Dictionary) -> int:
	var i: int = int(state["collection"])
	if i < KITTEN_COSTS.size():
		return int(KITTEN_COSTS[i])
	return int(KITTEN_COSTS[KITTEN_COSTS.size() - 1])


# Cout de la prochaine amelioration (indexe par le niveau d'amelioration).
static func upgrade_cost(state: Dictionary) -> int:
	var i: int = int(state["upgrade_level"])
	if i < UPGRADE_COSTS.size():
		return int(UPGRADE_COSTS[i])
	return int(UPGRADE_COSTS[UPGRADE_COSTS.size() - 1])


# Cout du prochain deblocage de lieu (indexe par le nombre de lieux debloques - 1 :
# le refuge initial ne se debloque pas, il est la des le depart).
static func unlock_cost(state: Dictionary) -> int:
	var i: int = int(state["locations"]) - 1
	if i < 0:
		i = 0
	if i < UNLOCK_COSTS.size():
		return int(UNLOCK_COSTS[i])
	return int(UNLOCK_COSTS[UNLOCK_COSTS.size() - 1])


# Table des couts affichable (les couts d'adoption non nuls), pour l'oracle de
# variance et l'affichage a l'ecran. Ordre stable, jamais dependant d'un Dictionary.
static func cost_ladder() -> Array:
	var out: Array = []
	for c in KITTEN_COSTS:
		if int(c) > 0:
			out.append(int(c))
	return out


# Nombre de valeurs de cout DISTINCTES et non triviales (> 0) dans l'echelle.
static func distinct_cost_count() -> int:
	var seen: Array = []
	for c in cost_ladder():
		if not seen.has(c):
			seen.append(c)
	return seen.size()


# Palier d'objectif courant, derive des ronrons CUMULES (jamais remis a zero).
static func palier(state: Dictionary) -> int:
	return int(float(state["earned"]) / PALIER_STEP)


# ETAT NEUF — donnee pure. Toutes les grandeurs du jeu, aucune reference a la vue.
static func initial_state() -> Dictionary:
	return {
		"ronrons": 0.0,        # monnaie courante (affichee en entier plancher)
		"earned": 0.0,         # ronrons cumules, jamais remis a zero (echelle d'objectifs)
		"collection": 0,       # chatons possedes
		"upgrade_level": 0,    # niveau d'amelioration
		"locations": 1,        # lieux debloques (le refuge initial compte pour 1)
		"prestige_mult": 1.0,  # multiplicateur permanent (clic et production)
		"prestige_count": 0,   # nombre de prestiges effectues
		"ticks": 0,            # trames de production ecoulees
	}
