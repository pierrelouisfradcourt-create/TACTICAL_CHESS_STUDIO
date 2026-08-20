extends Node2D
# Ennemi lent (encerclable) : dérive + légère poursuite, pour tester la Constriction.

@export var speed: float = 58.0
var drift: Vector2 = Vector2.RIGHT

func _ready() -> void:
	drift = Vector2.RIGHT.rotated(randf() * TAU)
	queue_redraw()

func update_chase(target: Vector2, delta: float) -> void:
	var to_t: Vector2 = (target - position).normalized()
	# 50% poursuite, 50% dérive -> lent et encerclable
	var dir: Vector2 = (to_t * 0.5 + drift * 0.5).normalized()
	position += dir * speed * delta
	# léger changement de dérive pour un mouvement organique
	drift = drift.rotated(randf_range(-0.6, 0.6) * delta)
	# rester dans l'écran
	var vp: Vector2 = get_viewport_rect().size
	position.x = clampf(position.x, 12.0, vp.x - 12.0)
	position.y = clampf(position.y, 12.0, vp.y - 12.0)

func _draw() -> void:
	draw_circle(Vector2.ZERO, 9.0, Color(1.0, 0.32, 0.36))
	draw_circle(Vector2.ZERO, 4.0, Color(0.35, 0.05, 0.08))
