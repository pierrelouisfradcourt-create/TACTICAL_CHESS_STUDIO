# main_screen_render.gd — oracle produit (PIXEL) de l'ecran principal (render.hud,
# render.refuge, render.click_response, entity.pelote, core.render). Prouve DEPUIS main.tscn,
# par les seules entrees d'un joueur et la capture du viewport :
#   - Label "objectif" non vide a l'ouverture, et son texte CHANGE vers un seuil superieur au
#     franchissement d'un palier ;
#   - Label "collection" non vide et croissant apres l'acquisition d'un type nouveau ;
#   - la region de la pelote DIFFERE au pixel avant/apres un clic (reponse visuelle) ;
#   - un sprite de chaton APPARAIT dans le refuge apres un achat (0 -> >=1).
# Aucune lecture de 05_SYSTEMS.
#
# forge:run_mode = gpu_window
extends SceneTree

var _inst

func _initialize() -> void:
	_inst = load("res://main.tscn").instantiate()
	get_root().add_child(_inst)
	await _run()

func _run() -> void:
	var fails: Array = []
	for _i in range(12):
		await process_frame

	var obj_a := _text("objectif")
	var col_a := _num("collection")
	if obj_a.strip_edges() == "":
		fails.append("Label 'objectif' vide a l'ouverture")

	# reponse au clic : la region de la pelote change au pixel.
	var img_pelote_avant := _capture()
	_clic("pelote")
	for _i in range(2):
		await process_frame
	var img_pelote_apres := _capture()
	if _diff(img_pelote_avant, img_pelote_apres, 250, 160, 390, 320) <= 0:
		fails.append("aucun changement de pixel sur la region de la pelote apres le clic")

	# franchir le 1er palier -> l'objectif change vers un seuil superieur.
	for _i in range(14):
		_clic("pelote")
		await process_frame
	var obj_b := _text("objectif")
	if obj_b == obj_a:
		fails.append("Label 'objectif' inchange apres franchissement du palier")

	# refuge : avant achat 0 chaton, apres achat >=1 sprite + collection croissante.
	if int(_inst.nb_chatons_affiches()) != 0:
		fails.append("des chatons sont affiches avant tout achat")
	var img_refuge_avant := _capture()
	_clic("acheter_chaton")
	for _i in range(4):
		await process_frame
	var col_c := _num("collection")
	if int(_inst.nb_chatons_affiches()) < 1:
		fails.append("aucun sprite de chaton dans le refuge apres achat")
	if not (col_c > col_a):
		fails.append("compteur de collection non croissant apres acquisition (%s -> %s)" % [col_a, col_c])
	var img_refuge_apres := _capture()
	if _diff(img_refuge_avant, img_refuge_apres, 120, 200, 400, 320) <= 0:
		fails.append("aucun chaton apparu au pixel dans le refuge apres achat")

	print("FORGE_ORACLE main_screen_render " + JSON.stringify({
		"ok": fails.is_empty(), "fails": fails,
		"data": {"objectif_ouverture": obj_a, "objectif_apres_palier": obj_b,
			"collection_avant": col_a, "collection_apres": col_c}}))
	quit(0 if fails.is_empty() else 1)

func _capture() -> Image:
	return get_root().get_texture().get_image()

func _diff(a: Image, b: Image, x0: int, y0: int, x1: int, y1: int) -> int:
	if a == null or b == null:
		return -1
	var n := 0
	var y := y0
	while y < y1 and y < a.get_height():
		var x := x0
		while x < x1 and x < a.get_width():
			if a.get_pixel(x, y) != b.get_pixel(x, y):
				n += 1
			x += 4
		y += 4
	return n

func _trouver(groupe: String, nom: String) -> Node:
	for n in get_nodes_in_group(groupe):
		if n.name == nom:
			return n
	return null

func _text(nom: String) -> String:
	var l := _trouver("hud", nom)
	return l.text if l != null and l is Label else ""

func _num(nom: String) -> float:
	var re := RegEx.new()
	re.compile("[-+]?\\d+(?:[.,]\\d+)?")
	var m := re.search(_text(nom))
	return m.get_string().replace(",", ".").to_float() if m != null else -1.0

func _clic(nom: String) -> void:
	var node := _trouver("affordance", nom)
	if node == null:
		return
	var c: Vector2 = node.get_global_rect().get_center()
	var p := InputEventMouseButton.new()
	p.button_index = MOUSE_BUTTON_LEFT
	p.pressed = true
	p.position = c
	get_root().push_input(p, true)
	var r := InputEventMouseButton.new()
	r.button_index = MOUSE_BUTTON_LEFT
	r.pressed = false
	r.position = c
	get_root().push_input(r, true)
