# kitten.gd — entite de scene AUTO-CONTENUE : un chaton qui joue une animation d'idle en
# boucle (respiration + petit rebond) tant qu'il est a l'ecran, et choisit son sprite selon
# sa rarete. Aucune regle de jeu, aucun import d'adaptateur (entity.kitten).
extends Node2D

var _sprite: Sprite2D
var _rarete := "common"
var _t := 0.0

func _ready() -> void:
	if _sprite == null:
		_sprite = Sprite2D.new()
		add_child(_sprite)

# Choisit le sprite du chaton d'apres son identifiant d'asset et retient sa rarete.
func configurer(sprite_id: String, rarete: String) -> void:
	_rarete = rarete
	if _sprite == null:
		_sprite = Sprite2D.new()
		add_child(_sprite)
	var tex = load("res://04_ASSETS/sprites/%s.svg" % sprite_id)
	if tex is Texture2D:
		_sprite.texture = tex

func rarete() -> String:
	return _rarete

func _process(delta: float) -> void:
	animer_idle(delta)

# Animation d'inactivite en boucle : le sprite respire (echelle) et se dandine (position y).
# Deux captures espacees de quelques frames different donc au pixel.
func animer_idle(delta: float) -> void:
	_t += delta
	if _sprite == null:
		return
	_sprite.position.y = sin(_t * 3.0) * 6.0
	var s := 1.0 + 0.08 * sin(_t * 3.0)
	_sprite.scale = Vector2(s, s)
