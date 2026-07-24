extends Node
# WAVEVALE — ItemData
# Singleton: catalogue des 8 items équipables.
# Accès global : ItemData.get_item("iron_sword")

const ITEMS: Dictionary = {
	"iron_sword": {
		"id": "iron_sword",
		"name": "Iron Sword",
		"emoji": "⚔️",
		"atk_flat": 50,
		"armor_flat": 0,
		"hp_flat": 0,
		"atk_pct": 0.0,
		"hp_pct": 0.0,
		"dodge": 0.0,
		"heal_per_tick": 0,
		"desc": "+50 ATK",
	},
	"steel_shield": {
		"id": "steel_shield",
		"name": "Steel Shield",
		"emoji": "🛡️",
		"atk_flat": 0,
		"armor_flat": 30,
		"hp_flat": 100,
		"atk_pct": 0.0,
		"hp_pct": 0.0,
		"dodge": 0.0,
		"heal_per_tick": 0,
		"desc": "+30 Armor, +100 HP",
	},
	"magic_ring": {
		"id": "magic_ring",
		"name": "Magic Ring",
		"emoji": "💍",
		"atk_flat": 0,
		"armor_flat": 0,
		"hp_flat": 0,
		"atk_pct": 0.25,
		"hp_pct": 0.0,
		"dodge": 0.0,
		"heal_per_tick": 0,
		"desc": "+25% ATK",
	},
	"ancient_tome": {
		"id": "ancient_tome",
		"name": "Ancient Tome",
		"emoji": "📚",
		"atk_flat": 0,
		"armor_flat": 0,
		"hp_flat": 0,
		"atk_pct": 0.0,
		"hp_pct": 0.0,
		"dodge": 0.0,
		"heal_per_tick": 0,
		"bonus_trait": "Mage",
		"desc": "Counts as +1 Mage",
	},
	"warrior_crown": {
		"id": "warrior_crown",
		"name": "Warrior Crown",
		"emoji": "👑",
		"atk_flat": 20,
		"armor_flat": 0,
		"hp_flat": 80,
		"atk_pct": 0.0,
		"hp_pct": 0.0,
		"dodge": 0.0,
		"heal_per_tick": 0,
		"desc": "+80 HP, +20 ATK",
	},
	"shadow_cloak": {
		"id": "shadow_cloak",
		"name": "Shadow Cloak",
		"emoji": "🌑",
		"atk_flat": 0,
		"armor_flat": 0,
		"hp_flat": 0,
		"atk_pct": 0.0,
		"hp_pct": 0.0,
		"dodge": 0.20,
		"heal_per_tick": 0,
		"desc": "+20% Dodge",
	},
	"dragon_scale": {
		"id": "dragon_scale",
		"name": "Dragon Scale",
		"emoji": "🐉",
		"atk_flat": 0,
		"armor_flat": 50,
		"hp_flat": 0,
		"atk_pct": 0.0,
		"hp_pct": 0.25,
		"dodge": 0.0,
		"heal_per_tick": 0,
		"desc": "+50 Armor, +25% HP",
	},
	"healers_staff": {
		"id": "healers_staff",
		"name": "Healer's Staff",
		"emoji": "🌿",
		"atk_flat": 0,
		"armor_flat": 0,
		"hp_flat": 0,
		"atk_pct": 0.0,
		"hp_pct": 0.0,
		"dodge": 0.0,
		"heal_per_tick": 10,
		"desc": "Heal nearby ally 10 HP/tick",
	},
}

# Pools de drop par tier de vague.
const _DROP_EARLY: Array[String]  = ["iron_sword", "steel_shield", "warrior_crown"]
const _DROP_ALL:   Array[String]  = ["iron_sword", "steel_shield", "warrior_crown",
                                      "magic_ring", "dragon_scale", "shadow_cloak",
                                      "healers_staff", "ancient_tome"]
const _DROP_LATE:  Array[String]  = ["magic_ring", "dragon_scale", "shadow_cloak",
                                      "healers_staff"]


func get_item(id: String) -> Dictionary:
	return ITEMS.get(id, {})


# wave est 1-indexé.
# Retourne un item aléatoire selon le palier de vague.
func get_random_drop(wave: int) -> Dictionary:
	var pool: Array[String]
	if wave <= 5:
		pool = _DROP_EARLY
	elif wave <= 10:
		pool = _DROP_ALL
	else:
		pool = _DROP_LATE
	var chosen_id: String = pool[randi() % pool.size()]
	return ITEMS[chosen_id]
