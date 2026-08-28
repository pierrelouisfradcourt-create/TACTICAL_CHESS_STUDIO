# run_tests.gd — POINT D'ENTREE MECANIQUE de l'oracle headless (categorie godot.project_tests).
# Lancer : godot --headless --path games/kitten_clicker --script res://tests/run_tests.gd
# exit 0 = tous verts, 1 = au moins un rouge.
#
# ENUMERE et execute TOUS les res://07_TESTS/unit/*.test.gd (chacun expose run(t)) via
# DirAccess (jamais un pass en dur). Garde anti-FAUX-VERT EXPECTED_ASSERTS : un coeur qui ne
# compile pas -> total d'assertions non atteint -> echec force. C'est ce harnais que le gate
# mutation re-execute pour prouver que les mutants des regles PURES sont tues.
extends SceneTree

# Total d'assertions attendu (mesure reelle, garde anti-faux-vert).
const EXPECTED_ASSERTS := 112

var _passed := 0
var _failed := 0
var _fails: Array = []

func ok(cond: bool, nom: String) -> void:
	if cond:
		_passed += 1
	else:
		_failed += 1
		_fails.append(nom)

# Egalite approchee pour les flottants (synthese/economie).
func eq(a: float, b: float, nom: String) -> void:
	ok(absf(a - b) < 0.0001, nom + " (%.4f vs %.4f)" % [a, b])

func _initialize() -> void:
	var dossier := "res://07_TESTS/unit"
	var da := DirAccess.open(dossier)
	var fichiers: Array = []
	if da != null:
		da.list_dir_begin()
		var nom := da.get_next()
		while nom != "":
			if not da.current_is_dir() and nom.ends_with(".test.gd"):
				fichiers.append(nom)
			nom = da.get_next()
		da.list_dir_end()
	fichiers.sort()
	for f in fichiers:
		var script = load(dossier + "/" + f)
		if script == null:
			_failed += 1
			_fails.append("chargement echoue : " + f)
			continue
		var inst = script.new()
		inst.run(self)

	var total := _passed + _failed
	if total != EXPECTED_ASSERTS:
		_failed += 1
		_fails.append("META: %d/%d assertions executees (coeur non charge ?)" % [total, EXPECTED_ASSERTS])
	print("\n=== RESULT: %d passed, %d failed ===" % [_passed, _failed])
	for f in _fails:
		print("  FAIL: ", f)
	quit(0 if _failed == 0 else 1)
