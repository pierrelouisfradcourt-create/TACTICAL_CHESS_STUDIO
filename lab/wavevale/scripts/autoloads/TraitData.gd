extends Node
# WAVEVALE — TraitData
# Singleton: définition des 10 traits, couleurs, seuils, descriptions.
# Accès global : TraitData.get_active_level("Knight", count)

var TRAITS: Dictionary = {
	"Knight": {
		"color": Color(0.54, 0.42, 0.19),
		"dot":   Color(0.79, 0.66, 0.30),
		"thresholds": [2, 4],
		"desc": "Armor +30/60",
	},
	"Mage": {
		"color": Color(0.29, 0.17, 0.48),
		"dot":   Color(0.60, 0.38, 1.0),
		"thresholds": [2, 4],
		"desc": "ATK +25%/+50%",
	},
	"Ranger": {
		"color": Color(0.17, 0.35, 0.17),
		"dot":   Color(0.38, 0.75, 0.38),
		"thresholds": [2, 3],
		"desc": "ATK +20%/+35%, Range+1",
	},
	"Warrior": {
		"color": Color(0.48, 0.17, 0.17),
		"dot":   Color(0.75, 0.38, 0.38),
		"thresholds": [2, 4],
		"desc": "HP +30%/+60%",
	},
	"Rogue": {
		"color": Color(0.17, 0.29, 0.29),
		"dot":   Color(0.38, 0.75, 0.69),
		"thresholds": [2, 3],
		"desc": "Crit +25%/+50%",
	},
	"Priest": {
		"color": Color(0.35, 0.23, 0.42),
		"dot":   Color(0.82, 0.56, 1.0),
		"thresholds": [2, 3],
		"desc": "Heal 5/15 HP/tick",
	},
	"Demon": {
		"color": Color(0.42, 0.10, 0.10),
		"dot":   Color(1.0,  0.31, 0.31),
		"thresholds": [2, 4],
		"desc": "ATK steal on kill +15/+30",
	},
	"Elf": {
		"color": Color(0.17, 0.29, 0.17),
		"dot":   Color(0.50, 0.82, 0.38),
		"thresholds": [3],
		"desc": "Dodge 25%",
	},
	"Undead": {
		"color": Color(0.23, 0.23, 0.29),
		"dot":   Color(0.63, 0.63, 0.75),
		"thresholds": [2, 4],
		"desc": "Resurrect 1x/2x",
	},
	"Dragon": {
		"color": Color(0.42, 0.23, 0.10),
		"dot":   Color(1.0,  0.56, 0.25),
		"thresholds": [2],
		"desc": "+50% all stats",
	},
}


# Retourne 0 si le trait est inactif, 1 si premier seuil atteint, 2 si second.
func get_active_level(trait_name: String, count: int) -> int:
	if not TRAITS.has(trait_name):
		return 0
	var thresholds: Array = TRAITS[trait_name]["thresholds"]
	var level: int = 0
	for t in thresholds:
		if count >= t:
			level += 1
	return level
