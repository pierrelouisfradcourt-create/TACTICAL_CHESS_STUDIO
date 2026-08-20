extends Node
# WAVEVALE — Main
# Coordinateur : gère les transitions d'écrans et branche les signaux

@onready var title_screen: Control = $TitleScreen
@onready var game_screen: Control = $GameScreen
@onready var game_over_screen: Control = $GameOverScreen
@onready var victory_screen: Control = $VictoryScreen
@onready var arena: Control = $GameScreen/Arena
@onready var top_bar: Control = $GameScreen/TopBar
@onready var shop_panel: Control = $GameScreen/ShopPanel
@onready var bench_area: Control = $GameScreen/BenchArea
@onready var synergy_panel: Control = $GameScreen/SynergyPanel
@onready var item_panel: Control = $GameScreen/ItemPanel
@onready var combat_log: Control = $GameScreen/CombatLog
@onready var combat_engine: Node = $CombatEngine
@onready var synergy_manager: Node = $SynergyManager
@onready var phase_banner: Label = $GameScreen/PhaseBanner
@onready var fight_btn: Button = $GameScreen/TopBar/FightButton
@onready var round_result: Control = $RoundResult


func _ready() -> void:
	# ── Boutons title screen ──
	var begin_btn := get_node_or_null("TitleScreen/CenterContainer/VBox/BeginButton")
	if begin_btn:
		begin_btn.pressed.connect(_on_start_game_pressed)

	# ── Bouton FIGHT ──
	if fight_btn:
		fight_btn.pressed.connect(_on_fight_pressed)

	# ── Bouton CONTINUE (RoundResult) ──
	var continue_btn := get_node_or_null("RoundResult/VBox/ContinueButton")
	if continue_btn:
		continue_btn.pressed.connect(_on_continue_pressed)

	# ── Boutons Play Again ──
	var gameover_btn := get_node_or_null("GameOverScreen/CenterContainer/VBox/PlayAgainButton")
	if gameover_btn:
		gameover_btn.pressed.connect(_on_start_game_pressed)
	var victory_btn := get_node_or_null("VictoryScreen/CenterContainer/VBox/PlayAgainButton")
	if victory_btn:
		victory_btn.pressed.connect(_on_start_game_pressed)

	# ── Signaux GameManager ──
	GameManager.phase_changed.connect(_on_phase_changed)
	GameManager.gold_changed.connect(_on_gold_changed)
	GameManager.hp_changed.connect(_on_hp_changed)
	GameManager.wave_changed.connect(_on_wave_changed)
	GameManager.level_changed.connect(_on_level_changed)
	GameManager.combat_result.connect(_on_combat_result)
	GameManager.items_dropped.connect(_on_items_dropped)
	combat_engine.combat_ended.connect(_on_combat_ended)
	combat_engine.tick_completed.connect(_on_tick_completed)
	combat_engine.inject_synergy_manager(synergy_manager)
	# ── Connexion bench → arena ──
	bench_area.bench_unit_selected.connect(arena.select_from_bench)
	show_screen("title")


func show_screen(screen_name: String) -> void:
	title_screen.hide()
	game_screen.hide()
	game_over_screen.hide()
	victory_screen.hide()
	match screen_name:
		"title":
			title_screen.show()
		"game":
			game_screen.show()
		"game_over":
			game_over_screen.show()
		"victory":
			victory_screen.show()


func _on_start_game_pressed() -> void:
	GameManager.start_game()
	show_screen("game")
	arena.refresh_board()
	bench_area.refresh()


func _on_fight_pressed() -> void:
	if GameManager.phase != "prep":
		return
	if GameManager.board_unit_count() == 0:
		return
	GameManager.phase = "combat"
	GameManager.phase_changed.emit("combat")
	fight_btn.disabled = true
	var synergies: Dictionary = synergy_manager.compute_active_synergies(GameManager.ally_board)
	var enemy_wave: Array = WaveData.get_wave(GameManager.wave)
	var enemy_board: Array = _build_enemy_board(enemy_wave)
	combat_engine.start_combat(GameManager.ally_board, enemy_board, synergies)


func _on_combat_ended(result: Dictionary) -> void:
	fight_btn.disabled = false
	GameManager.phase = "result"
	GameManager.resurrect_dead_units(result.get("ally_dead", []))
	GameManager.award_post_combat(
		result.get("won", false),
		result.get("surviving_enemies", []),
		result.get("kills", 0)
	)
	GameManager.apply_post_combat_heal()
	round_result.show()
	if result.get("won", false):
		log_message("✅ Vague effacée!")
	else:
		log_message("❌ Défaite — dégâts reçus")


func _on_continue_pressed() -> void:
	round_result.hide()
	if GameManager.is_game_over():
		show_screen("game_over")
	elif GameManager.wave >= 15:
		show_screen("victory")
	else:
		GameManager.next_wave()
		arena.refresh_board()


func _on_tick_completed(ally_states: Array, enemy_states: Array) -> void:
	arena.update_combat_display(ally_states, enemy_states)


func _on_phase_changed(new_phase: String) -> void:
	match new_phase:
		"prep":
			phase_banner.text = "— PRÉPARATION —"
		"combat":
			phase_banner.text = "⚔ COMBAT ⚔"
		"result":
			phase_banner.text = "— RÉSULTAT —"


func _on_gold_changed(_gold: int) -> void:
	pass


func _on_hp_changed(_hp: int) -> void:
	pass


func _on_wave_changed(_wave: int) -> void:
	pass


func _on_level_changed(_level: int) -> void:
	pass


func _on_combat_result(won: bool, damage: int, gold_earned: int) -> void:
	var msg := "Résultat : "
	msg += "Victoire" if won else "Défaite"
	msg += " | Dégâts : %d | Or gagné : %d" % [damage, gold_earned]
	log_message(msg)


func _on_items_dropped(items: Array) -> void:
	item_panel.show_items(items)


func log_message(msg: String) -> void:
	combat_log.add_entry(msg)


func _build_enemy_board(wave_units: Array) -> Array:
	var board: Array = []
	board.resize(50)
	for i in range(50):
		board[i] = null
	var available_positions: Array = []
	for row in range(5):
		for col in range(5):
			available_positions.append(row * 5 + col)
	available_positions.shuffle()
	var place_count: int = mini(wave_units.size(), available_positions.size())
	for i in range(place_count):
		var unit_def: Dictionary = wave_units[i]
		var idx: int = available_positions[i]
		board[idx] = {
			"uid": unit_def.get("uid", "enemy_%d" % i),
			"hp": unit_def.get("max_hp", 100),
			"max_hp": unit_def.get("max_hp", 100),
			"atk": unit_def.get("atk", 20),
			"range": unit_def.get("range", 1),
			"_armor": unit_def.get("armor", 0),
			"speed": unit_def.get("speed", 1.0),
			"items": unit_def.get("items", []),
			"traits": unit_def.get("traits", []),
			"emoji": unit_def.get("emoji", "👾"),
			"star": unit_def.get("star", 1),
		}
	return board
