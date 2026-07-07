# Capture des effets de combat (sans jouer un vrai tour) : déclenche 2 impacts et capture.
extends SceneTree

var g
var _f := 0

func _initialize() -> void:
	g = load("res://ui/game3d.tscn").instantiate()
	get_root().add_child(g)

func _process(_delta: float) -> bool:
	_f += 1
	if _f == 20:
		g._fx_hit(g._cell_to_world(Vector2i(3, 3)), Color("ffb14a"), 4)
		g._fx_hit(g._cell_to_world(Vector2i(4, 5)), Color("ff5236"), 3)
		g._fx_hit(g._cell_to_world(Vector2i(2, 4)), Color("b565ff"), 2)
	if _f >= 26:
		var img: Image = get_root().get_texture().get_image()
		img.save_png("res://_preview.png")
		print("combat fx saved")
		return true
	return false
