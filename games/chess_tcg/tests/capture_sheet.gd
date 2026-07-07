# Démo : tour sélectionnée colonne ouverte -> surbrillance longue portée + fiche + socles.
extends SceneTree

var g
var _f := 0

func _initialize() -> void:
	g = load("res://ui/game3d.tscn").instantiate()
	get_root().add_child(g)

func _process(_delta: float) -> bool:
	_f += 1
	if _f == 20:
		g.match_state.board.remove(Vector2i(0, 1))   # ouvre la colonne a
		g.match_state.board.remove(Vector2i(0, 6))
		g._sync_views(false)
		g._selected = Vector2i(0, 0)                  # tour a1
		g._legal = g.match_state.legal_for(Vector2i(0, 0))
		g._hover_cell = Vector2i(0, 0)
		g._refresh_markers()
		g._hud.queue_redraw()
	if _f >= 26:
		get_root().get_texture().get_image().save_png("res://_preview.png")
		print("sheet demo saved")
		return true
	return false
