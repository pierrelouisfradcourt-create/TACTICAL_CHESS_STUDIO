# run_tests.gd — POINT D'ENTREE MECANIQUE au chemin EXIGE par l'oracle maitre
# (godot_oracle.mjs charge `res://tests/run_tests.gd` en dur ; categorie godot.project_tests
# -> tests/{id} dans repo_map.yaml). Patron snake/breakout_v2 : ce fichier ENUMERE REELLEMENT
# les corps de test du jeu depuis le disque (DirAccess, jamais un pass code en dur) et porte
# la garde anti-FAUX-VERT EXPECTED_ASSERTS. Si le coeur ne compile pas, des tests avortent en
# silence et ce total n'est pas atteint -> echec force.
#
# Lancer : <godot> --headless --path games/kitten_clicker --script res://tests/run_tests.gd
# exit 0 = tous verts, 1 = au moins un echec.
extends SceneTree

# Garde anti-faux-vert : total d'assertions attendu (voir 07_TESTS/unit/*.test.gd).
const EXPECTED_ASSERTS := 104

# Harnais minimal passe a chaque corps de test : ok(cond, name) + compteurs.
class Harness:
	var passed := 0
	var failed := 0
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
