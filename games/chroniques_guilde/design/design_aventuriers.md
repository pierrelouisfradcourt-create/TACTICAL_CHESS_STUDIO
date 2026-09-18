# Chroniques de Guilde — Système AVENTURIERS (classes, attributs, niveaux, état, entraînement, carrière, taverne)

Date : 2026-09-17 · Source : sous-agent de conception (Fable 5.1), mission « Aventuriers », workflow Chroniques de Guilde.
Statut : proposition de design, tranche 1 (prototype HTML solo + 2 co-managers simulés, ~30 jours de jeu).
Portée : ce document définit la DONNÉE et les RÈGLES des aventuriers. Il ne définit ni le combat (donjons),
ni l'économie, ni le village ; il précise seulement ce qu'il leur consomme et ce qu'il leur fournit (§14).

---

## 0. Conventions communes (rappel, appliquées partout ici)

* Tout nombre est un ENTIER. Probabilités en permille (0-1000), multiplicateurs en centièmes (100 = x1)
  ou en millièmes quand précisé (1000 = x1).
* `a / b` = division entière TRONQUÉE VERS ZÉRO (`Math.trunc(a / b)` en JS, `int(a / b)` en Python ;
  attention : `//` Python arrondit vers -inf, ne pas l'utiliser sur des dividendes négatifs).
  Les formules ci-dessous sont écrites pour n'avoir que des dividendes >= 0.
* `clamp(x, lo, hi)` = `min(hi, max(lo, x))`.
* `rng(n)` = tirage d'un entier dans `[0, n-1]` sur LE générateur unique de la journée (dérivé de la graine).
  Toute règle qui tire est marquée « TIRAGE » et l'ordre des tirages est fixé : héros triés par `hero_id`
  ASCII croissant, managers par index croissant, offres de taverne par index croissant.
* Les puissances (`combat_profile`, `gather_power`, `craft_power`, `heal_power`) sont TOUJOURS calculées
  sur l'état du MATIN (état d'entrée de `resolveDay`), jamais sur l'état en cours de modification.
* Clés de données : `snake_case` ASCII anglais. Textes affichés : français.
* Aucun champ dérivé n'est stocké dans l'état (le hachage d'état ne porte que les champs du §12).

---

## 1. Vue d'ensemble

Un aventurier (héros) est le « joueur de club ». Il a :
* une **classe** (5), un **niveau** (1-20) et 6 **attributs** entiers dérivés déterministiquement du niveau,
  de la classe, de la rareté, de l'entraînement et de l'âge ;
* un **état quotidien** : forme, fatigue, moral (0-100), blessure (gravité + jours) ;
* une **carrière** : âge en saisons, déclin, retraite → maître du village ;
* un **contrat** (salaire, durée) et un **propriétaire** (manager), éventuellement un **prêt** ;
* 1 à 2 **traits** de personnalité qui colorent la chronique et modulent moral/fatigue.

Chaque jour, le manager assigne une **activité** à chacun de ses héros :
`expedition` · `gather` (cible : biome) · `train` (cible : programme) · `craft` · `rest` · `infirmary`
(patient) · `heal` (soignant) · `idle` (par défaut si aucune action reçue).

---

## 2. Classes

### 2.1 Table des classes

| class_id  | Nom FR   | Rôle en combat                       | primary_attr | secondary_attr | Affinité d'activité                                   |
|-----------|----------|--------------------------------------|--------------|----------------|-------------------------------------------------------|
| `warrior` | Guerrier | Ligne de front, encaisse, protège    | `strength`   | `vigor`        | Forge (armes/armures) +30 · récolte montagne +50      |
| `ranger`  | Rôdeur   | Dégâts à distance, éclaireur         | `dexterity`  | `vigor`        | Récolte forêt +50 · pistage (moins d'embuscades)      |
| `mage`    | Mage     | Dégâts de zone, contrôle             | `mind`       | `will`         | Forge (potions/enchantements) +30 · récolte marais +50|
| `cleric`  | Clerc    | Soutien, soin, protection            | `will`       | `mind`         | Soin (infirmerie) x2 · récolte marais +25             |
| `rogue`   | Voleur   | Dégâts mêlée, pièges, coffres, butin | `luck`       | `dexterity`    | Butin +, toute récolte +20                            |

### 2.2 Compétences (3 par classe, débloquées à niveau fixe : 1, 5, 10)

Une compétence a un **rang** 1..3 (rang 1 au déblocage, rangs 2-3 par entraînement §7.4).
`rank_mult_permille = {1: 1000, 2: 1250, 3: 1500}` s'applique au NOMBRE PRINCIPAL de la compétence
(colonne « valeur »). `type` : `passive` (toujours active), `active` (utilisée par le moteur de combat
selon sa propre règle de déclenchement), `activity` (hors combat).

| skill_id          | class_id  | Nom FR              | unlock_level | type     | Effet (valeur principale en gras)                                                      | Coût |
|-------------------|-----------|---------------------|--------------|----------|----------------------------------------------------------------------------------------|------|
| `taunt`           | `warrior` | Provocation         | 1            | passive  | `target_priority` +100 ; dégâts subis x(1000 - **100**)/1000                            | —    |
| `bulwark`         | `warrior` | Rempart             | 5            | active   | 1 fois par étage : dégâts subis par TOUS les alliés x(1000 - **250**)/1000 pendant 1 tour | —  |
| `sunder_strike`   | `warrior` | Frappe brisante     | 10           | active   | Attaque x**150**/100, ignore 50 % de la défense de la cible                            | fatigue +5 |
| `precise_shot`    | `ranger`  | Tir précis          | 1            | passive  | `crit_permille` +**100**                                                                | —    |
| `tracking`        | `ranger`  | Pistage             | 5            | activity | Expédition : `ambush_permille` -**200** pour l'équipe ; `find_permille` +150 ; récolte forêt x110/100 | — |
| `volley`          | `ranger`  | Volée               | 10           | active   | Touche TOUS les ennemis à **60** % de l'attaque                                        | fatigue +5 |
| `fire_bolt`       | `mage`    | Trait de feu        | 1            | active   | Magie x**130**/100 sur une cible                                                        | —    |
| `frost_hold`      | `mage`    | Emprise de givre    | 5            | active   | Une cible saute 1 tour (boss : **500** ‰ de réussite, sinon 1000 ‰)                     | —    |
| `storm`           | `mage`    | Tempête             | 10           | active   | Magie x**80**/100 sur TOUS les ennemis                                                  | fatigue +10 |
| `healing_prayer`  | `cleric`  | Prière de soin      | 1            | active   | Soigne un allié de `heal` x**100**/100 PV                                               | —    |
| `blessing`        | `cleric`  | Bénédiction         | 5            | passive  | Malus de moral de défaite de l'équipe x**50**/100 ; 1 fois par expédition : gravité de la 1re blessure de l'équipe -1 | — |
| `last_breath`     | `cleric`  | Souffle ultime      | 10           | active   | 1 fois par expédition : un allié KO revient avec **30** % de ses PV max                  | fatigue +10 |
| `lockpick`        | `rogue`   | Crochetage          | 1            | activity | Coffres : `bonus_loot_permille` +**300** ; dégâts de pièges x50/100 pour l'équipe        | —    |
| `shadow_strike`   | `rogue`   | Coup de l'ombre     | 5            | active   | Premier tour du combat : attaque x**200**/100 sur une cible                             | —    |
| `sticky_fingers`  | `rogue`   | Doigts de fée       | 10           | passive  | Or de butin x(1000 + **250**)/1000 pour l'équipe ; 50 ‰ par expédition d'une ligne de chronique « emprunt » (sans effet) | — |

Règle : `skill_unlocked(hero, skill) = hero.level >= unlock_level AND skill.class_id == hero.class_id`.
Les compétences `active` sont FOURNIES au moteur de combat (§14) qui décide seul quand les déclencher.

---

## 3. Attributs

### 3.1 Les 6 attributs

| attr_id     | Nom FR   | Sert à (indicatif, les formules exactes sont en §3.4)                        |
|-------------|----------|-------------------------------------------------------------------------------|
| `strength`  | Force    | Attaque mêlée, défense, récolte montagne, forge d'armes                        |
| `dexterity` | Adresse  | Attaque à distance, esquive, récolte forêt, artisanat fin                      |
| `mind`      | Esprit   | Magie, alchimie, récolte marais                                                |
| `vigor`     | Vigueur  | PV max, défense, durée des blessures (réduit)                                  |
| `will`      | Volonté  | Soin, résistance au moral bas                                                  |
| `luck`      | Chance   | Critiques, butin, accidents évités                                             |

Bornes : `ATTR_MIN = 1`, `ATTR_MAX = 60` (plafond dur, toutes sources confondues).

### 3.2 Valeurs de départ (niveau 1) — somme 60 pour chaque classe

| class_id  | strength | dexterity | mind | vigor | will | luck |
|-----------|----------|-----------|------|-------|------|------|
| `warrior` | 16       | 10        | 5    | 14    | 9    | 6    |
| `ranger`  | 10       | 16        | 7    | 11    | 8    | 8    |
| `mage`    | 5        | 8         | 16   | 8     | 14   | 9    |
| `cleric`  | 7        | 7         | 12   | 10    | 16   | 8    |
| `rogue`   | 8        | 14        | 7    | 9     | 6    | 16   |

### 3.3 Croissance par niveau (en centièmes de point par niveau — somme 600 = +6 pts/niveau)

| class_id  | strength | dexterity | mind | vigor | will | luck | dump_attr (le plus bas) |
|-----------|----------|-----------|------|-------|------|------|-------------------------|
| `warrior` | 200      | 75        | 25   | 150   | 100  | 50   | `mind`                  |
| `ranger`  | 75       | 200       | 50   | 125   | 75   | 75   | `mind`                  |
| `mage`    | 25       | 50        | 200  | 75    | 150  | 100  | `strength`              |
| `cleric`  | 50       | 50        | 150  | 100   | 200  | 50   | `strength`              |
| `rogue`   | 50       | 150       | 50   | 75    | 50   | 225  | `strength`              |

Règle déterministe, aucun jet :

```
base_attr(hero, a) = START[hero.class_id][a] + GROWTH[hero.class_id][a] * (hero.level - 1) / 100
```

Exemple : guerrier niveau 20 → strength = 16 + 200*19/100 = 54 ; mind = 5 + 25*19/100 = 9.

### 3.4 Attribut effectif et profils dérivés

```
attr_eff(hero, a) = clamp(
    base_attr(hero, a)
    + hero.bonus_attrs[a]        # rareté (§9.3), permanent
    + hero.trained[a]            # entraînement (§7), 0..10
    - hero.decline[a]            # déclin d'âge (§8.2)
    + TRAIT_ATTR_MOD(hero, a),   # veinard: luck +3 ; fragile: vigor -2
    ATTR_MIN, ATTR_MAX)
```

`perf_pct` (centièmes, plage [20, 110]) — la « forme du jour » qui multiplie toutes les puissances :

```
perf_pct(hero) = 50 + hero.form * 2 / 5 + hero.morale / 5 - max(0, hero.fatigue - 50) * 3 / 5
```

`combat_profile(hero)` (fourni au moteur de combat, calculé le matin) :

| champ                 | formule                                                                                   |
|-----------------------|-------------------------------------------------------------------------------------------|
| `hp_max`              | `(20 + vigor * 3 + level * 2) * perf_pct / 100`                                           |
| `attack`              | warrior : `strength*2 + dexterity` · ranger/rogue : `dexterity*2 + strength` · mage : `mind + dexterity` · cleric : `will + strength` ; puis `* perf_pct / 100` |
| `magic`               | `(mind * 2 + will) * perf_pct / 100`                                                      |
| `heal`                | `(will * 2 + mind) * perf_pct / 100`                                                      |
| `defense`             | `vigor + strength / 2` (l'équipement s'ajoute côté objets)                                |
| `crit_permille`       | `min(400, 30 + luck * 5)` (+ compétences passives)                                        |
| `dodge_permille`      | `min(350, dexterity * 4)`                                                                 |
| `target_priority`     | `0` (+100 `taunt`, +50 `brave`, -50 `coward`)                                             |
| `injury_risk_bonus_permille` | `0` ; +100 si fatigue >= 60 ; +200 si fatigue >= 80 ; +50 `brave` ; -100 `coward`  |
| `skills`              | liste `{skill_id, type, rank, value_scaled}` des compétences débloquées (valeur x rank_mult) |

Tous les attributs ci-dessus sont `attr_eff`.

---

## 4. Niveaux et XP

### 4.1 Table d'XP cumulée (`XP_CUM[level]`)

Formule : `delta(L) = 50 * L` pour `L` de 2 à 10 ; `delta(L) = 100 * (L - 5)` pour `L` de 11 à 20.

| level | xp_cum | delta | jour estimé (hypothèse 130 XP/jour) |
|-------|--------|-------|-------------------------------------|
| 1     | 0      | —     | 0                                   |
| 2     | 100    | 100   | 1                                   |
| 3     | 250    | 150   | 2                                   |
| 4     | 450    | 200   | 4                                   |
| 5     | 700    | 250   | 6                                   |
| 6     | 1000   | 300   | 8                                   |
| 7     | 1350   | 350   | 11                                  |
| 8     | 1750   | 400   | 14                                  |
| 9     | 2200   | 450   | 17                                  |
| 10    | 2700   | 500   | 21                                  |
| 11    | 3300   | 600   | 26                                  |
| 12    | 4000   | 700   | 31                                  |
| 13    | 4800   | 800   | 37                                  |
| 14    | 5700   | 900   | 44                                  |
| 15    | 6700   | 1000  | 52                                  |
| 16    | 7800   | 1100  | 60                                  |
| 17    | 9000   | 1200  | 70                                  |
| 18    | 10300  | 1300  | 80                                  |
| 19    | 11700  | 1400  | 90                                  |
| 20    | 13200  | 1500  | 102                                 |

Plafond : `LEVEL_MAX = 20`. Un héros niveau 20 n'accumule plus d'XP (`xp` figé à 13200).
Dans la tranche 1, un héros de départ atteint ~11-12 en 30 jours ; les recrues rares/légendaires
arrivent plus haut. Le plafond 20 n'est atteint que par un légendaire bien mené.

### 4.2 Sources d'XP (par jour et par héros)

| source                    | montant                                                                                             |
|---------------------------|-----------------------------------------------------------------------------------------------------|
| Expédition (donjon/quête) | `quest.xp_reward` (fourni par le système Quêtes ; hypothèse de calibrage : `40 + 20 * quest_level`) |
| Entraînement              | `10 + 5 * training_ground.level` (x(1000 + master_sage_bp)/1000 si maître mage présent)             |
| Récolte / forge           | `5`                                                                                                 |
| Soigner (`heal`)          | `8`                                                                                                 |
| Repos / infirmerie / idle | `0`                                                                                                 |

Modificateurs d'XP d'expédition, appliqués dans cet ordre (division entière à chaque étape) :

```
xp = quest.xp_reward
if hero.level - quest.level >= 5:            xp = xp * 50 / 100     # trop fort pour la quête
if result.knocked_out:                        xp = xp * 25 / 100     # KO pendant l'expédition
if result.outcome == "retreat":               xp = xp * 50 / 100
if hero.age_seasons < AGE_YOUNG (6):          xp = xp * 110 / 100    # jeune : apprend vite
```

### 4.3 Montée de niveau

```
apply_xp(hero, amount):
  if hero.level >= LEVEL_MAX: return
  hero.xp += amount
  while hero.level < LEVEL_MAX and hero.xp >= XP_CUM[hero.level + 1]:
    hero.level += 1
    morale_delta(hero, +5) ; form_delta(hero, +5)
    emit("hero_level_up", {hero_id, level})
    for skill in SKILLS where skill.class_id == hero.class_id and skill.unlock_level == hero.level:
      hero.skill_ranks[skill.skill_id] = 1
      emit("skill_unlocked", {hero_id, skill_id})
  if hero.level == LEVEL_MAX: hero.xp = XP_CUM[LEVEL_MAX]
```

---

## 5. État quotidien

### 5.1 Champs

| champ            | plage      | sens                                                              |
|------------------|------------|-------------------------------------------------------------------|
| `form`           | 0..100     | Condition physique ; dérive vers 50 ; plafonnée par l'âge (§8.2)  |
| `fatigue`        | 0..100     | 100 = repos forcé                                                  |
| `morale`         | 0..100     | < 20 : peut refuser l'expédition ; < 10 trois jours : part          |
| `injury.severity`| 0..3       | 0 aucune · 1 légère · 2 moyenne · 3 grave                          |
| `injury.days_left`| 0..40     | Jours avant guérison ; 0 ⇔ severity 0                              |
| `scars`          | 0..3       | Nombre de blessures graves subies ; 3 = retraite forcée            |

Étiquette d'humeur (dérivée, pour la chronique) :
`mood = morale >= 80 ? "exalte" : morale >= 60 ? "content" : morale >= 40 ? "neutre" : morale >= 20 ? "grognon" : "brise"`.

### 5.2 Variations par activité (appliquées le soir, sur l'activité EFFECTIVE §5.5)

| activité     | fatigue                                 | form              | morale              | XP  |
|--------------|-----------------------------------------|-------------------|---------------------|-----|
| `expedition` | `+25 + 5 * floors_visited`              | victoire +5 / défaite -10 / retraite -3 | voir §5.3 | §4.2 |
| `gather`     | +15                                     | +2                | 0                   | 5   |
| `train`      | +20                                     | +8                | -2                  | §4.2 |
| `craft`      | +10                                     | 0                 | +1                  | 5   |
| `heal`       | +10                                     | 0                 | +3                  | 8   |
| `rest`       | -40                                     | +10               | +5                  | 0   |
| `infirmary`  | -30                                     | +5                | +3                  | 0   |
| `idle`       | -20                                     | -5                | -3                  | 0   |

Avant les deltas d'activité : **dérive de forme** `form += sign(50 - form) * min(2, abs(50 - form))`.
Après tous les deltas : `fatigue = clamp(fatigue, 0, 100)`, `morale = clamp(morale, 0, 100)`,
`form = clamp(form, 0, form_cap(hero))` (§8.2).
Modificateurs de traits sur ces deltas : §11.

### 5.3 Moral : événements d'expédition (par héros participant)

| événement                                             | delta moral |
|-------------------------------------------------------|-------------|
| `outcome == "victory"`                                | +10         |
| `outcome == "defeat"`                                 | -15         |
| `outcome == "retreat"`                                | -5          |
| par compagnon de l'équipe blessé (severity >= 2)      | -3          |
| soi-même blessé severity 1 / 2 / 3                    | -5 / -10 / -20 |
| `loot_rarity_max >= "rare"` (butin rare ou mieux vu)  | +3          |
| exploit personnel (`result.exploit == true`)          | +5          |
| trahison subie (`result.betrayed == true`)            | -8          |

### 5.4 Blessures

Nouvelle blessure (gravité `s` fournie par le combat, ou accident d'activité) :

```
INJURY_DAYS = { 1: {base: 2, spread: 3}, 2: {base: 5, spread: 5}, 3: {base: 10, spread: 11} }
days = INJURY_DAYS[s].base + rng(INJURY_DAYS[s].spread)                  # TIRAGE
days = days - attr_eff(hero, "vigor") / 20                               # vigueur 1..60 → -0..-3
days = days + TRAIT_INJURY_DAYS(hero)                                    # veinard -1, fragile +2
days = max(1, days)
if s > hero.injury.severity:  hero.injury = {severity: s, days_left: days}
else:                          hero.injury.days_left += days / 2         # re-blessé : on prolonge
if s == 3: hero.scars += 1
```

Accidents d'activité (TIRAGE par héros concerné, ordre `hero_id`) :
`ACCIDENT_PERMILLE = {gather: 15, craft: 10, train: 10}` ; doublé si `fatigue >= 80` ;
`luck >= 30` : -5 ‰. Si `rng(1000) < p` → blessure severity 1 + ligne de chronique.

Contraintes par gravité (validation du matin, §5.5) :

| severity | activités autorisées                                     | perf     |
|----------|----------------------------------------------------------|----------|
| 1        | tout sauf `expedition` ; `train` à tp x50/100            | -20 pts  |
| 2        | `rest`, `infirmary`, `idle`                              | —        |
| 3        | `rest`, `infirmary`, `idle`                              | —        |

Récupération (chaque soir, dans cet ordre, pour tous les blessés) :

```
1. naturel :  days_left -= 1
2. infirmerie : si activité effective == "infirmary" : days_left -= INFIRMARY_HEAL[infirmary.level]
               INFIRMARY_HEAL = {0: 0, 1: 1, 2: 2, 3: 3} ; capacité INFIRMARY_CAP = {0: 0, 1: 2, 2: 4, 3: 6}
               + 1 si maître soigneur (master_healer) présent au village
3. soignants : chaque héros en activité "heal" dispose de heal_days = heal_power(hero) (§6.3 : will/10, x2 si
               clerc ; le rang de `healing_prayer` ne joue qu'en combat) ; ces jours sont distribués 1 par
               patient EN INFIRMERIE, patients triés (severity desc, hero_id asc), jusqu'à épuisement.
4. si days_left <= 0 : injury = {0, 0}, emit("hero_recovered")
```

### 5.5 Validation du matin (avant l'expédition) → activité effective

Exécutée dans l'ordre `hero_id` croissant. Produit `activity_effective[hero_id]` et `refusals[]`.

```
validate(hero, action):
  act = action ? action.activity : "idle"
  # propriétaire ou emprunteur ?
  if hero.loan != null and action.manager != hero.loan.to: act = "idle"    # seul l'emprunteur commande
  if hero.loan == null and action.manager != hero.owner:  act = "idle"
  # fatigue
  if hero.fatigue >= 100: act = "rest" ; note("epuise")
  # blessure
  if hero.injury.severity >= 2 and act not in {rest, infirmary, idle}: act = "rest" ; note("blesse")
  if hero.injury.severity == 1 and act == "expedition":               act = "rest" ; note("blesse")
  # infirmerie
  if act == "infirmary" and (hero.injury.severity == 0 or infirmary_slots_left == 0): act = "rest"
  if act == "infirmary": infirmary_slots_left -= 1
  if act == "heal" and infirmary.level == 0: act = "rest"
  # moral : refus (TIRAGE seulement si concerné)
  if act == "expedition" and hero.morale < 20:
      p = has_trait(hero, "coward") ? 500 : 300
      if rng(1000) < p: act = "idle" ; refusals.push(hero_id) ; note("refuse")
  if act == "expedition" and hero.morale < 30 and has_trait(hero, "coward") and rng(1000) < 500:
      act = "idle" ; refusals.push(hero_id)
  return act
```

Un héros dont l'activité effective devient `idle`/`rest` alors qu'il était prévu en expédition en est
retiré ; si l'équipe d'expédition tombe à 0, l'expédition du jour est annulée (§15).

---

## 6. Activités hors combat et affinités

### 6.1 Récolte (`gather`, cible `biome_id`)

Affinité de classe par biome (centièmes additionnels) et attribut de récolte :

| biome_id   | Nom FR   | gather_attr | warrior | ranger | mage | cleric | rogue |
|------------|----------|-------------|---------|--------|------|--------|-------|
| `forest`   | Forêt    | `dexterity` | 0       | +50    | 0    | +10    | +20   |
| `mountain` | Montagne | `strength`  | +50     | +10    | 0    | 0      | +20   |
| `marsh`    | Marais   | `mind`      | 0       | +10    | +50  | +25    | +20   |

```
gather_power(hero, biome) = (10 + attr_eff(hero, gather_attr[biome]))
                            * (100 + GATHER_AFFINITY[biome][hero.class_id]) / 100
                            * perf_pct(hero) / 100
                            * (has_trait(hero,"diligent") ? 110 : 100) / 100
                            * (tracking débloqué et biome == forest ? 110 : 100) / 100
                            * (master_hunter présent et biome in {forest, mountain} ? (1000 + bp) : 1000) / 1000
```
Fourni à l'Économie ; suggestion de conversion : `units = gather_power / 10` (rôdeur niv.1 en forêt → 3 unités,
niv.20 → 9).

### 6.2 Forge / artisanat (`craft`)

```
CRAFT_ATTR = {warrior: strength, mage: mind, ranger: dexterity, cleric: dexterity, rogue: dexterity}
CRAFT_AFFINITY = {warrior: 30, mage: 30, ranger: 0, cleric: 0, rogue: 10}
craft_power(hero) = (10 + attr_eff(hero, CRAFT_ATTR[class])) * (100 + CRAFT_AFFINITY[class]) / 100
                    * perf_pct(hero) / 100
                    * (master_smith présent ? (1000 + bp) : 1000) / 1000
```
Fourni à l'Économie/Forge comme « points de travail du jour » sur la file de craft. La spécialité
(guerrier → armes/armures, mage → potions/enchantements) est un TAG `craft_specialty` que la forge peut
utiliser pour +20 % sur les recettes de la bonne catégorie (décision côté Objets).

### 6.3 Soin (`heal`)

```
heal_power(hero) = attr_eff(hero, "will") / 10 * (hero.class_id == "cleric" ? 2 : 1)   # jours de soin à distribuer
```
Clerc niv.1 (will 16) → 2 jours/jour ; niv.10 (will 34) → 6. Un non-clerc will 12 → 1.

---

## 7. Entraînement

### 7.1 Programmes

| program_id            | Nom FR                 | cible                       | condition                         |
|-----------------------|------------------------|-----------------------------|-----------------------------------|
| `attr:strength`       | Musculation            | `trained.strength`          | —                                 |
| `attr:dexterity`      | Tir et esquive         | `trained.dexterity`         | —                                 |
| `attr:mind`           | Étude des grimoires    | `trained.mind`              | —                                 |
| `attr:vigor`          | Endurance              | `trained.vigor`             | —                                 |
| `attr:will`           | Méditation             | `trained.will`              | —                                 |
| `attr:luck`           | Jeux de dés            | `trained.luck`              | —                                 |
| `skill:<skill_id>`    | Perfectionnement       | `skill_ranks[skill_id]`     | compétence débloquée, rang < 3    |

### 7.2 Points d'entraînement par jour (`tp`)

```
TP_BASE = {0: 4, 1: 12, 2: 16, 3: 20}            # niveau du terrain d'entraînement (0 = pas de bâtiment)
tp = TP_BASE[training_ground.level]
if program est attr et attr == primary_attr[class]:  tp = tp * 120 / 100
if program est attr et attr == dump_attr[class]:     tp = tp * 80 / 100
if has_trait(hero, "diligent"): tp = tp * 125 / 100
if has_trait(hero, "lazy"):     tp = tp * 70 / 100
if hero.age_seasons < 6:        tp = tp * 120 / 100
if hero.age_seasons >= 12:      tp = tp * 50 / 100
if hero.injury.severity == 1:   tp = tp * 50 / 100
if has_trait(hero, "hothead"):  tp = tp + 2
if maître de la même classe présent au village : tp = tp + 2
hero.train_points[target] += tp
```

### 7.3 Seuils d'attribut

```
TP_THRESHOLD(k) = 20 + 10 * k          # k = trained[attr] actuel, 0..9 → 20, 30, ..., 110
TRAINED_MAX = 10
while trained[a] < TRAINED_MAX and train_points[a] >= TP_THRESHOLD(trained[a]):
    train_points[a] -= TP_THRESHOLD(trained[a]) ; trained[a] += 1
    emit("hero_attr_trained", {hero_id, attr, value: attr_eff})
```
Calibrage : terrain niv.1, attribut principal (14 tp/j) → +1 en 2 j, +5 en ~15 j, +10 en ~47 j.

### 7.4 Rangs de compétence

`SKILL_RANK_THRESHOLD = {1: 40, 2: 60}` (tp pour passer 1→2, puis 2→3). Même boucle que ci-dessus
sur `train_points["skill:<id>"]`.

### 7.5 Spécialisation (titre)

`specialization(hero)` = attribut dont `trained` est le plus haut, si `>= 5` (égalité : ordre de la table §3.1).
Titres affichés : `strength` Colosse · `dexterity` Fine-Lame · `mind` Érudit · `vigor` Roc ·
`will` Inébranlable · `luck` Chanceux. Cosmétique + chronique (« Aldric le Colosse »), aucun effet chiffré
supplémentaire (l'effet est déjà dans `trained`).

---

## 8. Carrière

### 8.1 Âge

* `SEASON_DAYS = 10` : tous les 10 jours (`day % 10 == 0`, fin de phase héros), `age_seasons += 1` pour tous.
* Paliers : `AGE_YOUNG = 6` (jeune si `< 6`), `AGE_PRIME = 6..11`, `AGE_DECLINE = 12`,
  `AGE_RETIRE_MIN = 14` (retraite volontaire possible), `AGE_RETIRE_FORCED = 20`.
* Âge à la génération (TIRAGE §9.3) : commun/peu commun `4 + rng(12)` (4..15), rare `5 + rng(8)`,
  légendaire `6 + rng(5)`.

### 8.2 Déclin (à chaque changement de saison, si `age_seasons >= 12`)

```
hero.decline[primary_attr[class]] += 1
if hero.age_seasons >= 16: for a in ATTRS: hero.decline[a] += 1
form_cap(hero) = age_seasons <= 11 ? 100 : max(50, 100 - 5 * (age_seasons - 11))
```
(16 saisons → form_cap 75, 19 → 60.) Un vétéran reste utile (compétences, rangs) mais s'use.

### 8.3 Retraite → maître

```
can_retire(hero)   = hero.age_seasons >= 14 or hero.scars >= 3
forced_retire(hero)= hero.age_seasons >= 20 or hero.scars >= 3
retire(hero):                                     # action manager "retire" ou forcée à la saison
  remove hero from owner roster
  if hero.level >= MASTER_MIN_LEVEL (8):
    m = {master_id: MASTER_OF[class], hero_name, level: hero.level, bonus_permille: hero.level * 5}
    if state.village.masters[class] absent OR its.level < hero.level: state.village.masters[class] = m
    emit("hero_retired_master") else emit("hero_retired_replaced")
  else emit("hero_retired")                       # « retourne aux champs »
```
Un seul maître par classe. `bonus_permille = level * 5` → 40 (niv.8) à 100 (niv.20).

| class_id  | master_id       | Nom FR            | Bonus au village (bp = bonus_permille)                                  |
|-----------|-----------------|-------------------|-------------------------------------------------------------------------|
| `warrior` | `master_smith`  | Maître forgeron   | `craft_power` x(1000+bp)/1000 pour tous ; +2 tp aux guerriers           |
| `ranger`  | `master_hunter` | Maître chasseur   | `gather_power` x(1000+bp)/1000 en forêt et montagne ; +2 tp aux rôdeurs |
| `mage`    | `master_sage`   | Maître sage       | XP d'entraînement x(1000+bp)/1000 pour tous ; +2 tp aux mages           |
| `cleric`  | `master_healer` | Maître soigneur   | Infirmerie : +1 jour de récupération/jour à chaque patient ; +2 tp aux clercs |
| `rogue`   | `master_fence`  | Maître receleur   | Prix de vente au marchand x(1000+bp)/1000 (fourni à l'Économie) ; +2 tp aux voleurs |

Les maîtres ne combattent pas, ne vieillissent plus, n'ont pas de salaire.

---

## 9. Taverne (recrutement) et prêt

### 9.1 Offres par jour

`TAVERN_OFFERS = {0: 0, 1: 2, 2: 3, 3: 4}` selon `tavern.level`. Chaque offre vit 3 jours
(`expires_day = day + 3`, disparaît quand `day >= expires_day`). Génération en fin de phase héros
(après vieillissement), TIRAGES dans l'ordre des offres. Une offre est commune à la guilde (état commun,
rejoué ; §14).

### 9.2 Rareté (TIRAGE `r = rng(1000)`)

| tavern.level | common      | uncommon    | rare        | legendary   |
|--------------|-------------|-------------|-------------|-------------|
| 1            | r < 700     | sinon       | —           | —           |
| 2            | r < 600     | r < 900     | sinon       | —           |
| 3            | r < 550     | r < 830     | r < 980     | sinon       |

### 9.3 Génération d'une recrue (ordre exact des tirages)

```
guild_avg_level = max(1, sum(level of all guild heroes) / max(1, count))   # 1 si roster vide
gen_recruit(day, i):
  rarity  = roll_rarity(rng(1000))                                          # T1
  level   = clamp(1, 20, guild_avg_level - 2 + rng(5) + RARITY_LVL[rarity]) # T2 ; RARITY_LVL = {0,0,2,4}
  class   = CLASSES[rng(5)]                                                 # T3 ; ordre: warrior,ranger,mage,cleric,rogue
  gender  = rng(2) == 0 ? "m" : "f"                                          # T4
  first   = FIRST_NAMES[gender][rng(24)]                                     # T5
  epithet = EPITHETS[rng(24)]                                                # T6
  age     = AGE_BASE[rarity] + rng(AGE_SPREAD[rarity])                       # T7 ; base {4,4,5,6}, spread {12,12,8,5}
  traits  = gen_traits(rarity)                                               # T8.. (§11.2)
  bonus   = gen_bonus_attrs(class, rarity)                                   # T9.. (ci-dessous)
  contract_days = 15 + 15 * rng(3)                                           # 15 / 30 / 45
  xp = XP_CUM[level] ; skill_ranks = 1 pour chaque compétence de classe avec unlock_level <= level
  if rarity == legendary: rang 2 sur la compétence de niveau 1
  cost_gold = 40 + level * level * 4 + RARITY_COST[rarity]                   # RARITY_COST = {0, 80, 250, 700}
  wage      = (2 + level) * (100 + 25 * RARITY_IDX[rarity]) / 100            # idx {0,1,2,3}
  offer_id  = "t_" + day + "_" + i
```

Bonus d'attributs par rareté (`bonus_attrs`, permanents) :

| rarity      | primary | secondary | aléatoires (TIRAGE `ATTRS[rng(6)]`, cumulables) | total |
|-------------|---------|-----------|-------------------------------------------------|-------|
| `common`    | 0       | 0         | —                                               | 0     |
| `uncommon`  | +2      | +2        | —                                               | +4    |
| `rare`      | +4      | +2        | +2 x1                                           | +8    |
| `legendary` | +6      | +4        | +2 x2                                           | +14   |

Exemples de coût : niv.3 commun 76 or · niv.6 peu commun 264 · niv.10 rare 690 · niv.14 légendaire 1524.
Salaire : niv.5 commun 7 or/j · niv.10 rare 18 or/j.

### 9.4 Achat, contrat, renouvellement, renvoi

* Action `{type: "recruit", offer_id, manager}` (matin). Validée dans l'ordre des managers (index croissant) :
  offre existante et non expirée · `gold >= cost_gold` · `roster_count(manager) < roster_cap(manager)`
  avec `roster_cap = 5 + housing.level` (les prêts reçus comptent, les prêts donnés aussi).
  Le premier valide gagne, les suivants sont rejetés (« arrivé trop tard à la taverne »).
* À l'achat : `hero_id = "h_" + manager + "_" + zero_pad(next_index[manager], 3)`, `owner = manager`,
  `contract = {wage, days_left: contract_days, unpaid_days: 0}`, état initial `form 50, fatigue 0, morale 60`.
* Héros fondateurs (roster de départ) : `wage = 0`, `days_left = -1` (illimité).
* Salaire : payé chaque soir (étape 0 de la phase héros) par le propriétaire. Or insuffisant →
  `unpaid_days += 1`, moral -10 ; `unpaid_days >= 3` → le héros part (même `loyal`). Payé → `unpaid_days = 0`.
* Contrat : `days_left -= 1` chaque soir ; à `days_left == 0`, si aucune action `renew` reçue ce jour → départ
  en fin de phase. `renew` coûte `level * 20` or et remet `days_left = 30`. L'UI prévient à J-3.
* `release` (renvoyer) : retire le héros ; les autres héros du manager : moral -2.
* Départ (`hero_left`) : le héros disparaît (pas de retour en taverne dans la tranche 1).

### 9.5 Roster de départ (jour 0, déterministe)

Manager joueur `m0` : Guerrier niv.2 âge 7 · Rôdeur niv.2 âge 5 (jeune) · Clerc niv.3 âge 13 (vétéran,
arc « dernier donjon → maître soigneur »). Managers IA `m1`, `m2` : 3 héros, classes `CLASSES[rng(5)]`
avec avancement d'index modulo 5 en cas de doublon, niveaux `1 + rng(3)`, âges `5 + rng(8)`, tous `common`,
noms par le générateur (§10), traits par §11.2. Fondateurs : salaire 0.

### 9.6 Prêt entre managers

```
action {type: "loan", hero_id, to_manager, days}   # matin, par le propriétaire
valide si: days in 1..7 · hero.loan == null · hero.injury.severity == 0 · to_manager != owner
           · roster_count(to_manager) < roster_cap(to_manager)
effet:  hero.loan = {to: to_manager, days_left: days} ; si trait loyal : moral -10
pendant: seules les actions de `to` s'appliquent (§5.5) ; XP, état, entraînement restent sur le héros ;
         le salaire reste payé par le propriétaire ; le butin va à l'expédition (règle commune).
fin:    chaque soir days_left -= 1 ; à 0 → loan = null, emit("hero_loan_ended")
        blessure severity >= 2 pendant le prêt → retour immédiat (loan = null), emit("hero_loan_ended")
le propriétaire ne peut pas rappeler avant la fin. Un seul prêt à la fois par héros.
```

---

## 10. Génération de noms

Format : `first_name + " " + epithet` (ex. « Aldric des Marais », « Mahaut Brise-Fer »).
Le `gender` sert uniquement aux accords de la chronique (blessé/blessée). Les épithètes sont choisies
invariables en genre. Collision de nom dans la guilde → suffixe « II », « III »…

`FIRST_NAMES.m` (24) : Aldric, Bastien, Corentin, Doriann, Enguerrand, Firmin, Gaultier, Hugues, Isambart,
Jehan, Lancelin, Mathurin, Nestor, Odilon, Perceval, Quentin, Raoul, Sigebert, Thibault, Ulric, Valère,
Wandrille, Yvon, Zacharie.

`FIRST_NAMES.f` (24) : Adélie, Brunehaut, Clothilde, Delphine, Élise, Flavie, Garance, Hersende, Isaure,
Jeanne, Léonie, Mahaut, Nolwenn, Ondine, Pernelle, Quitterie, Rosalinde, Sibylle, Tiphaine, Ursule, Violaine,
Wivine, Ysolde, Zélie.

`EPITHETS` (24) : des Marais, du Val Gris, de la Combe, de la Lande, du Pont-Cassé, Brise-Fer, Coupe-Bourse,
Longue-Vue, Bonne-Étoile, Trois-Doigts, Sans-Peur, Sans-Terre, au Poing d'Acier, aux Yeux de Cendre,
à la Cape Rouge, Vent-Debout, Œil-de-Lynx, Cœur-de-Chêne, Pied-Léger, Main-Froide, Dent-de-Loup,
Bec-de-Corbeau, Tête-de-Fer, Chante-Pluie.

Générateur : voir §9.3 (T4-T6). 48 x 24 = 1152 combinaisons, largement assez pour 30 jours.

---

## 11. Traits de personnalité (12)

### 11.1 Table

| trait_id   | Nom FR     | polarité | Effet chiffré                                                                                                   | Accroche de chronique        |
|------------|------------|----------|-----------------------------------------------------------------------------------------------------------------|------------------------------|
| `brave`    | Brave      | +        | malus moral de défaite x50/100 ; `target_priority` +50 ; `injury_risk_bonus_permille` +50                       | « charge en tête »           |
| `coward`   | Peureux    | -        | refus d'expédition : 500 ‰ si moral < 20, 500 ‰ si moral < 30 ; `target_priority` -50 ; risque de blessure -100 ‰ ; -5 moral supplémentaire par compagnon blessé | « se cache derrière le bouclier » |
| `stoic`    | Stoïque    | +        | gains de fatigue x80/100 ; toute variation de moral x50/100 (hausses et baisses)                                | « ne dit rien »              |
| `hothead`  | Sanguin    | 0        | moral +5 supplémentaire à la victoire, -5 à la défaite ; tp +2 ; querelle (§11.3)                                 | « cherche la bagarre »       |
| `greedy`   | Cupide     | -        | moral +8 si `loot_rarity_max >= rare` ; -5 si `loot_count == 0` ; 30 ‰ par expédition d'empocher 1 objet commun du butin (`loot_stolen`) | « les yeux qui brillent » |
| `loyal`    | Loyal      | +        | moral +2 le soir d'une expédition avec >= 1 membre de `last_team` ; prêt : moral -10 ; ne part jamais pour moral bas (part si impayé) | « fidèle jusqu'au bout » |
| `lazy`     | Paresseux  | -        | tp x70/100 ; `rest` : fatigue -50 au lieu de -40, moral +5 supplémentaire                                       | « bâille »                   |
| `diligent` | Appliqué   | +        | tp x125/100 ; `gather_power` x110/100 ; `train` : fatigue +5 supplémentaire                                      | « reste après les autres »   |
| `lucky`    | Veinard    | +        | `luck` effectif +3 ; jours de blessure -1                                                                        | « s'en sort par miracle »    |
| `fragile`  | Fragile    | -        | jours de blessure +2 ; `vigor` effectif -2 ; `expedition` : fatigue +5 supplémentaire                            | « revient en piteux état »   |
| `cheerful` | Jovial     | +        | chaque soir : moral +1 à tous les AUTRES héros du même manager (non cumulable entre plusieurs joviaux) ; propre moral plancher 20 | « chante faux »   |
| `whiner`   | Râleur     | -        | chaque soir : moral -1 ; compagnons d'expédition : moral -3 en cas de défaite ; querelle (§11.3)                 | « se plaint du temps »       |

Incompatibilités : `brave`/`coward`, `lazy`/`diligent`, `cheerful`/`whiner`, `stoic`/`hothead`.
`TRAITS` ordonnés comme dans la table (index 0..11) pour le générateur.

### 11.2 Attribution (TIRAGES)

```
POSITIVE = [brave, stoic, loyal, diligent, lucky, cheerful]
gen_traits(rarity):
  n = rarity in {common, uncommon} ? 1 : 2
  t1 = rarity in {rare, legendary} ? POSITIVE[rng(6)] : TRAITS[rng(12)]       # rare+ : 1 positif garanti
  if n == 1: return [t1]
  t2 = rarity == legendary ? POSITIVE[rng(6)] : TRAITS[rng(12)]
  while t2 == t1 or incompatible(t1, t2): t2 = next_in_list(t2)                 # avance d'index, sans tirage
  return [t1, t2]
```

### 11.3 Querelles

Pour chaque équipe d'expédition du jour, pour chaque paire (id1 < id2) où l'un est `hothead` et l'autre
`hothead` ou `whiner` : TIRAGE `rng(1000) < 100` → moral -5 aux deux, ligne de chronique « dispute ».

---

## 12. Schéma de données et constantes

### 12.1 Enregistrement `hero` (tout ce qui est stocké ; rien d'autre)

```json
{
  "hero_id": "h_m0_001",
  "owner": "m0",
  "first_name": "Aldric",
  "epithet": "des Marais",
  "gender": "m",
  "class_id": "warrior",
  "rarity": "common",
  "level": 2,
  "xp": 120,
  "bonus_attrs": {"strength": 0, "dexterity": 0, "mind": 0, "vigor": 0, "will": 0, "luck": 0},
  "trained":     {"strength": 0, "dexterity": 0, "mind": 0, "vigor": 0, "will": 0, "luck": 0},
  "decline":     {"strength": 0, "dexterity": 0, "mind": 0, "vigor": 0, "will": 0, "luck": 0},
  "train_points": {},
  "skill_ranks": {"taunt": 1},
  "form": 50,
  "fatigue": 0,
  "morale": 60,
  "injury": {"severity": 0, "days_left": 0},
  "scars": 0,
  "age_seasons": 7,
  "traits": ["brave"],
  "contract": {"wage": 0, "days_left": -1, "unpaid_days": 0},
  "loan": null,
  "low_morale_streak": 0,
  "last_team": [],
  "history": {"expeditions": 0, "victories": 0, "injuries": 0, "level_ups": 0}
}
```
`train_points` : clés `"strength"`… ou `"skill:taunt"`, absentes = 0. Sérialisation canonique pour le hachage :
clés triées, héros triés par `hero_id`, entiers uniquement, `null` autorisé pour `loan`.

Enregistrement `tavern_offer` : `{offer_id, day_created, expires_day, hero (sans owner/hero_id/contract),
cost_gold, wage, contract_days}`. Enregistrement `master` : `{master_id, class_id, hero_name, level, bonus_permille}`.

### 12.2 Constantes (bloc unique, transposable en JSON)

```
ATTR_MIN 1 · ATTR_MAX 60 · LEVEL_MAX 20 · TRAINED_MAX 10
SEASON_DAYS 10 · AGE_YOUNG 6 · AGE_DECLINE 12 · AGE_RETIRE_MIN 14 · AGE_RETIRE_FORCED 20
MASTER_MIN_LEVEL 8 · SCARS_MAX 3
FATIGUE_FORCED_REST 100 · MORALE_REFUSE 20 · MORALE_LEAVE 10 · MORALE_LEAVE_STREAK 3 · UNPAID_LEAVE 3
TP_BASE {0:4, 1:12, 2:16, 3:20} · SKILL_RANK_THRESHOLD {1:40, 2:60}
INFIRMARY_HEAL {0:0, 1:1, 2:2, 3:3} · INFIRMARY_CAP {0:0, 1:2, 2:4, 3:6}
TAVERN_OFFERS {0:0, 1:2, 2:3, 3:4} · OFFER_TTL_DAYS 3 · ROSTER_CAP_BASE 5
RARITY_LVL {common:0, uncommon:0, rare:2, legendary:4} · RARITY_COST {0, 80, 250, 700}
ACCIDENT_PERMILLE {gather:15, craft:10, train:10}
INJURY_DAYS {1:{2,3}, 2:{5,5}, 3:{10,11}}
LOAN_DAYS_MAX 7 · RENEW_DAYS 30 · RENEW_COST_PER_LEVEL 20
```

---

## 13. Ordre de résolution — les deux moments de la journée où ce système agit

Proposé au concepteur « Journée/Résolution » ; à intégrer tel quel ou à renuméroter.

```
MATIN (dans resolveDay, avant tout combat)
  H0. validate_hero_actions (§5.5) → activity_effective, refusals, teams d'expédition définitives
  H1. calcul des profils du matin : combat_profile, gather_power, craft_power, heal_power (état d'entrée)
  → phases EXPÉDITION, RÉCOLTE, FORGE (autres systèmes) consomment H0/H1

SOIR — PHASE HÉROS (après expédition/récolte/forge, avant chantiers du village)
  H2. contrats : salaires (unpaid_days, moral -10), days_left -= 1
  H3. dérive de forme (±2 vers 50)
  H4. deltas d'activité (§5.2) selon activity_effective, modifiés par traits
  H5. résultats d'expédition (§5.3) : moral, exploits, trahisons, querelles (§11.3, TIRAGES)
  H6. blessures : nouvelles (combat → jours, TIRAGES), accidents d'activité (TIRAGES), récupération (§5.4)
  H7. XP et montées de niveau (§4.3)
  H8. traits quotidiens : cheerful, whiner, loyal ; last_team mis à jour pour les expéditionnaires
  H9. clamps (fatigue, morale, form ≤ form_cap)
  H10. départs : unpaid >= 3 · contrat à 0 sans renew · morale < 10 → low_morale_streak (+1, sinon 0) ;
       streak >= 3 et non loyal → hero_left · prêts : days_left -= 1, retours
  H11. retraites demandées (action "retire") puis, si day % SEASON_DAYS == 0 : vieillissement, déclin,
       retraites forcées, form_cap
  H12. taverne : purge des offres expirées, génération des nouvelles (TIRAGES)
  → phases VILLAGE, CHRONIQUE (autres systèmes)
```
Chaque étape parcourt les héros par `hero_id` croissant. Les tirages ont lieu uniquement aux étapes
marquées TIRAGES, dans cet ordre.

---

## 14. Interfaces

### 14.1 Ce que le système AVENTURIERS consomme

| Fournisseur         | Champ (nom exact proposé)                                        | Usage ici                                    |
|---------------------|------------------------------------------------------------------|----------------------------------------------|
| Journée / moteur    | `day` (entier, jour 1..), `seed`, `rng(n)`                        | vieillissement, taverne, tirages             |
| Journée / actions   | `actions[manager][hero_id] = {activity, target}` ; `hero_ops[] = {type: recruit\|loan\|renew\|release\|retire, ...}` | validation du matin |
| Village             | `village.buildings.training_ground.level` (0-3), `infirmary.level` (0-3), `tavern.level` (0-3), `housing[manager].level` (0-3) | tp, soins, offres, roster_cap |
| Village             | `village.masters[class_id]` (§12.1)                              | bonus maîtres                                |
| Économie            | `managers[m].gold` (lecture/écriture pour salaires, achats, renouvellements) | contrats, taverne              |
| Quêtes / Donjons    | `quest.level`, `quest.xp_reward`                                 | XP                                           |
| Combat / Expédition | `expedition_result[hero_id] = {outcome: victory\|defeat\|retreat, floors_visited, knocked_out, injury_severity (0-3), exploit (bool), betrayed (bool), loot_rarity_max (common\|uncommon\|rare\|legendary\|none), loot_count}` et `expedition_teams[] = [hero_id...]` | état du soir |
| Objets              | rien dans la tranche 1 (l'équipement modifie `defense`/`attack` côté combat, pas ici) | —              |

### 14.2 Ce que le système AVENTURIERS fournit

| Consommateur         | Champ (nom exact proposé)                                                                 |
|----------------------|-------------------------------------------------------------------------------------------|
| Combat / Expédition  | `combat_profile(hero_id)` = `{hp_max, attack, magic, heal, defense, crit_permille, dodge_permille, target_priority, injury_risk_bonus_permille, skills[{skill_id, type, rank, value_scaled}], traits[], class_id, level}` |
| Journée              | `activity_effective[hero_id]`, `refusals[hero_id]`, `expedition_teams_validated[]`         |
| Économie / Récolte   | `gather_power(hero_id, biome_id)` (entier, unités suggérées `/10`)                        |
| Économie / Forge     | `craft_power(hero_id)`, `craft_specialty(hero_id)` ∈ {weapons_armor, potions, none}        |
| Économie / Marchand  | `sell_price_mult_permille` = 1000 + bp du `master_fence` (1000 si absent)                  |
| Village              | `masters` (écrit ici, lu par le village), `roster_count(manager)`                          |
| Chronique            | événements : `hero_level_up, skill_unlocked, hero_attr_trained, hero_injured {severity, days}, hero_recovered, hero_refused, hero_quarrel, hero_left {reason: unpaid\|contract\|morale}, hero_retired, hero_retired_master, hero_loan_started, hero_loan_ended, hero_accident, loot_stolen, tavern_new_offer, tavern_offer_expired, recruit_hired, recruit_missed` ; étiquettes `mood`, `traits`, `gender`, `specialization`, `age_label` (jeune\|confirme\|veteran) |
| UI                   | `next_day_hooks(hero_id)` : `xp_to_next`, `injury_days_left`, `tp_to_next`, `contract_days_left`, `seasons_to_decline`, `offer_expires_in` (dérivés, non stockés) |

### 14.3 Contrat de propriété (architecture sans serveur)

* `hero` = état à ÉCRIVAIN UNIQUE (le propriétaire `owner`). Le prêt ne transfère pas la propriété : les actions
  de l'emprunteur sont des actions du journal commun, rejouées par tous, appliquées à l'état du propriétaire.
* `tavern_offers`, `masters` = état COMMUN, rejoué ; l'arbitrage des achats simultanés est déterministe
  (index manager croissant).

---

## 15. Cas limites

| Situation                                        | Règle                                                                                              |
|--------------------------------------------------|----------------------------------------------------------------------------------------------------|
| Aucun aventurier dans la guilde                  | Phase héros vide ; `guild_avg_level = 1` ; taverne génère normalement ; chronique « la taverne est vide, personne ne part » |
| Manager sans héros                               | Ses actions sont ignorées ; il peut recruter/emprunter                                             |
| Tous les héros blessés / fatigués                | Expédition annulée (équipe vide) ; chronique « la guilde panse ses plaies » ; activités → rest      |
| Équipe d'expédition vide après refus             | Expédition annulée, pas d'XP, pas de butin ; les refus sont chroniqués                             |
| Action reçue pour un héros inconnu / d'un autre manager | Ignorée (→ idle) ; jamais d'erreur bloquante                                                 |
| Aucune action reçue pour un manager (hors ligne) | Toutes ses activités = `idle` (plan par défaut §17 pour les IA)                                    |
| Or négatif                                       | Impossible : achat/renouvellement rejetés si `gold < coût` ; salaire impayé → `unpaid_days`, jamais de dette |
| Roster plein (`>= roster_cap`)                   | `recruit` et `loan` entrants rejetés avec motif ; l'offre reste en taverne                          |
| Deux managers achètent la même offre             | Index manager le plus bas gagne ; l'autre reçoit `recruit_missed`                                  |
| Offre expirée / inconnue                         | `recruit` rejeté                                                                                   |
| Fatigue 100                                      | Activité forcée `rest`, chronique « épuisé »                                                       |
| Blessé assigné à l'expédition                    | → `rest` ; `hero_refused` n'est PAS émis (motif « blessé »)                                       |
| Infirmerie pleine ou absente                     | Patients excédentaires → `rest` (récupération naturelle seule)                                     |
| `heal` sans infirmerie                           | → `rest`                                                                                           |
| Terrain d'entraînement absent                    | Entraînement autorisé, `tp = 4`                                                                    |
| Attribut au plafond (60) ou `trained` à 10       | Les tp continuent de s'accumuler sans effet ; l'UI signale « au maximum »                          |
| Niveau 20                                        | XP ignorée, `xp` figé                                                                              |
| Re-blessure pendant une blessure                 | Gravité max conservée, jours prolongés de `days/2`                                                 |
| 3e blessure grave (`scars == 3`)                 | Retraite forcée le soir même (maître si niveau >= 8)                                               |
| Retraite d'un niveau < 8                         | `hero_retired`, aucun maître ; retraite volontaire refusée si `age < 14` et `scars < 3`            |
| Deux maîtres de même classe                      | Le plus haut niveau reste ; égalité : l'ancien reste                                               |
| Prêt d'un héros blessé / déjà prêté / à soi-même | Rejeté                                                                                             |
| Emprunteur atteint le plafond de roster           | Prêt rejeté                                                                                        |
| Héros prêté blessé (severity >= 2)               | Retour immédiat au propriétaire                                                                    |
| Héros prêté dont le contrat expire               | Départ normal ; le prêt s'annule                                                                   |
| Moral < 10 pendant 3 jours                       | Départ (`reason: morale`) sauf `loyal` ; `cheerful` ne descend jamais sous 20 donc jamais concerné |
| Contrat impayé 3 jours                           | Départ (`reason: unpaid`) même si `loyal`                                                          |
| `renew` sans or                                  | Rejeté ; le héros part si `days_left == 0`                                                         |
| Collision de nom                                 | Suffixe romain « II », « III »                                                                      |
| Âge 20 à la saison                               | Retraite forcée avant la génération de taverne                                                     |
| Division par zéro                                | Aucune : tous les diviseurs sont des constantes > 0 ou `max(1, ...)`                               |
| Champs manquants dans une sauvegarde             | Hors périmètre tranche 1 (pas de migration) ; l'état est régénéré depuis la graine                 |

---

## 16. Fun à la minute 12 (pourquoi on relance la journée)

* **La barre d'XP à 90 %** : « Aldric passe niveau 5 demain → Rempart débloqué ». `xp_to_next` affiché.
* **Le retour du blessé** : « Mahaut sort de l'infirmerie dans 1 jour » — on garde le donjon pour elle.
* **Le +1 qui tombe** : « Musculation : 4 tp avant Force +1 » — l'entraînement a un compteur visible.
* **L'offre qui expire** : la recrue rare de la taverne disparaît demain soir ; l'or manque de 30 pièces ;
  on vend, on récolte, on revient.
* **Le contrat à J-1** : renouveler ou laisser partir le Râleur ?
* **La saison qui tombe** : « Dans 2 jours, Clothilde (13 saisons) entre en déclin » → son dernier
  grand donjon, puis la retraite en maître soigneur qui accélère l'infirmerie de tout le village.
* **Les traits dans la chronique** : le Cupide qui empoche un objet, le Sanguin qui se dispute avec le Râleur,
  le Peureux qui refuse le donjon le matin — chaque ligne est une conséquence lisible d'un chiffre.
* **Le prêt** : on prête son Rôdeur au co-manager pour son donjon, il revient niveau 6 et fatigué —
  ou blessé, et c'est sujet de discussion.
* **La forme du jour** : un héros à perf 110 (frais, exalté) contre 60 (épuisé, grognon) : on SENT le
  choix du repos.

---

## 17. Annexe — plan par défaut d'un co-manager simulé (suggestion pour le prototype)

```
plan_ai(manager, state):
  for hero in roster(manager) trié hero_id:
    if hero.injury.severity >= 1 and infirmary_slot: infirmary
    elif hero.injury.severity >= 1:                   rest
    elif hero.fatigue >= 60 or hero.morale < 30:      rest
    elif expédition votée et count(expedition) < 2 and hero.level >= quest.level - 2: expedition
    elif day % 3 == 0:                                train (attr: primary_attr[class])
    elif hero.class_id in {ranger, rogue}:            gather forest
    elif hero.class_id == warrior:                    gather mountain
    elif hero.class_id == mage:                       craft
    else:                                             gather marsh
  recrute si gold >= cost de l'offre la moins chère et roster < cap
```

---

## 18. Questions ouvertes (pour l'orchestrateur / les autres concepteurs)

1. `SEASON_DAYS = 10` est court pour rendre la carrière visible en 30 jours ; garder 10 ou passer à 15 ?
2. Salaires : les fondateurs sont gratuits ; l'Économie doit garantir ~15-40 or/jour de revenus pour que
   2-3 recrues soient tenables. À calibrer ensemble.
3. `quest.xp_reward` : hypothèse `40 + 20 * quest_level` ; le concepteur Quêtes confirme-t-il ~130 XP/jour ?
4. Les compétences `active` : le moteur de combat décide seul du déclenchement — faut-il un champ
   `trigger` explicite ici (ex. `on_first_round`, `on_ally_ko`) ?
5. Trahison : ici seulement `greedy` (objet empoché) et `betrayed` reçu du combat. Faut-il un trait
   « traître » dédié ou la trahison reste-t-elle un événement d'expédition ?
6. Prêt gratuit entre amis, ou frais symbolique / part de butin pour donner du relief au derby ?
7. Le héros qui part (`hero_left`) disparaît ; devrait-il réapparaître à la taverne rivale (derby) ?
8. Un seul générateur : les refus du matin (H0) tirent AVANT le combat ; toute modification d'ordre de
   phase par le concepteur Journée change les tirages du combat — à figer dans le document Journée.
