extends Node
# WAVEVALE — WaveData
# Singleton: 15 vagues d'ennemis.
# Accès global : WaveData.get_wave(1)  ← 1-indexé

# Chaque ennemi : { "name", "emoji", "atk", "max_hp", "range", "boss" }
# Toutes les vagues sont stockées dans un Array[Array] constant.

const WAVES: Array = [
	# ── W1 ── 3 ennemis ───────────────────────────────────────────────────────
	[
		{ "name": "Goblin",  "emoji": "👺", "atk": 25, "max_hp": 100, "range": 1, "boss": false },
		{ "name": "Goblin",  "emoji": "👺", "atk": 25, "max_hp": 100, "range": 1, "boss": false },
		{ "name": "Wolf",    "emoji": "🐺", "atk": 35, "max_hp": 120, "range": 1, "boss": false },
	],
	# ── W2 ── 4 ennemis ───────────────────────────────────────────────────────
	[
		{ "name": "Goblin",  "emoji": "👺", "atk": 25, "max_hp": 100, "range": 1, "boss": false },
		{ "name": "Goblin",  "emoji": "👺", "atk": 25, "max_hp": 100, "range": 1, "boss": false },
		{ "name": "Wolf",    "emoji": "🐺", "atk": 35, "max_hp": 120, "range": 1, "boss": false },
		{ "name": "Zombie",  "emoji": "🧟", "atk": 30, "max_hp": 150, "range": 1, "boss": false },
	],
	# ── W3 ── 5 ennemis ───────────────────────────────────────────────────────
	[
		{ "name": "Zombie",   "emoji": "🧟", "atk": 30, "max_hp": 150, "range": 1, "boss": false },
		{ "name": "Zombie",   "emoji": "🧟", "atk": 30, "max_hp": 150, "range": 1, "boss": false },
		{ "name": "Wolf",     "emoji": "🐺", "atk": 35, "max_hp": 120, "range": 1, "boss": false },
		{ "name": "Bat",      "emoji": "🦇", "atk": 40, "max_hp": 100, "range": 1, "boss": false },
		{ "name": "Skeleton", "emoji": "💀", "atk": 45, "max_hp": 180, "range": 1, "boss": false },
	],
	# ── W4 ── 5 ennemis ───────────────────────────────────────────────────────
	[
		{ "name": "Skeleton", "emoji": "💀", "atk": 45, "max_hp": 180, "range": 1, "boss": false },
		{ "name": "Skeleton", "emoji": "💀", "atk": 45, "max_hp": 180, "range": 1, "boss": false },
		{ "name": "Ghoul",    "emoji": "😱", "atk": 60, "max_hp": 220, "range": 1, "boss": false },
		{ "name": "Ghoul",    "emoji": "😱", "atk": 60, "max_hp": 220, "range": 1, "boss": false },
		{ "name": "Orc",      "emoji": "👹", "atk": 70, "max_hp": 300, "range": 1, "boss": false },
	],
	# ── W5 ── 5 ennemis ───────────────────────────────────────────────────────
	[
		{ "name": "Orc",      "emoji": "👹", "atk": 70,  "max_hp": 300, "range": 1, "boss": false },
		{ "name": "Orc",      "emoji": "👹", "atk": 70,  "max_hp": 300, "range": 1, "boss": false },
		{ "name": "Revenant", "emoji": "👻", "atk": 80,  "max_hp": 280, "range": 1, "boss": false },
		{ "name": "Serpent",  "emoji": "🐍", "atk": 90,  "max_hp": 250, "range": 1, "boss": false },
		{ "name": "Spider",   "emoji": "🕷️", "atk": 65, "max_hp": 200, "range": 1, "boss": false },
	],
	# ── W6 ── 6 ennemis ───────────────────────────────────────────────────────
	[
		{ "name": "Ogre",       "emoji": "🗿", "atk": 100, "max_hp": 450, "range": 1, "boss": false },
		{ "name": "Revenant",   "emoji": "👻", "atk": 80,  "max_hp": 280, "range": 1, "boss": false },
		{ "name": "Revenant",   "emoji": "👻", "atk": 80,  "max_hp": 280, "range": 1, "boss": false },
		{ "name": "Spider",     "emoji": "🕷️", "atk": 65, "max_hp": 200, "range": 1, "boss": false },
		{ "name": "Viper",      "emoji": "🐍", "atk": 100, "max_hp": 240, "range": 1, "boss": false },
		{ "name": "Lich Scout", "emoji": "☠️", "atk": 90,  "max_hp": 300, "range": 3, "boss": false },
	],
	# ── W7 ── MINI-BOSS — 5 ennemis ──────────────────────────────────────────
	[
		{ "name": "Vampire", "emoji": "🧛", "atk": 120, "max_hp": 500, "range": 1, "boss": true  },
		{ "name": "Thrall",  "emoji": "🧟", "atk": 60,  "max_hp": 200, "range": 1, "boss": false },
		{ "name": "Thrall",  "emoji": "🧟", "atk": 60,  "max_hp": 200, "range": 1, "boss": false },
		{ "name": "Thrall",  "emoji": "🧟", "atk": 60,  "max_hp": 200, "range": 1, "boss": false },
		{ "name": "Thrall",  "emoji": "🧟", "atk": 60,  "max_hp": 200, "range": 1, "boss": false },
	],
	# ── W8 ── 5 ennemis ───────────────────────────────────────────────────────
	[
		{ "name": "Flame Imp",       "emoji": "🔥", "atk": 110, "max_hp": 300, "range": 1, "boss": false },
		{ "name": "Flame Imp",       "emoji": "🔥", "atk": 110, "max_hp": 300, "range": 1, "boss": false },
		{ "name": "War Chief",       "emoji": "⚔️", "atk": 140, "max_hp": 550, "range": 1, "boss": false },
		{ "name": "Spider Matriarch","emoji": "🕷️", "atk": 120, "max_hp": 400, "range": 1, "boss": false },
		{ "name": "Necromancer",     "emoji": "💀", "atk": 130, "max_hp": 350, "range": 3, "boss": false },
	],
	# ── W9 ── 6 ennemis ───────────────────────────────────────────────────────
	[
		{ "name": "Shadow Drake",  "emoji": "🐲", "atk": 160, "max_hp": 600, "range": 1, "boss": false },
		{ "name": "Bone Knight",   "emoji": "🛡️", "atk": 130, "max_hp": 500, "range": 1, "boss": false },
		{ "name": "Bone Knight",   "emoji": "🛡️", "atk": 130, "max_hp": 500, "range": 1, "boss": false },
		{ "name": "Fire Golem",    "emoji": "🔥", "atk": 150, "max_hp": 650, "range": 1, "boss": false },
		{ "name": "Plague Zombie", "emoji": "🧟", "atk": 100, "max_hp": 400, "range": 1, "boss": false },
		{ "name": "Plague Zombie", "emoji": "🧟", "atk": 100, "max_hp": 400, "range": 1, "boss": false },
	],
	# ── W10 ── 5 ennemis ──────────────────────────────────────────────────────
	[
		{ "name": "Death Knight", "emoji": "⚔️", "atk": 180, "max_hp": 700, "range": 1, "boss": false },
		{ "name": "Death Knight", "emoji": "⚔️", "atk": 180, "max_hp": 700, "range": 1, "boss": false },
		{ "name": "Inferno Mage", "emoji": "🔮", "atk": 200, "max_hp": 500, "range": 3, "boss": false },
		{ "name": "Lich",         "emoji": "☠️", "atk": 170, "max_hp": 600, "range": 3, "boss": false },
		{ "name": "Basilisk",     "emoji": "🐍", "atk": 160, "max_hp": 750, "range": 1, "boss": false },
	],
	# ── W11 ── MINI-BOSS — 5 ennemis ─────────────────────────────────────────
	[
		{ "name": "Wyvern",       "emoji": "🐉", "atk": 220, "max_hp": 1200, "range": 1, "boss": true  },
		{ "name": "Drake",        "emoji": "🐲", "atk": 150, "max_hp": 500,  "range": 1, "boss": false },
		{ "name": "Drake",        "emoji": "🐲", "atk": 150, "max_hp": 500,  "range": 1, "boss": false },
		{ "name": "Shadow Rider", "emoji": "🌑", "atk": 170, "max_hp": 600,  "range": 1, "boss": false },
		{ "name": "Shadow Rider", "emoji": "🌑", "atk": 170, "max_hp": 600,  "range": 1, "boss": false },
	],
	# ── W12 ── 5 ennemis ──────────────────────────────────────────────────────
	[
		{ "name": "Death Lord",  "emoji": "💀", "atk": 250, "max_hp": 900, "range": 1, "boss": false },
		{ "name": "Death Lord",  "emoji": "💀", "atk": 250, "max_hp": 900, "range": 1, "boss": false },
		{ "name": "Void Walker", "emoji": "🌀", "atk": 220, "max_hp": 800, "range": 1, "boss": false },
		{ "name": "Void Walker", "emoji": "🌀", "atk": 220, "max_hp": 800, "range": 1, "boss": false },
		{ "name": "Hellfire",    "emoji": "🔥", "atk": 280, "max_hp": 700, "range": 3, "boss": false },
	],
	# ── W13 ── 5 ennemis ──────────────────────────────────────────────────────
	[
		{ "name": "Elder Dragon", "emoji": "🐉", "atk": 300, "max_hp": 1500, "range": 1, "boss": false },
		{ "name": "Lich Archon",  "emoji": "☠️", "atk": 270, "max_hp": 1000, "range": 3, "boss": false },
		{ "name": "Doom Guard",   "emoji": "⚔️", "atk": 260, "max_hp": 950,  "range": 1, "boss": false },
		{ "name": "Doom Guard",   "emoji": "⚔️", "atk": 260, "max_hp": 950,  "range": 1, "boss": false },
		{ "name": "Chaos Mage",   "emoji": "🌀", "atk": 290, "max_hp": 800,  "range": 3, "boss": false },
	],
	# ── W14 ── 6 ennemis ──────────────────────────────────────────────────────
	[
		{ "name": "Darkmaster",  "emoji": "👁️", "atk": 310, "max_hp": 1100, "range": 1, "boss": false },
		{ "name": "Darkmaster",  "emoji": "👁️", "atk": 310, "max_hp": 1100, "range": 1, "boss": false },
		{ "name": "Voidborn",    "emoji": "🌑", "atk": 350, "max_hp": 1800, "range": 1, "boss": false },
		{ "name": "Annihilator", "emoji": "💥", "atk": 320, "max_hp": 1200, "range": 1, "boss": false },
		{ "name": "Infernarch",  "emoji": "🔥", "atk": 340, "max_hp": 1000, "range": 3, "boss": false },
		{ "name": "Oblivion",    "emoji": "🌀", "atk": 360, "max_hp": 1300, "range": 3, "boss": false },
	],
	# ── W15 ── BOSS FINAL — 5 ennemis ────────────────────────────────────────
	[
		{ "name": "THE DARKENED",   "emoji": "👿", "atk": 400, "max_hp": 4000, "range": 1, "boss": true  },
		{ "name": "Dark Harbinger", "emoji": "🌑", "atk": 280, "max_hp": 1000, "range": 1, "boss": false },
		{ "name": "Dark Harbinger", "emoji": "🌑", "atk": 280, "max_hp": 1000, "range": 1, "boss": false },
		{ "name": "Void Revenant",  "emoji": "👻", "atk": 300, "max_hp": 1200, "range": 1, "boss": false },
		{ "name": "Void Revenant",  "emoji": "👻", "atk": 300, "max_hp": 1200, "range": 1, "boss": false },
	],
]


# wave_index est 1-indexé (W1 → index 0 interne).
# Retourne un tableau vide si l'index est hors limites.
func get_wave(wave_index: int) -> Array:
	var i: int = wave_index - 1
	if i < 0 or i >= WAVES.size():
		return []
	return WAVES[i]
