# solvability.gd — POINT D'ENTREE de l'oracle de SOLVABILITE (racine du projet, categorie
# godot.project_root ; preuve R6). Charge par knowledge_base/systems/adapters/godot_trial.mjs
# via `--seed=<n> --max_ticks=<m>`. Le bot joue une session complete par le MEME canal d'entree
# PUBLIC (input_adapter) qu'un joueur, et doit reellement GAGNER : atteindre le seuil et
# declencher le prestige (mult_permanent passe strictement > 1). Aucun forcage d'etat.
#
# Le generateur d'instance (GameState.initial) ne consulte JAMAIS le module prestige teste : le
# bot lit le compteur observable et planifie ; la VICTOIRE est tranchee par le jeu (do_prestige),
# pas par le bot (evite la tautologie R9 du 2026-07-21).
# Sortie : une ligne `FORGE_TRIAL {"succeeded": bool, "ticks": number|null}`, exit 0.
extends SceneTree

const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")
const InputAdapter = preload("res://06_RUNTIME/adapters/input_adapter/input_adapter.gd")
const Bot = preload("res://06_RUNTIME/adapters/solvability_bot/solvability_bot.gd")

const DT := 1.0                 # pas de temps de simulation par tick (secondes)
const MAX_TICKS_DEFAUT := 400   # budget de ticks par defaut si non fourni / invalide

func _lire_arg(nom: String, defaut: int) -> int:
	for a in OS.get_cmdline_user_args():
		if a.begins_with(nom + "="):
			var v := a.substr((nom + "=").length())
			if v.is_valid_int():
				return int(v)
	return defaut

func _initialize() -> void:
	var graine := _lire_arg("--seed", 1)
	var max_ticks := _lire_arg("--max_ticks", MAX_TICKS_DEFAUT)
	if max_ticks <= 0:
		max_ticks = MAX_TICKS_DEFAUT

	var s = GameState.initial(graine)
	var mult_avant: float = s.prestige_mult
	var t := 0
	var gagne := false
	while t < max_ticks:
		var intent: Array = Bot.choisir_intention(s)
		s = InputAdapter.apply(s, intent[0], intent[1])
		# Victoire tranchee par le JEU : le prestige n'a lieu que si do_prestige a franchi le
		# seuil, ce qui se lit a l'augmentation STRICTE du multiplicateur permanent.
		if s.prestige_mult > mult_avant:
			gagne = true
			break
		s = GameState.tick(s, DT)
		t += 1

	var recu := {"succeeded": gagne, "ticks": (t if gagne else null)}
	print("FORGE_TRIAL " + JSON.stringify(recu))
	quit(0)
