# purr_action.gd — module `purr_action` (blueprint s4-archi). POINT DE MUTATION UNIQUE du
# compteur de ronrons par le geste de caresse.
#
# Fonction PURE : ne lit aucun peripherique, ne dessine rien, n'a aucune horloge. Applique
# N caresses a l'etat recu et rend un NOUVEL etat (ne mute jamais l'entree). Le gain est
# `state.gain_par_clic()` — derive de la base et du multiplicateur de prestige portes par
# l'etat — donc purr_action ne depend d'aucun autre systeme (deps: []).
extends RefCounted

# Applique `n` caresses (n>=1 sinon aucune) : purrs += n * gain_par_clic. Egalite stricte.
static func apply_purr(state, n: int = 1):
	var s = state.clone()
	if n < 1:
		return s
	s.purrs += float(n) * s.gain_par_clic()
	return s
