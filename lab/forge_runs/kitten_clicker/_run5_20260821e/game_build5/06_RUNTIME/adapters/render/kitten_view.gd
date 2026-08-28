# kitten_view.gd — affichage des chatons (capacite render.kitten_view, R3).
#
# Adaptateur de presentation. Fait apparaitre un sprite-chaton visible apres achat.
# Charge les textures SVG de 04_ASSETS/sprites. Aucune logique de jeu.
extends Node2D


# Fait apparaitre un sprite-chaton a la position donnee, a partir d'une texture chargee.
# Rend le Sprite2D cree (persistant : ajoute comme enfant, il reste au frame suivant).
func spawn_kitten_sprite(texture: Texture2D, pos: Vector2) -> Sprite2D:
	var sprite := Sprite2D.new()
	sprite.texture = texture
	sprite.position = pos
	add_child(sprite)
	return sprite


# Charge une texture de sprite depuis 04_ASSETS/sprites (SVG importe comme Texture2D).
static func load_sprite(name: String) -> Texture2D:
	var path := "res://04_ASSETS/sprites/" + name + ".svg"
	if not ResourceLoader.exists(path):
		return null
	return load(path) as Texture2D
