# main_screen_render.gd — oracle PIXEL de l'ecran principal (core.render / render.main_screen).
#
# forge:run_mode = gpu_window
#
# La directive ci-dessus route ce volet vers une fenetre GPU hors ecran (--headless rend une
# texture NULLE). Il charge la VRAIE scene (res://main.tscn) et la pilote par son canal public.
#
# CE QUI EST PROUVE, avec un TEMOIN pour la causalite :
#   1. une image existe, non monochrome (quelque chose est rendu) ;
#   2. deux etats distincts (avant/apres clics+achat) -> images DIFFERENTES ;
#   3. la region du HUD CHANGE quand le compteur change (feedback observable) ;
#   4. la region ou un chaton achete SPAWN change (achat persistant a l'ecran) ;
#   5. une region TEMOIN (fond, loin de toute action) NE change PAS (sinon simple bruit).
extends SceneTree

var _main: Node = null
var _render = null
var _img_a: Image = null
var _f := 0
var _phase := 0

const SETTLE := 12
const APRES := 12
const HUD_CENTRE := Vector2(90, 40)
const SPAWN_CENTRE := Vector2(72, 340)
const TEMOIN := Vector2(20, 200)


func _initialize() -> void:
	get_root().size = Vector2i(640, 480)
	var packed = load("res://main.tscn")
	if packed == null or not (packed is PackedScene):
		print("FORGE_ORACLE main_screen_render " + JSON.stringify({"ok": false,
			"fails": ["res://main.tscn introuvable"]}))
		quit(1)
		return
	_main = packed.instantiate()
	get_root().add_child(_main)
	_render = _main.get_render() if _main.has_method("get_render") else null


func _capture() -> Image:
	var t := get_root().get_texture()
	return t.get_image() if t != null else null


func _monochrome(img: Image) -> bool:
	if img == null:
		return true
	var p0 := img.get_pixel(0, 0)
	for x in range(0, img.get_width(), 8):
		for y in range(0, img.get_height(), 8):
			if img.get_pixel(x, y) != p0:
				return false
	return true


func _region_change(a: Image, b: Image, centre: Vector2, demi: int) -> bool:
	if a == null or b == null:
		return false
	var x0: int = int(max(0, int(centre.x) - demi))
	var y0: int = int(max(0, int(centre.y) - demi))
	var x1: int = int(min(a.get_width() - 1, int(centre.x) + demi))
	var y1: int = int(min(a.get_height() - 1, int(centre.y) + demi))
	for x in range(x0, x1 + 1):
		for y in range(y0, y1 + 1):
			if a.get_pixel(x, y) != b.get_pixel(x, y):
				return true
	return false


func _process(_delta: float) -> bool:
	_f += 1
	if _phase == 0:
		if _f < SETTLE:
			return false
		_img_a = _capture()
		# Pilotage par le canal public : 20 clics (HUD monte + pop) puis un achat (spawn).
		if _main != null and _main.has_method("api_click"):
			for i in range(20):
				_main.api_click()
			_main.api_buy_kitten()
		_phase = 1
		_f = 0
		return false

	if _f < APRES:
		return false
	var img_b := _capture()

	var fails: Array = []
	if _img_a == null or img_b == null:
		fails.append("capture nulle (fenetre GPU absente ?)")
	else:
		if _monochrome(_img_a):
			fails.append("image A monochrome (rendu mort)")
		if _img_a.get_data() == img_b.get_data():
			fails.append("deux etats distincts -> images IDENTIQUES")
		if not _region_change(_img_a, img_b, HUD_CENTRE, 40):
			fails.append("le HUD n'a pas change alors que le compteur a bouge")
		if not _region_change(_img_a, img_b, SPAWN_CENTRE, 24):
			fails.append("aucun chaton n'est apparu apres l'achat (spawn absent)")
		if _region_change(_img_a, img_b, TEMOIN, 6):
			fails.append("la region TEMOIN a change alors que rien ne s'y passe (bruit de rendu)")

	print("FORGE_ORACLE main_screen_render " + JSON.stringify({
		"ok": fails.is_empty(), "fails": fails,
		"viewport": [get_root().size.x, get_root().size.y],
	}))
	quit(0 if fails.is_empty() else 1)
	return true
