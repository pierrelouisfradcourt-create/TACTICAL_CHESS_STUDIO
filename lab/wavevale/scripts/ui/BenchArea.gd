extends HBoxContainer
# WAVEVALE — BenchArea

const BENCH_SIZE := 7

var _slot_panels: Array = []
var _slot_labels: Array = []

signal bench_unit_selected(idx: int)


func _ready() -> void:
	_create_slots()
	if GameManager.has_signal("bench_changed"):
		GameManager.bench_changed.connect(_on_bench_changed)


func _create_slots() -> void:
	for i in range(BENCH_SIZE):
		var panel := Panel.new()
		panel.custom_minimum_size = Vector2(110, 72)
		var style := StyleBoxFlat.new()
		style.bg_color = Color(0.15, 0.15, 0.2, 0.9)
		style.border_width_left = 2
		style.border_width_top = 2
		style.border_width_right = 2
		style.border_width_bottom = 2
		style.border_color = Color(0.4, 0.4, 0.5, 1.0)
		panel.add_theme_stylebox_override("panel", style)
		var lbl := Label.new()
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		lbl.size = Vector2(110, 72)
		lbl.add_theme_font_size_override("font_size", 22)
		panel.add_child(lbl)
		panel.gui_input.connect(_on_slot_input.bind(i))
		add_child(panel)
		_slot_panels.append(panel)
		_slot_labels.append(lbl)


func refresh() -> void:
	for i in range(BENCH_SIZE):
		var unit = null
		if i < GameManager.bench.size():
			unit = GameManager.bench[i]
		if unit == null:
			_slot_labels[i].text = ""
			_reset_slot_style(i)
		else:
			var emoji: String = unit.get("emoji", "?")
			var stars: int = unit.get("star", 1)
			var atk: int = unit.get("atk", 0)
			var hp: int = unit.get("hp", 0)
			_slot_labels[i].text = "%s%s\n⚔%d ❤%d" % [emoji, "★".repeat(stars), atk, hp]


func _reset_slot_style(idx: int) -> void:
	var style := _slot_panels[idx].get_theme_stylebox("panel") as StyleBoxFlat
	if style:
		style.bg_color = Color(0.15, 0.15, 0.2, 0.9)
		style.border_color = Color(0.4, 0.4, 0.5, 1.0)


func _on_bench_changed(_bench: Array) -> void:
	refresh()


func _on_slot_input(event: InputEvent, idx: int) -> void:
	if not (event is InputEventMouseButton):
		return
	var mbe := event as InputEventMouseButton
	if not (mbe.pressed and mbe.button_index == MOUSE_BUTTON_LEFT):
		return
	if idx >= GameManager.bench.size():
		return
	if GameManager.bench[idx] == null:
		return
	_highlight_slot(idx)
	bench_unit_selected.emit(idx)


func _highlight_slot(idx: int) -> void:
	for i in range(_slot_panels.size()):
		_reset_slot_style(i)
	var style := _slot_panels[idx].get_theme_stylebox("panel") as StyleBoxFlat
	if style:
		style.bg_color = Color(0.5, 0.5, 0.0, 0.9)
		style.border_color = Color(1.0, 1.0, 0.0, 1.0)
