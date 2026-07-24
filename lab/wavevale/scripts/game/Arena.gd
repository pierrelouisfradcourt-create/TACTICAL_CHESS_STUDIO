extends Control
# WAVEVALE — Arena
# Affichage du board 10×5 et placement des unités

const CELL_SIZE := Vector2(60.0, 60.0)
const BOARD_ROWS := 10
const BOARD_COLS := 5

const COLOR_ALLY_EMPTY := Color(0.1, 0.3, 0.1, 0.6)
const COLOR_ENEMY_EMPTY := Color(0.3, 0.1, 0.1, 0.6)
const COLOR_SELECTED := Color(0.8, 0.8, 0.0, 0.8)

var _selected_unit_pos: Vector2i = Vector2i(-1, -1)
var _selected_bench_idx: int = -1
var _cell_nodes: Array = []
var _unit_labels: Array = []


func _ready() -> void:
	_cell_nodes.resize(BOARD_ROWS * BOARD_COLS)
	_unit_labels.resize(BOARD_ROWS * BOARD_COLS)
	_create_grid()
	custom_minimum_size = Vector2(BOARD_COLS * CELL_SIZE.x, BOARD_ROWS * CELL_SIZE.y)


func _create_grid() -> void:
	for row in range(BOARD_ROWS):
		for col in range(BOARD_COLS):
			var idx: int = row * BOARD_COLS + col
			var cell := Panel.new()
			cell.position = Vector2(col * CELL_SIZE.x, row * CELL_SIZE.y)
			cell.size = CELL_SIZE
			var style := StyleBoxFlat.new()
			style.border_width_left = 1
			style.border_width_top = 1
			style.border_width_right = 1
			style.border_width_bottom = 1
			style.border_color = Color(0.4, 0.4, 0.4, 1.0)
			if row < 5:
				style.bg_color = COLOR_ENEMY_EMPTY
			else:
				style.bg_color = COLOR_ALLY_EMPTY
			cell.add_theme_stylebox_override("panel", style)
			cell.gui_input.connect(_on_cell_input.bind(row, col))
			add_child(cell)
			_cell_nodes[idx] = cell
			var unit_label := Label.new()
			unit_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			unit_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			unit_label.size = CELL_SIZE
			unit_label.add_theme_font_size_override("font_size", 14)
			unit_label.hide()
			cell.add_child(unit_label)
			_unit_labels[idx] = unit_label


func refresh_board() -> void:
	for idx in range(BOARD_ROWS * BOARD_COLS):
		_unit_labels[idx].text = ""
		_unit_labels[idx].hide()
		_reset_cell_color(idx)
	# ally_board[idx] est indexé en coordonnées absolues (rows 0-9).
	# Les unités alliées occupent les indices 25-49 (rows 5-9).
	# L'index dans la grille visuelle est identique à l'index dans ally_board.
	for idx in range(GameManager.ally_board.size()):
		var unit = GameManager.ally_board[idx]
		if unit == null:
			continue
		var cell_idx: int = idx
		if cell_idx < _unit_labels.size():
			_show_unit_in_cell(cell_idx, unit)


func update_combat_display(ally_states: Array, enemy_states: Array) -> void:
	for idx in range(BOARD_ROWS * BOARD_COLS):
		_unit_labels[idx].text = ""
		_unit_labels[idx].hide()
	# CombatEngine stocke les positions en coordonnées absolues (alliés: rows 5-9, ennemis: rows 0-4).
	# row_offset = 0 dans les deux cas car pos.y est déjà absolu.
	_update_side(ally_states, 0)
	_update_side(enemy_states, 0)


func _update_side(states: Array, row_offset: int) -> void:
	for state in states:
		if state == null:
			continue
		var pos = state.get("pos", Vector2i(-1, -1))
		if pos.x < 0 or pos.y < 0:
			continue
		var board_row: int = row_offset + pos.y
		var board_col: int = pos.x
		var cell_idx: int = board_row * BOARD_COLS + board_col
		if cell_idx >= 0 and cell_idx < _unit_labels.size():
			_show_unit_in_cell(cell_idx, state)


func _show_unit_in_cell(cell_idx: int, unit: Dictionary) -> void:
	var lbl: Label = _unit_labels[cell_idx]
	var emoji: String = unit.get("emoji", "?")
	var hp: int = unit.get("hp", 0)
	var max_hp: int = unit.get("max_hp", 1)
	var stars: int = unit.get("star", 1)
	var hp_pct: int = int(float(hp) / float(max_hp) * 100.0)
	var star_str: String = "★".repeat(stars)
	lbl.text = "%s%s\n%d%%" % [emoji, star_str, hp_pct]
	# Couleur HP : vert > 50%, orange > 25%, rouge sinon
	if hp_pct > 50:
		lbl.add_theme_color_override("font_color", Color.WHITE)
	elif hp_pct > 25:
		lbl.add_theme_color_override("font_color", Color(1.0, 0.7, 0.2))
	else:
		lbl.add_theme_color_override("font_color", Color(1.0, 0.3, 0.3))
	lbl.show()


func _reset_cell_color(idx: int) -> void:
	var cell: Panel = _cell_nodes[idx]
	if cell == null:
		return
	@warning_ignore("integer_division")
	var row: int = idx / BOARD_COLS
	var style := cell.get_theme_stylebox("panel") as StyleBoxFlat
	if style == null:
		return
	if row < 5:
		style.bg_color = COLOR_ENEMY_EMPTY
	else:
		style.bg_color = COLOR_ALLY_EMPTY


func _on_cell_input(event: InputEvent, row: int, col: int) -> void:
	if GameManager.phase != "prep":
		return
	if not (event is InputEventMouseButton):
		return
	var mbe := event as InputEventMouseButton
	if not (mbe.pressed and mbe.button_index == MOUSE_BUTTON_LEFT):
		return
	if row < 5:
		return
	# board_idx doit être l'index absolu dans ally_board (rows 5-9 → indices 25-49)
	var board_idx: int = row * BOARD_COLS + col
	_handle_ally_cell_click(board_idx, row, col)


func _handle_ally_cell_click(board_idx: int, row: int, col: int) -> void:
	var unit = GameManager.ally_board[board_idx] if board_idx < GameManager.ally_board.size() else null
	if _selected_unit_pos != Vector2i(-1, -1):
		var from_row: int = _selected_unit_pos.y
		var from_col: int = _selected_unit_pos.x
		GameManager.move_unit_on_board(from_row, from_col, row, col)
		_deselect_all()
		refresh_board()
	elif _selected_bench_idx >= 0:
		GameManager.place_unit_from_bench(_selected_bench_idx, row, col)
		_selected_bench_idx = -1
		_deselect_all()
		refresh_board()
	elif unit != null:
		_selected_unit_pos = Vector2i(col, row)
		_highlight_cell(row * BOARD_COLS + col)


func _highlight_cell(cell_idx: int) -> void:
	_deselect_all()
	var cell: Panel = _cell_nodes[cell_idx]
	if cell == null:
		return
	var style := cell.get_theme_stylebox("panel") as StyleBoxFlat
	if style:
		style.bg_color = COLOR_SELECTED


func _deselect_all() -> void:
	_selected_unit_pos = Vector2i(-1, -1)
	for idx in range(_cell_nodes.size()):
		_reset_cell_color(idx)


func select_from_bench(bench_idx: int) -> void:
	_selected_bench_idx = bench_idx
	_selected_unit_pos = Vector2i(-1, -1)
