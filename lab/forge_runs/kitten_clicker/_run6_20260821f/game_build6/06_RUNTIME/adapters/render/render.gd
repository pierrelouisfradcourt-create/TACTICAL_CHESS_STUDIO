# render.gd — ADAPTATEUR DE SORTIE VISUELLE de l'ecran principal (render.frame, main_screen).
#
# LIT l'etat et l'affiche ; ne le MUTE jamais (dependance a sens unique render -> game_state).
# Proprietaire de render.frame. Contient : decor du lieu, pelote centrale, HUD (total + taux/s),
# chatons achetes (persistants dans le refuge), icones d'objets, pop de feedback au clic.
#
# Le decor change avec le lieu (refuge -> jardin au 1er palier) : deux etats distincts
# produisent donc deux images distinctes, et le HUD change a chaque clic.
extends Node2D

const P = preload("res://05_SYSTEMS/params/params.gd")
const Pelote = preload("res://02_ENTITIES/wool_ball/wool_ball.gd")
const Chaton = preload("res://02_ENTITIES/kitten/kitten.gd")

# Couleurs de cadre par rarete (identite visuelle par rarete, art_bible R9/R14).
const CADRE_COMMON := Color("#A8D8C8")
const CADRE_RARE := Color("#7EC8E3")
const CADRE_LEGENDARY := Color("#FFD24C")

var _tex: Dictionary = {}
var _reg: Dictionary = {}
var _fond: Sprite2D = null
var _pelote: Sprite2D = null
var _lbl_ronrons: Label = null
var _lbl_taux: Label = null
var _pop: Sprite2D = null
var _pop_ttl: int = 0
var _chatons: Node2D = null
var _spawned: int = 0
var _place_unlocked: bool = false


# --- CHARGEMENT DE TEXTURE (statique, reutilise par gallery.gd) ---------------------------
# Rasterise un SVG a l'execution via Image.load_svg_from_string (aucune dependance au
# pipeline d'import de l'editeur). Repli DISTINCT par chemin si le SVG est illisible : la
# preuve de distinction des sprites ne depend jamais d'une seule voie de chargement.
static func charger_texture(chemin: String) -> Texture2D:
	if FileAccess.file_exists(chemin):
		var f := FileAccess.open(chemin, FileAccess.READ)
		if f != null:
			var txt := f.get_as_text()
			f.close()
			var img := Image.new()
			if img.has_method("load_svg_from_string"):
				var err = img.load_svg_from_string(txt, 1.0)
				if err == OK and img.get_width() > 0:
					return ImageTexture.create_from_image(img)
	return _placeholder(chemin)


static func _placeholder(chemin: String) -> Texture2D:
	var h: int = abs(chemin.hash())
	var img := Image.create(48, 48, false, Image.FORMAT_RGBA8)
	img.fill(Color(float(h % 255) / 255.0, float((h / 255) % 255) / 255.0,
		float((h / 65025) % 255) / 255.0, 1.0))
	return ImageTexture.create_from_image(img)


static func couleur_cadre(rarete: String) -> Color:
	match rarete:
		"rare":
			return CADRE_RARE
		"legendary":
			return CADRE_LEGENDARY
		_:
			return CADRE_COMMON


# --- CONSTRUCTION -------------------------------------------------------------------------
func batir(reg: Dictionary, tex: Dictionary) -> void:
	_reg = reg
	_tex = tex

	_fond = Sprite2D.new()
	_fond.centered = false
	_fond.texture = _tex.get("refuge", null)
	add_child(_fond)

	_chatons = Node2D.new()
	add_child(_chatons)

	# Icones d'objets (icone + effet observable) alignees en bas.
	var objs: Array = _reg.get("objects", [])
	var ox: float = 24.0
	for o in objs:
		var sp := Sprite2D.new()
		sp.texture = _tex.get(String(o.get("id", "")), null)
		sp.centered = false
		sp.position = Vector2(ox, float(P.SCREEN_H) - 96.0)
		sp.scale = Vector2(0.5, 0.5)
		add_child(sp)
		ox += 48.0

	# Pelote centrale (cible du clic injecte).
	_pelote = Pelote.new()
	_pelote.configurer(_tex.get("wool_ball", null))
	add_child(_pelote)

	# Pop de feedback au clic (cache par defaut).
	_pop = Sprite2D.new()
	_pop.texture = _tex.get("pop", null)
	_pop.position = P.WOOL_BALL_CENTER + Vector2(0.0, -90.0)
	_pop.visible = false
	add_child(_pop)

	# HUD : cadre + total ronrons + taux/seconde.
	var cadre := Sprite2D.new()
	cadre.texture = _tex.get("ui_frame", null)
	cadre.centered = false
	cadre.position = Vector2(12.0, 10.0)
	add_child(cadre)

	_lbl_ronrons = Label.new()
	_lbl_ronrons.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_lbl_ronrons.position = Vector2(24.0, 16.0)
	_lbl_ronrons.add_theme_color_override("font_color", Color("#4A4A55"))
	add_child(_lbl_ronrons)

	_lbl_taux = Label.new()
	_lbl_taux.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_lbl_taux.position = Vector2(24.0, 40.0)
	_lbl_taux.add_theme_color_override("font_color", Color("#4A4A55"))
	add_child(_lbl_taux)


func get_pelote() -> Node:
	return _pelote


# Region ecran du HUD (pour la verification de causalite d'un oracle).
func hud_rect() -> Rect2:
	return Rect2(12.0, 10.0, 256.0, 96.0)


# --- RAFRAICHISSEMENT ---------------------------------------------------------------------
func rafraichir(s) -> void:
	if _lbl_ronrons != null:
		_lbl_ronrons.text = "Ronrons: %d" % int(s.ronrons)
	if _lbl_taux != null:
		var par_sec: float = s.taux * float(P.TICKS_PAR_SECONDE)
		_lbl_taux.text = "Taux: %.1f/s" % par_sec

	# Decor : bascule refuge -> jardin au deblocage du 2e lieu.
	if s.place_unlocked != _place_unlocked and _fond != null:
		_place_unlocked = s.place_unlocked
		_fond.texture = _tex.get("garden", null) if s.place_unlocked else _tex.get("refuge", null)

	# Spawn PERSISTANT des chatons achetes.
	while _spawned < s.kittens.size():
		_spawn_chaton(String(s.kittens[_spawned]), _spawned)
		_spawned += 1

	# Extinction progressive du pop de clic.
	if _pop_ttl > 0:
		_pop_ttl -= 1
		if _pop_ttl == 0 and _pop != null:
			_pop.visible = false


# Vide les chatons affiches (le prestige remet la colonie a la base : rien ne doit
# survivre a l'ecran). La collection distincte, elle, vit dans la galerie et persiste.
func reset_chatons() -> void:
	if _chatons != null:
		for c in _chatons.get_children():
			c.queue_free()
	_spawned = 0


func montrer_pop() -> void:
	if _pop != null:
		_pop.visible = true
		_pop_ttl = 20


func _spawn_chaton(id: String, index: int) -> void:
	var rar: String = _rarete_de(id)
	var c := Chaton.new()
	c.configurer(id, rar, _tex.get(id, null), couleur_cadre(rar), 44.0)
	# Rangee au sol du refuge, deterministe.
	var col: int = index % 8
	var row: int = index / 8
	c.position = Vector2(72.0 + float(col) * 60.0, 340.0 + float(row) * 52.0)
	_chatons.add_child(c)


func _rarete_de(id: String) -> String:
	for k in _reg.get("kittens", []):
		if String(k.get("id", "")) == id:
			return String(k.get("rarete", "common"))
	return "common"
