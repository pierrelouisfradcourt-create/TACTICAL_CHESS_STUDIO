# Smoke UI headless : charge main.tscn, instancie, exécute _ready, vérifie le script.
# Ne teste pas l'interaction (pas d'affichage en headless) mais attrape parse/scene errors.
extends SceneTree

func _initialize() -> void:
	var packed = load("res://ui/game3d.tscn")
	var inst = packed.instantiate() if packed != null else null
	var okk: bool = inst != null and inst.get_script() != null and inst.has_method("_pick_cell")
	if inst != null:
		get_root().add_child(inst)   # déclenche _ready
	print("UI smoke: %s" % ("OK" if okk else "FAIL"))
	quit(0 if okk else 1)
