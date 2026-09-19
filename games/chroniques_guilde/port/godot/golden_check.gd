# =============================================================================
#  golden_check.gd — CONFORMITÉ DU PORTAGE AUX VECTEURS DE RÉFÉRENCE (Godot 4)
#  Chroniques de Guilde · portage. Date : 2026-09-19.
#
#  Rejoue golden/vectors.json avec TON moteur porté et affiche LA PREMIÈRE
#  JOURNÉE QUI DIVERGE. C'est le seul verdict qui compte : tant que ce script
#  n'affiche pas 100 %, le multijoueur sans serveur ne tient pas.
#
#  ---------------------------------------------------------------------------
#  CE CODE N'A PAS ENCORE ÉTÉ EXÉCUTÉ : il lui faut un moteur porté, qui
#  n'existe pas. Les PRIMITIVES dont il dépend, elles, sont vérifiées sur
#  Godot 4.6.stable (det_selftest.gd, 65/65 le 2026-09-19).
#  Le MÊME rejeu, écrit en JavaScript (port/gen_golden.mjs), passe 7 vecteurs
#  sur 7 et 161 journées sur 161 contre le moteur d'origine.
#  ---------------------------------------------------------------------------
#
#  BRANCHEMENT — ton moteur doit offrir trois fonctions, quel que soit son nom :
#      new_game(seed: int, data: Dictionary, options: Dictionary) -> Dictionary
#      resolve_day(state: Dictionary, actions: Array) -> Dictionary   # { state, chronicle, log }
#      hash_state(state: Dictionary) -> String
#  Renseigne ENGINE_SCRIPT ci-dessous, ou pose l'objet dans `engine` avant
#  d'appeler run().
#
#  Si tu embarques le moteur JavaScript (QuickJS / GodotJS), écris un petit
#  adaptateur qui fait suivre ces trois appels au contexte JS : le reste de ce
#  script ne change pas, et il vaut alors comme test du PONT (marshalling JSON,
#  types de nombres), pas des règles.
# =============================================================================
extends Node

const VECTORS_PATH := "res://golden/vectors.json"
const DATA_PATH := "res://data.json"
const ENGINE_SCRIPT := "res://engine/guilde_engine.gd"   # <-- à adapter

var engine: Object = null

func _ready() -> void:
	var code := run()
	get_tree().quit(code)

func run() -> int:
	if engine == null:
		if not ResourceLoader.exists(ENGINE_SCRIPT):
			printerr("moteur introuvable : " + ENGINE_SCRIPT + " — renseigne ENGINE_SCRIPT ou pose `engine`")
			return 2
		engine = (load(ENGINE_SCRIPT) as GDScript).new()

	var data: Variant = _load_json(DATA_PATH)
	var doc: Variant = _load_json(VECTORS_PATH)
	if data == null or doc == null:
		return 2

	# Garde n°0 : la table de données est-elle la même ? Sans cela, comparer des
	# journées n'a aucun sens — et le diagnostic partirait dans le décor.
	var data_fnv := DetInt.hex8(DetHash.fnv1a_str(DetCanonical.canonical(data)))
	var want_fnv: String = str(doc.get("data_fnv", "")).lpad(8, "0")
	if data_fnv != want_fnv:
		printerr("data.json DIFFÉRENT : empreinte %s, attendu %s" % [data_fnv, want_fnv])
		printerr("  -> AU 2026-09-19 (tranche V5 T9), C'EST ATTENDU ET CE N'EST PAS TON PORTAGE :")
		printerr("     golden/vectors.json est PÉRIMÉ. data.json a changé (six emplacements,")
		printerr("     recalibrage des raids). Les vecteurs seront régénérés une seule fois,")
		printerr("     après les tranches restantes : node port/gen_golden.mjs. D'ici là, ce")
		printerr("     script n'a rien à dire — lance det_selftest.gd, lui reste valable.")
		printerr("  -> l'autre cause possible, une fois les vecteurs à jour : le parseur JSON de")
		printerr("     Godot rend des flottants (1000.0) là où le JSON porte des entiers (1000).")
		return 1

	var vec_ok := 0
	var days_ok := 0
	var days_total := 0
	var first_fail := ""

	for v in doc["vectors"]:
		var r := _replay(v, data)
		days_total += (v["steps"] as Array).size()
		days_ok += r["checked"]
		if r["ok"]:
			vec_ok += 1
			print("PASS  %-20s graine %-6s %d journées  final %s" % [v["id"], str(v["seed"]), (v["steps"] as Array).size(), v["hash_final"]])
		else:
			print("FAIL  %-20s graine %-6s DIVERGE AU JOUR %s" % [v["id"], str(v["seed"]), str(r["day"])])
			print("        attendu  %s" % r["expected"])
			print("        obtenu   %s" % r["got"])
			if r.has("diag"):
				var d: Dictionary = r["diag"]
				print("        journée de référence : or %s · héros vivants %s · âge %s (%s)" % [
					str(d.get("guild_gold")), str(d.get("heroes_alive")),
					str(d.get("village_age")), str(d.get("village_age_id"))])
				print("        chronique de référence : %s" % str(d.get("chronicle_title")))
			if r.has("mine"):
				var m: Dictionary = r["mine"]
				print("        TON état            : or %s · héros vivants %s · âge %s" % [
					str(m.get("guild_gold")), str(m.get("heroes_alive")), str(m.get("village_age"))])
			if first_fail == "":
				first_fail = "%s jour %s" % [v["id"], str(r["day"])]

	print("---")
	var pct_days: int = 0 if days_total == 0 else int(days_ok * 100.0 / days_total)
	print("vecteurs : %d/%d   journées : %d/%d (%d %%)" % [vec_ok, (doc["vectors"] as Array).size(), days_ok, days_total, pct_days])
	if first_fail != "":
		print("PREMIÈRE DIVERGENCE : " + first_fail)
		print("  -> la phase fautive est l'une de celles de CETTE journée-là.")
		print("     Suis la procédure de diagnostic de golden/README.md, dans l'ordre.")
		return 1
	print("CONFORME — 100 %")
	return 0

func _replay(v: Dictionary, data: Variant) -> Dictionary:
	var options: Dictionary = DetCanonical.deep_clone(v["options"])
	var state: Variant = engine.new_game(int(v["seed"]), data, options)
	var h0: String = engine.hash_state(state)
	if h0 != v["hash_initial"]:
		return {"ok": false, "day": 0, "checked": 0,
			"expected": v["hash_initial"] + " (état INITIAL, avant toute journée)",
			"got": h0 + " — newGame diverge : génération des héros, du tableau de quêtes ou du marché"}
	var n := 0
	for st in v["steps"]:
		var day := int(st["day"])
		if int(state.get("day", -1)) != day:
			return {"ok": false, "day": day, "checked": n,
				"expected": "state.day == %d" % day, "got": "state.day == %s" % str(state.get("day"))}
		var res: Variant = engine.resolve_day(state, st["actions"])
		if typeof(res) != TYPE_DICTIONARY or not res.has("state"):
			return {"ok": false, "day": day, "checked": n,
				"expected": st["hash_after"], "got": "resolve_day n'a pas rendu { state, ... }"}
		state = res["state"]
		var h: String = engine.hash_state(state)
		n += 1
		if h != st["hash_after"]:
			return {"ok": false, "day": day, "checked": n - 1,
				"expected": st["hash_after"], "got": h, "diag": st["diag"],
				"mine": {
					"guild_gold": state.get("guild", {}).get("gold", "?"),
					"heroes_alive": (state.get("heroes", {}) as Dictionary).size(),
					"village_age": state.get("village_age", 0)
				}}
	return {"ok": true, "checked": n, "day": 0, "expected": "", "got": ""}

func _load_json(p: String) -> Variant:
	var f := FileAccess.open(p, FileAccess.READ)
	if f == null:
		printerr("fichier illisible : " + p)
		return null
	var txt := f.get_as_text()   # get_as_text() lit en UTF-8 : c'est ce qu'il faut
	f.close()
	# V5 T9, MESURÉ : JSON.parse_string rend des FLOTTANTS pour des nombres entiers.
	# DetJson les ramène à des entiers AVANT que le moteur ne calcule quoi que ce
	# soit — sans ça, `div()` ne tronque plus pareil et la divergence est muette
	# en build release, où les `assert` de garde sont retirés.
	var parsed: Variant = DetJson.parse(txt)
	if parsed == null:
		printerr("JSON invalide : " + p)
	return parsed
