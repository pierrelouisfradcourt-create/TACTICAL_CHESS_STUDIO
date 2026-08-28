# run_tests.gd — POINT D'ENTREE MECANIQUE de l'oracle headless (categorie godot.project_tests).
# Lancer : godot --headless --path games/kitten_clicker --script res://tests/run_tests.gd
# exit 0 = tous verts, 1 = au moins un rouge.
#
# Patron conforme au STANDARD (snake / breakout_v2 / tetris) : SceneTree headless qui
# ENUMERE reellement depuis le disque (DirAccess) tous les res://07_TESTS/unit/*.test.gd,
# chacun exposant run(h). Garde anti-FAUX-VERT EXPECTED_ASSERTS : si le coeur ne compile
# pas, des tests avortent et le total n'est pas atteint -> echec force.
#
# HARNAIS INLINE (classe interne Harness) : la wiremap gelee ne declare aucun adaptateur
# de harnais (pas de 06_RUNTIME/adapters/proof_harness) ; un fichier externe serait un
# orphelin (code non demande par la carte). Le harnais vit donc ici, dans le seul fichier
# de test declare a la racine `tests/`.
extends SceneTree

# Total d'assertions attendu (mesure reelle, garde anti-faux-vert). Verifie a l'execution.
const EXPECTED_ASSERTS := 115


class Harness:
	var passed: int = 0
	var failed: int = 0
	var fails: Array = []

	func ok(cond: bool, name: String) -> void:
		if cond:
			passed += 1
		else:
			failed += 1
			fails.append(name)


func _initialize() -> void:
	var h := Harness.new()
	var dossier := "res://07_TESTS/unit"
	var da := DirAccess.open(dossier)
	if da == null:
		push_error("Dossier de tests introuvable : " + dossier)
		quit(1)
		return

	var fichiers: Array = []
	da.list_dir_begin()
	var nom := da.get_next()
	while nom != "":
		if not da.current_is_dir() and nom.ends_with(".test.gd"):
			fichiers.append(nom)
		nom = da.get_next()
	da.list_dir_end()
	fichiers.sort()  # ordre deterministe, jamais dependant du systeme de fichiers

	for f in fichiers:
		var chemin: String = dossier + "/" + f
		var script = load(chemin)
		if script == null or not (script is GDScript) or not script.can_instantiate():
			h.failed += 1
			h.fails.append("CHARGEMENT: %s introuvable/illisible/non compilable" % chemin)
			continue
		var inst = script.new()
		if not inst.has_method("run"):
			h.failed += 1
			h.fails.append("CONTRAT: %s n'expose pas run(h)" % f)
			continue
		inst.run(h)

	var total: int = h.passed + h.failed
	if total != EXPECTED_ASSERTS:
		h.failed += 1
		h.fails.append("META: %d/%d assertions executees (coeur non charge ? test manquant ?)" % [total, EXPECTED_ASSERTS])

	print("\n=== RESULT: %d passed, %d failed (fichiers: %d) ===" % [h.passed, h.failed, fichiers.size()])
	for x in h.fails:
		print("  FAIL: ", x)
	quit(0 if h.failed == 0 else 1)
