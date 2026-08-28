# contribution.gd — contribution des chatons au taux (capacite economy.contribution, R22).
#
# Depend UNIQUEMENT de game_state. La table de contribution par rarete vit ICI (systeme
# economy), jamais dans game_state (qui est une feuille sans dependance) : acheter un
# chaton fait monter base_production de la contribution declaree de sa rarete.
extends RefCounted

# Contribution en ronrons/tick d'UN chaton, par rarete. Valeurs distinctes et croissantes
# avec la rarete (variance non triviale, regle des metriques Forge).
const CONTRIB_BY_RARITY: Dictionary = {
	"common": 1.0,
	"uncommon": 3.0,
	"rare": 8.0,
	"epic": 20.0,
	"legendary": 50.0,
}


# Contribution declaree d'une rarete (0.0 si rarete inconnue — jamais une exception).
static func kitten_contribution(rarity: String) -> float:
	return float(CONTRIB_BY_RARITY.get(rarity, 0.0))


# Acheter un chaton d'une rarete : incremente son compte et ajoute sa contribution a
# base_production. Rend la contribution appliquee (pour verification stricte de la hausse).
static func buy_kitten(state, rarity: String) -> float:
	var contribution: float = kitten_contribution(rarity)
	state.kittens[rarity] = int(state.kittens.get(rarity, 0)) + 1
	state.base_production += contribution
	return contribution
