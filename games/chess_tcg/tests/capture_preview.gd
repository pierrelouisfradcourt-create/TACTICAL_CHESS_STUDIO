# Capture une frame du jeu vers _preview.png (à lancer SANS --headless).
extends SceneTree

var _f := 0

func _initialize() -> void:
	var inst = load("res://ui/game3d.tscn").instantiate()
	get_root().add_child(inst)

func _process(_delta: float) -> bool:
	_f += 1
	if _f >= 24:
		var img: Image = get_root().get_texture().get_image()
		img.save_png("res://_preview.png")
		print("preview saved")
		return true
	return false
