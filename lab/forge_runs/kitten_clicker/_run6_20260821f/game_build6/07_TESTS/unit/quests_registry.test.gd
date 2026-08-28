# quests_registry.test.gd — >=3 quetes a id unique : objectif CHIFFRE + progression + accompli.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")


func _charger() -> Dictionary:
	var f := FileAccess.open(P.REG_QUESTS, FileAccess.READ)
	if f == null:
		return {}
	var d = JSON.parse_string(f.get_as_text())
	f.close()
	return d if d is Dictionary else {}


func run(h) -> void:
	var quests: Array = _charger().get("quests", [])
	h.gt(quests.size(), 2, "quests: au moins 3 quetes")

	var ids := {}
	for q in quests:
		ids[String(q.get("id", ""))] = true
		var cible = q.get("cible", null)
		h.ok(cible is float or cible is int, "quests: la cible est un nombre (objectif chiffre)")
		h.gt(float(cible), 0.0, "quests: cible strictement positive")
		h.ok(q.has("progression"), "quests: porte un champ de progression")
		h.ok(q.has("accompli"), "quests: porte un etat d'accomplissement")

	h.eq(ids.size(), quests.size(), "quests: id UNIQUES")
