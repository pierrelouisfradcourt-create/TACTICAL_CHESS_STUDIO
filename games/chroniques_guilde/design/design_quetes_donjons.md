# Chroniques de Guilde — Design QUÊTES · DONJONS · MONSTRES · MOTEUR DE COMBAT

*Tranche 1 (prototype HTML, ~30 jours de jeu). Date : 2026-09-17. Source : sous-agent concepteur
« quêtes / donjons / combat ». Statut : PROPOSITION, non ratifiée. Tout ce qui est marqué
`[ASSUMÉ]` est un choix fait à la place d'un autre concepteur (classes, objets, village, économie)
et doit être réconcilié dans la section 10 « Interfaces ».*

---

## 0. Conventions et primitives

### 0.1 Nombres
* Tout nombre de jeu est un **entier signé 32 bits**. Hachages et graines : entiers **non signés 32 bits**.
* Probabilités en **permille** `‰` (0–1000). Multiplicateurs en **centièmes** `pct` (100 = ×1).
* `div(a, b)` = division entière tronquée vers zéro (`Math.trunc(a / b)` ; en JS `(a / b) | 0`).
  Tous les opérandes sont ≥ 0 sauf mention explicite, donc `div` ≡ plancher.
* `clamp(x, lo, hi) = min(max(x, lo), hi)`.
* `pct(x, p) = div(x * p, 100)` · `permille_of(x, p) = div(x * p, 1000)`.
* Bornes garanties : PV ≤ 2 000, dégâts par coup ≤ 2 000, or en sac ≤ 1 000 000. Aucun produit
  intermédiaire ne dépasse 2^31 − 1.

### 0.2 Hachage `h32` et `fnv`
```
fnv_bytes(h, bytes):            // FNV-1a 32 bits
  for b in bytes: h = (h ^ b) ; h = imul(h, 0x01000193) >>> 0
  return h
fnv(str)      = fnv_bytes(0x811C9DC5, utf8(str))
h32(v1, v2, …, vn) =            // chaque vi est un entier 32 bits, encodé little-endian sur 4 octets
  h = 0x811C9DC5 ; for v in args: h = fnv_bytes(h, le4(v)) ; return h
```
`imul` = multiplication 32 bits non signée modulo 2^32 (`Math.imul` en JS).

### 0.3 Générateur pseudo-aléatoire : `mulberry32`
```
rng_new(seed_u32) -> { s: seed_u32 >>> 0 }
rng_next(rng) -> u32 :
  rng.s = (rng.s + 0x6D2B79F5) >>> 0
  t = rng.s
  t = imul(t ^ (t >>> 15), t | 1) >>> 0
  t = (t + imul(t ^ (t >>> 7), t | 61)) ^ t
  return ((t ^ (t >>> 14)) >>> 0)
roll(rng, n)          = rng_next(rng) % n            // entier dans [0, n-1], n ≥ 1
chance(rng, permille) = roll(rng, 1000) < permille   // booléen
between(rng, lo, hi)  = lo + roll(rng, hi - lo + 1)  // entier dans [lo, hi]
```
Un seul flux par expédition-étage (voir 0.4). **Chaque tirage est nommé et ordonné** dans ce
document ; ajouter un tirage sans mettre à jour l'ordre casse la rejouabilité.

### 0.4 Dérivation des graines
| Nom | Formule | Usage |
|---|---|---|
| `world_seed` | u32 choisi à la création de la guilde | racine |
| `board_seed` | `h32(world_seed, day, 1)` | tableau de quêtes du jour `day` |
| `expedition_seed` | `h32(world_seed, fnv(quest_id), 2)` | fixé à l'acceptation, jamais recalculé |
| `floor_seed` | `h32(expedition_seed, floor_index, 4)` | flux RNG de l'étage `floor_index` (0-based) |
| `derby_seed` | `h32(world_seed, day, 3)` | roster de la guilde rivale (prototype) |
| `event_seed` | jamais séparé : les événements tirent dans le flux de l'étage | — |

### 0.5 Tirage pondéré
```
pick_weighted(rng, entries) :   // entries = [{key, weight}] dans l'ordre de la table, weight ≥ 0
  total = Σ weight ; si total == 0 → retourne null
  r = roll(rng, total) ; acc = 0
  for e in entries: acc += e.weight ; si r < acc → retourne e.key
```

### 0.6 Place dans `resolveDay` (proposition, à arbitrer par le concepteur boucle de jeu)
```
P1 valider les ordres reçus (tous managers)      P6 repos / infirmerie
P2 chantiers (village)                            P7 EXPÉDITIONS  ← ce document (§6)
P3 récolte (biomes du village)                    P8 RETOURS : application des deltas (§6.7)
P4 entraînement                                   P9 taverne, résultat du derby (§8)
P5 forge / file de craft                          P10 tableau de quêtes de day+1, expirations (§2)
                                                  P11 hachage d'état
```
Les expéditions actives sont résolues **dans l'ordre croissant de `quest_id`** (comparaison de
chaînes ASCII), une par une, chacune avec son propre flux RNG. Aucune expédition ne lit l'état
produit par une autre le même jour.

---

## 1. Types de quêtes

Une quête est toujours résolue par le **même moteur** (§6) : une suite d'étages composés de salles.
Le type fixe la structure, l'objectif, les poids de salles et les récompenses.

### 1.1 Table `quest_types`
| id | nom_fr | days | group_min | group_max | diff_min | diff_max | floors | rooms_per_floor | boss | objective | reward_gold_pct | reward_res_pct | event_base_permille |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hunt` | Chasse | 1 | 2 | 4 | 1 | 8 | 1 | 4 | `none` | `kill_target` | 100 | 60 | 250 |
| `escort` | Escorte | 2 | 2 | 3 | 2 | 7 | 2 | 3 | `none` | `caravan_alive` | 120 | 40 | 450 |
| `exploration` | Exploration | 2 si d≤5, 3 si d≥6 | 1 | 3 | 1 | 6 | = days | 4 | `none` | `rooms_visited` | 80 | 120 | 350 |
| `purge` | Purge | 1 | 3 | 5 | 3 | 10 | 2 + div(d, 4) | 4 | `elite` si d<7, `biome_boss` si d≥7 | `boss_killed` | 130 | 100 | 250 |
| `perilous_harvest` | Récolte périlleuse | 1 | 1 | 3 | 1 | 5 | 1 | 3 | `none` | `harvest_nodes` | 60 | 250 | 250 |
| `siege` | Siège | 3 | 4 | 5 | 6 | 10 | 5 | 5 | `biome_boss_enraged` | `boss_killed` | 180 | 150 | 250 |

* `floors_per_day` : 1 étage par jour pour tous, sauf `siege` = `[2, 2, 1]` (jour 3 = étage du boss).
* Étages : 1 (hunt, récolte) · 2 (escort, exploration d≤5, purge d 3) · 3 (exploration d≥6, purge d 4–7) ·
  4 (purge d 8–10) · 5 (siege). Couverture 1–5 étages.
* Jours multiples : les aventuriers sont **verrouillés** (`busy_until_day`) et l'état d'expédition
  (`expedition_state`, §6.2) est persisté entre deux jours.

### 1.2 Table `difficulty` (d = 1…10)
| d | monster_level | rec_level | gold_base | xp_base | resource_units | item_rolls | item_permille | rarity_bonus | trap_dc |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 2 | 1 | 40 | 60 | 4 | 1 | 500 | 0 | 14 |
| 2 | 4 | 3 | 80 | 90 | 6 | 1 | 600 | 0 | 16 |
| 3 | 6 | 5 | 130 | 130 | 8 | 1 | 700 | 0 | 18 |
| 4 | 8 | 7 | 190 | 180 | 10 | 1 | 800 | 10 | 20 |
| 5 | 10 | 9 | 260 | 240 | 12 | 2 | 600 | 20 | 22 |
| 6 | 12 | 11 | 340 | 310 | 14 | 2 | 700 | 30 | 24 |
| 7 | 14 | 13 | 430 | 390 | 16 | 2 | 800 | 40 | 26 |
| 8 | 16 | 15 | 530 | 480 | 18 | 3 | 700 | 60 | 28 |
| 9 | 18 | 17 | 640 | 580 | 20 | 3 | 800 | 80 | 30 |
| 10 | 20 | 19 | 760 | 700 | 24 | 3 | 900 | 100 | 32 |

* `monster_level` = niveau de tous les monstres et du boss de la quête (les plages de niveau du
  bestiaire filtrent seulement *quelles* espèces peuvent apparaître).
* `xp_base` = XP de quête par aventurier en cas de succès (avant modificateurs §6.6).
* `resource_units` = unités de ressources de la récompense de quête (hors salles récolte/butin).
* `item_rolls` / `item_permille` : nombre de tirages d'objet à la récompense de quête et chance de
  chacun. `rarity_bonus` s'ajoute au tirage de rareté (§6.6).
* Calibrage `[ASSUMÉ]` : un aventurier de niveau `rec_level` équipé normalement doit réussir une
  quête de difficulté d avec ~1 KO tous les 3 jours. Vérification : §5.9.

### 1.3 Objectifs et échec partiel
| objective | succès (`success`) | partiel (`partial`) | échec (`failed`) |
|---|---|---|---|
| `kill_target` | `kills_target ≥ target_count` avec `target_count = 3 + div(d, 2)` | `kills_target * 2 ≥ target_count` | sinon |
| `caravan_alive` | dernier étage terminé et `caravan.hp > 0` | retraite avec `caravan.hp > 0` et ≥ 1 étage terminé | `caravan.hp ≤ 0` (immédiat) |
| `rooms_visited` | toutes les salles visitées (ou sautées par passage secret) | `div(visited * 1000, total) ≥ 600` | sinon |
| `boss_killed` | boss tué | tous les étages non-boss terminés, boss non tué | sinon |
| `harvest_nodes` | toutes les salles récolte exploitées | ≥ 1 salle récolte exploitée | 0 |

Issues possibles d'une expédition : `success` · `partial` · `failed` · `retreat` · `wiped`.
`retreat` = abandon volontaire (§6.4) avant d'atteindre `partial`. `wiped` = tout le groupe KO.

### 1.4 Multiplicateur d'issue
| outcome | reward_pct (récompense de quête : or, XP de base, ressources, tirages d'objet) | sac (butin ramassé) |
|---|---|---|
| `success` | 100 | 100 % conservé |
| `partial` | 50 | 100 % conservé |
| `retreat` | 25 | 100 % conservé |
| `failed` | 20 | 100 % conservé |
| `wiped` | 0 | **perdu** (sac = 0, objets ramassés perdus) |

---

## 2. Tableau de quêtes (génération déterministe)

### 2.1 Entrées
`world_seed`, `day`, `guild_level` (1–10, fourni par le village `[ASSUMÉ]`), `board_bonus[]`
(bonus d'exploration de la veille, §6.5), `active_quest_ids[]`.

### 2.2 Poids des types selon `guild_level` (GL)
| type | GL 1 | GL 2–3 | GL 4–5 | GL 6–10 |
|---|---|---|---|---|
| `hunt` | 400 | 300 | 250 | 200 |
| `perilous_harvest` | 300 | 200 | 150 | 100 |
| `exploration` | 300 | 200 | 200 | 150 |
| `escort` | 0 | 150 | 150 | 150 |
| `purge` | 0 | 150 | 200 | 250 |
| `siege` | 0 | 0 | 50 | 150 |

Biomes : `[{forest, 400}, {mountain, 300}, {marsh, 300}]` (tous ouverts dès GL 1 ; le danger
vient de d). Ressource cible d'une `perilous_harvest` : ressource primaire du biome (§3.1).

### 2.3 Algorithme
```
gen_board(world_seed, day, GL, board_bonus, active_quest_ids) :
  rng = rng_new(h32(world_seed, day, 1))
  n = 3 + roll(rng, 3)                                  // tirage 1 : 3..5 quêtes
  quests = []
  for i in 0 .. n-1 :
    type   = pick_weighted(rng, type_weights(GL))       // tirage 2
    biome  = pick_weighted(rng, biome_weights)          // tirage 3
    d      = clamp(GL - 1 + roll(rng, 4), type.diff_min, type.diff_max)   // tirage 4 : GL-1..GL+2
    ttl    = 1 + roll(rng, 3)                           // tirage 5 : 1..3 jours
    target = (type == hunt) ? pick_weighted(rng, bestiary_of(biome, d.monster_level)) : null  // tirage 6 si hunt
    quests.push({ id: "q" + day + "_" + i, type, biome, difficulty: d, posted_day: day,
                  expires_day: day + ttl, target_monster_id: target,
                  target_count: 3 + div(d, 2), reward_mult_pct: 100, source: "board" })
  for b in board_bonus (ordre d'arrivée) :              // 0 tirage : dérivé
    j = quests.length
    quests.push({ id: "q" + day + "_" + j, type: purge_or_hunt(b), biome: b.biome,
                  difficulty: clamp(b.difficulty + 1, 1, 10), posted_day: day, expires_day: day + 2,
                  reward_mult_pct: 130, source: "exploration" })
    // purge_or_hunt : purge si GL ≥ 2 et d+1 ≥ 3, sinon hunt (target tiré avec un tirage 7 supplémentaire)
  return quests
```
* Le tableau visible le jour `day` = `board(day)` ∪ quêtes non expirées des jours précédents non
  acceptées. Une quête est **retirée** en P10 du jour `expires_day − 1` (elle est donc jouable
  `ttl` jours, `expires_day` exclu). Une quête acceptée n'expire jamais.
* Le jour derby (§8) ajoute une quête `source: "derby"` avant les bonus, sans tirage.
* Vote : chaque manager vote pour un `quest_id` du tableau ; `guild_quest_id` = quête la plus votée,
  égalité → `quest_id` le plus petit (ASCII). La quête de guilde donne `reward_mult_pct += 20`.
  Les autres quêtes restent acceptables par n'importe quel sous-ensemble de managers.

### 2.4 Acceptation = ordres d'expédition
```
expedition_order = { manager_id, quest_id, adventurer_ids: [...] }   // 1 ordre max par manager et par quête
```
Un groupe = union des ordres de tous les managers sur le même `quest_id`. Composition finale (§6.1).

---

## 3. Donjons : biomes, étages, salles

### 3.1 Table `biomes`
| id | nom_fr | ressource primaire `[ASSUMÉ]` | ressource secondaire `[ASSUMÉ]` | boss | outdoor |
|---|---|---|---|---|---|
| `forest` | Forêt de Brumes | `wood` | `herbs`, `hide` | `ancient_sylvan` | true |
| `mountain` | Mont Cendré | `iron_ore` | `stone`, `crystal` | `ash_drake` | false |
| `marsh` | Marais Noir | `swamp_moss` | `venom` | `bog_hydra` | true |

Ids de ressources supposés (8) : `wood, herbs, hide, stone, iron_ore, crystal, swamp_moss, venom`.
L'or n'est pas une ressource d'entrepôt (`gold` = trésorerie).

### 3.2 Table `room_types`
| id | nom_fr | résolution (§6.3) |
|---|---|---|
| `combat` | Salle de combat | rencontre §3.4 → combat §5 |
| `trap` | Piège | test de piège |
| `treasure` | Trésor | coffre ; 150 ‰ mimique |
| `altar` | Autel | prière selon `altar_policy` |
| `rest` | Campement | soin partiel ; 150 ‰ embuscade |
| `harvest` | Filon / clairière | récolte ; 300 ‰ embuscade |
| `boss` | Antre | combat de boss §4.3 |

### 3.3 Poids des salles libres par type de quête (‰, somme 1000)
| quest_type | combat | trap | treasure | altar | rest | harvest |
|---|---|---|---|---|---|---|
| `hunt` | 600 | 200 | 100 | 0 | 0 | 100 |
| `escort` | 500 | 250 | 0 | 100 | 150 | 0 |
| `exploration` | 250 | 250 | 250 | 150 | 50 | 50 |
| `purge` | 550 | 150 | 150 | 100 | 50 | 0 |
| `perilous_harvest` | 300 | 200 | 0 | 0 | 0 | 500 |
| `siege` | 600 | 150 | 100 | 100 | 50 | 0 |

### 3.4 Génération d'un étage
```
gen_floor(quest, floor_index, rng) :       // rng = rng_new(floor_seed) ; premiers tirages du flux
  R = quest.type.rooms_per_floor ; last_floor = (floor_index == quest.floors - 1)
  rooms = []
  for r in 0 .. R-1 :
    if r == 0 and floor_index == 0 :
        kind = (quest.type == perilous_harvest) ? harvest : combat        // 0 tirage
    else if r == R-1 and last_floor :
        kind = (quest.type.boss != none) ? boss : combat                  // 0 tirage
    else if r == R-1 :
        kind = rest                                                       // campement de fin d'étage
    else :
        kind = pick_weighted(rng, room_weights[quest.type])               // tirage
    rooms.push({ index: r, kind, cleared: false })
  // contrainte hunt : au moins 2 salles combat par étage ; si < 2, la première salle libre non-combat devient combat (0 tirage)
  // contrainte perilous_harvest : exactement 2 salles harvest (index 0 et la première salle libre ; les autres harvest tirées deviennent trap)
  return rooms
```
Les rencontres (`gen_encounter`) ne sont **pas** pré-tirées : elles tirent au moment de l'entrée
dans la salle, dans le même flux. Ordre des tirages d'un étage = génération des salles, puis
salle par salle dans l'ordre d'index.

```
gen_encounter(quest, floor_index, room, rng) :
  L = difficulty[quest.difficulty].monster_level
  k = clamp(2 + div(floor_index, 2) + roll(rng, 2), 1, 5)                // tirage : 2..4 (+ étage)
  if room.kind == rest or room.kind == harvest : k = clamp(k - 1, 1, 5)   // embuscades plus petites
  if nest_flag : k = clamp(k + 2, 1, 5)                                   // événement monster_nest
  pool = bestiary.filter(m => m.biome ∈ {quest.biome, any} and m.level_min ≤ L ≤ m.level_max and m.id != mimic)
  monsters = []
  for i in 0 .. k-1 :
    if quest.type == hunt and i < div(k + 1, 2) : id = quest.target_monster_id        // 0 tirage
    else : id = pick_weighted(rng, pool.map(m => {key: m.id, weight: m.spawn_weight})) // tirage
    monsters.push(instantiate(id, L, elite: false, slot: i))
  return monsters
```
Le boss est instancié sans tirage : `instantiate(biome.boss, L, boss: true)` ; pour `purge` d<7 :
`elite` = le monstre de `spawn_weight` maximal du biome éligible à L (égalité → ordre de table),
avec `elite: true`, accompagné de `k−1` monstres normaux (k tiré comme ci-dessus).

### 3.5 Structure des donjons par biome (identique en grammaire, différente en contenu)
| biome | décor de salle (texte chronique) | piège type | autel |
|---|---|---|---|
| `forest` | clairière, ravin, ruines moussues, chênaie noire | fosse à pieux, filet | autel de la Sève |
| `mountain` | galerie, puits, forge abandonnée, pont de corde | éboulement, gaz de mine | autel de la Braise |
| `marsh` | tourbière, ponton pourri, cabane engloutie, île de roseaux | sables mouvants, miasme | autel des Noyés |

---

## 4. Bestiaire

### 4.1 Statistiques de base par niveau L (1–20)
```
hp_base(L)  = 18 + 7 * L        // L1: 25   L10: 88   L20: 158
atk_base(L) = 5 + 2 * L         // L1: 7    L10: 25   L20: 45
def_base(L) = 2 + L             // L1: 3    L10: 12   L20: 22
spd_base(L) = 6 + div(L, 2)     // L1: 6    L10: 11   L20: 16
xp_kill(L)  = 5 + 3 * L         // elite ×2, boss ×5
instantiate(id, L, flags) :
  m = bestiary[id]
  hp_max = pct(hp_base(L), m.hp_pct) ; atk = pct(atk_base(L), m.atk_pct)
  def = pct(def_base(L), m.def_pct) ; spd = pct(spd_base(L), m.spd_pct)
  if flags.elite : hp_max = pct(hp_max, 180) ; atk = pct(atk, 120) ; name_fr += " alpha"
  if flags.boss  : hp_max = pct(hp_base(L), boss.hp_pct) … (voir §4.3)
  return { …, hp: hp_max, level: L, crit_permille: m.crit_permille, evasion_permille: m.evasion_permille,
           status: {}, cooldowns: {}, alive: true, fled: false }
```

### 4.2 Table `monsters` (16)
Pourcentages = multiplicateurs des bases. `target_rule` ∈ {`weakest` (plus faible % PV), `softest`
(plus faible def), `strongest` (plus forte atk), `random`}. Butin : `{res, min, max, ‰}` ou
`{gold, min, max, ‰}` ou `{pool, ‰}` (pool d'objets, fourni par le concepteur objets `[ASSUMÉ]` :
`weapon_pool`, `armor_pool`, `trinket_pool`).

| id | nom_fr | biome | L min–max | hp | atk | def | spd | crit ‰ | eva ‰ | spawn_w | target_rule | capacité spéciale | butin |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `wolf` | Loup gris | forest | 1–8 | 85 | 110 | 80 | 130 | 50 | 50 | 300 | weakest | `pack` : +10 pct atk par autre loup vivant (max +30) | hide 1–2 @700 · herbs 0–1 @200 |
| `bandit` | Brigand | forest | 2–10 | 100 | 100 | 100 | 110 | 80 | 50 | 250 | softest | `pickpocket` : chaque coup au but vole `div(bag_gold, 20)` ; rendu s'il est tué | gold 5–15 @1000 · weapon_pool @100 |
| `giant_spider` | Araignée géante | forest | 3–12 | 90 | 95 | 90 | 120 | 50 | 80 | 200 | random | `venom` : coup au but → `poison` 3 tours | venom 1–1 @600 · hide 0–1 @300 |
| `corrupted_sylvan` | Sylvain corrompu | forest | 5–14 | 130 | 90 | 110 | 70 | 30 | 0 | 150 | strongest | `regen` : +5 % hp_max en début de tour sauf si `burned` | wood 2–4 @900 · herbs 1–2 @500 |
| `forest_troll` | Troll des bois | forest | 8–18 | 170 | 130 | 90 | 60 | 50 | 0 | 100 | strongest | `crush` : n'attaque qu'aux tours pairs, dégâts ×180 pct · `regen` 5 % | hide 2–3 @800 · armor_pool @200 · gold 20–40 @800 |
| `goblin` | Gobelin | mountain | 1–6 | 70 | 90 | 80 | 120 | 50 | 50 | 300 | softest | `coward` : fuit (retiré, 0 XP, 0 butin) si hp < 25 % hp_max | gold 3–8 @900 · iron_ore 0–1 @300 |
| `cave_bat` | Chauve-souris géante | mountain | 1–5 | 50 | 80 | 60 | 160 | 50 | 250 | 250 | random | `erratic` : évasion 250 ‰ | hide 0–1 @200 |
| `kobold_sapper` | Kobold sapeur | mountain | 3–9 | 80 | 100 | 90 | 110 | 50 | 50 | 200 | weakest | `blast` : une fois, quand hp < 50 % : 60 pct atk à tous les conscients (ignore def) puis meurt | iron_ore 1–2 @700 · crystal 0–1 @150 |
| `stone_golem` | Golem de pierre | mountain | 7–16 | 150 | 110 | 160 | 50 | 0 | 0 | 150 | strongest | `stoneskin` : immunisé aux critiques ; subit les dégâts magiques avec def/2 | stone 3–5 @1000 · crystal 1–1 @400 · armor_pool @150 |
| `harpy` | Harpie | mountain | 6–13 | 90 | 105 | 80 | 150 | 80 | 100 | 100 | weakest | `screech` : au tour 1, au lieu d'attaquer : morale −8 à tous les conscients | crystal 0–1 @300 · gold 10–25 @700 · trinket_pool @100 |
| `bog_zombie` | Zombie des tourbières | marsh | 2–9 | 120 | 95 | 90 | 60 | 30 | 0 | 300 | weakest | `tenacious` : la 1re fois que hp ≤ 0, hp = 1 | swamp_moss 1–2 @600 · gold 0–10 @300 |
| `giant_leech` | Sangsue géante | marsh | 1–6 | 80 | 90 | 70 | 90 | 30 | 0 | 250 | weakest | `drain` : se soigne de `div(dmg, 2)` par coup au but | venom 0–1 @400 |
| `will_o_wisp` | Feu follet | marsh | 4–11 | 50 | 120 | 40 | 140 | 100 | 150 | 150 | random | `spectral` : ses attaques sont magiques (def/2) ; les attaques `physical` contre lui font `div(dmg, 2)` | crystal 1–1 @500 · herbs 0–1 @300 |
| `lizardman` | Homme-lézard | marsh | 5–13 | 105 | 115 | 100 | 100 | 80 | 50 | 200 | softest | `spearfish` : crit 250 ‰ contre une cible à hp < 50 % | hide 1–2 @600 · venom 0–1 @300 · weapon_pool @150 |
| `plague_rat_swarm` | Nuée de rats pestiférés | marsh | 3–9 | 90 | 85 | 60 | 130 | 50 | 100 | 100 | random | `plague` : coup au but → fatigue +6 | swamp_moss 0–2 @500 |
| `mimic` | Mimique | any | 3–15 | 130 | 120 | 110 | 70 | 100 | 0 | 0 (jamais tiré) | strongest | `ambush` : agit en premier au tour 1 ; n'apparaît qu'en salle `treasure` (150 ‰) | gold 30–60 @1000 · +1 tirage d'objet, rarity_bonus +20 |

Status utilisés : `poison` (3 tours, `2 + div(L, 4)` dégâts en début de tour de la victime, ignore
def, ne se cumule pas : rafraîchit la durée) · `burned` (1 tour, posé par un coup `fire`) ·
`entangled` (1 tour, saute son action) · `taunted` (voir §5.7).

### 4.3 Table `bosses` (3) — niveau = `monster_level` de la quête
Multiplicateurs communs : hp 400 (siège : 500) · atk 130 · def 120 · spd 100 · crit 100 ‰ · eva 0 ·
xp ×5 · `target_rule = strongest` sauf mention. Or de boss : `gold_base * 2` (tiré `between(rng,
pct(gold_base, 150), pct(gold_base, 250))`).

| id | nom_fr | biome | mécanisme distinct (règles exactes) | butin |
|---|---|---|---|---|
| `ancient_sylvan` | Sylvain Ancestral | forest | **Racines** : quand `round % 3 == 0`, au lieu d'attaquer, pose `entangled` sur l'aventurier conscient de plus haute atk (égalité → slot le plus bas). **Sève profonde** : +8 % hp_max en début de son tour sauf si `burned` (un coup `fire` reçu depuis son dernier tour). **Éveil** (une fois, dès hp < 50 %) : 2 `corrupted_sylvan` apparaissent aux slots libres (niveau L−2, min 1). Siège : racines quand `round % 2 == 0`. | wood 6–10 @1000 · herbs 4–6 @1000 · weapon_pool @1000 (rarity +60) |
| `ash_drake` | Drake des Cendres | mountain | **Souffle cyclique** : `round % 3 == 1` → *inspire* (aucune attaque, chronique) ; `round % 3 == 2` → *souffle* : 120 pct atk **magique** sur tous les conscients ; réduit à `div(dmg, 2)` pour un aventurier dont `spd ≥ drake.spd + 2` ou si `shield_wall` est actif. Autres tours : attaque normale. **Écailles** : immunisé aux critiques tant que hp > 50 %. Siège : cycle sur 2 tours (inspire / souffle). | iron_ore 6–10 @1000 · crystal 3–5 @1000 · armor_pool @1000 (rarity +60) |
| `bog_hydra` | Hydre des Marais | marsh | **Têtes** : `heads = 3` ; à son tour elle attaque `heads` fois (chaque tête recible `weakest`). **Perte de tête** : chaque fois que les dégâts cumulés depuis la dernière perte ≥ 25 % hp_max, `heads −= 1` (min 1) et le compteur repart. **Repousse** : en début de son tour, si `heads < 3` et qu'aucun coup `fire` n'a été reçu pendant le tour précédent : `heads += 1`, hp += 10 % hp_max (siège : 15 %). **Crachat** : `round % 4 == 0` → la 1re tête crache `poison` sur les 2 aventuriers les plus faibles au lieu d'attaquer. | venom 5–8 @1000 · swamp_moss 6–10 @1000 · trinket_pool @1000 (rarity +60) |

Clé de lecture pour les joueurs : la forêt punit l'absence de dégâts de feu (mage), la montagne
récompense la vitesse et le guerrier, le marais exige de finir vite ou de brûler.

---

## 5. Moteur de combat (entiers, tour par tour)

### 5.1 Vue aventurier consommée `[ASSUMÉ — contrat avec le concepteur classes/objets]`
```
adventurer_combat_view = {
  id, name_fr, owner_manager_id, controller_manager_id,   // controller ≠ owner si prêté
  class_id ∈ {warrior, ranger, mage, cleric, rogue},      // [ASSUMÉ] 5 classes
  level (1–20),
  hp_max, hp, atk, def, spd,             // TOTAUX : base classe + niveau + équipement + forme
  crit_permille, evasion_permille,       // totaux (base classe + équipement)
  morale (0–100), fatigue (0–100), injury_days (0 = valide),
  skills: [skill_id, …],                 // compétences actives connues, ordre = priorité
  contract_type ∈ {member, mercenary, loaned}
}
```
Calibrage supposé pour vérifier les formules (§5.9) : `hp_max ≈ 30 + 9 L`, `atk ≈ 6 + 3 L`
(équipement compris), `def ≈ 3 + div(3 L, 2)`, `spd ≈ 7 + div(L, 2)`, crit 50 ‰ (voleur 150),
évasion 0 (rôdeur 50, voleur 100).

### 5.2 Grammaire des compétences (fournie au concepteur classes)
```
skill = { id, name_fr, class_id, cooldown_rounds, trigger, target_rule, effect, power_pct, duration_rounds, tags[] }
trigger     ∈ { always, ally_hp_below_50, enemies_ge_2, enemies_ge_3, enemy_hp_below_50, boss_present }
target_rule ∈ { self, ally_lowest_hp_pct, enemy_lowest_hp, enemy_highest_atk, enemies_all, enemies_up_to_3, allies_all }
effect      ∈ { damage, damage_magic, heal, taunt_defend, buff_atk }
tags        ⊆ { physical, fire, holy, stealth }
```
Compétences de référence (une par classe, tranche 1) :
| id | nom_fr | classe | cd | trigger | target_rule | effect | power_pct | durée | tags | note |
|---|---|---|---|---|---|---|---|---|---|---|
| `shield_wall` | Mur de boucliers | warrior | 4 | ally_hp_below_50 | self | taunt_defend | 50 | 2 | physical | tous les monstres le ciblent ; def ×150 pct |
| `volley` | Volée de flèches | ranger | 3 | enemies_ge_3 | enemies_up_to_3 | damage | 65 | 0 | physical | 3 cibles de plus bas hp |
| `fireball` | Boule de feu | mage | 3 | enemies_ge_2 OU boss_present | enemies_all | damage_magic | 75 | 0 | fire | pose `burned` |
| `prayer_of_mending` | Prière de soin | cleric | 2 | ally_hp_below_50 | ally_lowest_hp_pct | heal | 120 | 0 | holy | soin = `pct(atk, 120) + 10` |
| `backstab` | Coup dans le dos | rogue | 2 | always | enemy_lowest_hp | damage | 130 | 0 | physical, stealth | crit +400 ‰ |

Attaque de base (pas de cooldown) : `effect = damage, power_pct = 100, tags = [physical]`,
`target_rule = enemy_highest_atk` pour `warrior`, `enemy_lowest_hp` pour les autres. Un mage
sans compétence disponible frappe en `damage_magic` 100 pct sans tag `fire`.

### 5.3 État de combat
```
combat = {
  round: 0, party: [slots 0..4], monsters: [slots 0..4], caravan?: {hp, hp_max, def},
  order: [], log: [], kills: 0, kills_target: 0, damage_by_adv: {id: 0}, heal_by_adv: {id: 0},
  ko_this_combat: [], retreat_next_allowed_round: 2, monsters_first: false
}
```
Slots du groupe : ordre déterministe de §6.1. Un aventurier est `conscious` si `hp > 0` et
non `deserted`/`betrayed`. Un monstre est `active` si `alive && !fled`.

### 5.4 Initiative (une fois par combat)
```
for a in party (slot asc)    : a.init = a.spd * 100 + roll(rng, 100)      // tirages I1..In
for m in monsters (slot asc) : m.init = m.spd * 100 + roll(rng, 100)      // tirages In+1..
order = tri décroissant de init ; égalité → aventuriers avant monstres, puis slot croissant
si monsters_first (embuscade, mimique) : au tour 1 seulement, tous les monstres actifs jouent d'abord (ordre de slot), puis les aventuriers dans l'ordre normal
```

### 5.5 Boucle de tour
```
while true :
  round += 1
  if round > 30 : return end(stalemate)                       // cap dur
  if round ≥ 2 and party_should_retreat(): r = attempt_retreat() ; if r == escaped : return end(retreated)
  for actor in order_of_round(round) :
    if actor est aventurier et !conscious : continue
    if actor est monstre et !active      : continue
    tick_status(actor)                                        // poison : dégâts ; entangled : saute ; regen
    if actor.skip_turn : actor.skip_turn = false ; continue
    if actor est aventurier : adventurer_turn(actor) else monster_turn(actor)
    if no active monsters : return end(victory)
    if no conscious adventurers : return end(wiped)
    if caravan and caravan.hp ≤ 0 : return end(caravan_lost)
  décrément des cooldowns et durées de buff (fin de tour) ; fatigue +3 pour chaque conscient
```
`tick_status(actor)` : `poison` → `hp −= 2 + div(L_poison, 4)` (L du poseur), `turns −= 1` ; si
hp ≤ 0 → KO/mort ; `regen` (monstre) → `hp = min(hp_max, hp + pct(hp_max, regen_pct))` sauf `burned` ;
`burned` expire ; `entangled` → `skip_turn = true`, expire.

### 5.6 Tour d'un aventurier
```
adventurer_turn(a) :
  skill = première s dans a.skills telle que cooldown[s] == 0 et trigger_ok(s) et a.fatigue < 80
  action = skill ?? basic_attack(a.class_id)
  targets = resolve_targets(action.target_rule)                 // §5.7, 0 ou 1 tirage (random)
  if targets vide : action = basic_attack ; targets = resolve_targets(…)   // ex. heal sans blessé
  for t in targets : apply_effect(a, t, action)                 // tirages : hit, variance, crit par cible
  if skill : cooldown[skill] = skill.cooldown_rounds ; chronique "skill"
```
`trigger_ok` : `ally_hp_below_50` = ∃ allié conscient avec `hp * 2 < hp_max` · `enemies_ge_N` =
monstres actifs ≥ N · `enemy_hp_below_50` = ∃ monstre actif `hp * 2 < hp_max` · `boss_present` =
∃ monstre `boss` actif (pour `fireball` : `enemies_ge_2 OU boss_present`).

### 5.7 Ciblage déterministe
```
resolve_targets(rule, actor) :
  ADV = aventuriers conscients (slot asc) ; MON = monstres actifs (slot asc)
  self                : [actor]
  ally_lowest_hp_pct  : argmin sur ADV de div(hp * 1000, hp_max), égalité → slot le plus bas
  allies_all          : ADV
  enemy_lowest_hp     : argmin sur MON de hp, égalité → slot le plus bas
  enemy_highest_atk   : argmax sur MON de atk, égalité → slot le plus bas
  enemies_all         : MON
  enemies_up_to_3     : les 3 premiers de MON triés par hp croissant puis slot
monster_target(m) :
  if caravan and chance(rng, 300) : return caravan            // tirage C1 (escorte seulement)
  taunter = aventurier conscient avec status taunt actif ; if taunter : return taunter   // 0 tirage
  weakest  : argmin ADV de div(hp * 1000, hp_max) ; softest : argmin ADV de def ;
  strongest: argmax ADV de atk ; random : ADV[roll(rng, |ADV|)]   // tirage C2 si random
  égalités → slot le plus bas
```

### 5.8 Résolution d'un coup
```
apply_effect(src, tgt, action) :
  if action.effect == heal :
      amount = pct(src.atk, action.power_pct) + 10 ; tgt.hp = min(tgt.hp_max, tgt.hp + amount)
      heal_by_adv[src.id] += amount ; return
  if action.effect == taunt_defend :
      src.status.taunt = duration ; src.status.def_buff = {pct: 100 + power_pct, turns: duration} ; return
  if action.effect == buff_atk : src.status.atk_buff = {pct: 100 + power_pct, turns: duration} ; return

  // --- dégâts ---
  hit_permille = clamp(850 + (src.spd - tgt.spd) * 15, 600, 950) - tgt.evasion_permille
  if !chance(rng, hit_permille) : chronique "miss" ; return              // tirage H
  variance = 90 + roll(rng, 21)                                          // tirage V : 90..110
  atk_eff  = src.atk
  if src est aventurier : atk_eff = pct(atk_eff, morale_mod(src)) ; atk_eff = pct(atk_eff, fatigue_atk_mod(src))
  if src.status.atk_buff : atk_eff = pct(atk_eff, atk_buff.pct)
  if src.pack_bonus : atk_eff = pct(atk_eff, 100 + pack_bonus)
  raw = pct(pct(atk_eff, action.power_pct), variance)
  def_eff = tgt.def
  if tgt.status.def_buff : def_eff = pct(def_eff, def_buff.pct)
  if tgt est aventurier : def_eff = pct(def_eff, fatigue_def_mod(tgt))
  if action.effect == damage_magic or src.spectral : def_eff = div(def_eff, 2)
  if action.ignore_def : def_eff = 0
  dmg = div(raw * raw, raw + def_eff)            // raw ≥ 1 garanti car atk ≥ 1 ; jamais 0 par def seule
  crit_p = src.crit_permille + (action.tags ∋ stealth ? 400 : 0) + (src est aventurier et morale ≥ 70 ? 20 : 0) + src.feat_crit_bonus
  if tgt.crit_immune : crit_p = 0
  if chance(rng, crit_p) : dmg = pct(dmg, 150) ; chronique "crit"     // tirage K
  if tgt.spectral and action.tags ∋ physical : dmg = div(dmg, 2)
  dmg = max(1, dmg)
  tgt.hp -= dmg ; damage_by_adv[src.id] += dmg (si src aventurier)
  on_hit_effects(src, tgt, action, dmg)          // venom → poison ; drain ; pickpocket ; plague ; fire → burned ; hydra head counter
  if tgt.hp ≤ 0 : on_down(tgt)
```
Modificateurs :
| morale | `morale_mod` | fatigue | `fatigue_atk_mod` | `fatigue_def_mod` | compétences |
|---|---|---|---|---|---|
| 0–29 | 90 | 0–59 | 100 | 100 | oui |
| 30–69 | 100 | 60–79 | 90 | 95 | oui |
| 70–100 | 105 | 80–100 | 75 | 85 | **non** |

Ordre des tirages par coup : H (toucher), V (variance), K (critique). Un coup raté ne tire ni V ni K.

`on_down(tgt)` :
* Monstre : `tenacious` non consommé → `hp = 1`, consommé ; sinon `alive = false`, `kills += 1`,
  `kills_target += 1` si `id == quest.target_monster_id`, XP ajouté au pool, butin tiré (§6.6)
  **immédiatement** (tirages B dans l'ordre de la table de butin), `pickpocket` rendu au sac.
* Aventurier : `hp = 0`, `conscious = false`, `ko_this_combat.push(id)`, fatigue +15, morale −8
  pour chaque allié conscient (**ordre de slot**), chronique "ko". Ses statuts sont purgés.
* Caravane : `hp = 0` → fin de combat `caravan_lost`.
* `coward` : vérifié en début de tour du monstre (`hp * 4 < hp_max` → `fled = true`, chronique).

### 5.9 KO, blessure, mort — règle tranchée
* **Par défaut (`iron_mode = false`) : un aventurier ne meurt jamais.** KO → il est porté ; au
  retour il reçoit `injury_days = 2 + roll(rng, 3) + div(d, 3)` (tirage J, ordre de slot), −1 si un
  clerc conscient termine l'expédition (min 1), +`injury_bonus_days` (événement 6).
* **Mode Fer (`iron_mode = true`, option de guilde, hors prototype)** : au retour, chaque aventurier
  KO à l'issue `wiped` tire `chance(rng, 100 + 20 * d)` → mort (tirage D, après J). KO dans une
  expédition non `wiped` : jamais de mort (il a été ramené).
* Au **campement** (fin d'étage non final), les KO se relèvent avec `hp = div(hp_max, 5)` et le
  flag `was_ko = true` (la blessure du retour reste due).

### 5.10 Retraite et fuite
```
party_should_retreat() :
  hp_permille = div(Σ hp(conscients) * 1000, Σ hp_max(tous les membres))
  threshold   = guild.retreat_threshold_permille (défaut 300) + (morale moyenne des conscients < 30 ? 100 : 0)
  return hp_permille < threshold or (conscients == 1 and party_size ≥ 3)
attempt_retreat() :                                   // au plus une tentative tous les 2 tours
  if round < retreat_next_allowed_round : return stay
  p = clamp(500 + (avg_spd(ADV) - avg_spd(MON)) * 30, 200, 900)
  if chance(rng, p) : return escaped                  // tirage R ; les KO sont portés
  retreat_next_allowed_round = round + 2 ; chronique "retreat_failed"
  for m in MON : monster_turn(m)                       // tour gratuit des monstres
  return stay
```
Combat `stalemate` (30 tours) : la salle n'est **pas** nettoyée, aucune blessure supplémentaire,
puis règle d'abandon inter-salles (§6.4).

### 5.11 Vérification de calibrage (à rejouer dans le prototype)
Guerrier L10 (hp 120, atk 36, def 18, spd 12) contre Loup L10 (hp 74, atk 27, def 9, spd 14) :
coup du guerrier : raw 36 → `div(36*36, 36+9) = 28` → 3 coups. Coup du loup : raw 27 →
`div(27*27, 27+18) = 16` → 8 coups pour un KO. Groupe de 4 contre 3–4 monstres : 4–6 tours, ~20 %
des PV du groupe par combat, 4 combats par étage, campement +20 % : tenable à niveau égal, un KO
attendu tous les 2–3 étages sans clerc. **Cette table de calibrage est une hypothèse : la variance
doit être prouvée par 1 000 combats simulés avant tout réglage** (invariant studio).

---

## 6. Résolution d'une expédition

### 6.1 Composition du groupe (phase P1, sans tirage)
```
build_party(quest, orders) :                 // orders = tous les expedition_order de ce quest_id
  orders triés par manager_id (ASCII) ; dans chaque ordre, adventurer_ids dans l'ordre soumis (doublons retirés)
  rejets individuels (chronique "order_rejected", motif) : injury_days > 0 · fatigue ≥ 90 · busy_until_day > day ·
    déjà pris par un ordre antérieur du même manager · id inconnu · controller_manager_id ≠ manager_id
  slots = [] ; tour de table : pour k = 0, 1, 2… prendre le k-ième aventurier valide de chaque manager
    (managers en ordre ASCII) jusqu'à quest.group_max ; les suivants sont rejetés ("group_full")
  if |slots| < quest.group_min : expédition NON LANCÉE, tous rejetés ("group_too_small") ; quête reste au tableau
  return slots  // slot = index dans la liste
```
Un aventurier prêté est envoyé par son `controller_manager_id` ; partages (§6.7) au contrôleur,
XP à l'aventurier, chronique et blessure notifiées à l'`owner_manager_id`.

### 6.2 État persistant d'expédition
```
expedition_state = {
  quest_id, expedition_seed, started_day, day_index (0-based), floor_index, outcome: null,
  party: [{ adventurer_id, slot, controller_manager_id, hp, fatigue, morale, was_ko, deserted, betrayed,
            atk_pct_mod: 100, feat_crit_bonus: 0, xp_bonus_permille: 0, injury_bonus_days: 0 }],
  bag: { gold: 0, resources: {res_id: qty}, items: [], item_rolls_bonus: 0, rarity_bonus: 0 },
  caravan: {hp, hp_max, def} | null,
  counters: { rooms_total, rooms_visited, rooms_cleared, floors_cleared, kills, kills_target, harvest_done, harvest_total,
              ko_count, rounds_total, deserters, boss_killed: false },
  flags: { cursed: false, nest: false, storm: false, feat_pending: null },
  chronicle: [], proof: { orders_hash, state_in_hash, state_out_hash: null }
}
```
Au départ : `hp, fatigue, morale` copiés de l'aventurier ; `rooms_total` = Σ salles de tous les
étages (les étages sont générés à la demande ; `rooms_total = floors * rooms_per_floor`).

### 6.3 Séquence exacte d'un jour d'expédition
```
resolve_expedition_day(state, day) :
  for f in floors_of_day(quest, state.day_index) :          // 1 étage, sauf siège [2,2,1]
    rng = rng_new(h32(state.expedition_seed, f, 4))
    rooms = gen_floor(quest, f, rng)                         // tirages de génération d'abord
    if f == 0 : chronique "depart"
    else       : chronique "floor_enter"
    for room in rooms :
      if abandon_check(state) : state.outcome = retreat ; chronique "abandon" ; return finish(state)
      chronique "room_enter"
      resolve_room(state, room, rng)                          // §6.3.1
      if state.outcome ∈ {wiped, failed} : return finish(state)
      if state.outcome == retreat_from_combat : state.outcome = retreat ; return finish(state)
      state.party.forEach(a conscient → fatigue = clamp(fatigue + 2, 0, 100))
      counters.rooms_visited += 1 ; if room.cleared : counters.rooms_cleared += 1
      maybe_event(state, room, rng)                           // §7, 0 à 2 tirages + effets
      if state.outcome ∈ {wiped, failed} : return finish(state)
      if room.kind == boss and counters.boss_killed : break   // fin de donjon
    counters.floors_cleared += 1
  state.day_index += 1
  if state.day_index == quest.days or counters.boss_killed or all_rooms_done :
      state.outcome = evaluate_objective(state)              // §1.3 → success | partial | failed
      return finish(state)
  chronique "camp_night" ; return state                      // continue demain (aventuriers verrouillés)
```
`abandon_check(state)` (entre deux salles) : `hp_permille < guild.retreat_threshold_permille`
(calcul §5.10) **ou** fatigue moyenne des conscients ≥ 90 **ou** aucun conscient.

#### 6.3.1 Résolution d'une salle
| kind | règles (tirages dans cet ordre) |
|---|---|
| `combat` | `monsters = gen_encounter(…)` ; `run_combat` (§5) ; victoire → `cleared = true`, morale +5 conscients ; `wiped` → outcome ; `retreated` → outcome `retreat_from_combat` ; `stalemate` → non nettoyée ; `caravan_lost` → outcome `failed`. Après victoire : `nest` consommé. |
| `boss` | idem avec le boss (+ `elite`/escorte du boss : `k − 1` monstres normaux pour purge d<7 ; boss seul sinon) ; victoire → `boss_killed = true`, morale +10, chronique "boss_down". |
| `trap` | `best = max(spd + (rogue ? 6 : 0) + (ranger ? 3 : 0))` sur les conscients ; `ok = best + roll(rng, 12) ≥ trap_dc` (tirage T). Succès : `bag.gold += div(gold_base, 10)`, `cleared`. Échec : chaque conscient `hp −= 3 + 3 d` (KO si ≤ 0, avec `on_down`), fatigue +5, `cleared`. |
| `treasure` | `chance(rng, 150)` (tirage M) → mimique : combat avec `[mimic]` seul, puis coffre si victoire. Coffre : `gold += between(rng, pct(gold_base, 20), pct(gold_base, 40))` (tirage G) ; `chance(rng, item_permille)` (tirage O) → `bag.item_rolls_bonus += 1` ; morale +3 ; `cleared`. |
| `altar` | `altar_policy` (réglage de guilde, défaut `pray`) : `pray` → tirage A : 500 ‰ bénédiction (morale +10, `feat_crit_bonus` +100 à tous jusqu'au prochain combat), 300 ‰ rien, 200 ‰ malédiction (fatigue +10 tous, `flags.cursed`). `ignore` → rien. `loot` → `gold += div(gold_base, 5)`, puis tirage A' 500 ‰ malédiction. `cleared`. |
| `rest` | `chance(rng, 150)` (tirage E) → embuscade (combat, `k − 1`) puis soin **moitié**. Soin : conscients `hp += pct(hp_max, storm ? 10 : 20)`, fatigue −12, morale +3 ; KO → relevés `hp = div(hp_max, 5)`, `was_ko` ; `storm` consommé ; `cleared`. |
| `harvest` | `chance(rng, 300)` (tirage E) → embuscade (combat) puis récolte **moitié**. Récolte : `qty = div(resource_units, harvest_total)` de la ressource primaire du biome (récolte périlleuse : ressource de la quête) ; `bag.resources[res] += qty` ; `harvest_done += 1` ; `cleared`. |

### 6.4 Condition d'abandon (résumé)
1. En combat : §5.10 (seuil PV, morale, dernier debout) — tentative avec tirage.
2. Entre les salles : `abandon_check` — sans tirage, immédiat.
3. Automatique : `wiped`, `caravan_lost`, désertion réduisant le groupe à 0.
La retraite ramène **tous** les KO (portés). Seule l'issue `wiped` abandonne le sac.

### 6.5 Fin d'expédition : `finish(state)`
```
finish(state) :
  if outcome == wiped : bag = vide ; morale −15 pour tous
  rewards = compute_rewards(state)                 // §6.6
  distribution = distribute(state, rewards)        // §6.7
  injuries    = compute_injuries(state, rng)       // §5.9, tirages J puis D (mode Fer)
  proof.state_out_hash = fnv(canonical_json(state sans chronicle))
  chronique "return" (résumé : issue, butin, blessés, XP)
  if quest.type == exploration and outcome ∈ {success, partial} :
      board_bonus.push({ biome: quest.biome, difficulty: quest.difficulty })
  return expedition_result                          // §10.2
```

### 6.6 Calcul du butin et de l'XP
```
compute_rewards(state) :
  out_pct = outcome_pct[outcome]                              // §1.4
  quest_gold   = div(gold_base * type.reward_gold_pct * quest.reward_mult_pct * out_pct, 100 * 100 * 100)
  quest_res    = { primary_res(biome): div(resource_units * type.reward_res_pct * out_pct, 100 * 100) }
  xp_quest     = div(xp_base * out_pct, 100)                  // par aventurier, avant modificateurs
  xp_pool      = Σ xp_kill des monstres tués (déjà accumulé pendant les combats)
  item_rolls   = (outcome ∈ {success, partial}) ? difficulty.item_rolls + bag.item_rolls_bonus : 0
  items = []
  for i in 0 .. item_rolls-1 :
    if chance(rng, item_permille) :                              // tirage O_i
      rarity = pick_weighted(rng, rarity_table(difficulty.rarity_bonus + bag.rarity_bonus))   // tirage Q_i
      items.push({ pool: pool_of(biome, rng), rarity, seed: rng_next(rng) })                  // tirages P_i, S_i
  return { gold: bag.gold + quest_gold, resources: bag.resources ⊕ quest_res, items: bag.items ⊕ items, xp_quest, xp_pool }
rarity_table(bonus) : [{common, 700 − bonus}, {uncommon, 220}, {rare, 70 + div(bonus, 2)}, {epic, 10 + div(bonus, 2)}]
pool_of(biome, rng) : pick_weighted(rng, [{weapon_pool, 400}, {armor_pool, 400}, {trinket_pool, 200}])
```
L'objet lui-même (`item_id`, stats) est **généré par le concepteur objets** à partir de
`{pool, rarity, seed, biome, monster_level}` — ce document ne produit que ce quadruplet.

Butin de monstre (au moment du kill, `on_down`) : pour chaque ligne de sa table de butin, dans
l'ordre : `chance(rng, ‰)` puis `between(rng, min, max)` (or/ressource) ou `bag.items.push({pool,
rarity: pick_weighted(…), seed})`. Elite : chaque ligne tirée deux fois. `nest` actif : deux fois.

### 6.7 Répartition entre aventuriers et managers
```
distribute(state, rewards) :
  members = party sans deserted/betrayed ; managers = controller_manager_id distincts, triés ASCII
  // --- OR ---
  guild_cut = permille_of(rewards.gold, guild.guild_cut_permille)      // défaut 200
  rest = rewards.gold − guild_cut
  for m in managers : gold[m] = div(rest * count(members de m), |members|)
  guild_cut += rest − Σ gold[m]                                          // reste d'arrondi → trésorerie de guilde
  // --- RESSOURCES --- : 100 % à l'entrepôt de guilde (bien commun, rejoué par tous)
  // --- XP --- (par aventurier a)
  for a in members :
    share = div(rewards.xp_pool, |members|)
    xp = rewards.xp_quest + share
    if a.level > monster_level + 4 : xp = pct(xp, 50)
    if a.level < monster_level − 4 : xp = pct(xp, 120)
    xp = permille_of(xp, 1000 + a.xp_bonus_permille)                     // mentor
    if a.was_ko or a.hp == 0 : xp = div(xp, 2)
    xp_gain[a.id] = xp
  // --- OBJETS --- : tour de table par contribution
  ranking = members triés par (damage_by_adv + heal_by_adv) décroissant, égalité → slot croissant
  for i, item in rewards.items : owner = ranking[i % |ranking|].controller_manager_id ; item_grants.push({manager_id: owner, item, credited_to: ranking[i % |ranking|].id})
```
Déserteurs et traîtres : 0 or, 0 XP, 0 objet. Contribution `damage + heal` est le seul critère :
un clerc qui n'a fait que soigner est classé par ses soins.

---

## 7. Événements d'expédition (22)

### 7.1 Déclenchement
```
maybe_event(state, room, rng) :
  if events_this_floor ≥ 3 : return
  base = quest.type.event_base_permille
  if !chance(rng, base) : return                                        // tirage EV1
  eligible = events.filter(e => e.phase_ok(room, last_combat) and e.condition(state))
  if eligible vide : return
  e = pick_weighted(rng, eligible)                                      // tirage EV2 (poids de la table, ordre de la table)
  e.apply(state, rng) ; events_this_floor += 1 ; chronique e.template
```
Phases : `after_room` (toute salle), `after_combat_won` (la salle venait d'être gagnée),
`treasure_room`, `trap_room`. Un événement par salle, trois par étage.

### 7.2 Table `expedition_events`
| id | nom_fr | poids | phase | condition | effets (tirages internes notés) |
|---|---|---|---|---|---|
| `ambush` | Embuscade | 120 | after_room | salle non-combat, pas de boss suivant | combat immédiat : `k = 2 + roll(rng, 2)` (tirage), `monsters_first = true` ; butin normal |
| `mercenary_betrayal` | Trahison du mercenaire | 60 | after_room | ∃ membre `contract_type == mercenary` conscient avec morale < 50 | il part (`betrayed = true`, retiré des slots) avec `div(bag.gold * 15, 100)` ; morale −10 aux autres ; sortie `mercenary_betrayed: id` |
| `discovery` | Découverte | 100 | after_room | — | `bag.gold += pct(gold_base, 30)` ; `bag.item_rolls_bonus += 1` |
| `quarrel` | Dispute | 80 | after_room | ≥ 2 managers dans le groupe | les 2 aventuriers de morale la plus basse appartenant à des managers différents : morale −8 chacun ; si un clerc est conscient : −3 |
| `heroic_feat` | Exploit | 70 | after_combat_won | aucun KO dans ce combat | meilleur `damage_by_adv` du combat : `feat_crit_bonus = 300` jusqu'au prochain combat ; morale +10 à tous ; sortie `feats: [id]` |
| `festering_wound` | Blessure qui s'infecte | 60 | after_room | ∃ conscient avec `0 < hp * 10 < hp_max * 3` | ce membre : fatigue +15, `injury_bonus_days += 1` (n'agit qu'en cas de KO ultérieur) |
| `lost_path` | Sentier perdu | 80 | after_room | — | fatigue +8 à tous les conscients |
| `kind_hermit` | Ermite bienveillant | 50 | after_room | `!flags.cursed` | soin `pct(hp_max, 25)` à tous les conscients ; morale +3 |
| `monster_nest` | Nid de monstres | 70 | after_room | la salle suivante est `combat` | `flags.nest = true` : prochain combat `k + 2` (max 5), butin ×2 |
| `secret_passage` | Passage secret | 60 (20 sans voleur ni rôdeur) | after_room | salle suivante ≠ boss et ≠ dernière de l'étage | la salle suivante est sautée (comptée `visited` et `cleared`) |
| `bad_omen` | Mauvais présage | 60 | after_room | — | morale −5 à tous |
| `rival_party` | Groupe rival croisé | 40 | after_room | `day % 7 ≥ 4` (semaine de derby) | morale +5 ; si `day` est le jour du derby : `bag.gold −= div(bag.gold, 10)` |
| `loot_dispute` | Partage contesté | 60 | after_room | ≥ 2 managers et `bag.gold > 50` | `bag.gold −= div(bag.gold, 20)` ; morale −5 aux aventuriers du manager ayant le moins d'aventuriers dans le groupe (égalité → manager ASCII le plus grand) |
| `mentor_moment` | Leçon du vétéran | 50 | after_combat_won | `level_max − level_min ≥ 5` | plus bas niveau : `xp_bonus_permille += 200` ; morale +5 aux deux |
| `broken_weapon` | Arme brisée | 50 | after_combat_won | — | conscient `roll(rng, |ADV|)` (tirage) : `atk_pct_mod = 80` pour le reste de l'expédition ; sortie `item_damage: {adventurer_id, slot: "weapon"}` |
| `sudden_storm` | Orage soudain | 50 | after_room | biome `outdoor` | fatigue +5 à tous ; `flags.storm = true` (prochain campement soigne 10 %) |
| `rescued_captive` | Captif délivré | 40 | after_combat_won | — | morale +5 ; sortie `tavern_candidates: [{seed: rng_next(rng), biome}]` (tirage) |
| `cursed_relic` | Relique maudite | 40 | treasure_room | — | `bag.item_rolls_bonus += 1`, `bag.rarity_bonus += 40` ; morale −10 à tous ; `flags.cursed = true` |
| `second_wind` | Second souffle | 60 | after_combat_won | ≥ 1 KO dans ce combat | conscient de morale la plus basse : morale +15, fatigue −10 |
| `ancient_trap` | Piège des anciens | 40 | trap_room | — | rejoue le test (tirage T') : échec → `hp −= pct(hp_max, 15)` à tous les conscients ; succès → `bag.gold += div(gold_base, 4)` |
| `desertion` | Désertion | 30 | after_room | ∃ conscient morale < 20 et `contract_type ≠ loaned` | il quitte (`deserted = true`, retiré des slots), fatigue +10 pour lui ; morale −5 aux autres ; sortie `deserters: [id]` ; si le groupe tombe à 0 conscient → outcome `retreat` |
| `legend_sighting` | Légende aperçue | 30 | after_room | quête sans boss | morale +3 ; chronique décrivant le boss du biome (préfiguration) |

Effets sur morale/fatigue toujours `clamp(…, 0, 100)`. Le sac d'or ne descend jamais sous 0.

---

## 8. Derby hebdomadaire

* Jours de derby : `day % 7 == 6` (jours 6, 13, 20, 27 → 4 derbies en 30 jours). Biome :
  `biomes[div(day, 7) % 3]`. Quête : `purge`, `d = clamp(GL + 1, 3, 10)`, `id = "derby_" + day`,
  `expedition_seed = h32(world_seed, fnv(id), 2)` — **identique pour les deux guildes**.
* Chaque guilde envoie son propre groupe. La rejouabilité fait que la guilde rivale n'a besoin
  d'échanger que `{party snapshot (vues §5.1), orders}` ; chacun recalcule les deux chroniques.
  Prototype : la guilde rivale « Les Corbeaux de Sel » est simulée : `rng_d = rng_new(derby_seed)`,
  4 aventuriers `[warrior, ranger, cleric, rogue]` de niveau `clamp(avg_level(notre groupe) + roll(rng_d, 3) − 1, 1, 20)`,
  stats = formule de calibrage §5.1 × 110 pct (compense l'absence d'équipement), morale 60, fatigue 20.
* Score d'expédition (entier) :
```
expedition_score = rooms_cleared * 100 + floors_cleared * 150 + (boss_killed ? 600 : 0)
                 + div(loot_gold_value, 5) + kills * 10 + (outcome == success ? 300 : 0)
                 − ko_count * 120 − rounds_total * 3 − deserters * 200
loot_gold_value = gold + Σ resources × prix marchand [ASSUMÉ : 5 par unité] + Σ objets × {common 20, uncommon 60, rare 200, epic 600}
```
* Comparaison : score le plus haut gagne ; égalité → moins de `rounds_total` ; puis moins de
  `ko_count` ; puis match nul. Résultat : `{winner: "us" | "them" | "draw", score_us, score_them}`.
* Récompenses (sortie, appliquées par le village) : gagnant `renown +30`, `gold +pct(gold_base, 50)`
  à la trésorerie de guilde ; perdant `renown +5` ; nul `renown +15` chacun. Les deux chroniques
  sont affichées côte à côte, salle par salle.

---

## 9. Chronique : entrées et gabarits

### 9.1 Format d'une entrée
```
chronicle_entry = { seq, day, quest_id, floor, room, round | null, kind, text_fr, actors: [ids], values: {…}, highlight: bool }
```
`highlight = true` pour : `ko`, `boss_down`, `crit` sur boss, `heroic_feat`, `mercenary_betrayal`,
`desertion`, `retreat`, `wiped`, `return`, tout objet `rare`/`epic`. Le résumé du soir affiche
d'abord les `highlight`, puis le déroulé complet sur demande.

### 9.2 Gabarits (`{a}` aventurier, `{m}` monstre, `{n}` nombre, `{b}` biome, `{r}` décor de salle)
| kind | text_fr |
|---|---|
| `depart` | « {n} aventuriers quittent le village pour {b} : {liste}. » |
| `floor_enter` | « Étage {n} — {r}. » |
| `room_enter` | « Le groupe pénètre dans {r}. » |
| `encounter` | « Surgissent {liste_m} ! » |
| `hit` | « {a} frappe {m} : {n} dégâts. » |
| `miss` | « {a} rate {m}. » |
| `crit` | « Coup critique ! {a} déchire {m} : {n} dégâts. » |
| `skill` | « {a} lance {skill} ! » |
| `heal` | « {a} soigne {b} de {n} PV. » |
| `monster_hit` | « {m} mord {a} : {n} dégâts. » (verbe par monstre) |
| `kill` | « {m} s'effondre. » |
| `ko` | « {a} tombe, hors de combat ! » |
| `boss_intro` | « L'antre s'ouvre : {boss} se dresse. » |
| `boss_mech` | racines : « Les racines du Sylvain enserrent {a}. » · inspire : « Le Drake gonfle ses poumons… » · souffle : « Une nappe de cendres brûlantes ! » · tête : « Une tête de l'Hydre roule au sol ! » / « Une tête repousse… » |
| `boss_down` | « {boss} est vaincu ! Le groupe rugit. » |
| `trap_ok` | « {a} repère le piège à temps. » |
| `trap_fail` | « Le piège se referme : {n} dégâts à chacun. » |
| `treasure` | « Un coffre : {n} pièces d'or{, et quelque chose de brillant}. » |
| `altar` | bénédiction / silence / malédiction (3 textes) |
| `camp` | « Le groupe monte le camp. Soins, ragoût, silence. » |
| `camp_night` | « La nuit tombe sur {b}. Ils repartent demain. » |
| `harvest` | « {n} {res} récoltés dans {r}. » |
| `retreat` | « Trop de sang perdu : le groupe bat en retraite en portant {liste_ko}. » |
| `retreat_failed` | « La fuite échoue, les monstres se ruent ! » |
| `abandon` | « Épuisés, ils rebroussent chemin. » |
| `wiped` | « Personne ne reste debout. Le butin est perdu. » |
| `event_*` | un gabarit par événement (22, §7.2 colonne nom_fr + phrase) |
| `order_rejected` | « {a} ne peut pas partir : {motif}. » |
| `return` | « Retour au village : {issue}. Butin : {n} or, {res}. Blessés : {liste} ({jours} j). XP : {liste_xp}. » |
| `derby` | « Derby contre {rival} : {score_us} à {score_them} — {issue}. » |

---

## 10. Interfaces

### 10.1 Ce que ce système CONSOMME
| Champ (nom exact) | Type | Fournisseur | Note |
|---|---|---|---|
| `world_seed` | u32 | boucle de jeu | racine des graines |
| `day` | int ≥ 0 | boucle de jeu | |
| `guild_level` | int 1–10 | village | pondère le tableau et la difficulté |
| `guild.retreat_threshold_permille` | int, défaut 300 | réglages de guilde (vote) | seuil de retraite |
| `guild.guild_cut_permille` | int, défaut 200 | réglages de guilde | part d'or de la trésorerie |
| `guild.altar_policy` | `pray` \| `ignore` \| `loot` | réglages de guilde | |
| `guild.iron_mode` | bool, défaut false | réglages de guilde | mort possible |
| `adventurer_combat_view` (§5.1) | objet | classes + objets (stats totales) | `hp_max, hp, atk, def, spd, crit_permille, evasion_permille, morale, fatigue, injury_days, level, class_id, skills[], contract_type, owner_manager_id, controller_manager_id` |
| `skills[skill_id]` (§5.2) | grammaire | classes | 5 compétences de référence fournies ici |
| `expedition_orders[]` | `{manager_id, quest_id, adventurer_ids[]}` | boucle de jeu (matin) | reçus avant la limite |
| `guild_votes[]` | `{manager_id, quest_id}` | boucle de jeu | quête de guilde |
| `expedition_states[]` | §6.2 | persistance | expéditions multi-jours en cours |
| `board_bonus[]` | `[{biome, difficulty}]` | ce système (veille) | bonus d'exploration |
| `resource_price[res_id]` | int | économie | pour `loot_gold_value` du derby uniquement |
| `item_pools` : `weapon_pool`, `armor_pool`, `trinket_pool` | ids | objets | seuls les noms sont consommés |
| `resource ids` : `wood, herbs, hide, stone, iron_ore, crystal, swamp_moss, venom` | ids | économie `[ASSUMÉ]` | à réconcilier |

### 10.2 Ce que ce système FOURNIT
```
quest_board_day = { day, quests: [quest], guild_quest_id, expired_quest_ids: [] }
quest = { id, type, biome, difficulty, posted_day, expires_day, target_monster_id, target_count, reward_mult_pct, source,
          preview: { gold_base, xp_base, resource_units, rec_level, group_min, group_max, days, floors } }

expedition_result = {
  quest_id, expedition_seed, outcome ∈ {success, partial, failed, retreat, wiped, in_progress},
  day_index, days_total, busy_until_day,                       // verrouillage des aventuriers si in_progress
  adventurers: [{ adventurer_id, owner_manager_id, controller_manager_id,
                  hp_end, fatigue_delta, morale_delta, xp_gain, injury_days, dead: bool,
                  was_ko, deserted, betrayed, damage_dealt, healing_done, kills }],
  gold_by_manager: { manager_id: int }, gold_to_guild: int,
  resources_to_warehouse: { res_id: qty },
  item_grants: [{ manager_id, credited_to, pool, rarity, seed, biome, monster_level }],   // l'objet est instancié par le système objets
  item_damage: [{ adventurer_id, slot }], mercenary_betrayed: [id], deserters: [id], feats: [id],
  tavern_candidates: [{ seed, biome }], board_bonus: [{ biome, difficulty }],
  counters (§6.2), expedition_score (§8),
  chronicle: [chronicle_entry], highlights: [chronicle_entry],
  proof: { expedition_seed, orders_hash, state_in_hash, state_out_hash, chronicle_hash }
}
derby_result = { day, quest_id, winner, score_us, score_them, chronicle_them: [chronicle_entry], rewards: { renown_us, gold_us, renown_them } }
```
Application des deltas (P8) : `hp = hp_end` ; `fatigue = clamp(fatigue + fatigue_delta, 0, 100)` ;
`morale = clamp(morale + morale_delta, 0, 100)` ; `injury_days` = max avec l'existant ; `xp += xp_gain`
(la montée de niveau est du ressort du système classes) ; `busy_until_day` si `in_progress`.

### 10.3 Ordre de dépendance
`village (guild_level)` → `tableau` → `ordres (managers, IA)` → `expéditions` → `retours` →
`classes (XP, niveaux)`, `économie (or, entrepôt)`, `objets (item_grants, item_damage)`,
`recrutement (tavern_candidates, mercenary_betrayed)`, `village (renown, board_bonus)`.

---

## 11. Cas limites

| Situation | Règle |
|---|---|
| Aucun ordre d'expédition reçu | Aucune expédition ; le tableau expire normalement ; chronique du soir : « La guilde est restée au village. » |
| Groupe < `group_min` | Expédition non lancée ; aventuriers marqués `order_rejected: group_too_small`, disponibles pour rien d'autre ce jour-là (ils ont attendu à la porte) ; la quête reste au tableau si non expirée. |
| Groupe > `group_max` | Tour de table §6.1 ; surnuméraires rejetés `group_full`, aucun malus. |
| Aventurier blessé (`injury_days > 0`) ou fatigue ≥ 90 dans un ordre | Rejeté individuellement ; le reste de l'ordre est valide. |
| Tous les aventuriers de la guilde blessés | Aucun groupe possible ; tableau intact ; expirations normales. |
| Même aventurier dans deux ordres d'un même manager | Le premier `quest_id` (ASCII) le garde ; rejet `already_assigned` sur l'autre. |
| Aventurier prêté envoyé par son propriétaire pendant le prêt | Rejet `not_controller` (seul le contrôleur envoie). |
| Niveau du groupe ≪ `rec_level` (d10 avec des niveaux 1) | Aucune interdiction ; la retraite (§5.10) et l'abandon (§6.4) limitent la casse ; XP ×120 pct si `level < monster_level − 4`. |
| Niveau ≫ `monster_level + 4` | XP ×50 pct ; butin inchangé (évite le farm sans le bloquer). |
| Tous KO (`wiped`) | Sac perdu, récompense 0, blessures pour tous, morale −15 ; en mode Fer : jet de mort par KO. |
| Un seul survivant conscient dans un groupe ≥ 3 | Tentative de retraite immédiate à chaque tour (§5.10). |
| Combat sans monstre (`k` mal calculé) | `k` est borné à [1, 5] ; un pool vide (biome/niveau sans espèce) → repli sur `wolf`/`goblin`/`bog_zombie` selon biome (0 tirage). |
| Boss avec `heads` déjà à 1 et repousse | `heads = min(3, heads + 1)`. |
| Sac d'or négatif (vol, dispute, rival) | Toute soustraction = `bag.gold = max(0, bag.gold − x)`. |
| Or de la trésorerie négatif | Impossible depuis ce système (il ne fait qu'ajouter). |
| Entrepôt plein | Hors périmètre : `resources_to_warehouse` est fourni tel quel ; règle proposée à l'économie : excédent vendu au marchand à 25 % du prix. |
| Escorte : caravane déjà à 0 au 2e jour | Impossible : `caravan_lost` termine l'expédition le jour même. |
| Expiration pendant une expédition multi-jours | Une quête acceptée n'expire jamais. |
| `guild_level` hors 1–10 | `clamp(GL, 1, 10)` avant génération. |
| `world_seed = 0` | Valide (mulberry32 accepte 0). |
| Tableau vide (tous poids 0) | Impossible : `hunt` a toujours un poids > 0. |
| Étage sans aucune salle combat (`exploration`) | Autorisé ; l'XP vient seulement de `xp_base`. |
| 30 tours de combat | `stalemate` : salle non nettoyée, pas de butin, pas de KO supplémentaire ; puis `abandon_check`. |
| Compétence sans cible valide (soin sans blessé) | Repli sur l'attaque de base ; le cooldown n'est pas consommé. |
| Fatigue ≥ 80 | Compétences désactivées, atk 75 pct, def 85 pct — l'aventurier reste en jeu. |
| Morale 0 | `morale_mod` 90 ; désertion possible (§7) ; seuil de retraite +100 ‰. |
| Désertion réduisant le groupe à 0 | Issue `retreat` immédiate (les déserteurs rentrent seuls). |
| Mercenaire prêté qui trahit | `contract_type` est `loaned` OU `mercenary`, jamais les deux : un mercenaire prêté est `loaned` (pas de trahison, pas de désertion). |
| Rejouer (`Rejouer`) | Recalcul depuis `{expedition_seed, state_in, orders}` → doit produire `state_out_hash` et `chronicle_hash` identiques ; toute divergence = bug de déterminisme, affichée en rouge. |
| Deux expéditions le même jour sur la même quête | Impossible : un `quest_id` = une expédition (les ordres fusionnent). |
| Objet `epic` en tirage sans pool | `pool_of` a toujours un poids total > 0. |
| Dépassement int32 | Bornes §0.1 ; `raw * raw` ≤ 2000² = 4·10⁶. |

---

## 12. Fun à la minute 12

* **Le suspense du soir** : la chronique déroule salle par salle, avec les `highlight` en tête —
  « Coup critique sur l'Hydre » ou « {a} tombe » se lit avant le détail. On veut savoir *qui* est
  tombé et *ce qu'on ramène*.
* **Le lendemain est déjà en jeu** : un siège sur 3 jours laisse le groupe *au campement* ce soir,
  avec 2 blessés relevés à 20 % de PV et un boss demain. Lancer la journée suivante, c'est savoir
  s'ils tiennent.
* **Chaque manager repart avec quelque chose** : l'or est partagé au prorata, les objets vont au
  contributeur (le clerc qui n'a fait que soigner peut rafler l'arme rare), la chronique le nomme.
* **La quête bonus d'exploration** : une exploration réussie fait apparaître demain une quête à
  +1 difficulté et +30 % — la découverte a une conséquence visible au tableau.
* **Le derby** tous les 7 jours : même graine, même donjon, deux chroniques côte à côte — la
  comparaison salle par salle rend chaque KO évitable et chaque exploit racontable.
* **Le boss qui a une réponse** : sans mage en forêt, sans guerrier en montagne, sans feu au marais,
  la chronique dit pourquoi ça a raté — et ce qu'il faut entraîner ou recruter.

---

## 13. Questions ouvertes

1. Classes : les 5 ids `warrior, ranger, mage, cleric, rogue` et la grammaire de compétence §5.2
   conviennent-ils au concepteur classes ? Faut-il une 2e compétence par classe dès la tranche 1 ?
2. Stats totales : le concepteur classes/objets fournit-il bien `atk, def, spd, hp_max, crit_permille,
   evasion_permille` déjà agrégés (équipement et forme inclus), ou ce moteur doit-il agréger ?
3. Courbe d'XP : hypothèse `xp_to_next(L) = 60 L + 20 L²` (niveau ~13 à J30). À valider contre la
   courbe du concepteur classes ; sinon ajuster `xp_base` et `xp_kill`.
4. Ressources : les 8 ids et le rattachement par biome sont supposés ; l'économie tranche.
5. Objets : `item_grants` livre `{pool, rarity, seed, biome, monster_level}` — suffisant pour
   instancier un objet déterministe côté objets ? Recettes hors périmètre ici.
6. Place des expéditions dans `resolveDay` (P7/P8, §0.6) : avant ou après l'infirmerie et la récolte ?
7. Mode Fer : gardé hors prototype ; faut-il l'exposer dans le prototype comme case à cocher pour
   tester l'émotion de la mort ?
8. Vote de guilde : le bonus +20 % de la quête de guilde suffit-il à la coop, ou faut-il rendre la
   quête de guilde obligatoire pour au moins un aventurier par manager ?
9. Derby : la guilde rivale simulée compense l'absence d'équipement par ×110 pct — à mesurer sur
   1 000 derbies simulés (invariant variance).
10. Calibrage global : aucun chiffre de ce document n'est prouvé ; le prototype doit embarquer un
    simulateur (N combats / N expéditions par difficulté) avant tout réglage.
