# input_adapter.gd — adaptateur `input_adapter` (blueprint s4-archi). CANAL D'ENTREE PUBLIC
# UNIQUE : traduit les evenements de peripherique (clic, tap) en INTENTIONS d'un vocabulaire
# FERME, puis applique l'intention a l'etat via les systemes PURS. Le bot de solvabilite emet
# ses intentions par CE MEME canal, jamais par une ecriture directe dans l'etat.
#
# Ne dessine rien, ne calcule aucune valeur de jeu (il delegue tout aux systemes purs).
# Deps (blueprint) : game_state, purr_action, economy, prestige. Le clic-bonus est route par
# game_state (qui, lui, depend de bonus_event) — l'input_adapter ne connait pas bonus_event.
extends RefCounted

const PurrAction = preload("res://05_SYSTEMS/purr_action/purr_action.gd")
const Economy = preload("res://05_SYSTEMS/economy/economy.gd")
const Prestige = preload("res://05_SYSTEMS/prestige/prestige.gd")
const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")

# Vocabulaire FERME d'intentions. Toute entree hors de ce vocabulaire vaut AUCUNE.
enum Intention { AUCUNE, CARESSER, ACHETER, PRESTIGE, BONUS }

# Applique une intention a l'etat et rend un NOUVEL etat. `arg` = type de producteur pour
# ACHETER (ignore pour les autres). Une intention inconnue ou AUCUNE laisse l'etat inchange.
static func apply(state, intention: int, arg: int = 0):
	match intention:
		Intention.CARESSER:
			return PurrAction.apply_purr(state, 1)
		Intention.ACHETER:
			return Economy.buy_producer(state, arg)
		Intention.PRESTIGE:
			return Prestige.do_prestige(state)
		Intention.BONUS:
			return GameState.click_bonus(state)
		_:
			return state.clone()

# Traduit un clic ecran en intention selon la zone focale du chaton central. Geometrie pure
# (rectangle de la zone focale) : sur la zone => CARESSER, hors zone => AUCUNE. Ne mute rien.
static func intention_from_click(pos: Vector2, focal_rect: Rect2) -> int:
	if focal_rect.has_point(pos):
		return Intention.CARESSER
	return Intention.AUCUNE
