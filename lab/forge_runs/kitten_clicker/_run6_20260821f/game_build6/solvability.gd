# solvability.gd — POINT D'ENTREE R9 (racine du projet, categorie godot.project_root).
#
# Lance par scripts/forge/godot_oracle.mjs -> solvability_godot.mjs, un essai par graine
# (`--seed=<n> --max_ticks=<m>`). C'est le chemin REELLEMENT execute par le gate : le
# wrapper godot_oracle.mjs charge `res://solvability.gd` (const SOLVABILITY_SCRIPT), jamais
# un sous-dossier. La ligne de wiremap `solvability.bot` porte le meme harnais sous
# 07_TESTS/oracle/solvability.gd (adresse test.solvability) ; ce fichier-ci en est le point
# d'entree moteur exige, meme logique, meme verdict.
#
# CE QUI EST PROUVE : un bot DETERMINISTE joue seul via le CANAL PUBLIC du joueur (clic +
# achats de l'API 05_SYSTEMS, jamais de forcage d'etat) et FRANCHIT LE 3e PALIER de
# meta-progression en un nombre FINI de ticks. La "victoire" du genre incremental EST le
# franchissement de palier ; le bot GAGNE, ce n'est pas une mecanique testee en isolation.
# Aucun comparateur >= tautologique : le succes est `palier_franchi(state, 3)` STRICT.
#
# Protocole de sortie : `FORGE_TRIAL {"succeeded": bool, "ticks": number|null}` puis quit(0)
# DANS TOUS LES CAS (un echec s'exprime par succeeded:false, jamais par un code non nul :
# knowledge_base/systems/adapters/godot_trial.mjs leve sur tout statut non nul -> BLOCKED).
extends SceneTree

const P = preload("res://05_SYSTEMS/params/params.gd")
const Economy = preload("res://05_SYSTEMS/economy/economy.gd")
const End = preload("res://05_SYSTEMS/game_state/end_conditions.gd")
const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")
const Bot = preload("res://06_RUNTIME/adapters/solvability_bot/solvability_bot.gd")

const MAX_TICKS_DEFAUT := 20000
const PALIER_CIBLE := 3


func _lire_arg(nom: String, defaut: int) -> int:
	for a in OS.get_cmdline_user_args():
		if a.begins_with(nom + "="):
			var v := a.substr((nom + "=").length())
			if v.is_valid_int():
				return int(v)
	return defaut


func _ids() -> Array:
	var f := FileAccess.open(P.REG_KITTENS, FileAccess.READ)
	if f == null:
		return []
	var d = JSON.parse_string(f.get_as_text())
	f.close()
	var out: Array = []
	if d is Dictionary:
		for k in d.get("kittens", []):
			out.append(String(k.get("id", "")))
	return out


func _initialize() -> void:
	var max_ticks := _lire_arg("--max_ticks", MAX_TICKS_DEFAUT)
	if max_ticks <= 0:
		max_ticks = MAX_TICKS_DEFAUT

	var ids: Array = _ids()
	var s = GameState.initial(ids.size() if not ids.is_empty() else 6)

	var seuils_franchis: Array = []     # valeurs de seuil reellement traversees (variance)
	var palier_vu: int = 0
	var ticks: int = 0
	while ticks < max_ticks:
		Economy.tick(s)          # production passive de ce tick
		Bot.agir(s, ids)         # le bot clique et achete via le canal public
		ticks += 1
		if s.palier > palier_vu:
			for k in range(palier_vu, s.palier):
				seuils_franchis.append(float(P.PALIERS[k]))
			palier_vu = s.palier
		if End.palier_franchi(s, PALIER_CIBLE):
			break

	var reussi: bool = End.palier_franchi(s, PALIER_CIBLE)
	var distincts := {}
	for v in seuils_franchis:
		distincts[v] = true

	print("FORGE_DIAG ", JSON.stringify({
		"palier_atteint": s.palier,
		"total_earned": s.total_earned,
		"ronrons": s.ronrons,
		"colonie": s.kittens.size(),
		"collection": s.unlocked.size(),
		"ticks": ticks,
		"budget_epuise": ticks >= max_ticks,
		"seuils_franchis": seuils_franchis,
		"seuils_distincts": distincts.size(),
		"statut": s.statut,
	}))
	print("FORGE_TRIAL ", JSON.stringify({
		"succeeded": reussi, "ticks": (ticks if reussi else null)
	}))
	quit(0)
