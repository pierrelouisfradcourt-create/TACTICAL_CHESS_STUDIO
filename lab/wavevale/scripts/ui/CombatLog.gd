extends ScrollContainer
# WAVEVALE — CombatLog

@onready var log_vbox: VBoxContainer = $LogVBox

const MAX_ENTRIES := 50

var _entry_count: int = 0


func _ready() -> void:
	if not has_node("LogVBox"):
		var vbox := VBoxContainer.new()
		vbox.name = "LogVBox"
		add_child(vbox)


func add_entry(msg: String, type: String = "normal") -> void:
	var lbl := Label.new()
	lbl.text = msg
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	match type:
		"kill":
			lbl.add_theme_color_override("font_color", Color(0.9, 0.2, 0.2, 1.0))
		"win":
			lbl.add_theme_color_override("font_color", Color(0.2, 0.9, 0.2, 1.0))
		"loss":
			lbl.add_theme_color_override("font_color", Color(0.9, 0.5, 0.1, 1.0))
		_:
			lbl.add_theme_color_override("font_color", Color(0.7, 0.7, 0.7, 1.0))
	log_vbox.add_child(lbl)
	_entry_count += 1
	if _entry_count > MAX_ENTRIES:
		var oldest: Node = log_vbox.get_child(0)
		if oldest:
			oldest.queue_free()
		_entry_count -= 1
	await get_tree().process_frame
	scroll_vertical = int(get_v_scroll_bar().max_value)
