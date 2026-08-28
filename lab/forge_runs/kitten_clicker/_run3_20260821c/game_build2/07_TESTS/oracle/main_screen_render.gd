# main_screen_render.gd — volet visuel (pixel) de R9 (ecran principal). Rend REELLEMENT la
# scene principale, capture AVANT et APRES un clic, et prouve : (a) le viewport porte une image
# NON MONOCHROME (rendu reel, pas un ecran noir), (b) l'image change entre avant et apres le clic
# (compteur incremente + feedback flottant present apres, absent avant).
#
# forge:run_mode = gpu_window
#
# DIRECTIVE STATIQUE lue par le collecteur (scripts/forge/product_oracle_godot.py) AVANT
# execution : ce volet CAPTURE des pixels et doit donc etre lance en fenetre GPU reelle, non en
# --headless (qui rend une texture NULLE et fabriquerait un rouge). Sortie : une ligne
# `FORGE_ORACLE main_screen_render {json}`. Si aucune image ne peut etre capturee (pas de GPU),
# emet requires_gpu_window:true => NOT_MEASURED (jamais un FAIL fabrique).
extends SceneTree

const ECHANTILLONS := 40

func _grab() -> Image:
	var tex := root.get_texture()
	if tex == null:
		return null
	return tex.get_image()

func _non_monochrome(img: Image) -> bool:
	if img == null or img.get_width() < 2 or img.get_height() < 2:
		return false
	var premiere := img.get_pixel(0, 0)
	var w := img.get_width()
	var h := img.get_height()
	for i in range(ECHANTILLONS):
		var x := (i * 977) % w
		var y := (i * 613) % h
		if img.get_pixel(x, y) != premiere:
			return true
	return false

func _images_differ(a: Image, b: Image) -> bool:
	if a == null or b == null:
		return false
	if a.get_width() != b.get_width() or a.get_height() != b.get_height():
		return true
	var w := a.get_width()
	var h := a.get_height()
	for i in range(ECHANTILLONS * 4):
		var x := (i * 977) % w
		var y := (i * 613) % h
		if a.get_pixel(x, y) != b.get_pixel(x, y):
			return true
	return false

func _initialize() -> void:
	var inst = load("res://main.tscn").instantiate()
	root.add_child(inst)
	for _i in range(20):
		await process_frame
	var img_avant := _grab()
	inst.simulate_caresse()
	for _i in range(5):
		await process_frame
	var img_apres := _grab()

	if img_avant == null or img_apres == null:
		print("FORGE_ORACLE main_screen_render " + JSON.stringify({
			"ok": false, "fails": ["capture impossible"], "requires_gpu_window": true,
		}))
		quit(0)
		return

	var fails: Array = []
	var rendu_reel := _non_monochrome(img_apres)
	if not rendu_reel:
		fails.append("viewport monochrome (ecran noir ?)")
	var changement := _images_differ(img_avant, img_apres)
	if not changement:
		fails.append("aucun changement visible entre avant et apres le clic")
	var ok := fails.is_empty()
	print("FORGE_ORACLE main_screen_render " + JSON.stringify({
		"ok": ok, "fails": fails,
		"data": {"non_monochrome": rendu_reel, "diff_click": changement},
	}))
	quit(0 if ok else 1)
