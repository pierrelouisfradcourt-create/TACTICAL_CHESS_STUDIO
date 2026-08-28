# economy.gd — module `economy` (blueprint s4-archi). Detient les producteurs automatiques :
# achat (debit du cout courant), COURBE DE COUT strictement croissante par rachat, et TAUX de
# production passive par unite de temps.
#
# Fonctions PURES : la production est PRODUITE ici (taux) ; son application dans le temps est
# composee par game_state (jamais l'inverse). Aucune constante de rendu, aucun acces horloge.
# Tous les literaux economiques du domaine "producteurs" vivent en tete de CE fichier (le
# systeme est proprietaire de ses parametres — aucun bloc params central n'est mappe).
extends RefCounted

# --- Parametres du domaine producteurs (proprietaire: economy) ---
# Roster ORDONNE de producteurs. L'ordre est l'identite (indices), jamais une iteration de
# Dictionary (garde-fou determinisme).
const PRODUCER_IDS: Array = ["chaton_roux", "chaton_gris", "chaton_noir"]
const PRODUCER_BASE_COST: Array = [10, 200, 3000]     # cout de base (entier) par type
const PRODUCER_BASE_RATE: Array = [2.0, 25.0, 200.0]  # ronrons/seconde par unite possedee
const COST_GROWTH: float = 1.15                       # facteur multiplicatif de cout par rachat

static func producer_count() -> int:
	return PRODUCER_IDS.size()

static func producer_counts_initial() -> Array:
	var a: Array = []
	for _i in range(PRODUCER_IDS.size()):
		a.append(0)
	return a

# Cout du PROCHAIN achat du producteur `type`, sachant `owned` deja possedes.
# floor(base * growth^owned) : strictement croissant en `owned` (base>=10, growth>1 => floors
# distincts et croissants). Retourne un entier (le compteur se debite d'un montant exact).
static func cost(type: int, owned: int) -> int:
	if type < 0 or type >= PRODUCER_BASE_COST.size():
		return -1
	if owned < 0:
		owned = 0
	var base: float = float(PRODUCER_BASE_COST[type])
	return int(floor(base * pow(COST_GROWTH, owned)))

# Cout courant du producteur `type` au vu de l'etat (nombre deja possede).
static func current_cost(state, type: int) -> int:
	if type < 0 or type >= state.producer_counts.size():
		return -1
	return cost(type, state.producer_counts[type])

# Achat d'un producteur : si le solde couvre le cout courant, debiter et incrementer le compte,
# rendre un NOUVEL etat. Sinon rendre l'etat INCHANGE (achat refuse, aucun credit fantome).
static func buy_producer(state, type: int):
	var s = state.clone()
	if type < 0 or type >= s.producer_counts.size():
		return s
	var c: int = current_cost(s, type)
	if s.purrs < float(c):
		return s
	s.purrs -= float(c)
	s.producer_counts[type] += 1
	return s

# Peut-on acheter le producteur `type` ? (solde suffisant)
static func can_buy(state, type: int) -> bool:
	if type < 0 or type >= state.producer_counts.size():
		return false
	return state.purrs >= float(current_cost(state, type))

# Taux de production passive TOTAL (ronrons/seconde) : somme des unites possedees x leur taux.
# Iteration sur des indices ORDONNES (jamais un Dictionary).
static func passive_rate(state) -> float:
	var total: float = 0.0
	for i in range(state.producer_counts.size()):
		total += float(state.producer_counts[i]) * float(PRODUCER_BASE_RATE[i])
	return total
