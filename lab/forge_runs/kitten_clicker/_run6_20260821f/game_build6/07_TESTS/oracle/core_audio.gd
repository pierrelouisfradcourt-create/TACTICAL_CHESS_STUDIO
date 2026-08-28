# core_audio.gd — oracle produit de la ligne core.audio (proof_kind: oracle).
#
# Exige (wiremap) : le volet journalise les 4 declenchements 'click','buy','unlock','prestige'
# avec 4 identifiants deux a deux DISTINCTS, chacun declenche par SON evenement de jeu.
#
# ASSEMBLAGE : ce volet charge la VRAIE scene (res://main.tscn) et pilote le jeu par son
# CANAL PUBLIC (api_click / api_buy_kitten / api_prestige). Il ne joue AUCUN son lui-meme :
# l'audio est declenche par les evenements du jeu, via le cablage du runtime. Le journal est
# ensuite relu sur l'adaptateur audio. Patron games/bomberman_3d/07_TESTS/oracle/core_audio.gd.
#
# MODE HEADLESS assume : la synthese journalise le cue meme sans peripherique (l'identite du
# son, pas son amplitude, est ce que cet oracle prouve).
extends SceneTree

const Audio = preload("res://06_RUNTIME/adapters/audio/audio.gd")
const P = preload("res://05_SYSTEMS/params/params.gd")

var _main: Node = null
var _f := 0
var _fait := false


func _initialize() -> void:
	var packed = load("res://main.tscn")
	if packed == null or not (packed is PackedScene):
		print("FORGE_ORACLE core_audio " + JSON.stringify({"ok": false,
			"fails": ["res://main.tscn introuvable"]}))
		quit(1)
		return
	_main = packed.instantiate()
	get_root().add_child(_main)


func _process(_d: float) -> bool:
	_f += 1
	if _f < 6:
		return false
	if _fait:
		return true
	_fait = true

	var fails: Array = []
	if _main == null or not _main.has_method("api_click"):
		fails.append("la scene principale n'expose pas le canal public de jeu")
		print("FORGE_ORACLE core_audio " + JSON.stringify({"ok": false, "fails": fails}))
		quit(1)
		return true

	# Partie REELLE pilotee par le canal public : clic -> achat (buy + unlock) -> prestige.
	for i in range(60):
		_main.api_click()                 # -> 'click' ; 60 clics franchissent le 1er palier
	var achat: Dictionary = _main.api_buy_kitten()   # -> 'buy' (+ 'unlock' au 1er distinct)
	var prest: bool = _main.api_prestige()           # -> 'prestige' (palier 1 atteint)

	# Releve du journal audio (declenchements traces sur une partie reellement jouee).
	var cues := {}
	for e in Audio.journal:
		cues[String(e["cue"])] = true

	if Audio.journal.is_empty():
		fails.append("aucun declenchement trace sur une partie jouee")
	if not cues.has(P.EV_CLICK):
		fails.append("le clic n'a declenche aucun son")
	if not cues.has(P.EV_BUY):
		fails.append("l'achat n'a declenche aucun son")
	if not cues.has(P.EV_UNLOCK):
		fails.append("le deblocage n'a declenche aucun son")
	if not cues.has(P.EV_PRESTIGE):
		fails.append("le prestige n'a declenche aucun son")
	if cues.size() < 4:
		fails.append("moins de 4 cues distincts (%d)" % cues.size())

	print("FORGE_ORACLE core_audio " + JSON.stringify({
		"ok": fails.is_empty(), "fails": fails,
		"declenchements": Audio.journal.size(),
		"cues_distincts": cues.keys(),
		"achat_ok": achat.get("ok", false),
		"prestige_ok": prest,
	}))
	quit(0 if fails.is_empty() else 1)
	return true
