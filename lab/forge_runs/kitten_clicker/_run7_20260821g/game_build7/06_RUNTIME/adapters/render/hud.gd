# hud.gd — adaptateur de HUD. Cree et met a jour les Labels d'etat (groupe "hud", un Label
# par cle nommee) : objectif courant permanent, ronrons, production/s, collection, lieux,
# palier. LIT des valeurs deja calculees, ne decide d'aucune regle (render.hud).
extends Node

const CLES := ["objectif", "ronrons", "production_par_seconde", "collection", "lieux", "palier"]

var _labels := {}

# Cree les Labels et les range dans le groupe "hud" avec name == la cle.
func construire(parent: Control) -> void:
	var y := 8.0
	for cle in CLES:
		var l := Label.new()
		l.name = cle
		l.add_to_group("hud")
		l.position = Vector2(10, y)
		l.add_theme_color_override("font_color", Color(0.29, 0.29, 0.33))
		l.add_theme_font_size_override("font_size", 15)
		parent.add_child(l)
		_labels[cle] = l
		y += 22.0

# Met a jour tous les Labels d'apres un dictionnaire de valeurs d'affichage.
func rafraichir(v: Dictionary) -> void:
	_ecrire("objectif", String(v.get("objectif", "")))
	_ecrire("ronrons", "Ronrons: %.1f" % float(v.get("ronrons", 0.0)))
	_ecrire("production_par_seconde", "Prod/s: %.1f" % float(v.get("taux", 0.0)))
	_ecrire("collection", "Collection: %s" % String(v.get("collection", "0/0")))
	_ecrire("lieux", "Lieux: %d" % int(v.get("lieux", 1)))
	_ecrire("palier", "%d" % int(v.get("palier", 0)))

func _ecrire(cle: String, texte: String) -> void:
	if _labels.has(cle):
		_labels[cle].text = texte
