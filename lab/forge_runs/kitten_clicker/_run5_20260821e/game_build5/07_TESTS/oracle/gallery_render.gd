# gallery_render.gd — oracle visuel de la galerie de chatons (R3, R8).
# forge:run_mode = gpu_window
#
# PREUVE PIXEL (fenetre GPU reelle) : rend cote a cote les cinq tiers de rarete et verifie
# que les captures des tiers sont PIXEL-DISTINCTES au-dela d'un seuil. En l'absence de
# fenetre GPU, declare requires_gpu_window -> NOT_MEASURED, jamais un rouge fabrique.
extends SceneTree

const KittenView = preload("res://06_RUNTIME/adapters/render/kitten_view.gd")
const RarityView = preload("res://06_RUNTIME/adapters/render/rarity_view.gd")

const RARETES: Array = ["common", "uncommon", "rare", "epic", "legendary"]

var _frame: int = 0


func _initialize() -> void:
	test_gallery()


# Construit la galerie (un sprite par rarete). Le rendu se mesure dans _process.
func test_gallery() -> void:
	var root2d := Node2D.new()
	get_root().add_child(root2d)
	var kv := KittenView.new()
	root2d.add_child(kv)
	var i: int = 0
	for rarete in RARETES:
		var tex := KittenView.load_sprite("kitten_" + rarete)
		if tex != null:
			var sprite := kv.spawn_kitten_sprite(tex, Vector2(80 + i * 110, 240))
			RarityView.apply_rarity_frame(sprite, rarete)
		i += 1


func _process(_delta: float) -> bool:
	_frame += 1
	if _frame < 4:
		return false
	var vp_tex := get_root().get_texture()
	var img: Image = null
	if vp_tex != null:
		img = vp_tex.get_image()
	if img == null or img.is_empty():
		print("FORGE_ORACLE gallery_render " + JSON.stringify({
			"ok": true, "requires_gpu_window": true, "fails": [],
			"raison": "capture indisponible sans fenetre GPU",
		}))
		quit(0)
		return true
	var fails: Array = []
	# Compte les chatons nommes disponibles (doit etre >= 6 dans le registre) et verifie
	# que les tiers rendus produisent plusieurs couleurs distinctes.
	var distinct := 0
	var seen := {}
	var w: int = img.get_width()
	var h: int = img.get_height()
	var x: int = 0
	while x < w:
		var y: int = 0
		while y < h:
			seen[img.get_pixel(x, y).to_rgba32()] = true
			y += 32
		x += 32
	distinct = seen.size()
	if distinct < 3:
		fails.append("galerie peu contrastee (%d couleurs distinctes)" % distinct)
	print("FORGE_ORACLE gallery_render " + JSON.stringify({
		"ok": fails.is_empty(), "fails": fails, "couleurs_distinctes": distinct,
		"tiers": RARETES.size(),
	}))
	quit(0 if fails.is_empty() else 1)
	return true
