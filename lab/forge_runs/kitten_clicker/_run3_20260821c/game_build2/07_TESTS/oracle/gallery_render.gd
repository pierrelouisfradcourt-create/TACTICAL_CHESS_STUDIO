# gallery_render.gd — volet visuel (pixel) de R5 (galerie). Rend REELLEMENT l'ecran collection
# (l'adaptateur gallery_view) dans une fenetre GPU et prouve : (a) le viewport porte une image
# NON MONOCHROME (rendu reel), (b) apres avoir debloque un chaton, l'ecran CHANGE (une entree
# passe de verrouille a debloque de facon visible).
#
# forge:run_mode = gpu_window
#
# DIRECTIVE STATIQUE (product_oracle_godot.py) : capture pixel => fenetre GPU reelle, jamais
# --headless. On instancie directement l'adaptateur gallery_view (l'ecran collection) et on lui
# remet deux projections distinctes : le runtime_loop de main.tscn re-rend son propre etat a
# chaque trame, il ne peut donc pas servir a comparer deux etats de collection choisis.
# Sortie : `FORGE_ORACLE gallery_render {json}`. requires_gpu_window:true si aucune capture
# possible => NOT_MEASURED, jamais un FAIL fabrique.
extends SceneTree

const GameState = preload("res://05_SYSTEMS/game_state/game_state.gd")
const Collection = preload("res://05_SYSTEMS/collection/collection.gd")
const GalleryView = preload("res://06_RUNTIME/adapters/gallery_view/gallery_view.gd")
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
	var w := a.get_width()
	var h := a.get_height()
	for y in range(h):
		for x in range(w):
			if a.get_pixel(x, y) != b.get_pixel(x, y):
				return true
	return false

func _initialize() -> void:
	var view = GalleryView.new()
	view.set_anchors_preset(Control.PRESET_FULL_RECT)
	view.size = Vector2(640, 480)
	root.add_child(view)

	var depart = GameState.initial(1)   # chaton 0 debloque, autres verrouilles
	view.render(GameState.project(depart))
	for _i in range(12):
		await process_frame
	var img_verrouille := _grab()

	var debloque = depart.clone()
	debloque.purrs = 100.0
	debloque = Collection.refresh_unlocks(debloque)   # chatons supplementaires debloques
	view.render(GameState.project(debloque))
	for _i in range(12):
		await process_frame
	var img_debloque := _grab()

	if img_verrouille == null or img_debloque == null:
		print("FORGE_ORACLE gallery_render " + JSON.stringify({
			"ok": false, "fails": ["capture impossible"], "requires_gpu_window": true,
		}))
		quit(0)
		return

	var fails: Array = []
	var rendu_reel := _non_monochrome(img_debloque)
	if not rendu_reel:
		fails.append("viewport monochrome (ecran noir ?)")
	var changement := _images_differ(img_verrouille, img_debloque)
	if not changement:
		fails.append("aucun changement visible apres un deblocage")
	# Verifie aussi cote modele que l'ecran de depart porte bien du verrouille ET du debloque.
	var cells_depart := GalleryView.cells(GameState.project(depart))
	var a_verrouille := false
	var a_debloque := false
	for c in cells_depart:
		if c["unlocked"]:
			a_debloque = true
		else:
			a_verrouille = true
	if not (a_verrouille and a_debloque):
		fails.append("l'ecran de depart ne montre pas a la fois verrouille et debloque")
	var ok := fails.is_empty()
	print("FORGE_ORACLE gallery_render " + JSON.stringify({
		"ok": ok, "fails": fails,
		"data": {"non_monochrome": rendu_reel, "diff_unlock": changement,
			"depart_mixte": a_verrouille and a_debloque},
	}))
	quit(0 if ok else 1)
