# solvability_bot.gd — BOT DE SOLVABILITE (bot.solvability). Politique DETERMINISTE qui
# pilote une partie par le MEME canal public que le joueur : clic + achats via l'API de
# 05_SYSTEMS (economy/upgrades), jamais d'ecriture directe dans l'etat.
#
# Deps declarees : game_state, input. Il consomme la LOGIQUE (economy) qui est le canal des
# intentions ; il ne force aucun etat. DETERMINISME : aucun alea, aucun temps.
extends RefCounted

const Economy = preload("res://05_SYSTEMS/economy/economy.gd")
const Upgrades = preload("res://05_SYSTEMS/economy/upgrades.gd")

# GARDE dure contre une boucle d'achat infinie sur un tick : borne le nombre d'achats par
# tour. Le cout croit geometriquement, donc en pratique 1 a 2 achats par tour suffisent.
const MAX_ACHATS_PAR_TOUR: int = 8


# UN tour de bot (apres la production passive du tick, geree par l'oracle) :
#  1. clic (gain strictement positif, toujours) ;
#  2. tant qu'un chaton est finançable -> l'acheter (montre la production) ;
#  3. si l'amelioration est confortablement finançable -> l'acheter (montre le taux).
# Ne rend rien : mute l'etat UNIQUEMENT via l'API publique.
static func agir(s, kitten_ids: Array) -> void:
	Economy.clic(s)
	var achats: int = 0
	while achats < MAX_ACHATS_PAR_TOUR and Economy.cout_chaton(s) <= s.ronrons:
		var r: Dictionary = Economy.acheter_chaton(s, kitten_ids)
		if not r.get("ok", false):
			break
		achats += 1
	# Amelioration achetee seulement avec une marge (x2) : garder de quoi acheter des chatons.
	if Upgrades.cout(s) * 2.0 <= s.ronrons:
		Upgrades.acheter(s)
