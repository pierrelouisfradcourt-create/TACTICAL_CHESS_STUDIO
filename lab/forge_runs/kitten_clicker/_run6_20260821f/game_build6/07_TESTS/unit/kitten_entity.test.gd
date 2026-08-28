# kitten_entity.test.gd — le chaton instanciable : porte son id/rarete et construit son
# visuel (cadre de rarete + sprite). Sans regle d'economie.
extends RefCounted

const Chaton = preload("res://02_ENTITIES/kitten/kitten.gd")


func run(h) -> void:
	var c = Chaton.new()
	c.configurer("kitten_golden_legendary", "legendary", null, Color("#FFD24C"), 44.0)
	h.eq(c.kitten_id, "kitten_golden_legendary", "kitten: porte son id")
	h.eq(c.rarete, "legendary", "kitten: porte sa rarete")
	# un cadre (ColorRect) DERRIERE un sprite : deux enfants construits
	h.eq(c.get_child_count(), 2, "kitten: construit un cadre + un sprite")
	c.free()

	# rarete distincte -> couleur de cadre distincte (identite visuelle par rarete)
	var a = Chaton.new()
	a.configurer("k1", "common", null, Color("#A8D8C8"), 40.0)
	var b = Chaton.new()
	b.configurer("k2", "rare", null, Color("#7EC8E3"), 40.0)
	h.ok(a.get_child(0) is ColorRect and b.get_child(0) is ColorRect, "kitten: le fond est un cadre colore")
	h.ok(a.get_child(0).color != b.get_child(0).color, "kitten: cadres de rarete de couleurs distinctes")
	a.free()
	b.free()
