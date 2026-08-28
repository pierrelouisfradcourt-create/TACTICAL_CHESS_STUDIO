# forge:run_mode = gpu_window
# gallery_render.gd — VOLET PRODUIT (FORGE_ORACLE, fenetre GPU). Charge la VRAIE
# scene principale (res://main.tscn) et asserte que la galerie de chatons rend au
# moins 3 raretes VISUELLEMENT distinctes (R5). Preuve PIXEL : on echantillonne la
# couleur au centre de chaque case du groupe "gallery" et on compte les teintes
# distinctes. Lecture seule de l'ecran (aucun acces a l'economie).
extends SceneTree

const SETTLE := 60

var _f := 0


func _init() -> void:
	var packed = load("res://main.tscn")
	if packed == null or not (packed is PackedScene):
		_emit(false, ["main.tscn introuvable"], {})
		return
	get_root().add_child(packed.instantiate())


func _process(_d: float) -> bool:
	_f += 1
	if _f < SETTLE:
		return false
	var img := get_root().get_texture().get_image()
	var colors: Array = []
	var count := 0
	if img != null:
		for n in get_nodes_in_group("gallery"):
			if n is Control:
				count += 1
				var c: Vector2 = (n as Control).get_global_rect().get_center()
				var x := clampi(int(c.x), 0, img.get_width() - 1)
				var y := clampi(int(c.y), 0, img.get_height() - 1)
				var col := img.get_pixel(x, y)
				if not _has_close(colors, col):
					colors.append(col)
	var fails: Array = []
	if count < 3:
		fails.append("galerie de moins de 3 cases (%d)" % count)
	if colors.size() < 3:
		fails.append("moins de 3 teintes distinctes dans la galerie (%d)" % colors.size())
	_emit(fails.is_empty(), fails, {"gallery_nodes": count, "distinct_colors": colors.size()})
	return true


func _has_close(list: Array, col: Color) -> bool:
	for c in list:
		if abs(c.r - col.r) + abs(c.g - col.g) + abs(c.b - col.b) < 0.12:
			return true
	return false


func _emit(ok: bool, fails: Array, data: Dictionary) -> void:
	print("FORGE_ORACLE gallery_render " + JSON.stringify({"ok": ok, "fails": fails, "data": data}))
	quit(0 if ok else 1)
