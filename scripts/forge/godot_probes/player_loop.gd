extends SceneTree
# player_loop — sonde Forge HORS projet (bot-joueur GENERIQUE, lancee `--path <jeu>
# --script <chemin absolu>` en fenetre GPU, meme patron que runtime_alive.gd).
# Rejoue la sequence de `res://03_WORLD/loop.json` (projection DETERMINISTE du
# Prisme, jamais une source de verite en elle-meme — decision Pierre 2026-08-22)
# avec les SEULES entrees d'un joueur : InputEvent sur des affordances (groupe
# "affordance") + lecture de Label (groupe "hud"). PAUVRE ET GENERIQUE : cette
# sonde n'a AUCUNE connaissance d'un jeu particulier : aucun appel a l'economie
# interne, aucune API systeme, aucun script de regles (garde anti-contournement V4,
# non negociable).
#
# KC_LOOP_JSON_OVERRIDE (variable d'environnement) : UNIQUEMENT pour les tests —
# permet de pointer un loop.json temporaire hors du jeu, sans jamais ecrire sous
# games/**. En production la sonde lit strictement res://03_WORLD/loop.json.

const SETTLE_FRAMES := 60
const DEFAULT_WAIT_FRAMES := 30
const FRAMES_BETWEEN_CLICKS := 2

var _num_re := RegEx.new()
var _frames := 0
var _steps: Array = []
var _step_idx := 0
var _phase := "settle"          # settle -> before -> inject -> wait -> done
var _click_count := 0
var _click_target := 0
var _click_subframe := 0
var _wait_elapsed := 0
var _before_text := ""
var _cur_affordance: Node = null
var _results: Array = []
var _fails: Array[String] = []
var _reached_role := "NONE"


func _init() -> void:
	_num_re.compile("[-+]?\\d+(?:[.,]\\d+)?")

	var scene_path: String = ProjectSettings.get_setting("run/main_scene", "res://main.tscn")
	var packed = load(scene_path)
	if packed == null or not (packed is PackedScene):
		_fails.append("scene principale introuvable : %s" % scene_path)
		_emit(); return
	var inst: Node = packed.instantiate()
	get_root().add_child(inst)

	var text := _read_loop_json()
	if text == "":
		_fails.append("loop.json absent du jeu")
		_emit(); return

	var parsed = JSON.parse_string(text)
	if not (parsed is Dictionary) or not (parsed.get("steps") is Array) or (parsed["steps"] as Array).is_empty():
		_fails.append("loop.json illisible/mal forme")
		_emit(); return
	_steps = parsed["steps"]


func _read_loop_json() -> String:
	# Test seulement : une variable d'environnement pointe un loop.json temporaire
	# hors de games/** (jamais lue en production — la sonde reste generique).
	var override := OS.get_environment("KC_LOOP_JSON_OVERRIDE")
	var path := override if override != "" else "res://03_WORLD/loop.json"
	if not FileAccess.file_exists(path):
		return ""
	return FileAccess.get_file_as_string(path)


func _process(_delta: float) -> bool:
	_frames += 1

	if _phase == "settle":
		if _frames >= SETTLE_FRAMES:
			_phase = "before"
		return false

	if _phase == "done":
		return false

	if _step_idx >= _steps.size():
		_phase = "done"
		_emit()
		return false

	var step = _steps[_step_idx]
	if typeof(step) != TYPE_DICTIONARY:
		_fail_current("step #%d n'est pas un objet" % _step_idx, {})
		return false

	if _phase == "before":
		_do_before(step)
		return false
	if _phase == "inject":
		_do_inject(step)
		return false
	if _phase == "wait":
		_do_wait(step)
		return false
	return false


func _do_before(step: Dictionary) -> void:
	var observe = step.get("observe", {})
	var hud_name := String(observe.get("hud", "")) if typeof(observe) == TYPE_DICTIONARY else ""
	var label := _find_hud(hud_name)
	if label == null:
		_fail_current("hud '%s' introuvable" % hud_name, step)
		return
	_before_text = label.text

	var affordance_name := String(step.get("affordance", ""))
	if affordance_name != "":
		var node := _find_affordance(affordance_name)
		if node == null:
			_fail_current("affordance '%s' introuvable" % affordance_name, step)
			return
		if not (node is Control):
			_fail_current("affordance '%s' n'est pas un Control" % affordance_name, step)
			return
		_cur_affordance = node
		_click_target = maxi(1, int(step.get("repeat", 1)))
		_click_count = 0
		_click_subframe = 0
		_phase = "inject"
	else:
		_cur_affordance = null
		_wait_elapsed = 0
		_phase = "wait"


func _do_inject(step: Dictionary) -> void:
	if _click_subframe == 0:
		_click(_cur_affordance)
		_click_count += 1
	_click_subframe += 1
	if _click_subframe >= FRAMES_BETWEEN_CLICKS:
		_click_subframe = 0
		if _click_count >= _click_target:
			_wait_elapsed = 0
			_phase = "wait"


func _do_wait(step: Dictionary) -> void:
	_wait_elapsed += 1
	var target := int(step.get("wait_frames", DEFAULT_WAIT_FRAMES))
	if target <= 0:
		target = DEFAULT_WAIT_FRAMES
	if _wait_elapsed >= target:
		_evaluate(step)


func _click(node: Control) -> void:
	var center: Vector2 = node.get_global_rect().get_center()
	var press := InputEventMouseButton.new()
	press.button_index = MOUSE_BUTTON_LEFT
	press.pressed = true
	press.position = center
	var release := InputEventMouseButton.new()
	release.button_index = MOUSE_BUTTON_LEFT
	release.pressed = false
	release.position = center
	Input.parse_input_event(press)
	Input.parse_input_event(release)


func _find_hud(name: String) -> Label:
	if name == "":
		return null
	for n in get_nodes_in_group("hud"):
		if n is Label and n.name == name:
			return n
	return null


func _find_affordance(name: String) -> Node:
	if name == "":
		return null
	for n in get_nodes_in_group("affordance"):
		if n.name == name:
			return n
	return null


func _evaluate(step: Dictionary) -> void:
	var observe = step.get("observe", {})
	var hud_name := String(observe.get("hud", "")) if typeof(observe) == TYPE_DICTIONARY else ""
	var predicate := String(observe.get("predicate", "")) if typeof(observe) == TYPE_DICTIONARY else ""
	var label := _find_hud(hud_name)
	var after_text := label.text if label != null else ""
	var role := String(step.get("role", ""))
	var passed := _eval_predicate(predicate, _before_text, after_text)

	_results.append({
		"role": role, "ref": String(step.get("ref", "")),
		"affordance": String(step.get("affordance", "")),
		"before": _before_text, "after": after_text, "pass": passed,
		"reason": ("" if passed else
			"predicat '%s' non satisfait (avant='%s' apres='%s')" % [predicate, _before_text, after_text]),
	})

	if not passed:
		_fails.append("step %s (%s) : predicat '%s' non satisfait" %
			[String(step.get("ref", "")), role, predicate])
		_phase = "done"
		_emit()
		return

	_reached_role = role
	_step_idx += 1
	_phase = "before"


func _fail_current(reason: String, step) -> void:
	var role := String(step.get("role", "")) if typeof(step) == TYPE_DICTIONARY else ""
	var ref := String(step.get("ref", "")) if typeof(step) == TYPE_DICTIONARY else ""
	var affordance := String(step.get("affordance", "")) if typeof(step) == TYPE_DICTIONARY else ""
	_results.append({
		"role": role, "ref": ref, "affordance": affordance,
		"before": _before_text, "after": "", "pass": false, "reason": reason,
	})
	_fails.append(reason)
	_phase = "done"
	_emit()


func _eval_predicate(predicate: String, before: String, after: String) -> bool:
	if predicate == "nonempty":
		return after.strip_edges() != ""
	if predicate == "increases":
		var b := _extract_number(after)
		if is_nan(b):
			return false
		var a := _extract_number(before)
		if is_nan(a):
			a = 0.0
		return b > a
	if predicate == "changes":
		return after != before
	if predicate.begins_with("contains:"):
		var txt := predicate.substr("contains:".length())
		return after.find(txt) != -1
	return false


func _extract_number(s: String) -> float:
	var m := _num_re.search(s)
	if m == null:
		return NAN
	return m.get_string().replace(",", ".").to_float()


func _emit() -> void:
	var ok: bool = _fails.is_empty()
	var data := {"steps": _results, "reached_role": _reached_role, "frames": _frames}
	print("FORGE_ORACLE player_loop " + JSON.stringify({"ok": ok, "fails": _fails, "data": data}))
	quit(0 if ok else 1)
