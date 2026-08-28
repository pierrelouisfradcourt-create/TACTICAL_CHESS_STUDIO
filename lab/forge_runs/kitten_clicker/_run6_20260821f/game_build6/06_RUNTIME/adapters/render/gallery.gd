# gallery.gd — ADAPTATEUR DE RENDU de la GALERIE de collection (render.gallery).
#
# Affiche les >=6 chatons du registre, CHACUN dans son cadre de rarete (identite visuelle
# distincte par rarete), plus le compteur de collection "X/T". LIT l'etat, ne le mute jamais.
# Un chaton non encore debloque est attenue (modulate), mais son sprite reste distinct : la
# preuve de distinction ne depend pas du deblocage.
#
# La galerie vit dans main.tscn (comme l'ecran principal) : un oracle qui charge la VRAIE
# scene y trouve les 6 sprites et le compteur sans reconstruire quoi que ce soit.
extends Node2D

const P = preload("res://05_SYSTEMS/params/params.gd")
const Render = preload("res://06_RUNTIME/adapters/render/render.gd")
const Collection = preload("res://05_SYSTEMS/collection/collection.gd")

const SLOT: float = 48.0
const ESPACE: float = 6.0
const ORIGINE := Vector2(300.0, 14.0)

var _reg: Dictionary = {}
var _tex: Dictionary = {}
var _slots: Array = []          # {cadre: ColorRect, sprite: Sprite2D, id: String}
var _lbl: Label = null


func batir(reg: Dictionary, tex: Dictionary) -> void:
	_reg = reg
	_tex = tex
	var kittens: Array = _reg.get("kittens", [])
	for i in range(kittens.size()):
		var k: Dictionary = kittens[i]
		var rar: String = String(k.get("rarete", "common"))
		var pos: Vector2 = ORIGINE + Vector2(float(i) * (SLOT + ESPACE), 0.0)

		var cadre := ColorRect.new()
		cadre.mouse_filter = Control.MOUSE_FILTER_IGNORE
		cadre.color = Render.couleur_cadre(rar)
		cadre.size = Vector2(SLOT, SLOT)
		cadre.position = pos
		add_child(cadre)

		var sp := Sprite2D.new()
		sp.texture = _tex.get(String(k.get("id", "")), null)
		sp.centered = false
		sp.position = pos + Vector2(4.0, 4.0)
		var t: Vector2 = sp.texture.get_size() if sp.texture != null else Vector2(64, 64)
		if t.x > 0.0:
			sp.scale = Vector2.ONE * ((SLOT - 8.0) / t.x)
		sp.modulate = Color(1, 1, 1, 0.35)   # attenue tant que non debloque
		add_child(sp)

		_slots.append({"cadre": cadre, "sprite": sp, "id": String(k.get("id", ""))})

	_lbl = Label.new()
	_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_lbl.position = ORIGINE + Vector2(0.0, SLOT + 6.0)
	_lbl.add_theme_color_override("font_color", Color("#4A4A55"))
	add_child(_lbl)


func rafraichir(s) -> void:
	if _lbl != null:
		_lbl.text = "Collection: %s" % Collection.texte(s)
	for slot in _slots:
		var debloque: bool = String(slot["id"]) in s.unlocked
		slot["sprite"].modulate = Color(1, 1, 1, 1.0) if debloque else Color(1, 1, 1, 0.35)


# Centre ecran du slot i (pour un oracle : ou regarder, jamais deviner).
func slot_centre(i: int) -> Vector2:
	if i < 0 or i >= _slots.size():
		return Vector2(-1, -1)
	return ORIGINE + Vector2(float(i) * (SLOT + ESPACE) + SLOT / 2.0, SLOT / 2.0)


func nb_slots() -> int:
	return _slots.size()


func compteur_centre() -> Vector2:
	return ORIGINE + Vector2(40.0, SLOT + 12.0)
