# onboarding.gd — indice de premier lancement (capacite render.onboarding, R21).
#
# Adaptateur de presentation. Au boot, l'objet central (coussin) porte un indicateur
# visuel qui appelle le clic ; un clic simule change le compteur affiche.
extends Node2D


# Pose un halo d'appel au clic autour de l'objet central. Rend le noeud d'indicateur cree.
func highlight_central(center: Vector2) -> Node2D:
	var halo := Node2D.new()
	halo.position = center
	add_child(halo)
	var ring := Sprite2D.new()
	# Le halo reutilise le sprite du coussin en surbrillance douce (teinte claire).
	var tex := load("res://04_ASSETS/sprites/central_cushion.svg") as Texture2D
	if tex != null:
		ring.texture = tex
	ring.modulate = Color(1.0, 1.0, 1.0, 0.5)
	ring.scale = Vector2(1.15, 1.15)
	halo.add_child(ring)
	return halo
