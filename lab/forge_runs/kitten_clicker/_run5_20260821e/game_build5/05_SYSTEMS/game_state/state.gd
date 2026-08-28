# state.gd — logique pure de l'etat de partie (capacite game.state).
#
# FEUILLE DU GRAPHE : ne connait ni scene, ni noeud, ni Input, ni rendu, ni aucun
# autre systeme (wiremap: game_state.allowed_deps == []). Les systemes production /
# economy / progression / persistence dependent de LUI ; jamais l'inverse.
#
# DETERMINISME : aucune source d'alea ni de temps. L'ordre d'iteration des chatons
# (Dictionary) n'influe sur aucun resultat — seule une SOMME commutative en depend.
extends RefCounted

# Bloc de parametres de gameplay (constantes nommees, jamais de litteral disperse).
const BASE_CLICK: float = 1.0        # ronrons gagnes par clic, avant multiplicateur prestige

var ronrons: float = 0.0             # compteur principal
var base_production: float = 0.0     # somme des contributions des chatons possedes (ronrons/tick)
var prestige_mult: float = 1.0       # multiplicateur permanent de meta-progression (au moins 1.0)
var upgrade_bonus: float = 1.0       # multiplicateur cumule des ameliorations achetees
var kittens: Dictionary = {}         # rarete(String) -> nombre possede(int)
var unlocked_places: Array = ["shelter"]  # lieux debloques (refuge de depart present d'entree)


# Valeur d'UN clic : la puissance de base amplifiee par le multiplicateur de prestige.
func click_value() -> float:
	return BASE_CLICK * prestige_mult


# TAUX RONRONS/SEC AGREGE (l'unique taux expose comme etat, lu par le HUD) :
# somme des producteurs (base_production) multipliee par les multiplicateurs
# (prestige * ameliorations). C'est la seule fonction qui compose ces trois grandeurs.
func aggregate_rate() -> float:
	return base_production * prestige_mult * upgrade_bonus


# Nombre total de chatons possedes, toutes raretes confondues. Somme commutative :
# independante de l'ordre d'iteration du Dictionary (garde-fou determinisme).
func kitten_count() -> int:
	var n: int = 0
	for rarity in kittens:
		n += int(kittens[rarity])
	return n
