# offline_gains.gd — module `offline_gains` (blueprint s4-archi). Calcule les gains hors-ligne
# pour une duree D RECUE EN ARGUMENT : production_passive * D, eventuellement capee a un plafond
# declare ; valeur strictement positive tant que D>0 et qu'au moins un producteur est possede.
#
# Fonction PURE : ne lit AUCUNE horloge de plateforme (D est remise par persistence). Depend
# d'economy pour le taux passif. Ne connait ni rendu, ni fichier.
extends RefCounted

const Economy = preload("res://05_SYSTEMS/economy/economy.gd")

# --- Parametres du domaine hors-ligne (proprietaire: offline_gains) ---
const OFFLINE_CAP: float = 3600.0   # plafond de gains hors-ligne (ronrons), quelle que soit D

# Gain hors-ligne pour un taux passif et une duree D donnes : min(rate*D, cap), borne >=0.
# rate<=0 (aucun producteur) => 0 ; D<=0 => 0. Deux gardes SEPAREES (une par condition) :
# forme equivalente au `or` compose, mais chaque borne vit sur sa propre ligne — la preuve de
# mutation peut alors trier chaque survivant equivalent individuellement (un `<=` mutant sur une
# ligne partagee serait ambigu et non triable).
static func compute(rate: float, duration_s: float, cap: float = OFFLINE_CAP) -> float:
	if rate <= 0.0:
		return 0.0
	if duration_s <= 0.0:
		return 0.0
	var brut: float = rate * duration_s
	if brut > cap:
		return cap
	return brut

# Gain hors-ligne pour un etat et une duree D : lit le taux passif d'economy puis compose.
# Ne mute pas l'etat (calcul pur, retourne un nombre).
static func compute_for_state(state, duration_s: float) -> float:
	return compute(Economy.passive_rate(state), duration_s)
