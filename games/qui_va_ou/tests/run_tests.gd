extends SceneTree

## Tests headless du moteur de règles. Aucun rendu, aucune scène.
##   godot --headless --path games/qui_va_ou --script res://tests/run_tests.gd
## Attendu : « TOUT VERT » et code de sortie 0.
##
## Ils rejouent chaque niveau dans TOUS les ordres de préparation possibles,
## comme la sonde HTML avait été testée : c'est là que les régressions sortent.

const Donnees := preload("res://core/donnees.gd")
const Moteur := preload("res://core/moteur.gd")

var _echecs: int = 0


func _initialize() -> void:
	var roster := Donnees.charger_roster()
	var ordre := Donnees.ordre_des_niveaux()
	_verifier(not roster.is_empty(), "roster chargé")
	_verifier(not ordre.is_empty(), "index des niveaux chargé")

	for fichier: Variant in ordre:
		var niveau := Donnees.charger_niveau(String(fichier))
		if niveau.is_empty():
			_echouer("niveau illisible : %s" % String(fichier))
			continue
		_tester_niveau(niveau, roster)

	if _echecs == 0:
		print("TOUT VERT")
	else:
		print("%d ECHEC(S)" % _echecs)
	quit(1 if _echecs > 0 else 0)


func _tester_niveau(niveau: Dictionary, roster: Dictionary) -> void:
	var id := String(niveau["id"])
	var preparations: Array[String] = []
	var liberatrice := ""
	for z: Variant in niveau["zones"]:
		var zone: Dictionary = z
		if bool(zone.get("libere", false)):
			liberatrice = String(zone["id"])
		else:
			preparations.append(String(zone["id"]))

	_verifier(liberatrice != "", "%s : une zone libératrice" % id)

	for ordre: Array in _permutations(preparations):
		var m := Moteur.new()
		m.charger(niveau, roster)

		# la zone finale doit être bloquée, et le dire, tant que tout n'est pas prêt
		var chat_final := _chat_pour(m, m.zone(liberatrice))
		if chat_final != "":
			m.prendre(chat_final)
			var tot := m.poser(liberatrice)
			_verifier(int(tot["resultat"]) == Moteur.Resultat.BLOQUE,
				"%s %s : la libération est bloquée d'entrée" % [id, ordre])
			_verifier(String(tot["texte"]).length() > 10,
				"%s %s : le blocage s'explique" % [id, ordre])
			m.lacher()

		for zone_id: String in ordre:
			var zone := m.zone(zone_id)
			var chat := _chat_pour(m, zone)
			_verifier(chat != "", "%s %s : un chat sait %s" % [id, ordre, String(zone["verbe"])])
			if chat == "":
				break
			m.prendre(chat)
			var issue := m.poser(zone_id)
			_verifier(int(issue["resultat"]) == Moteur.Resultat.SUCCES,
				"%s %s : %s réussi" % [id, ordre, zone_id])

		var chat_fin := _chat_pour(m, m.zone(liberatrice))
		_verifier(chat_fin != "", "%s %s : le libérateur est arrivé" % [id, ordre])
		if chat_fin == "":
			continue
		m.prendre(chat_fin)
		var fin := m.poser(liberatrice)
		_verifier(int(fin["resultat"]) == Moteur.Resultat.SUCCES,
			"%s %s : libération réussie" % [id, ordre])
		_verifier(m.libere, "%s %s : le prisonnier est libre" % [id, ordre])

	_tester_mauvais_chat(niveau, roster, preparations)


## Poser un chat dont le verbe ne correspond pas doit être refusé, jamais accepté.
func _tester_mauvais_chat(niveau: Dictionary, roster: Dictionary, preparations: Array[String]) -> void:
	if preparations.is_empty():
		return
	var m := Moteur.new()
	m.charger(niveau, roster)
	var zone := m.zone(preparations[0])
	for chat: String in m.disponibles:
		if m.verbe_du_chat(chat) == String(zone["verbe"]):
			continue
		m.prendre(chat)
		var issue := m.poser(String(zone["id"]))
		_verifier(int(issue["resultat"]) == Moteur.Resultat.REFUS,
			"%s : %s refusé sur %s" % [String(niveau["id"]), chat, String(zone["id"])])
		_verifier(not m.occupees.has(String(zone["id"])),
			"%s : un refus ne réserve pas la place" % String(niveau["id"]))
		return


func _chat_pour(moteur: Moteur, zone: Dictionary) -> String:
	for chat: String in moteur.disponibles:
		if moteur.verbe_du_chat(chat) == String(zone["verbe"]):
			return chat
	return ""


func _permutations(elements: Array[String]) -> Array:
	if elements.size() <= 1:
		return [elements.duplicate()]
	var sorties: Array = []
	for i in elements.size():
		var reste: Array[String] = elements.duplicate()
		var pris: String = reste[i]
		reste.remove_at(i)
		for suite: Array in _permutations(reste):
			var ordre: Array = [pris]
			ordre.append_array(suite)
			sorties.append(ordre)
	return sorties


func _verifier(condition: bool, quoi: String) -> void:
	if not condition:
		_echouer(quoi)


func _echouer(quoi: String) -> void:
	_echecs += 1
	printerr("ECHEC : %s" % quoi)
