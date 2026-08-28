# gallery_render.gd — oracle produit (PIXEL) de l'entite chaton (entity.kitten :
# ref_rarity_visual, ref_idle_anim). Charge main.tscn (garde d'assemblage), puis instancie
# l'entite chaton auto-contenue en deux raretes differentes pour prouver :
#   - RARETE : deux chatons de raretes differentes ont des regions de sprite DISTINCTES au
#     pixel (la rarete est portee par des assets reellement distincts) ;
#   - IDLE : deux captures espacees d'un MEME chaton au repos different au pixel (l'animation
#     d'inactivite tourne).
# L'entite est auto-contenue (blueprint) : la prouver directement est legitime, main.tscn est
# charge pour garantir que la vraie scene s'assemble. Aucune lecture de 05_SYSTEMS.
#
# forge:run_mode = gpu_window
extends SceneTree

const KittenScene := preload("res://02_ENTITIES/entities/kitten.tscn")

var _inst
var _kc
var _kl

func _initialize() -> void:
	_inst = load("res://main.tscn").instantiate()
	get_root().add_child(_inst)
	await _run()

func _run() -> void:
	var fails: Array = []
	var galerie := Node2D.new()
	get_root().add_child(galerie)
	_kc = KittenScene.instantiate()
	galerie.add_child(_kc)
	_kc.configurer("kitten_tabby_common", "common")
	_kc.position = Vector2(150, 240)
	_kl = KittenScene.instantiate()
	galerie.add_child(_kl)
	_kl.configurer("kitten_golden_legendary", "legendary")
	_kl.position = Vector2(430, 240)

	for _i in range(10):
		await process_frame

	# RARETE : les regions des deux chatons different au pixel.
	var img := _capture()
	var diff_rarete := _diff_regions(img, Vector2(150, 240), Vector2(430, 240), 44)
	if diff_rarete <= 0:
		fails.append("chatons common/legendary identiques au pixel (rarete non distincte)")

	# IDLE : le meme chaton (common) differe entre deux captures espacees.
	var a := _region(img, Vector2(150, 240), 44)
	for _i in range(22):
		await process_frame
	var b := _region(_capture(), Vector2(150, 240), 44)
	var diff_idle := _diff_pixels(a, b)
	if diff_idle <= 0:
		fails.append("aucune difference de pixel du meme chaton entre deux captures (idle inerte)")

	print("FORGE_ORACLE gallery_render " + JSON.stringify({
		"ok": fails.is_empty(), "fails": fails,
		"data": {"diff_rarete": diff_rarete, "diff_idle": diff_idle}}))
	quit(0 if fails.is_empty() else 1)

func _capture() -> Image:
	return get_root().get_texture().get_image()

# Echantillonne une region carree centree autour de `centre`, demi-cote `d`.
func _region(img: Image, centre: Vector2, d: int) -> PackedColorArray:
	var out := PackedColorArray()
	if img == null:
		return out
	var y := int(centre.y) - d
	while y <= int(centre.y) + d:
		var x := int(centre.x) - d
		while x <= int(centre.x) + d:
			if x >= 0 and y >= 0 and x < img.get_width() and y < img.get_height():
				out.append(img.get_pixel(x, y))
			else:
				out.append(Color(0, 0, 0, 0))
			x += 2
		y += 2
	return out

func _diff_pixels(a: PackedColorArray, b: PackedColorArray) -> int:
	var n := 0
	var m := mini(a.size(), b.size())
	for i in range(m):
		if a[i] != b[i]:
			n += 1
	return n

func _diff_regions(img: Image, ca: Vector2, cb: Vector2, d: int) -> int:
	return _diff_pixels(_region(img, ca, d), _region(img, cb, d))
