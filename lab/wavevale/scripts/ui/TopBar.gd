extends HBoxContainer
# WAVEVALE — TopBar

@onready var hp_label: Label = $HPContainer/HPLabel
@onready var wave_label: Label = $WaveContainer/WaveLabel
@onready var gold_label: Label = $GoldContainer/GoldLabel
@onready var level_label: Label = $LevelContainer/LevelLabel
@onready var xp_bar: ProgressBar = $XPSection/XPBar
@onready var xp_label: Label = $XPSection/XPLabel
@onready var fight_btn: Button = $FightButton
@onready var reroll_btn: Button = $RerollButton
@onready var freeze_btn: Button = $FreezeButton
@onready var sell_btn: Button = $SellButton
@onready var buy_xp_btn: Button = $BuyXPButton

var _selected_source: String = ""
var _selected_index: int = -1


func _ready() -> void:
	GameManager.gold_changed.connect(_on_gold_changed)
	GameManager.hp_changed.connect(_on_hp_changed)
	GameManager.wave_changed.connect(_on_wave_changed)
	GameManager.level_changed.connect(_on_level_changed)
	GameManager.phase_changed.connect(_on_phase_changed)
	reroll_btn.pressed.connect(_on_reroll_pressed)
	freeze_btn.pressed.connect(_on_freeze_pressed)
	sell_btn.pressed.connect(_on_sell_pressed)
	buy_xp_btn.pressed.connect(_on_buy_xp_pressed)
	refresh_all()


func refresh_all() -> void:
	_update_hp(GameManager.hp)
	_update_wave(GameManager.wave)
	_update_gold(GameManager.gold)
	_update_level(GameManager.level, GameManager.xp, GameManager.xp_needed)


func _update_hp(hp: int) -> void:
	hp_label.text = "❤ %d" % hp


func _update_wave(wave: int) -> void:
	wave_label.text = "Vague %d / 15" % wave


func _update_gold(gold: int) -> void:
	gold_label.text = "🪙 %d" % gold


func _update_level(level: int, xp: int, xp_to_next: int) -> void:
	level_label.text = "Niv. %d" % level
	xp_bar.max_value = xp_to_next
	xp_bar.value = xp
	xp_label.text = "%d / %d XP" % [xp, xp_to_next]


func _on_gold_changed(gold: int) -> void:
	_update_gold(gold)


func _on_hp_changed(hp: int) -> void:
	_update_hp(hp)


func _on_wave_changed(wave: int) -> void:
	_update_wave(wave)


func _on_level_changed(_level: int) -> void:
	_update_level(GameManager.level, GameManager.xp, GameManager.xp_needed)


func _on_phase_changed(phase: String) -> void:
	var in_prep := phase == "prep"
	reroll_btn.disabled = not in_prep
	freeze_btn.disabled = not in_prep
	sell_btn.disabled = not in_prep
	buy_xp_btn.disabled = not in_prep


func _on_reroll_pressed() -> void:
	GameManager.reroll_shop()


func _on_freeze_pressed() -> void:
	GameManager.toggle_freeze()
	freeze_btn.text = "❄ Figé" if GameManager.shop_frozen else "❄ Geler"


func _on_sell_pressed() -> void:
	if _selected_source.is_empty() or _selected_index < 0:
		return
	GameManager.sell_unit(_selected_source, _selected_index)
	_selected_source = ""
	_selected_index = -1


func _on_buy_xp_pressed() -> void:
	GameManager.buy_xp()


func set_selection(source: String, index: int) -> void:
	_selected_source = source
	_selected_index = index
