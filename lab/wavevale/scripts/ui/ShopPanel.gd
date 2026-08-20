extends PanelContainer
# WAVEVALE — ShopPanel

const SHOP_SIZE := 5

var _unit_buttons: Array = []

@onready var slots_hbox: HBoxContainer = $MarginContainer/VBox/SlotsHBox
@onready var cost_label: Label = $MarginContainer/VBox/CostLabel


func _ready() -> void:
	_create_slots()
	if GameManager.has_signal("shop_refreshed"):
		GameManager.shop_refreshed.connect(_on_shop_refreshed)
	GameManager.gold_changed.connect(_on_gold_changed)


func _create_slots() -> void:
	for i in range(SHOP_SIZE):
		var btn := Button.new()
		btn.custom_minimum_size = Vector2(100, 100)
		btn.pressed.connect(_on_slot_pressed.bind(i))
		slots_hbox.add_child(btn)
		_unit_buttons.append(btn)


func refresh(shop_units: Array) -> void:
	for i in range(SHOP_SIZE):
		if i >= _unit_buttons.size():
			break
		if i >= shop_units.size() or shop_units[i] == null:
			_unit_buttons[i].text = "—"
			_unit_buttons[i].disabled = true
		else:
			var unit: Dictionary = shop_units[i]
			var cost: int = unit.get("cost", 1)
			var emoji: String = unit.get("emoji", "?")
			var name_str: String = unit.get("name", "?")
			_unit_buttons[i].text = "%s\n%s\n🪙%d" % [emoji, name_str, cost]
			_unit_buttons[i].disabled = GameManager.gold < cost


func _on_shop_refreshed() -> void:
	refresh(GameManager.get_shop())


func _on_gold_changed(gold: int) -> void:
	if GameManager.has_method("get_shop"):
		refresh(GameManager.get_shop())


func _on_slot_pressed(idx: int) -> void:
	GameManager.buy_unit(idx)
