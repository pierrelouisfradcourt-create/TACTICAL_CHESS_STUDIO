# quest_panel.gd — panneau de quetes. Affiche >=3 quetes, chacune avec son objectif et sa
# progression courante, lues dans le registre de contenu et l'etat (render.quests /
# quest_panel_display).
extends Node

var _labels := []
var _quetes := []

func construire(parent: Control, quetes: Array) -> void:
	_quetes = quetes
	var titre := Label.new()
	titre.text = "Quetes"
	titre.position = Vector2(400, 8)
	titre.add_theme_color_override("font_color", Color(0.29, 0.29, 0.33))
	parent.add_child(titre)
	var y := 32.0
	for _q in quetes:
		var l := Label.new()
		l.position = Vector2(400, y)
		l.add_theme_color_override("font_color", Color(0.29, 0.29, 0.33))
		l.add_theme_font_size_override("font_size", 13)
		parent.add_child(l)
		_labels.append(l)
		y += 30.0
	afficher_quetes({})

# Met a jour la progression de chaque quete (objectif + "cur/cible").
func afficher_quetes(etat: Dictionary) -> void:
	for i in range(_quetes.size()):
		var q = _quetes[i]
		var mesure := String(q.get("mesure", "cumul"))
		var cible := int(q.get("cible_progression", 1))
		var cur := int(etat.get(mesure, 0))
		_labels[i].text = "%s (%d/%d)" % [String(q.get("objectif", "")), min(cur, cible), cible]
