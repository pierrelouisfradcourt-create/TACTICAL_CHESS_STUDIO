# rarity_view.gd — ADAPTATEUR DE PRESENTATION (categorie `system.adapter`).
# Fournit `render.rarity` : l'identite visuelle d'un chaton selon sa rarete.
#
# LIT le registre de chatons (03_WORLD) et les sprites (04_ASSETS), n'en mute aucun.
# Chaque rarete rend un sprite propre (robe + cadre distincts par tier), donc les
# trois raretes sont visuellement DISTINCTES a l'ecran (R5, oracle gallery_render).
extends RefCounted

const _SPRITE_DIR := "res://04_ASSETS/sprites/"

# Teinte de fond par rarete : second signal "a l'oeil", au-dela du sprite lui-meme.
const RARITY_TINT := {
	"commune": Color(0.66, 0.85, 0.78),
	"rare": Color(0.49, 0.78, 0.89),
	"legendaire": Color(1.0, 0.82, 0.30),
}


# Construit un TextureRect pret a poser dans la scene pour un chaton donne.
# `kitten` est une entree du registre kittens.json ({id, nom, rarete, sprite}).
static func make_sprite(kitten: Dictionary) -> TextureRect:
	var tr := TextureRect.new()
	var sprite_name := String(kitten.get("sprite", ""))
	if sprite_name != "":
		tr.texture = load(_SPRITE_DIR + sprite_name)
	tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	tr.custom_minimum_size = Vector2(48, 48)
	tr.size = Vector2(48, 48)
	tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tr.tooltip_text = String(kitten.get("nom", ""))
	return tr


# Couleur de rarete (pour un cadre/halo pose derriere le sprite).
static func tint_for(rarete: String) -> Color:
	return RARITY_TINT.get(rarete, Color(1, 1, 1))
