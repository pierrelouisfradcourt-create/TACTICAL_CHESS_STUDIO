# upgrades.gd — ameliorations du taux (capacite economy.upgrades, couvre R5).
#
# Depend UNIQUEMENT de game_state. Une amelioration multiplie le bonus de production :
# le taux apres achat est strictement superieur au taux avant (tant qu'il existe une
# production de base a amplifier).
extends RefCounted

# Facteur multiplicatif de chaque amelioration (> 1.0 : sinon l'achat ne monterait pas
# le taux). Valeurs distinctes, croissantes avec le prix suppose de l'amelioration.
const UPGRADES: Dictionary = {
	"extra_paws": 1.5,
	"cozy_blankets": 2.0,
	"golden_bell": 3.0,
}


# Facteur d'une amelioration (1.0 si inconnue -> aucun effet, jamais une exception).
static func upgrade_factor(upgrade_id: String) -> float:
	return float(UPGRADES.get(upgrade_id, 1.0))


# Applique une amelioration : multiplie upgrade_bonus par son facteur. Rend true si
# l'amelioration existe (et a donc eu un effet), false sinon.
static func apply_upgrade(state, upgrade_id: String) -> bool:
	if not UPGRADES.has(upgrade_id):
		return false
	state.upgrade_bonus *= upgrade_factor(upgrade_id)
	return true
