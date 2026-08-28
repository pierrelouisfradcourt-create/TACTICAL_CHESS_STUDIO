# wool_ball_entity.test.gd — la pelote centrale : cible cliquable au centre, test de disque.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")
const Pelote = preload("res://02_ENTITIES/wool_ball/wool_ball.gd")


func run(h) -> void:
	var w = Pelote.new()
	w.configurer(null)
	h.eq(w.position, P.WOOL_BALL_CENTER, "pelote: placee au centre de l'ecran")
	h.eq(w.rayon(), P.WOOL_BALL_RADIUS, "pelote: rayon declare")

	# un clic AU centre tombe sur la pelote ; loin, non (test de disque STRICT)
	h.ok(w.contient(P.WOOL_BALL_CENTER), "pelote: le centre exact est sur la pelote")
	h.ok(w.contient(P.WOOL_BALL_CENTER + Vector2(P.WOOL_BALL_RADIUS - 1.0, 0.0)),
		"pelote: un point juste dans le rayon est sur la pelote")
	h.ok(not w.contient(P.WOOL_BALL_CENTER + Vector2(P.WOOL_BALL_RADIUS + 20.0, 0.0)),
		"pelote: un point hors rayon n'est PAS sur la pelote")
	h.ok(not w.contient(Vector2(0.0, 0.0)), "pelote: le coin de l'ecran n'est pas sur la pelote")
	w.free()
