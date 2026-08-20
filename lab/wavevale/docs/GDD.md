# WAVEVALE — Game Design Document v1.0
## Genre : Auto-battler TFT-style | Engine : Godot 4 | Lane : JEUX

---

## 1. CONCEPT

Jeu de type Teamfight Tactics. Le joueur draft des champions, les positionne sur un plateau 5×5, et défend le Vale contre 15 vagues d'ennemis croissants. Les synergies de traits amplifient les unités. Le positioning est stratégique : tanks en front-row, mages/archers en backline.

---

## 2. BOUCLE DE JEU

```
TITRE → PHASE PRÉP → [COMBAT] → RÉSULTAT → PHASE PRÉP (wave+1) → ... → VICTOIRE/DÉFAITE
```

**Phase Préparation :**
- Achat d'unités en shop (5 slots, refresh auto chaque wave)
- Placement sur son plateau 5×5
- Achat XP (level up = +1 slot board + unités de haut coût)
- Équipement d'items sur les unités
- Durée : illimitée (pas de timer en MVP)

**Phase Combat :**
- Auto-résolu tick par tick (700ms/tick)
- Unités se déplacent vers l'ennemi le plus proche
- Attaquent quand à portée
- Résolution jusqu'à ce qu'un camp soit éliminé

**Après combat :**
- Unités survivantes : heal 40% HP max
- Unités mortes : résurrectées à 30% HP
- Attribution items (1–2 items droppés par vague)
- Gold reward → prochaine wave

---

## 3. BOARDS

### Structure visuelle
```
[ROW 0] ██ ██ ██ ██ ██   ← ENEMY backline
[ROW 1] ██ ██ ██ ██ ██
[ROW 2] ██ ██ ██ ██ ██
[ROW 3] ██ ██ ██ ██ ██
[ROW 4] ██ ██ ██ ██ ██   ← ENEMY frontline (closest to player)
── ── ── ── ── ── ──
[ROW 5] ██ ██ ██ ██ ██   ← PLAYER frontline (tanks here)
[ROW 6] ██ ██ ██ ██ ██
[ROW 7] ██ ██ ██ ██ ██
[ROW 8] ██ ██ ██ ██ ██
[ROW 9] ██ ██ ██ ██ ██   ← PLAYER backline (mages/rangers here)
```
- Arena totale en combat : 10 lignes × 5 colonnes
- En prép : player voit uniquement rows 5–9 (son plateau 5×5)
- Ennemi visible en haut (rows 0–4, preview)

### Placement
- Player place ses unités sur rows 5–9 (drag depuis bench)
- maxBoardSlots = level + 2 (L1=3, L2=4, ... L6+=8, cap 8)
- Bench : 7 slots

### Combat movement
- Chaque tick : chaque unité cherche l'ennemi le plus proche (Manhattan distance)
- Si portée atteinte → attaque
- Sinon → se déplace d'une case vers la cible
- Melee (Warrior, Knight) : portée 1 case adjacente
- Ranged (Ranger, Mage) : portée 3 cases, ne bougent pas si déjà à portée
- Aggro : ennemi cible toujours l'allié le plus proche → tanks en row 5 absorbent naturellement

---

## 4. ÉCONOMIE

### Gold
- Start : 8g
- Wave reward : 3 + min(wave, 5) gold
- Intérêts : +1g par tranche de 10g gardée (cap +5g/round)
- Reroll shop : 2g
- XP manuel : 4g → +4 XP

### XP & Level
- **XP AUTO par round : +2 XP** (nouveau — non présent dans le HTML)
- XP pour level up : level × 4 (L1→L2 = 4, L2→L3 = 8, ...)
- Level max : 9
- Level → maxBoardSlots = min(level + 2, 8)
- Level → maxCostVisible = min(5, 1 + level // 2)

### Shop
- Slots : min(4 + level, 7)
- Reroll : 2g (manuel) + auto entre chaque wave si non freezé
- Lock : préserve le shop pour le prochain round

### Sell
- Valeur : cost × star (★1 = 1×, ★2 = 2×, ★3 = 3×)

### Merge
- 3 copies identiques (même id, même star) → fusion automatique → star+1
- ATK × 1.8, HP × 1.8

---

## 5. UNITÉS

### Stats
- `atk` : dégâts par attaque
- `max_hp` : HP maximum
- `hp` : HP courant
- `range` : portée d'attaque (1=melee, 3=ranged)
- `speed` : cases/tick de déplacement (1 pour tous en MVP)
- `cost` : coût en gold (1–5)
- `traits` : liste de traits (1–3)
- `star` : niveau de fusion (1–3)

### Roster (20 unités)
Voir `UnitData.gd` — repris du HTML avec corrections :
- Cost 1: Squire, Archer, Imp, Acolyte, Scout
- Cost 2: Paladin, Wizard, Elf Blade, Ghoul, Berserker
- Cost 3: Champion, Archmage, Assassin, Lich, Druid
- Cost 4: Warlord, Sorcerer, Shadowblade
- Cost 5: Dragon, Seraph

### Heal / Résurrection inter-round
- Survivants : +40% max_hp récupérés
- Morts : ressuscitent à 30% max_hp
- Undead trait en combat : ressuscite 1× à 30% HP si tué

---

## 6. TRAITS & SYNERGIES

| Trait | Seuils | Bonus |
|---|---|---|
| Knight | 2/4 | Armor +30/60 (réduit dmg reçu) |
| Mage | 2/4 | ATK +25%/+50% |
| Ranger | 2/3 | ATK +20%/+35%, range +1 |
| Warrior | 2/4 | HP +30%/+60% |
| Rogue | 2/3 | Crit +25%/+50% |
| Priest | 2/3 | Heal 5/15 HP/tick en combat |
| Demon | 2/4 | +15 ATK volé sur kill / +30 ATK |
| Elf | 3 | Dodge 25% |
| Undead | 2/4 | Résurrection 1× / 2× par combat |
| Dragon | 2 | +50% toutes stats |

---

## 7. ITEMS

Droppés après chaque wave (1–2 items aléatoires). Max 2 items par unité.

| Item | Emoji | Effet |
|---|---|---|
| Iron Sword | ⚔️ | +50 ATK |
| Steel Shield | 🛡️ | +30 Armor, +100 HP |
| Magic Ring | 💍 | +25% ATK (multiplier) |
| Ancient Tome | 📚 | Active synergy Mage +1 (compte comme 1 Mage extra) |
| Warrior Crown | 👑 | +80 HP, +20 ATK |
| Shadow Cloak | 🌑 | +20% Dodge chance |
| Dragon Scale | 🐉 | +50 Armor, +25% HP |
| Healer's Staff | 🌿 | Heal 10 HP/tick allié le plus proche |

---

## 8. VAGUES ENNEMIES

15 vagues progressives (données dans `WaveData.gd`).
Courbe ATK : 25 (W1) → 400 (W15).
Mini-boss W7 (Vampire), W11 (Wyvern).
Boss final W15 (THE DARKENED, 4000 HP).

---

## 9. ARCHITECTURE GODOT

### Arborescence
```
lab/wavevale/
├── project.godot
├── scenes/
│   ├── Main.tscn              ← root, gère les écrans
│   ├── game/
│   │   ├── Arena.tscn         ← 10×5 board + unités
│   │   ├── Unit.tscn          ← nœud unité (Panel + Labels)
│   │   └── ItemSlot.tscn      ← slot item sur unité
│   └── ui/
│       ├── TopBar.tscn
│       ├── ShopPanel.tscn
│       ├── BenchArea.tscn
│       ├── SynergyPanel.tscn
│       ├── ItemPanel.tscn
│       ├── CombatLog.tscn
│       └── screens/
│           ├── TitleScreen.tscn
│           ├── GameOverScreen.tscn
│           └── VictoryScreen.tscn
├── scripts/
│   ├── autoloads/
│   │   ├── GameManager.gd     ← singleton état global
│   │   ├── UnitData.gd        ← définitions unités
│   │   ├── WaveData.gd        ← définitions vagues
│   │   ├── ItemData.gd        ← définitions items
│   │   └── TraitData.gd       ← définitions traits/synergies
│   ├── game/
│   │   ├── Arena.gd           ← gestion plateau 10×5
│   │   ├── Unit.gd            ← comportement unité
│   │   ├── CombatEngine.gd    ← boucle combat tick-by-tick
│   │   └── SynergyManager.gd  ← calcul synergies actives
│   └── ui/
│       ├── Main.gd
│       ├── TopBar.gd
│       ├── ShopPanel.gd
│       ├── BenchArea.gd
│       ├── SynergyPanel.gd
│       ├── ItemPanel.gd
│       └── CombatLog.gd
└── tests/
    └── test_combat.gd
```

### Autoloads (singletons)
- `GameManager` : état global (gold, hp, wave, level, xp, phase, bench, items_pending)
- `UnitData` : dict des templates unités
- `WaveData` : array des vagues
- `ItemData` : dict des items
- `TraitData` : dict des traits et seuils

### Signaux clés
```gdscript
GameManager.phase_changed(phase: String)
GameManager.gold_changed(amount: int)
GameManager.hp_changed(amount: int)
GameManager.wave_changed(wave: int)
Arena.unit_placed(unit_node, cell: Vector2i)
Arena.unit_removed(unit_node, cell: Vector2i)
CombatEngine.combat_tick_done(state: Dictionary)
CombatEngine.combat_ended(result: Dictionary)
Unit.unit_died(unit_node)
Unit.unit_attacked(attacker, target)
```

---

## 10. GATES PIERRE

- [ ] GDD sign-off ← **TU ES ICI**
- [ ] Data layer review (unités/items/vagues équilibrés ?)
- [ ] Combat engine test (1 wave complète sans UI)
- [ ] UI playtest (première session 5 min)
- [ ] Balance pass Wave 1–5
- [ ] Steam page assets
