# gallery_render.gd — oracle PIXEL de la galerie de collection (render.gallery).
#
# forge:run_mode = gpu_window
#
# Charge la VRAIE scene (res://main.tscn) et inspecte la galerie qu'elle affiche.
# CE QUI EST PROUVE :
#   1. >=6 emplacements de chatons ;
#   2. les 6 sprites sont deux a deux NON pixel-identiques (chatons distincts) ;
#   3. traitement visuel distinct par RARETE (common vs rare, common vs legendary : regions
#      differentes au-dela du bruit) ;
#   4. le compteur de collection X/T est REELLEMENT affiche (region non monochrome) ;
#   5. apres un deblocage, la galerie CHANGE visiblement (progression observable).
extends SceneTree

var _main: Node = null
var _gallery = null
var _f := 0
var _phase := 0
var _fails: Array = []
var _img_a: Image = null

const SETTLE := 12
const APRES := 12


func _initialize() -> void:
	get_root().size = Vector2i(640, 480)
	var packed = load("res://main.tscn")
	if packed == null or not (packed is PackedScene):
		print("FORGE_ORACLE gallery_render " + JSON.stringify({"ok": false,
			"fails": ["res://main.tscn introuvable"]}))
		quit(1)
		return
	_main = packed.instantiate()
	get_root().add_child(_main)
	# NB : `_main._ready()` n'a PAS encore tourne ici — dans un SceneTree, le `_ready` d'un
	# noeud ajoute en `_initialize` est differe au premier idle frame. get_gallery() rendrait
	# donc `null`. On recupere l'adaptateur dans `_process`, apres SETTLE (scene vivante).


func _capture() -> Image:
	var t := get_root().get_texture()
	return t.get_image() if t != null else null


# Deux regions (memes dimensions) de la MEME image sont-elles pixel-identiques ?
func _meme_region(img: Image, c1: Vector2, c2: Vector2, demi: int) -> bool:
	if img == null:
		return true
	for dx in range(-demi, demi + 1):
		for dy in range(-demi, demi + 1):
			var x1 := int(clampf(c1.x + dx, 0, img.get_width() - 1))
			var y1 := int(clampf(c1.y + dy, 0, img.get_height() - 1))
			var x2 := int(clampf(c2.x + dx, 0, img.get_width() - 1))
			var y2 := int(clampf(c2.y + dy, 0, img.get_height() - 1))
			if img.get_pixel(x1, y1) != img.get_pixel(x2, y2):
				return false
	return true


func _mono_region(img: Image, centre: Vector2, demi: int) -> bool:
	if img == null:
		return true
	var p0 := img.get_pixel(int(centre.x), int(centre.y))
	for dx in range(-demi, demi + 1):
		for dy in range(-demi, demi + 1):
			var x := int(clampf(centre.x + dx, 0, img.get_width() - 1))
			var y := int(clampf(centre.y + dy, 0, img.get_height() - 1))
			if img.get_pixel(x, y) != p0:
				return false
	return true


func _region_change(a: Image, b: Image, centre: Vector2, demi: int) -> bool:
	if a == null or b == null:
		return false
	for dx in range(-demi, demi + 1):
		for dy in range(-demi, demi + 1):
			var x := int(clampf(centre.x + dx, 0, a.get_width() - 1))
			var y := int(clampf(centre.y + dy, 0, a.get_height() - 1))
			if a.get_pixel(x, y) != b.get_pixel(x, y):
				return true
	return false


func _process(_delta: float) -> bool:
	_f += 1
	if _phase == 0:
		if _f < SETTLE:
			return false
		# La scene est vivante (SETTLE frames ecoules) : `_main._ready()` a tourne, la
		# galerie est batie. On la recupere MAINTENANT (jamais en `_initialize`).
		if _gallery == null and _main != null and _main.has_method("get_gallery"):
			_gallery = _main.get_gallery()
		_img_a = _capture()

		var n: int = _gallery.nb_slots() if _gallery != null else 0
		if n < 6:
			_fails.append("moins de 6 emplacements de chatons (%d)" % n)

		# distinction deux a deux des sprites (regions de slot non identiques)
		if _img_a != null and n >= 6:
			for i in range(n):
				for j in range(i + 1, n):
					if _meme_region(_img_a, _gallery.slot_centre(i), _gallery.slot_centre(j), 16):
						_fails.append("slots %d et %d pixel-IDENTIQUES" % [i, j])
			# rarete distincte : common(0) vs rare(3) vs legendary(5)
			if _meme_region(_img_a, _gallery.slot_centre(0), _gallery.slot_centre(3), 18):
				_fails.append("common et rare visuellement identiques")
			if _meme_region(_img_a, _gallery.slot_centre(0), _gallery.slot_centre(5), 18):
				_fails.append("common et legendary visuellement identiques")
			# compteur X/T reellement affiche (region non monochrome)
			if _mono_region(_img_a, _gallery.compteur_centre(), 30):
				_fails.append("le compteur de collection X/T n'est pas affiche (region monochrome)")

		# deblocage : 20 clics puis achat -> slot 0 s'active, compteur passe a 1/T
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

	# progression visible : la galerie a change apres le deblocage
	if _gallery != null and not _region_change(_img_a, img_b, _gallery.slot_centre(0), 20):
		_fails.append("la galerie n'a pas change apres un deblocage (progression invisible)")

	print("FORGE_ORACLE gallery_render " + JSON.stringify({
		"ok": _fails.is_empty(), "fails": _fails,
		"slots": _gallery.nb_slots() if _gallery != null else 0,
	}))
	quit(0 if _fails.is_empty() else 1)
	return true
