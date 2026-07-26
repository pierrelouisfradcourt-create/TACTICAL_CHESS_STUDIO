# Fixture DETERMINISTE — controle de l adaptateur godot_trial.mjs.
# Ne modelise aucune mecanique : mappe seed -> resultat par une formule fixe,
# pour que l adaptateur puisse etre teste independamment de tout jeu reel.
extends SceneTree

const PREFIX := "FORGE_TRIAL "

func _initialize() -> void:
	var args := _parse_args()
	if not args.has("seed"):
		printerr("argument --seed=<N> manquant")
		quit(2)
		return
	var seed_str: String = args["seed"]
	if not seed_str.is_valid_int():
		printerr("--seed argument doit être un entier valide")
		quit(2)
		return
	var seed_value: int = int(seed_str)
	var succeeded: bool = (seed_value % 10) != 0
	var ticks = (seed_value % 7) + 3 if succeeded else null
	print(PREFIX + JSON.stringify({"succeeded": succeeded, "ticks": ticks}))
	quit(0)

func _parse_args() -> Dictionary:
	var out := {}
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--") and a.contains("="):
			var parts := a.substr(2).split("=", true, 1)
			out[parts[0]] = parts[1]
	return out
