# economy.gd — ECONOMIE PURE : clic, production passive, achat de chaton.
#
# Deps declarees (wiremap) : params, game_state. Le registre de chatons (03_WORLD) n'est PAS
# une dependance : ses identifiants sont PASSES en argument par le runtime. La logique reste
# ainsi sans connaissance du contenu (donnee pure lue au boot).
#
# DETERMINISME : aucune source d'alea ni de temps. Meme etat -> meme etat suivant.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")
const Guard = preload("res://05_SYSTEMS/game_state/error_guard.gd")
const End = preload("res://05_SYSTEMS/game_state/end_conditions.gd")


# Cout du PROCHAIN chaton : croissance geometrique sur la taille de la colonie.
static func cout_chaton(s) -> float:
	return P.KITTEN_BASE_COST * pow(P.KITTEN_COST_GROWTH, float(s.kittens.size()))


# Taux de production par tick, DERIVE de l'etat. Recalcule et cache dans s.taux.
# Un seul chaton donne deja un taux STRICTEMENT positif.
static func recalculer_taux(s) -> float:
	s.taux = float(s.kittens.size()) * P.KITTEN_PROD_PER * s.upgrade_mult() * s.prestige_mult()
	return s.taux


# UN clic : ajoute le gain (STRICTEMENT positif) au compteur. Rend le gain applique.
# Le gain herite du bonus de prestige — c'est ce qui rend le clic plus fort apres un reset.
static func clic(s) -> float:
	var gain: float = P.CLICK_GAIN * s.prestige_mult()
	if not Guard.gain_valide(gain):
		return 0.0
	s.ronrons += gain
	s.total_earned += gain
	End.update_palier(s)
	return gain


# UN tick de production passive : avance l'etat SANS clic. Rend le delta ajoute (== taux).
# Delta STRICTEMENT positif des qu'au moins un chaton est possede.
static func tick(s) -> float:
	var delta: float = recalculer_taux(s)
	s.ronrons += delta
	s.total_earned += delta
	End.update_palier(s)
	return delta


# ACHAT d'un chaton. `ids` = identifiants du registre (passes par le runtime). Debloque un
# chaton DISTINCT tant que la collection n'est pas complete, sinon agrandit la colonie sans
# nouveau distinct. Un achat non finançable est IGNORE (etat inchange).
# Rend {ok, unlocked_new, kitten_id}.
static func acheter_chaton(s, ids: Array) -> Dictionary:
	var cout: float = cout_chaton(s)
	if not Guard.peut_payer(s.ronrons, cout):
		return {"ok": false, "unlocked_new": false, "kitten_id": ""}
	s.ronrons -= cout
	# Identite du chaton achete : le prochain non encore debloque, sinon un doublon du dernier.
	var idx: int = s.unlocked.size()
	var kid: String = ""
	var nouveau: bool = false
	if not ids.is_empty():
		if idx < ids.size():
			kid = String(ids[idx])
			s.unlocked.append(kid)
			nouveau = true
		else:
			kid = String(ids[ids.size() - 1])
	s.kittens.append(kid)
	recalculer_taux(s)
	End.update_palier(s)
	return {"ok": true, "unlocked_new": nouveau, "kitten_id": kid}
