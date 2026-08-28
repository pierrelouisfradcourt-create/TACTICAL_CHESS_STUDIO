# kittens_registry.test.gd — registre de contenu : >=6 chatons a id/nom uniques, >=3 raretes.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")


func _charger() -> Dictionary:
	var f := FileAccess.open(P.REG_KITTENS, FileAccess.READ)
	if f == null:
		return {}
	var d = JSON.parse_string(f.get_as_text())
	f.close()
	return d if d is Dictionary else {}


func run(h) -> void:
	var data := _charger()
	var kittens: Array = data.get("kittens", [])
	h.gt(kittens.size(), 5, "kittens: au moins 6 chatons")

	var ids := {}
	var noms := {}
	var raretes := {}
	for k in kittens:
		ids[String(k.get("id", ""))] = true
		noms[String(k.get("nom", ""))] = true
		raretes[String(k.get("rarete", ""))] = true
		h.ok(String(k.get("id", "")) != "", "kittens: chaque chaton a un id non vide")
		h.ok(String(k.get("sprite", "")) != "", "kittens: chaque chaton reference un sprite")

	h.eq(ids.size(), kittens.size(), "kittens: tous les id sont UNIQUES")
	h.eq(noms.size(), kittens.size(), "kittens: tous les noms sont UNIQUES")
	h.gt(raretes.size(), 2, "kittens: au moins 3 raretes representees")
