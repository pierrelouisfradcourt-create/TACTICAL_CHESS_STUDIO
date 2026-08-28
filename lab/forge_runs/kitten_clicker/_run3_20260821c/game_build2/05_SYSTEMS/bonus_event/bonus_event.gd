# bonus_event.gd — module `bonus_event` (blueprint s4-archi). Tient l'objet-bonus ephemere
# comme MODELE PUR : apparition par intermittence (planning DETERMINISTE seede), fenetre de vie
# bornee, effet temporaire (gain multiplie pendant une duree) au clic dans la fenetre,
# disparition en fin de fenetre. Ignorer l'objet n'entraine AUCUNE penalite ni decrement.
#
# Fonctions PURES ; aucun rendu, aucun RNG non seede, aucune horloge (le temps vit dans l'etat).
# Le planning est une FONCTION du temps et de la graine : aucun randi/randf (garde-fou
# determinisme). Deps: [].
extends RefCounted

# --- Parametres du domaine bonus (proprietaire: bonus_event) ---
const BONUS_FIRST_S: float = 10.0    # premier instant d'apparition possible
const BONUS_PERIOD_S: float = 30.0   # periode entre deux apparitions
const BONUS_WINDOW_S: float = 5.0    # duree pendant laquelle l'objet est cliquable
const BONUS_FACTOR: float = 2.0      # facteur de gain applique quand le bonus est actif (>1)
const BONUS_EFFECT_S: float = 10.0   # duree de l'effet apres un clic reussi

# Decalage de phase deterministe de la graine (borne dans [0, PERIOD)). Aucune source d'alea.
static func _phase_offset(seed_value: int) -> float:
	var m: int = seed_value % 5
	if m < 0:
		m += 5
	return float(m)

# L'objet-bonus est-il cliquable a l'instant courant ? true dans chaque fenetre
# [t_k, t_k + WINDOW) ou t_k = FIRST + offset + k*PERIOD, k>=0.
static func is_active(state) -> bool:
	var start: float = BONUS_FIRST_S + _phase_offset(state.seed_value)
	if state.time_s < start:
		return false
	var rel: float = state.time_s - start
	var dans_periode: float = fmod(rel, BONUS_PERIOD_S)
	return dans_periode < BONUS_WINDOW_S

# Clic sur l'objet : s'il est actif, activer l'effet temporaire (facteur > 1 jusqu'a
# time_s + EFFECT). Sinon etat INCHANGE (aucun bonus, aucun decrement).
static func click_bonus(state):
	var s = state.clone()
	if not is_active(s):
		return s
	s.bonus_factor = BONUS_FACTOR
	s.bonus_expiry_s = s.time_s + BONUS_EFFECT_S
	return s

# Fait expirer l'effet du bonus quand sa duree est passee : facteur ramene a 1. N'affecte
# jamais le total (aucune penalite a ignorer l'objet).
static func advance(state):
	var s = state.clone()
	if s.bonus_factor != 1.0 and s.time_s >= s.bonus_expiry_s:
		s.bonus_factor = 1.0
		s.bonus_expiry_s = -1.0
	return s
