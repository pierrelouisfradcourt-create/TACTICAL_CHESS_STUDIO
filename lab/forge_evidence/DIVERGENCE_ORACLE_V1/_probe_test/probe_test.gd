extends SceneTree
func _initialize() -> void:
	var s = load("res://05_SYSTEMS/settings/settings.gd")
	print("LOADED_OK ", s != null)
	if s != null:
		print("MODES ", s.MODES_VALIDES)
	quit(0)
