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
# Predicats supportes (observe.predicate) : nonempty | increases | changes |
# contains:<txt> | new_distinct | decreases | resets | increases_more_than:<ref>.
# En plus, observe.appears:<group> exige que get_nodes_in_group(<group>).size()
# strictement augmente entre avant et apres (nouvel element du groupe "affordance"
# ou "hud" — toujours un groupe generique, jamais un nom de noeud du jeu).
# role REPEAT porte `replay: [refs]` : rejoue, dans l'ordre, les steps B..F deja
# definis plus haut dans `loop.json` (identifies par leur `ref`), sans jamais
# reconnaitre le jeu — seule la structure loop.json est lue.
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
var _run_queue: Array = []      # taches aplaties (normal | replay_item | replay_end)
var _step_idx := 0
var _phase := "settle"          # settle -> before -> inject -> wait -> done
var _click_count := 0
var _click_target := 0
var _click_subframe := 0
var _wait_elapsed := 0
var _before_text := ""
var _cur_affordance: Node = null
var _appears_group := ""
var _appears_before := -1
var _results: Array = []
var _fails: Array[String] = []
var _reached_role := "NONE"

var _seen: Dictionary = {}      # hud -> Array[String] : toutes les valeurs before/after vues
var _initial: Dictionary = {}   # hud -> String : premiere valeur jamais vue sur ce hud
var _deltas: Dictionary = {}    # ref (ou "<ref>@replay") -> float : delta after-before du dernier PASS
var _replay_acc: Dictionary = {}  # parent_ref (REPEAT) -> Array de {ref, pass, before, after}


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
	_build_run_queue()


func _read_loop_json() -> String:
	# Test seulement : une variable d'environnement pointe un loop.json temporaire
	# hors de games/** (jamais lue en production — la sonde reste generique).
	var override := OS.get_environment("KC_LOOP_JSON_OVERRIDE")
	var path := override if override != "" else "res://03_WORLD/loop.json"
	if not FileAccess.file_exists(path):
		return ""
	return FileAccess.get_file_as_string(path)


# Aplatit `_steps` en une file d'execution lineaire : un step REPEAT devient N
# taches "replay_item" (une par ref rejouee, config recopiee du step d'origine
# identifie par son `ref`) suivies d'une tache "replay_end" qui agrege le resultat.
# Les refs REPEAT doivent pointer un step deja rencontre plus haut dans `_steps`
# (role B..F) — resolu ici par un dictionnaire construit en un seul passage avant.
func _build_run_queue() -> void:
	var by_ref := {}
	for step in _steps:
		if typeof(step) != TYPE_DICTIONARY:
			_run_queue.append({"task_kind": "normal", "orig_step": step})
			continue
		var role := String(step.get("role", ""))
		if role == "REPEAT":
			var parent_ref := String(step.get("ref", ""))
			var replay_refs: Array = step.get("replay", []) if step.get("replay") is Array else []
			for r in replay_refs:
				var rr := String(r)
				_run_queue.append({
					"task_kind": "replay_item", "parent_ref": parent_ref,
					"orig_ref": rr, "orig_step": by_ref.get(rr),
				})
			_run_queue.append({"task_kind": "replay_end", "parent_ref": parent_ref, "orig_step": step})
		else:
			_run_queue.append({"task_kind": "normal", "orig_step": step})
			var ref := String(step.get("ref", ""))
			if ref != "":
				by_ref[ref] = step


func _process(_delta: float) -> bool:
	_frames += 1

	if _phase == "settle":
		if _frames >= SETTLE_FRAMES:
			_phase = "before"
		return false

	if _phase == "done":
		return false

	if _step_idx >= _run_queue.size():
		_phase = "done"
		_emit()
		return false

	var task: Dictionary = _run_queue[_step_idx]
	var kind := String(task.get("task_kind", ""))

	if kind == "replay_end":
		_do_replay_end(task)
		return false

	var step = task.get("orig_step")
	if typeof(step) != TYPE_DICTIONARY:
		var reason := ("replay ref '%s' introuvable" % String(task.get("orig_ref", "")) if kind == "replay_item"
			else "step #%d n'est pas un objet" % _step_idx)
		_fail_current_task(task, reason)
		return false

	if _phase == "before":
		_do_before(step, task)
		return false
	if _phase == "inject":
		_do_inject(step)
		return false
	if _phase == "wait":
		_do_wait(step, task)
		return false
	return false


func _do_before(step: Dictionary, task: Dictionary) -> void:
	var observe = step.get("observe", {})
	var hud_name := String(observe.get("hud", "")) if typeof(observe) == TYPE_DICTIONARY else ""
	var label := _find_hud(hud_name)
	if label == null:
		_fail_current_task(task, "hud '%s' introuvable" % hud_name)
		return
	_before_text = label.text

	_appears_group = String(observe.get("appears", "")) if typeof(observe) == TYPE_DICTIONARY else ""
	_appears_before = get_nodes_in_group(_appears_group).size() if _appears_group != "" else -1

	var affordance_name := String(step.get("affordance", ""))
	if affordance_name != "":
		var node := _find_affordance(affordance_name)
		if node == null:
			_fail_current_task(task, "affordance '%s' introuvable" % affordance_name)
			return
		if not (node is Control):
			_fail_current_task(task, "affordance '%s' n'est pas un Control" % affordance_name)
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


func _do_wait(step: Dictionary, task: Dictionary) -> void:
	_wait_elapsed += 1
	var target := int(step.get("wait_frames", DEFAULT_WAIT_FRAMES))
	if target <= 0:
		target = DEFAULT_WAIT_FRAMES
	if _wait_elapsed >= target:
		_evaluate(step, task)


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


func _evaluate(step: Dictionary, task: Dictionary) -> void:
	var observe = step.get("observe", {})
	var hud_name := String(observe.get("hud", "")) if typeof(observe) == TYPE_DICTIONARY else ""
	var predicate := String(observe.get("predicate", "")) if typeof(observe) == TYPE_DICTIONARY else ""
	var label := _find_hud(hud_name)
	var after_text := label.text if label != null else ""
	var role := String(step.get("role", ""))
	var ref := String(step.get("ref", ""))

	if hud_name != "" and not _initial.has(hud_name):
		_initial[hud_name] = _before_text

	var predicate_pass := _eval_predicate(predicate, hud_name, _before_text, after_text)

	var appears_after := -1
	var appears_pass := true
	if _appears_group != "":
		appears_after = get_nodes_in_group(_appears_group).size()
		appears_pass = appears_after > _appears_before

	var passed: bool = predicate_pass and appears_pass

	var reason := ""
	if not passed:
		if not predicate_pass:
			reason = _predicate_fail_reason(predicate, _before_text, after_text)
		else:
			reason = "appears '%s' : %d -> %d, aucun nouvel element" % [_appears_group, _appears_before, appears_after]

	if hud_name != "":
		var seen_list: Array = _seen.get(hud_name, [])
		if not seen_list.has(_before_text):
			seen_list.append(_before_text)
		if not seen_list.has(after_text):
			seen_list.append(after_text)
		_seen[hud_name] = seen_list

	var kind := String(task.get("task_kind", ""))
	var delta_key := (String(task.get("orig_ref", "")) + "@replay") if kind == "replay_item" else ref
	if passed:
		var bnum := _extract_number(_before_text)
		var anum := _extract_number(after_text)
		if not is_nan(bnum) and not is_nan(anum):
			_deltas[delta_key] = anum - bnum

	if kind == "replay_item":
		var entry := {"ref": String(task.get("orig_ref", "")), "pass": passed,
			"before": _before_text, "after": after_text}
		if reason != "":
			entry["reason"] = reason
		var parent_ref := String(task.get("parent_ref", ""))
		var acc: Array = _replay_acc.get(parent_ref, [])
		acc.append(entry)
		_replay_acc[parent_ref] = acc
		_advance_task()
		return

	var result := {
		"role": role, "ref": ref, "affordance": String(step.get("affordance", "")),
		"before": _before_text, "after": after_text, "pass": passed, "reason": reason,
	}
	if _appears_group != "":
		result["appears_before"] = _appears_before
		result["appears_after"] = appears_after
	_results.append(result)

	if not passed:
		_fails.append("step %s (%s) : %s" % [ref, role, reason])
		_phase = "done"
		_emit()
		return

	_reached_role = role
	_advance_task()


func _do_replay_end(task: Dictionary) -> void:
	var parent_ref := String(task.get("parent_ref", ""))
	var orig_step = task.get("orig_step", {})
	var role := String(orig_step.get("role", "REPEAT")) if typeof(orig_step) == TYPE_DICTIONARY else "REPEAT"
	var replays: Array = _replay_acc.get(parent_ref, [])
	var all_pass := not replays.is_empty()
	var failed_refs: Array[String] = []
	for r in replays:
		if not bool(r.get("pass", false)):
			all_pass = false
			failed_refs.append(String(r.get("ref", "")))

	var reason := ""
	if replays.is_empty():
		reason = "replay vide"
	elif not all_pass:
		reason = "replay(s) en echec : %s" % ", ".join(failed_refs)

	_results.append({
		"role": role, "ref": parent_ref, "affordance": "",
		"before": "", "after": "", "pass": all_pass, "reason": reason,
		"replays": replays,
	})

	if not all_pass:
		_fails.append("step %s (%s) : %s" % [parent_ref, role, reason])
		_phase = "done"
		_emit()
		return

	_reached_role = role
	_advance_task()


func _advance_task() -> void:
	_step_idx += 1
	if _step_idx >= _run_queue.size():
		_phase = "done"
		_emit()
	else:
		_phase = "before"


# Une seule tache en echec avant l'evaluation (hud/affordance introuvable, ref de
# replay non resolue, step malforme). Pour un "replay_item", n'interrompt PAS le
# run global : consignee dans l'accumulateur du REPEAT parent, qui echouera a son
# tour a "replay_end" (agregation), seul point qui arrete la file dans ce cas.
func _fail_current_task(task: Dictionary, reason: String) -> void:
	var kind := String(task.get("task_kind", ""))
	if kind == "replay_item":
		var entry := {"ref": String(task.get("orig_ref", "")), "pass": false,
			"before": _before_text, "after": "", "reason": reason}
		var parent_ref := String(task.get("parent_ref", ""))
		var acc: Array = _replay_acc.get(parent_ref, [])
		acc.append(entry)
		_replay_acc[parent_ref] = acc
		_advance_task()
		return

	var orig_step = task.get("orig_step")
	var role := String(orig_step.get("role", "")) if typeof(orig_step) == TYPE_DICTIONARY else ""
	var ref := String(orig_step.get("ref", "")) if typeof(orig_step) == TYPE_DICTIONARY else ""
	var affordance := String(orig_step.get("affordance", "")) if typeof(orig_step) == TYPE_DICTIONARY else ""
	_results.append({
		"role": role, "ref": ref, "affordance": affordance,
		"before": _before_text, "after": "", "pass": false, "reason": reason,
	})
	_fails.append(reason)
	_phase = "done"
	_emit()


func _predicate_fail_reason(predicate: String, before: String, after: String) -> String:
	if predicate.begins_with("increases_more_than:"):
		var ref := predicate.substr("increases_more_than:".length())
		if not _deltas.has(ref):
			return "delta de %s inconnu" % ref
	return "predicat '%s' non satisfait (avant='%s' apres='%s')" % [predicate, before, after]


func _eval_predicate(predicate: String, hud: String, before: String, after: String) -> bool:
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
	if predicate == "new_distinct":
		if after.strip_edges() == "":
			return false
		var seen_list: Array = _seen.get(hud, [])
		return not seen_list.has(after)
	if predicate == "decreases":
		var a := _extract_number(after)
		var b := _extract_number(before)
		if is_nan(a) or is_nan(b):
			return false
		return a < b
	if predicate == "resets":
		if not _initial.has(hud):
			return false
		var init_text := String(_initial[hud])
		if before == init_text:
			return false
		var init_num := _extract_number(init_text)
		var after_num := _extract_number(after)
		if is_nan(init_num) or is_nan(after_num):
			return false
		return after_num == init_num
	if predicate.begins_with("increases_more_than:"):
		var ref := predicate.substr("increases_more_than:".length())
		if not _deltas.has(ref):
			return false
		var a := _extract_number(after)
		var b := _extract_number(before)
		if is_nan(a) or is_nan(b):
			return false
		return (a - b) > float(_deltas[ref])
	return false


func _extract_number(s: String) -> float:
	var m := _num_re.search(s)
	if m == null:
		return NAN
	return m.get_string().replace(",", ".").to_float()


func _emit() -> void:
	var ok: bool = _fails.is_empty()
	var data := {
		"steps": _results, "reached_role": _reached_role, "frames": _frames,
		"deltas": _deltas, "seen": _seen,
	}
	print("FORGE_ORACLE player_loop " + JSON.stringify({"ok": ok, "fails": _fails, "data": data}))
	quit(0 if ok else 1)
