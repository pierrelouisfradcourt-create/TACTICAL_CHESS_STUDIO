extends VBoxContainer
# WAVEVALE — SynergyPanel

@onready var title_label: Label = $TitleLabel


func _ready() -> void:
	if not has_node("TitleLabel"):
		var lbl := Label.new()
		lbl.name = "TitleLabel"
		lbl.text = "— SYNERGIES —"
		add_child(lbl)


func refresh(synergies: Dictionary) -> void:
	for child in get_children():
		if child == title_label:
			continue
		child.queue_free()
	for trait_key in synergies.keys():
		var info: Dictionary = synergies[trait_key]
		if info.get("level", 0) <= 0:
			continue
		var row := _create_trait_row(trait_key, info)
		add_child(row)


func _create_trait_row(trait_key: String, info: Dictionary) -> Control:
	var hbox := HBoxContainer.new()
	var dot := Panel.new()
	dot.custom_minimum_size = Vector2(16, 16)
	var style := StyleBoxFlat.new()
	var trait_def: Dictionary = {}
	if TraitData.TRAITS.has(trait_key):
		trait_def = TraitData.TRAITS[trait_key]
	var dot_color: Color = trait_def.get("dot", Color(0.5, 0.5, 0.5, 1.0))
	style.bg_color = dot_color
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	dot.add_theme_stylebox_override("panel", style)
	hbox.add_child(dot)
	var name_lbl := Label.new()
	var display_name: String = trait_def.get("name", trait_key)
	name_lbl.text = display_name
	name_lbl.custom_minimum_size = Vector2(80, 0)
	hbox.add_child(name_lbl)
	var count_lbl := Label.new()
	var count: int = info.get("count", 0)
	var thresholds: Array = trait_def.get("thresholds", [2])
	var threshold: int = thresholds[0] if not thresholds.is_empty() else 2
	count_lbl.text = "(%d/%d)" % [count, threshold]
	hbox.add_child(count_lbl)
	var bonus_lbl := Label.new()
	bonus_lbl.text = trait_def.get("desc", "")
	bonus_lbl.add_theme_color_override("font_color", Color(0.8, 0.8, 0.6, 1.0))
	hbox.add_child(bonus_lbl)
	return hbox
