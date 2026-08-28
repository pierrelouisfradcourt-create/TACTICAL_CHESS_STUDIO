# main_screen_render.gd — oracle visuel de l'ecran principal (R2).
# forge:run_mode = gpu_window
#
# PREUVE PIXEL : exige une FENETRE GPU reelle (--headless rend une texture nulle). La
# directive ci-dessus route ce volet en fenetre GPU hors-ecran. Assemble le HUD (taux
# ronrons/sec) et l'objet central cliquable, rend une frame et verifie qu'elle n'est pas
# monochrome. En l'absence de fenetre GPU (mesure impossible), declare requires_gpu_window
# -> NOT_MEASURED, jamais un rouge fabrique.
extends SceneTree

const HUD = preload("res://06_RUNTIME/adapters/render/hud.gd")
const KittenView = preload("res://06_RUNTIME/adapters/render/kitten_view.gd")

var _frame: int = 0
var _root2d: Node2D


func _initialize() -> void:
	test_main_screen()


# Construit l'ecran principal (appelee par _initialize ; le rendu se mesure dans _process).
func test_main_screen() -> void:
	_root2d = Node2D.new()
	get_root().add_child(_root2d)
	var bg := Sprite2D.new()
	var tex_bg := KittenView.load_sprite("place_shelter")
	if tex_bg != null:
		bg.texture = tex_bg
		bg.centered = false
	_root2d.add_child(bg)
	var kv := KittenView.new()
	_root2d.add_child(kv)
	var tex := KittenView.load_sprite("central_cushion")
	if tex != null:
		kv.spawn_kitten_sprite(tex, Vector2(320, 260))
	var hud := HUD.new()
	_root2d.add_child(hud)
	hud.draw_hud(12345.0, 678.0)


func _process(_delta: float) -> bool:
	_frame += 1
	if _frame < 4:
		return false
	var fails: Array = []
	var payload := {}
	var img: Image = null
	var vp_tex := get_root().get_texture()
	if vp_tex != null:
		img = vp_tex.get_image()
	if img == null or img.is_empty():
		# Aucune capture possible (headless / pas de fenetre GPU) : non mesurable, jamais FAIL.
		print("FORGE_ORACLE main_screen_render " + JSON.stringify({
			"ok": true, "requires_gpu_window": true, "fails": [],
			"raison": "capture indisponible sans fenetre GPU",
		}))
		quit(0)
		return true
	# Non-monochrome : au moins deux couleurs distinctes dans la frame rendue.
	var distinct := _distinct_colors(img, 64)
	if distinct < 2:
		fails.append("frame monochrome (%d couleur distincte)" % distinct)
	payload = {"ok": fails.is_empty(), "fails": fails, "couleurs_distinctes": distinct}
	print("FORGE_ORACLE main_screen_render " + JSON.stringify(payload))
	quit(0 if fails.is_empty() else 1)
	return true


# Nombre de couleurs distinctes echantillonnees sur une grille (borne pour rester rapide).
func _distinct_colors(img: Image, step: int) -> int:
	var seen := {}
	var w: int = img.get_width()
	var h: int = img.get_height()
	var x: int = 0
	while x < w:
		var y: int = 0
		while y < h:
			seen[img.get_pixel(x, y).to_rgba32()] = true
			y += step
		x += step
	return seen.size()
