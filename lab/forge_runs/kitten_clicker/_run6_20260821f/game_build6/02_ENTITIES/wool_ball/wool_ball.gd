# wool_ball.gd — PELOTE CENTRALE : cible cliquable, objet d'amorcage de la boucle.
#
# Entite instanciable pilotee par le runtime. SANS regle d'economie : elle ne sait que se
# placer au centre, s'afficher, et repondre "ce point est-il sur moi ?". C'est l'adaptateur
# d'entree qui traduit un clic sur elle en appel a la logique (direction input -> logique).
extends Sprite2D

const P = preload("res://05_SYSTEMS/params/params.gd")

var _rayon: float = P.WOOL_BALL_RADIUS


# Place la pelote au centre de l'ecran avec sa texture. Le clic injecte par la sonde
# runtime_alive vise EXACTEMENT ce centre : la pelote doit y etre.
func configurer(tex: Texture2D) -> void:
	texture = tex
	position = P.WOOL_BALL_CENTER
	centered = true
	if tex != null:
		var t: Vector2 = tex.get_size()
		if t.x > 0.0:
			# Echelle pour que la pelote occupe ~2*rayon a l'ecran.
			scale = Vector2.ONE * (2.0 * _rayon / t.x)


# Un point d'ecran est-il sur la pelote ? Test de disque, pur.
func contient(point: Vector2) -> bool:
	return point.distance_to(P.WOOL_BALL_CENTER) <= _rayon


func rayon() -> float:
	return _rayon
