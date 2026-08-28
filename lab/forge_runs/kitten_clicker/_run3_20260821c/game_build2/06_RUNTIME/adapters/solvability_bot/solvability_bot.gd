# solvability_bot.gd — adaptateur `solvability_bot` (blueprint s4-archi). Prouve la PROGRESSION :
# planifie et emet, PAR LE CANAL D'INTENTIONS PUBLIC (input_adapter), une suite d'actions
# (caresser, acheter des producteurs, laisser accumuler, declencher le prestige) qui atteint le
# seuil de prestige dans un budget de ticks DECLARE.
#
# Ne calcule AUCUNE mutation lui-meme : il DEMANDE (renvoie une intention), le jeu decide.
# Deterministe (aucun alea). Deps (blueprint) : game_state, input_adapter. Il ne consulte JAMAIS
# le module prestige teste pour decider "gagne" — il lit seulement le compteur observable et le
# cout d'economy pour planifier ; la victoire est tranchee par le jeu (do_prestige).
extends RefCounted

const InputAdapter = preload("res://06_RUNTIME/adapters/input_adapter/input_adapter.gd")
const Economy = preload("res://05_SYSTEMS/economy/economy.gd")

# Nombre de producteurs de type 0 a acheter avant de se contenter d'accumuler par caresses.
# Choix de PLANIFICATION du bot (pas un parametre de gameplay) : borne son investissement pour
# ne pas drainer le compteur indefiniment et converger vers le seuil.
const ACHATS_PRODUCTEUR0_MAX: int = 4
const SEUIL_CIBLE: float = 100.0   # cible de progression du bot (= SEUIL_PRESTIGE d'economie)

# Choisit l'intention du tick a partir du SEUL releve observable de l'etat :
#  1) seuil atteint  -> PRESTIGE (le jeu tranche la victoire) ;
#  2) peu de producteurs 0 et achat abordable -> ACHETER(0) (accelere la production) ;
#  3) sinon -> CARESSER (accumule).
static func choisir_intention(state) -> Array:
	if state.purrs >= SEUIL_CIBLE:
		return [InputAdapter.Intention.PRESTIGE, 0]
	if state.producer_counts[0] < ACHATS_PRODUCTEUR0_MAX and Economy.can_buy(state, 0):
		return [InputAdapter.Intention.ACHETER, 0]
	return [InputAdapter.Intention.CARESSER, 0]
