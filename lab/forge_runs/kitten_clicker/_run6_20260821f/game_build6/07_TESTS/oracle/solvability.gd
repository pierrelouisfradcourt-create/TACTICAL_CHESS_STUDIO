# solvability.gd — ORACLE DE SOLVABILITE R9. A la racine oracle du jeu (categorie
# test.solvability), lance par scripts/forge/solvability_godot.mjs via `--seed --max_ticks`.
#
# CE QUI EST PROUVE : un bot DETERMINISTE joue seul via le CANAL PUBLIC du joueur (clic +
# achats de l'API 05_SYSTEMS, jamais de forcage d'etat) et FRANCHIT LE 3e PALIER de
# meta-progression en un nombre FINI de ticks. La "victoire" du genre incremental EST le
# franchissement de palier ; le bot GAGNE, ce n'est pas une mecanique testee en isolation.
#
# Enregistre les seuils franchis : >=3 valeurs distinctes non triviales (regle de variance).
# Aucun comparateur >= tautologique : le succes est `palier_franchi(state, 3)` STRICT.
#
# Ce fichier ne porte volontairement PAS le marqueur d'oracle produit (celui que
# discover_oracle_files cherche dans le texte brut) : il joue en headless via la logique
# pure, sans charger de scene, et n'a donc rien a voir avec la garde d'assemblage runtime.
# Protocole de sortie : `FORGE_TRIAL {"succeeded": bool, "ticks": number|null}` puis quit(0)
# DANS TOUS LES CAS (un echec s'exprime par succeeded:false, jamais par un code non nul).
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
			# enregistre les seuils franchis depuis le dernier releve
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
