# prestige.gd — module `prestige` (blueprint s4-archi). Tient l'action de prestige : au
# franchissement du seuil, remettre a zero la production courante (compteur + producteurs) et
# appliquer un multiplicateur permanent > 1 qui persiste apres le reset et augmente le gain de
# base des caresses futures.
#
# Fonction PURE ; lit la production courante pour calculer le gain de multiplicateur.
# Depend d'economy (pour remettre les producteurs a zero via son roster). Ne connait ni rendu,
# ni horloge.
extends RefCounted

const Economy = preload("res://05_SYSTEMS/economy/economy.gd")

# --- Parametres du domaine prestige (proprietaire: prestige) ---
const SEUIL_PRESTIGE: float = 100.0   # ronrons courants requis pour franchir le prestige
const MULT_STEP: float = 1.5          # facteur applique au multiplicateur permanent (>1 strict)

# Le seuil est-il franchi ? (production courante >= seuil)
static func can_prestige(state) -> bool:
	return state.purrs >= SEUIL_PRESTIGE

# Declenche le prestige SI le seuil est franchi : production courante remise a 0 (compteur +
# tous les producteurs), multiplicateur permanent multiplie par MULT_STEP (>1). Sinon etat
# INCHANGE (controle negatif : budget insuffisant ne franchit pas le seuil).
static func do_prestige(state):
	var s = state.clone()
	if not can_prestige(s):
		return s
	s.prestige_mult *= MULT_STEP
	s.purrs = 0.0
	s.producer_counts = Economy.producer_counts_initial()
	return s
