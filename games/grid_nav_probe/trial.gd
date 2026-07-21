# Point d'entrée de simulation headless pour grid_nav_probe.
# Lancer : godot --headless --path games/grid_nav_probe --script res://trial.gd --seed=<N>
# Émet : FORGE_TRIAL {"succeeded": bool, "ticks": number|null}
# Exit : 0 (toujours), ou 2 si argument manquant/invalide.
extends SceneTree

const GridNav = preload("res://core/grid_nav.gd")
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

	# Extraire max_ticks si fourni.
	var max_ticks := 200
	if args.has("max_ticks"):
		var max_ticks_str: String = args["max_ticks"]
		if max_ticks_str.is_valid_int():
			max_ticks = int(max_ticks_str)

	var result = run_simulation(seed_value, max_ticks)

	print(PREFIX + JSON.stringify(result))
	quit(0)

## Simule une session de navigation de labyrinthe seedée.
## Retourne {"succeeded": bool, "ticks": int|null}
func run_simulation(seed: int, max_ticks: int) -> Dictionary:
	# Générer un labyrinthe déterministe à partir du seed.
	var maze_width := 16
	var maze_height := 16
	var walls = _generate_maze_deterministic(seed, maze_width, maze_height)

	# Placer un agent et une cible.
	var agent_pos = Vector2i(1, 1)
	var target_pos = Vector2i(maze_width - 2, maze_height - 2)

	# Vérifier que la cible est atteignable.
	var path_len = GridNav.path_length(agent_pos, target_pos, walls)
	if path_len < 0:
		# Cible inaccessible.
		return {"succeeded": false, "ticks": null}

	# Simuler la navigation : faire des pas jusqu'à atteindre la cible ou timeout.
	var ticks := 0
	var current_pos = agent_pos

	while ticks < max_ticks and current_pos != target_pos:
		current_pos = GridNav.next_step(current_pos, target_pos, walls)
		ticks += 1

	var succeeded = (current_pos == target_pos)
	return {"succeeded": succeeded, "ticks": ticks if succeeded else null}

## Génère un labyrinthe déterministe à partir du seed.
## Utilise un hash prédéfini au lieu de randi (interdit par R10).
func _generate_maze_deterministic(seed: int, width: int, height: int) -> Dictionary:
	var walls = {}

	# Hash déterministe linéaire : (seed * position + offset) % MOD.
	var mod := 65521  # nombre premier
	for y in range(height):
		for x in range(width):
			var pos_hash := ((seed * (x + y * width)) + x * 73 + y * 83) % mod
			# Probabilité de mur = pos_hash % 10 > 6, ~40% des cellules.
			if (pos_hash % 10) > 6:
				walls[Vector2i(x, y)] = true

	# S'assurer que le chemin de (1,1) à (width-2, height-2) n'est pas complètement bloqué.
	# Créer un corridor dégagé pour garantir une réussite possible.
	for x in range(1, width - 1):
		walls.erase(Vector2i(x, 1))
	for y in range(1, height - 1):
		walls.erase(Vector2i(width - 2, y))

	return walls

func _parse_args() -> Dictionary:
	var out := {}
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--") and a.contains("="):
			var parts := a.substr(2).split("=", true, 1)
			out[parts[0]] = parts[1]
	return out
