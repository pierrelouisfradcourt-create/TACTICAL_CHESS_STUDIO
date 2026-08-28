# refuge_view.gd — vue du refuge. Instancie un chaton VISIBLE apres un achat (la ou il n'y
# en avait aucun : ref_kitten_appears). Instancie l'entite chaton, ne detient aucune regle
# (render.refuge).
extends Node

const KittenScene := preload("res://02_ENTITIES/entities/kitten.tscn")

var _conteneur: Node2D
var _n := 0

func construire(parent: Node) -> void:
	_conteneur = Node2D.new()
	_conteneur.name = "RefugeChatons"
	parent.add_child(_conteneur)

# Fait apparaitre un chaton nomme (sprite selon rarete) dans le refuge.
func ajouter_chaton(sprite_id: String, rarete: String) -> void:
	if _conteneur == null:
		return
	var k = KittenScene.instantiate()
	_conteneur.add_child(k)
	k.configurer(sprite_id, rarete)
	k.position = Vector2(150 + (_n % 5) * 88, 250 - int(_n / 5) * 80)
	_n += 1

func nb_chatons_affiches() -> int:
	return _n
