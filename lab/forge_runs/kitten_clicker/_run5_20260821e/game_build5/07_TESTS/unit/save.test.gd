# save.test.gd — assertions strictes sur persistence.save (R20). Round-trip champ par champ.
extends RefCounted

const State = preload("res://05_SYSTEMS/game_state/state.gd")
const Save = preload("res://05_SYSTEMS/persistence/save.gd")

const TEST_PATH := "user://kitten_clicker_save_test.json"


func run(h) -> void:
	# to_dict porte tous les champs.
	var s = State.new()
	s.ronrons = 123.0
	s.base_production = 45.0
	s.prestige_mult = 2.0
	s.upgrade_bonus = 1.5
	s.kittens = {"common": 3, "rare": 1}
	s.unlocked_places = ["shelter", "veranda"]

	var d = Save.to_dict(s)
	h.ok(float(d["ronrons"]) == 123.0, "save: to_dict ronrons")
	h.ok(float(d["base_production"]) == 45.0, "save: to_dict base_production")
	h.ok(float(d["prestige_mult"]) == 2.0, "save: to_dict prestige_mult")
	h.ok(float(d["upgrade_bonus"]) == 1.5, "save: to_dict upgrade_bonus")
	h.ok(int(d["kittens"]["common"]) == 3, "save: to_dict kittens[common]")

	# apply_dict restaure un etat vierge a l'identique.
	var s2 = State.new()
	Save.apply_dict(s2, d)
	h.ok(s2.ronrons == 123.0, "save: apply_dict ronrons")
	h.ok(s2.base_production == 45.0, "save: apply_dict base_production")
	h.ok(s2.prestige_mult == 2.0, "save: apply_dict prestige_mult")
	h.ok(s2.upgrade_bonus == 1.5, "save: apply_dict upgrade_bonus")
	h.ok(s2.kitten_count() == 4, "save: apply_dict kittens (3+1)")
	h.ok(s2.unlocked_places.has("veranda"), "save: apply_dict lieux")

	# Round-trip disque strict : ecrit, relit, compare champ par champ.
	h.ok(Save.save_load_roundtrip(s, TEST_PATH) == true, "save: round-trip disque fidele (strict)")

	# load_into recharge dans un etat vierge et retrouve les valeurs.
	var s3 = State.new()
	var loaded = Save.load_into(s3, TEST_PATH)
	h.ok(loaded == true, "save: load_into rend true si fichier present")
	h.ok(s3.ronrons == 123.0, "save: load_into ronrons")
	h.ok(s3.kitten_count() == 4, "save: load_into chatons")

	# load_into sur chemin absent -> false, sans exception.
	var s4 = State.new()
	h.ok(Save.load_into(s4, "user://inexistant_kitten.json") == false, "save: load_into chemin absent -> false")

	# save() sur un chemin non ouvrable en ecriture -> false (garde open-null declenchee).
	h.ok(Save.save(s, "user://__no_such_dir__/deep/x.json") == false, "save: chemin invalide -> false")

	# load_into sur un contenu NON-dictionnaire -> false (garde non-dict declenchee).
	var bad_path := "user://kitten_bad_content_test.json"
	var bf = FileAccess.open(bad_path, FileAccess.WRITE)
	bf.store_string("[1, 2, 3]")
	bf.close()
	h.ok(Save.load_into(State.new(), bad_path) == false, "save: contenu non-dict -> false")

	# roundtrip sur chemin invalide (save echoue) -> false.
	h.ok(Save.save_load_roundtrip(s, "user://__no_such_dir__/deep/y.json") == false, "save: roundtrip chemin invalide -> false")
