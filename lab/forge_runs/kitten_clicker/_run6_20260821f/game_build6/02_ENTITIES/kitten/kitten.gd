# kitten.gd — CHATON instanciable et persistant apres achat.
#
# Entite pilotee par le runtime, SANS regle d'economie. Porte un sprite DISTINCT par rarete
# (cadre de rarete derriere le chaton). Une fois ajoute a la scene, il y reste (persistance) :
# c'est ce qui rend l'achat observable a l'ecran.
extends Node2D

var kitten_id: String = ""
var rarete: String = ""


# Construit le chaton : un cadre de rarete (rectangle colore) derriere un sprite de chaton.
# `cadre` = couleur du cadre selon la rarete ; deux chatons de rarete differente different
# donc visiblement meme a silhouette proche.
func configurer(id: String, rar: String, tex: Texture2D, cadre: Color, taille: float = 56.0) -> void:
	kitten_id = id
	rarete = rar

	var fond := ColorRect.new()
	fond.color = cadre
	fond.size = Vector2(taille + 8.0, taille + 8.0)
	fond.position = Vector2(-(taille + 8.0) / 2.0, -(taille + 8.0) / 2.0)
	add_child(fond)

	var sp := Sprite2D.new()
	sp.texture = tex
	sp.centered = true
	if tex != null:
		var t: Vector2 = tex.get_size()
		if t.x > 0.0:
			sp.scale = Vector2.ONE * (taille / t.x)
	add_child(sp)
