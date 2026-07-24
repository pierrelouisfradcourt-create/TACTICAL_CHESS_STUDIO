extends PanelContainer
# WAVEVALE — ItemPanel

var _pending_item: Dictionary = {}
var _item_buttons: Array = []

@onready var items_hbox: HBoxContainer = $MarginContainer/VBox/ItemsHBox
@onready var title_label: Label = $MarginContainer/VBox/TitleLabel


func _ready() -> void:
	hide()


func show_items(items: Array) -> void:
	_clear_buttons()
	if items.is_empty():
		hide()
		return
	for item in items:
		_add_item_button(item)
	show()


func _add_item_button(item: Dictionary) -> void:
	var btn := Button.new()
	btn.text = "%s %s" % [item.get("emoji", "📦"), item.get("name", "?")]
	btn.tooltip_text = item.get("desc", "")
	btn.pressed.connect(_on_item_selected.bind(item))
	items_hbox.add_child(btn)
	_item_buttons.append(btn)


func _on_item_selected(item: Dictionary) -> void:
	_pending_item = item
	for btn in _item_buttons:
		btn.modulate = Color(0.5, 0.5, 0.5, 1.0)


func equip_to_unit(unit: Dictionary) -> void:
	if _pending_item.is_empty() or unit.is_empty():
		return
	GameManager.equip_item(_pending_item, unit)
	_pending_item = {}
	hide()


func _clear_buttons() -> void:
	for btn in _item_buttons:
		btn.queue_free()
	_item_buttons.clear()
