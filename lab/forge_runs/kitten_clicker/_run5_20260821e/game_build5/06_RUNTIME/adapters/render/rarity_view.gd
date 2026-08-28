# rarity_view.gd — cadre visuel de rarete (capacite render.rarity, R8).
#
# Adaptateur de presentation. Applique a un sprite-chaton une teinte de cadre distincte
# par rarete, pour que les tiers soient distinguables au premier coup d'oeil (sans texte).
extends RefCounted

# Couleurs de cadre par rarete (du plus frequent au plus rare), reprises de l'art bible.
const FRAME_COLOR: Dictionary = {
	"common": Color("b0a99f"),
	"uncommon": Color("8fcb9b"),
	"rare": Color("7fb6e0"),
	"epic": Color("b79ce0"),
	"legendary": Color("f2c94c"),
}


# Couleur de cadre d'une rarete (blanc neutre si inconnue).
static func frame_color(rarity: String) -> Color:
	return FRAME_COLOR.get(rarity, Color.WHITE)


# Applique le cadre de rarete a un noeud (modulate = teinte). Rend la couleur appliquee.
static func apply_rarity_frame(node: CanvasItem, rarity: String) -> Color:
	var col: Color = frame_color(rarity)
	if node != null:
		node.modulate = col
	return col
