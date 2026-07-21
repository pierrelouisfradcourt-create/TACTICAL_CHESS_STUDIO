# Oracle headless pour grid_nav.gd — déterministe, pur.
# Lancer : godot --headless --path games/grid_nav_probe --script res://tests/run_tests.gd
# exit 0 = tous verts, 1 = échec.
extends SceneTree

const GridNav = preload("res://core/grid_nav.gd")

# Nombre d'assertions attendu — garde anti-faux-vert.
const EXPECTED_ASSERTS := 30

var _passed := 0
var _failed := 0
var _fails: Array = []

func _initialize() -> void:
	test_next_step_adjacent_north()
	test_next_step_adjacent_south()
	test_next_step_adjacent_east()
	test_next_step_adjacent_west()
	test_next_step_same_position()
	test_path_length_adjacent()
	test_path_length_straight_line()
	test_path_length_unreachable()
	test_path_length_same()
	test_path_length_diagonal_obstacle()
	test_next_step_avoids_wall_north()
	test_next_step_avoids_wall_south()
	test_next_step_reduces_distance()
	test_next_step_determinism()
	test_path_purity_walls_unmodified()
	test_path_length_complex_maze()
	test_next_step_away_then_toward()
	test_path_length_surrounded()
	test_edge_wrapping_not_allowed()
	test_path_length_large_distance()
	test_next_step_multiple_steps()
	test_path_length_L_shape()
	test_next_step_consistency()
	test_bfs_revisit_detection()
	test_path_long_exploration()

	var total := _passed + _failed
	if total != EXPECTED_ASSERTS:
		_failed += 1
		_fails.append("META: %d/%d assertions exécutées (coeur non chargé ?)" % [total, EXPECTED_ASSERTS])

	print("\n=== RESULT: %d passed, %d failed ===" % [_passed, _failed])
	for f in _fails:
		print("  FAIL: ", f)
	quit(0 if _failed == 0 else 1)

func ok(cond: bool, name: String) -> void:
	if cond:
		_passed += 1
	else:
		_failed += 1
		_fails.append(name)

# === Test suite ===

func test_next_step_adjacent_north() -> void:
	var from = Vector2i(5, 5)
	var to = Vector2i(5, 4)  # une case vers le nord
	var walls = {}
	var step = GridNav.next_step(from, to, walls)
	ok(step == to, "next_step adjacent north reaches target")

func test_next_step_adjacent_south() -> void:
	var from = Vector2i(5, 5)
	var to = Vector2i(5, 6)  # une case vers le sud
	var walls = {}
	var step = GridNav.next_step(from, to, walls)
	ok(step == to, "next_step adjacent south reaches target")

func test_next_step_adjacent_east() -> void:
	var from = Vector2i(5, 5)
	var to = Vector2i(6, 5)  # une case vers l'est
	var walls = {}
	var step = GridNav.next_step(from, to, walls)
	ok(step == to, "next_step adjacent east reaches target")

func test_next_step_adjacent_west() -> void:
	var from = Vector2i(5, 5)
	var to = Vector2i(4, 5)  # une case vers l'ouest
	var walls = {}
	var step = GridNav.next_step(from, to, walls)
	ok(step == to, "next_step adjacent west reaches target")

func test_next_step_same_position() -> void:
	var pos = Vector2i(3, 3)
	var walls = {}
	var step = GridNav.next_step(pos, pos, walls)
	ok(step == pos, "next_step(p, p, {}) returns p")

func test_path_length_adjacent() -> void:
	var from = Vector2i(0, 0)
	var to = Vector2i(1, 0)
	var walls = {}
	var length = GridNav.path_length(from, to, walls)
	ok(length == 1, "path_length adjacent = 1")
	ok(length > 0, "path_length adjacent is positive")

func test_path_length_straight_line() -> void:
	var from = Vector2i(0, 0)
	var to = Vector2i(5, 0)
	var walls = {}
	var length = GridNav.path_length(from, to, walls)
	ok(length == 5, "path_length straight line = 5")

func test_path_length_unreachable() -> void:
	var from = Vector2i(0, 0)
	var to = Vector2i(5, 5)
	# entourer to de murs
	var walls = {}
	walls[Vector2i(4, 5)] = true
	walls[Vector2i(6, 5)] = true
	walls[Vector2i(5, 4)] = true
	walls[Vector2i(5, 6)] = true
	var length = GridNav.path_length(from, to, walls)
	ok(length == -1, "path_length unreachable = -1")

func test_path_length_same() -> void:
	var pos = Vector2i(2, 2)
	var walls = {}
	var length = GridNav.path_length(pos, pos, walls)
	ok(length == 0, "path_length same position = 0")
	ok(length >= 0, "path_length is non-negative for reachable target")

func test_path_length_diagonal_obstacle() -> void:
	var from = Vector2i(0, 0)
	var to = Vector2i(2, 0)
	var walls = {}
	walls[Vector2i(1, 0)] = true
	# doit aller via (0,1) -> (1,1) -> (2,1) -> (2,0) = 4 pas
	var length = GridNav.path_length(from, to, walls)
	ok(length == 4, "path_length with direct obstacle = 4")

func test_next_step_avoids_wall_north() -> void:
	var from = Vector2i(5, 5)
	var to = Vector2i(5, 0)  # loin au nord
	var walls = {}
	walls[Vector2i(5, 4)] = true  # mur directement au nord
	var step = GridNav.next_step(from, to, walls)
	# doit contourner -> aller à l'est ou l'ouest
	ok(step != from, "next_step avoids wall north (moves away)")
	ok(step == Vector2i(6, 5) or step == Vector2i(4, 5), "next_step avoids wall north and detours")

func test_next_step_avoids_wall_south() -> void:
	var from = Vector2i(5, 5)
	var to = Vector2i(5, 10)
	var walls = {}
	walls[Vector2i(5, 6)] = true  # mur directement au sud
	var step = GridNav.next_step(from, to, walls)
	ok(step == Vector2i(6, 5) or step == Vector2i(4, 5), "next_step avoids wall south")

func test_next_step_reduces_distance() -> void:
	var from = Vector2i(0, 0)
	var to = Vector2i(10, 10)
	var walls = {}
	var step = GridNav.next_step(from, to, walls)
	var dist_before = from.distance_to(to)
	var dist_after = step.distance_to(to)
	ok(dist_after < dist_before, "next_step reduces Manhattan distance to target")
	ok(step != from, "next_step produces different position")
	ok(step.distance_to(to) >= 0, "distance is non-negative")

func test_next_step_determinism() -> void:
	var from = Vector2i(7, 7)
	var to = Vector2i(3, 2)
	var walls = {}
	walls[Vector2i(6, 6)] = true
	walls[Vector2i(5, 5)] = true
	# 100 appels identiques doivent donner 100 résultats identiques
	var first = GridNav.next_step(from, to, walls)
	var all_same = true
	for i in range(100):
		var result = GridNav.next_step(from, to, walls)
		if result != first:
			all_same = false
			break
	ok(all_same, "next_step determinism 100 calls identical")

func test_path_purity_walls_unmodified() -> void:
	var from = Vector2i(0, 0)
	var to = Vector2i(3, 3)
	var walls = {}
	walls[Vector2i(1, 1)] = true
	walls[Vector2i(2, 2)] = true
	var walls_before = walls.duplicate()
	var _length = GridNav.path_length(from, to, walls)
	var walls_after = walls.duplicate()
	ok(walls_before == walls_after, "path_length does not modify walls dictionary")

func test_path_length_complex_maze() -> void:
	# S-shaped path: go right 2, up 2, right 2
	var from = Vector2i(0, 0)
	var to = Vector2i(4, 2)
	var walls = {}
	walls[Vector2i(2, 1)] = true
	walls[Vector2i(3, 0)] = true
	walls[Vector2i(3, 1)] = true
	# Path: (0,0)->(1,0)->(2,0)->(2,1 blocked)->(2,2)->(3,2)->(4,2)
	# Length should be 6
	var length = GridNav.path_length(from, to, walls)
	ok(length == 6, "path_length complex maze = 6")

func test_next_step_away_then_toward() -> void:
	# If direct path blocked, move perpendicular then converge
	var from = Vector2i(5, 5)
	var to = Vector2i(5, 0)
	var walls = {}
	walls[Vector2i(5, 4)] = true
	walls[Vector2i(5, 3)] = true
	walls[Vector2i(5, 2)] = true
	walls[Vector2i(5, 1)] = true
	# Must go around
	var step = GridNav.next_step(from, to, walls)
	ok(step != from, "next_step moves away from deadlock")

func test_path_length_surrounded() -> void:
	var from = Vector2i(5, 5)
	var to = Vector2i(6, 6)
	var walls = {}
	# Surround from but not completely
	walls[Vector2i(4, 4)] = true
	walls[Vector2i(4, 5)] = true
	walls[Vector2i(4, 6)] = true
	# Still reachable via (5,6) -> (6,6)
	var length = GridNav.path_length(from, to, walls)
	ok(length == 2, "path_length surrounded = 2")

func test_edge_wrapping_not_allowed() -> void:
	# Grid allows negative indices but paths respect walls
	var from = Vector2i(0, 0)
	var to = Vector2i(10, 10)
	var walls = {}
	# Create a wall barrier
	for i in range(11):
		walls[Vector2i(5, i)] = true
	# Path must go around
	var length = GridNav.path_length(from, to, walls)
	ok(length > 10, "path_length around barrier > 10")

func test_path_length_large_distance() -> void:
	var from = Vector2i(0, 0)
	var to = Vector2i(20, 20)
	var walls = {}
	var length = GridNav.path_length(from, to, walls)
	ok(length == 40, "path_length Manhattan distance 20+20 = 40")

func test_next_step_multiple_steps() -> void:
	var from = Vector2i(0, 0)
	var to = Vector2i(5, 5)
	var walls = {}
	var step1 = GridNav.next_step(from, to, walls)
	var step2 = GridNav.next_step(step1, to, walls)
	var step3 = GridNav.next_step(step2, to, walls)
	ok(step1 != from and step2 != step1 and step3 != step2, "next_step sequence progresses toward target")

func test_path_length_L_shape() -> void:
	var from = Vector2i(0, 0)
	var to = Vector2i(3, 2)
	var walls = {}
	walls[Vector2i(1, 1)] = true
	walls[Vector2i(2, 1)] = true
	var length = GridNav.path_length(from, to, walls)
	ok(length == 5, "path_length L-shape with obstacle = 5")

func test_next_step_consistency() -> void:
	var from = Vector2i(2, 2)
	var to = Vector2i(10, 10)
	var walls = {}
	walls[Vector2i(5, 5)] = true
	var step1 = GridNav.next_step(from, to, walls)
	var step2 = GridNav.next_step(from, to, walls)
	ok(step1 == step2, "next_step is consistent for same inputs")

func test_bfs_revisit_detection() -> void:
	# Test that BFS properly marks visited cells and doesn't revisit
	# This catches mutations where visited[cell] = false fails
	var from = Vector2i(0, 0)
	var to = Vector2i(10, 0)  # 10 steps away
	var walls = {}
	# No walls, so BFS explores in all 4 directions
	var length = GridNav.path_length(from, to, walls)
	ok(length == 10, "BFS finds correct distance without revisiting cells")

func test_path_long_exploration() -> void:
	# Another test to ensure visited tracking works correctly
	var from = Vector2i(0, 0)
	var to = Vector2i(5, 5)
	var walls = {}
	var length = GridNav.path_length(from, to, walls)
	ok(length == 10, "path_length handles explorations correctly")
