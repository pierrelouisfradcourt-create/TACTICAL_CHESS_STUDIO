# objects_registry.test.gd — >=3 objets a id unique, icone NON VIDE et effet NON VIDE.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")


func _charger() -> Dictionary:
	var f := FileAccess.open(P.REG_OBJECTS, FileAccess.READ)
	if f == null:
		return {}
	var d = JSON.parse_string(f.get_as_text())
	f.close()
	return d if d is Dictionary else {}


func run(h) -> void:
	var objs: Array = _charger().get("objects", [])
	h.gt(objs.size(), 2, "objects: au moins 3 objets")

	var ids := {}
	for o in objs:
		ids[String(o.get("id", ""))] = true
		h.ok(String(o.get("icone", "")) != "", "objects: icone NON vide")
		h.ok(String(o.get("effet", "")) != "", "objects: effet NON vide")

	h.eq(ids.size(), objs.size(), "objects: id UNIQUES")
