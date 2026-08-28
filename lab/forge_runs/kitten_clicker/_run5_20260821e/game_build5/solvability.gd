# solvability.gd — oracle de SOLVABILITE (R16, critere demo (h)), racine du projet
# (categorie godot.project_root). Charge par scripts/forge/solvability_godot.mjs.
#
# Un bot DETERMINISTE (aucun alea) joue par les MEMES canaux publics que le joueur
# (production.click + production.auto + achats economy) et doit ATTEINDRE LE 3e PALIER
# en un nombre de ticks FINI, borne explicite. L'atteinte est STRICTE : succeeded ssi
# tier_reached == 3 (jamais un >= tautologique). Sortie : une ligne
# FORGE_TRIAL {"succeeded": bool, "ticks": number|null}, exit 0.
extends SceneTree

const State = preload("res://05_SYSTEMS/game_state/state.gd")
const Click = preload("res://05_SYSTEMS/production/click.gd")
const Auto = preload("res://05_SYSTEMS/production/auto.gd")
const Pricing = preload("res://05_SYSTEMS/economy/pricing.gd")
const Contribution = preload("res://05_SYSTEMS/economy/contribution.gd")
const Tiers = preload("res://05_SYSTEMS/progression/tiers.gd")

const MAX_TICKS_DEFAUT := 20000   # BORNE FINIE EXPLICITE
const COUT_BASE_COMMON := 10      # cout de base d'un chaton commun
const CHATONS_A_ACHETER := 8      # le bot reinvestit dans 8 communs puis accumule


func _lire_arg(nom: String, defaut: int) -> int:
	for a in OS.get_cmdline_user_args():
		if a.begins_with(nom + "="):
			var v := a.substr((nom + "=").length())
			if v.is_valid_int():
				return int(v)
	return defaut


func _initialize() -> void:
	var max_ticks := _lire_arg("--max_ticks", MAX_TICKS_DEFAUT)
	if max_ticks <= 0:
		max_ticks = MAX_TICKS_DEFAUT

	var s = State.new()
	var owned_common: int = 0
	var t: int = 0
	var ticks_atteinte: int = -1

	while t < max_ticks:
		# Le bot clique puis laisse tourner la production automatique (memes canaux joueur).
		Click.on_click(s)
		Auto.tick_production(s)
		# Reinvestissement : achete des communs tant qu'il en manque et qu'il peut payer.
		while owned_common < CHATONS_A_ACHETER:
			var cost: int = Pricing.next_cost(COUT_BASE_COMMON, owned_common)
			if s.ronrons >= float(cost):
				s.ronrons -= float(cost)
				Contribution.buy_kitten(s, "common")
				owned_common += 1
			else:
				break
		t += 1
		if Tiers.tier_reached(s.ronrons) == 3:
			ticks_atteinte = t
			break

	var succeeded: bool = (ticks_atteinte >= 0 and Tiers.tier_reached(s.ronrons) == 3)
	var recu := {"succeeded": succeeded, "ticks": (ticks_atteinte if succeeded else null)}
	print("FORGE_TRIAL " + JSON.stringify(recu))
	quit(0)
