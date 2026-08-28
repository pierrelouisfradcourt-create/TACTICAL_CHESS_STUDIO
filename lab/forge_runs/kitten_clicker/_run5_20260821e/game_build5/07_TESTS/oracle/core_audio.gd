# core_audio.gd — oracle produit de la ligne audio.sfx (R14, critere demo (e)).
#
# Provoque les quatre evenements de jeu (clic / achat / deblocage / prestige) et asserte
# QUATRE ids de son DISTINCTS deux a deux, via le JOURNAL des declenchements. La synthese
# est procedurale (aucun asset audio) et fonctionne sans peripherique : mode HEADLESS
# legitime (mesure du precedent bomberman/pacman — le tampon accepte les trames sans
# fenetre). Sortie : une ligne FORGE_ORACLE, exit 0 si vert.
extends SceneTree

const Audio = preload("res://06_RUNTIME/adapters/audio/audio.gd")


func _initialize() -> void:
	test_audio_distinct()


func test_audio_distinct() -> void:
	Audio.reinitialiser()
	# Partie reelle : on declenche chaque evenement une fois, dans l'ordre du jeu.
	Audio.play_sfx("clic", 1)
	Audio.play_sfx("achat", 2)
	Audio.play_sfx("deblocage", 3)
	Audio.play_sfx("prestige", 4)

	var fails: Array = []
	var ids := {}
	var total_ech: int = 0
	for e in Audio.journal():
		ids[String(e["cue"])] = true
		total_ech += int(e["echantillons"])

	if Audio.journal().size() != 4:
		fails.append("attendu 4 declenchements, obtenu %d" % Audio.journal().size())
	if ids.size() != 4:
		fails.append("attendu 4 ids de son distincts, obtenu %d (%s)" % [ids.size(), str(ids.keys())])
	if total_ech <= 0:
		fails.append("0 echantillon reellement synthetise")

	print("FORGE_ORACLE core_audio " + JSON.stringify({
		"ok": fails.is_empty(),
		"fails": fails,
		"declenchements": Audio.journal().size(),
		"ids_distincts": ids.keys(),
		"echantillons_synthetises": total_ech,
	}))
	quit(0 if fails.is_empty() else 1)
