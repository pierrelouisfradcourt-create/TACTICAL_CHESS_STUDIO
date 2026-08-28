# forge:run_mode = gpu_window
# main_screen_render.gd — VOLET PRODUIT (FORGE_ORACLE, fenetre GPU). Charge la VRAIE
# scene principale (res://main.tscn) et asserte qu'au lancement l'ecran EST vivant :
# le HUD "objectif" est non vide (guidage joueur, garde-fou (j)) ET l'image rendue
# n'est pas monochrome (la scene rend quelque chose). Lecture seule de l'ecran.
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
	var objectif := ""
	for n in get_nodes_in_group("hud"):
		if n is Label and n.name == "objectif":
			objectif = n.text
	var img := get_root().get_texture().get_image()
	var fails: Array = []
	if objectif.strip_edges() == "":
		fails.append("HUD objectif vide au lancement")
	if not _nonmonochrome(img):
		fails.append("image monochrome (rien de rendu)")
	_emit(fails.is_empty(), fails, {"objectif": objectif})
	return true


func _nonmonochrome(img: Image) -> bool:
	if img == null:
		return false
	var first := img.get_pixel(0, 0)
	var step := maxi(1, img.get_width() / 32)
	for y in range(0, img.get_height(), step):
		for x in range(0, img.get_width(), step):
			if not img.get_pixel(x, y).is_equal_approx(first):
				return true
	return false


func _emit(ok: bool, fails: Array, data: Dictionary) -> void:
	print("FORGE_ORACLE main_screen_render " + JSON.stringify({"ok": ok, "fails": fails, "data": data}))
	quit(0 if ok else 1)
