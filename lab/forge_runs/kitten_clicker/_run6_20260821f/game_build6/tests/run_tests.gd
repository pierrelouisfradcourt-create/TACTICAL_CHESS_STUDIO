# run_tests.gd — POINT D'ENTREE MECANIQUE de l'oracle headless (godot.project_tests).
# Lancer : godot --headless --path games/kitten_clicker --script res://tests/run_tests.gd
# exit 0 = tous verts, 1 = au moins un rouge.
#
# Chemin IMPOSE par la chaine (res://tests/run_tests.gd). Patron chess_tcg/bomberman_3d :
# le SceneTree EST le harnais (ok/eq/gt/lt), et enumere tous les res://07_TESTS/unit/*.test.gd
# (chacun expose run(h)).
#
# Garde anti-FAUX-VERT EXPECTED_ASSERTS : si un coeur ne compile pas, ses tests avortent en
# silence, le total n'est pas atteint et l'echec est FORCE. Sans elle, supprimer un systeme
# rendrait la suite plus verte, pas plus rouge.
extends SceneTree

# MESURE sur la sortie reelle de la suite (jamais devinee). Compte RUNTIME (les boucles des
# tests de registres/variance multiplient les assertions statiques).
const EXPECTED_ASSERTS := 213

var passed: int = 0
var failed: int = 0
var fails: Array = []


func ok(cond: bool, name: String) -> void:
	if cond:
		passed += 1
	else:
		failed += 1
		fails.append(name)


# Egalite STRICTE (jamais un >=). Trace la valeur observee en cas d'echec.
func eq(a, b, name: String) -> void:
	if a == b:
		passed += 1
	else:
		failed += 1
		fails.append("%s (attendu %s, obtenu %s)" % [name, str(b), str(a)])


func gt(a, b, name: String) -> void:
	if a > b:
		passed += 1
	else:
		failed += 1
		fails.append("%s (attendu > %s, obtenu %s)" % [name, str(b), str(a)])


func lt(a, b, name: String) -> void:
	if a < b:
		passed += 1
	else:
		failed += 1
		fails.append("%s (attendu < %s, obtenu %s)" % [name, str(b), str(a)])


func _initialize() -> void:
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
	fichiers.sort()   # ordre deterministe, jamais dependant du systeme de fichiers

	for f in fichiers:
		var chemin: String = dossier + "/" + f
		var script = load(chemin)
		if script == null or not (script is GDScript) or not script.can_instantiate():
			failed += 1
			fails.append("CHARGEMENT: %s introuvable/illisible/non compilable" % chemin)
			continue
		var inst = script.new()
		if not inst.has_method("run"):
			failed += 1
			fails.append("CONTRAT: %s n'expose pas run(h)" % f)
			continue
		inst.run(self)

	var total: int = passed + failed
	if total != EXPECTED_ASSERTS:
		failed += 1
		fails.append("META: %d/%d assertions executees (coeur non charge ? test manquant ?)" % [total, EXPECTED_ASSERTS])

	print("\n=== RESULT: %d passed, %d failed (fichiers: %d) ===" % [passed, failed, fichiers.size()])
	for x in fails:
		print("  FAIL: ", x)
	quit(0 if failed == 0 else 1)
