extends Node2D
# WAVEVALE — Unit
# Représentation visuelle + données d'une unité sur le board.
# Attaché au Node2D Unit.tscn.

# ── Variables exportées ───────────────────────────────────────────────────────
@export var unit_data: Dictionary = {}

# ── Nœuds enfants ─────────────────────────────────────────────────────────────
@onready var emoji_label: Label = $EmojiLabel
@onready var name_label: Label = $NameLabel
@onready var hp_bar: ProgressBar = $HPBar
@onready var star_label: Label = $StarLabel
@onready var items_label: Label = $ItemsLabel
@onready var anim_player: AnimationPlayer = $AnimationPlayer

# ── Constantes ────────────────────────────────────────────────────────────────
const HP_LOW_THRESHOLD: float = 0.35
const ATTACK_SCALE: float = 1.2
const RESURRECT_GOLD_FLASH: Color = Color(1.0, 0.85, 0.1, 1.0)
const HIT_FLASH_COLOR: Color = Color.WHITE
const TWEEN_ATTACK_DURATION: float = 0.1
const TWEEN_HIT_DURATION: float = 0.12
const TWEEN_DEATH_DURATION: float = 0.25
const TWEEN_RESURRECT_DURATION: float = 0.3


# ── API publique ──────────────────────────────────────────────────────────────

func setup(data: Dictionary) -> void:
	unit_data = data.duplicate(true)
	refresh_display()


func refresh_display() -> void:
	_refresh_emoji()
	_refresh_name()
	_refresh_hp_bar()
	_refresh_stars()
	_refresh_items()


func update_hp(new_hp: int) -> void:
	unit_data["hp"] = new_hp
	_refresh_hp_bar()


func get_board_position() -> Vector2i:
	return unit_data.get("board_pos", Vector2i(-1, -1))


# ── Animations ────────────────────────────────────────────────────────────────

func play_attack() -> void:
	if anim_player.has_animation("attack"):
		anim_player.play("attack")
		return
	_tween_scale_punch()


func play_hit() -> void:
	var tween: Tween = create_tween()
	tween.tween_property(self, "modulate", HIT_FLASH_COLOR, TWEEN_HIT_DURATION)
	tween.tween_property(self, "modulate", Color.WHITE, TWEEN_HIT_DURATION)


func play_death() -> void:
	var tween: Tween = create_tween()
	tween.tween_property(self, "scale", Vector2.ZERO, TWEEN_DEATH_DURATION)
	tween.tween_callback(queue_free)


func play_resurrect() -> void:
	scale = Vector2.ZERO
	var tween: Tween = create_tween()
	tween.tween_property(self, "scale", Vector2.ONE, TWEEN_RESURRECT_DURATION)
	tween.parallel().tween_property(self, "modulate", RESURRECT_GOLD_FLASH, TWEEN_RESURRECT_DURATION * 0.5)
	tween.tween_property(self, "modulate", Color.WHITE, TWEEN_RESURRECT_DURATION * 0.5)


# ── Rafraîchissement interne ──────────────────────────────────────────────────

func _refresh_emoji() -> void:
	emoji_label.text = unit_data.get("emoji", "?")


func _refresh_name() -> void:
	name_label.text = unit_data.get("name", "")


func _refresh_hp_bar() -> void:
	var hp: int = unit_data.get("hp", 0)
	var max_hp: int = maxi(unit_data.get("max_hp", 1), 1)
	hp_bar.value = float(hp) / float(max_hp) * 100.0
	hp_bar.modulate = Color.GREEN if hp > max_hp * HP_LOW_THRESHOLD else Color.RED


func _refresh_stars() -> void:
	var star: int = unit_data.get("star", 1)
	star_label.text = "★".repeat(star) if star > 1 else ""


func _refresh_items() -> void:
	var items: Array = unit_data.get("items", [])
	var emojis: Array = items.map(func(i: Dictionary) -> String: return i.get("emoji", ""))
	items_label.text = " ".join(emojis)


# ── Helpers animation ─────────────────────────────────────────────────────────

func _tween_scale_punch() -> void:
	var original_scale: Vector2 = scale
	var tween: Tween = create_tween()
	tween.tween_property(self, "scale", original_scale * ATTACK_SCALE, TWEEN_ATTACK_DURATION)
	tween.tween_property(self, "scale", original_scale, TWEEN_ATTACK_DURATION)
