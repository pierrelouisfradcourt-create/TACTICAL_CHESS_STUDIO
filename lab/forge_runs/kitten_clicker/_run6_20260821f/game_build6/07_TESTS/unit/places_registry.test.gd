# places_registry.test.gd — >=2 lieux : refuge INITIAL + >=1 DEBLOQUE, decor distinct.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")


func _charger() -> Dictionary:
	var f := FileAccess.open(P.REG_PLACES, FileAccess.READ)
	if f == null:
		return {}
	var d = JSON.parse_string(f.get_as_text())
	f.close()
	return d if d is Dictionary else {}


func run(h) -> void:
	var places: Array = _charger().get("places", [])
	h.gt(places.size(), 1, "places: au moins 2 lieux")

	var ids := {}
	var decors := {}
	var a_initial := false
	var a_debloque := false
	for p in places:
		ids[String(p.get("id", ""))] = true
		decors[String(p.get("decor", ""))] = true
		var etat := String(p.get("etat", ""))
		if etat == "initial":
			a_initial = true
		if etat == "debloque":
			a_debloque = true
		h.ok(String(p.get("decor", "")) != "", "places: chaque lieu a un decor non vide")

	h.eq(ids.size(), places.size(), "places: id de lieu UNIQUES")
	h.eq(decors.size(), places.size(), "places: decors DISTINCTS (arriere-plan different)")
	h.ok(a_initial, "places: un lieu INITIAL (refuge) existe")
	h.ok(a_debloque, "places: un lieu DEBLOQUE par palier existe")
