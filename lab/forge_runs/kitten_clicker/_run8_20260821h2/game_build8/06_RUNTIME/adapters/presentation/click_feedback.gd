# click_feedback.gd — ADAPTATEUR DE PRESENTATION (categorie `system.adapter`).
# Fournit `render.feedback` : un retour visuel TRANSITOIRE au clic (R10).
#
# Un pop (sprite click_feedback_pop) apparait au point de clic puis remonte et
# s'efface en quelques trames. DETERMINISME : l'animation est pilotee par un
# compteur de trames (`_life`), jamais par une horloge de plateforme.
#
# LIT l'evenement de clic, ne mute aucun etat de jeu (separation garde-fou (c)).
extends Control

const _POP_TEXTURE := "res://04_ASSETS/sprites/click_feedback_pop.svg"
const _LIFE_FRAMES := 24

var _sprite: TextureRect = null
var _life := 0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_sprite = TextureRect.new()
	_sprite.texture = load(_POP_TEXTURE)
	_sprite.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_sprite.visible = false
	_sprite.size = Vector2(48, 48)
	add_child(_sprite)


# Declenche le pop au point donne (coordonnees globales).
func pop(at: Vector2) -> void:
	_sprite.global_position = at - _sprite.size / 2.0
	_sprite.modulate = Color(1, 1, 1, 1)
	_sprite.visible = true
	_life = _LIFE_FRAMES


func _process(_delta: float) -> void:
	if _life <= 0:
		return
	_life -= 1
	_sprite.position.y -= 1.5
	_sprite.modulate.a = float(_life) / float(_LIFE_FRAMES)
	if _life <= 0:
		_sprite.visible = false
