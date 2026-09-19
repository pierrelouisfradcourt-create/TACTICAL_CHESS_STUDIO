# CRAFT DE BIOME — protection, agression, progressif

**Date : 2026-09-19.**
**Source :** mesures exécutées ce jour sur `sim.js`, `tactic.js` et `data.json` de ce dossier (version
`meta.tranche` = V5 T8, `data_fnv` = `97a2d68a`), avec quatre scripts jetables sous `test/`
(`tmp_craft_measure.mjs`, `tmp_eco_measure.mjs`, `tmp_boss_measure.mjs`, `tmp_forge_access.mjs`,
`tmp_p1_multi.mjs`), supprimés après mesure. Population : **60 saisons × 30 jours, 5 ou 6 managers, plans par
défaut, graines `1000 + 7i`** — la même population que `season_t5_check`. Lectures de code : `[L]`. Mesures
d'exécution : `[M]`. Propositions de conception : `[P]`.

**Ce document ne modifie rien.** Aucun fichier du moteur, des données, des bancs ou de `golden/` n'a été
touché. Tout ce qui suit est une conception à ratifier.

**Demandes couvertes.** (1) craft de biome protection/agression progressif ; (2) le matériau précède toujours
le mur qu'il prépare ; (3) cinq métiers couvrant tous les emplacements ; (4) six emplacements d'équipement
(cape et anneau ajoutés).

---

## 1. MESURES DE DÉPART

### 1.1 Ce que la forge produit réellement

60 saisons, 1 797 jours simulés, 1 544 objets apparus (25,7 par saison) [M].

| | valeur |
|---|---|
| objets issus de la forge | **359 sur 1 544 = 233 ‰** [M] |
| objets issus du butin | 1 185 |
| rareté de tout ce qui apparaît | commun 1 249 · rare 194 · épique 49 · légendaire 52 [M] |

**Trois recettes sur vingt-trois sont commandées, jamais une de plus** [M] :

| recette | commandes | livrées |
|---|---|---|
| `r_potion_soin` | 284 | 258 |
| `r_gambison` | 104 | 85 |
| `r_cuir` | 18 | 16 |
| **les vingt autres** | **0** | **0** |

Les six recettes `category: "dragon"` (`r_d_lame_coeur`, `r_d_cuirasse_ecailles`, `r_d_amulette_braise`,
`r_d_dague_hydre`, `r_d_manteau_marais`, `r_d_couronne_dragons`) **ne sont jamais commandées ni livrées en
60 saisons** [M]. Cause lue : `planDragonCraft` (sim.js:1267) exige `bLevel(forge) >= 3`, et la forge
n'atteint jamais le niveau 3 (§1.2).

### 1.2 Le niveau de forge atteint

| niveau de forge en fin de saison | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| saisons | **6** | **53** | **1** | **0** | **0** |

[M] La forge reste au niveau 1 dans 53 saisons sur 60 ; elle **tombe à 0** dans 6 (ravage) ; elle atteint 2
une seule fois, au jour 26. Le niveau 3 n'est jamais atteint. Cause lue : `pickBuildVote` (sim.js:1114) vote
« le chantier finançable le moins cher » ; la forge niveau 2 coûte 150 or + 14 pierre + 10 minerai, contre
40 or pour le comptoir ou la taverne. Or de guilde en fin de saison : médiane **136** [M].

**Conséquence dure : toute recette posée à `forge_level: 3` est, aujourd'hui, du contenu que personne ne
verra jamais.**

### 1.3 Ce qui est porté, ce qui dort

Fin de saison, 60 saisons, emplacements des héros vivants [M] :

| | valeur |
|---|---|
| emplacements remplis | arme 232 · armure 221 · babiole 133 · fiole 205 · **vides 525** |
| au jour 20, part d'emplacements remplis | **519 ‰** [M] |
| rareté portée | commun 630 · rare 106 · épique 30 · légendaire 25 |

**Onze objets sur quarante-sept ne sont jamais portés en 60 saisons** [M] : `c_antidote`, `c_elixir_force`,
`c_elixir_pierre`, `c_baume`, `w_croc_drake`, et les **six objets `pool: "dragon_craft"`** — `w_lame_coeur`,
`a_cuirasse_ecailles`, `t_amulette_braise`, `w_dague_hydre`, `a_manteau_marais`, `t_couronne_dragons`. Ces
six-là sont exactement ce que la forge était censée apporter en propre.

### 1.4 Couverture par emplacement et par métier

| emplacement | objets | dont craftables | recettes |
|---|---|---|---|
| arme | 15 | 10 | 8 (dont 2 `dragon`) |
| armure | 13 | 7 | 7 (dont 2 `dragon`) |
| babiole | 13 | **2** | **2, toutes deux `dragon`** |
| fiole | 6 | 4 | 4 |

[M] La babiole n'a **aucune recette accessible** sous le niveau de forge 3 : mesuré, l'emplacement babiole est
entièrement laissé au hasard du butin, dans 60 saisons sur 60.

Cinq classes sur sept n'ont aucune spécialité (`craft_specialty: "none"` pour rôdeur, clerc, voleur,
invocateur, barde) [L]. Et **deux recettes portent une catégorie fausse** : `r_baton_cristal` produit une
ARME et `r_robe_mousse` une ARMURE, mais toutes deux sont `category: "potions"` — donc `craftSlotRun`
(sim.js:1520) accorde au Mage le bonus ×120 pour forger un bâton et tisser une robe [L].

### 1.5 Le calendrier : quand tombe le mur, quand tombe le boss

| événement | forêt | monts | marais |
|---|---|---|---|
| **présage du dragon** (l'attaque est le lendemain), jour médian | **j20** | **j22** | **j15** [M] |
| saisons où le dragon se réveille | 36/60 | 20/60 | 13/60 |
| **premier boss de donjon du biome vaincu**, jour médian | **j24** | **j25** | **j29** [M] |
| saisons où un boss de ce biome tombe | **11/60** | **10/60** | **6/60** |

**Vingt-sept boss de donjon tués en soixante saisons, soit 0,45 par saison** [M]. Avance mesurée entre le
premier boss du biome et le présage : médiane **0 jour**, et négative dans 3 saisons sur 16.

**C'est exactement le défaut que Pierre a nommé.** Si on accrochait aujourd'hui le palier 2 aux matériaux de
boss de donjon, l'objet arriverait après le mur qu'il prépare, dans la quasi-totalité des saisons. Ce n'est
pas un risque : c'est une mesure.

Cause lue : les deux seuls types de quête à boss sont `purge` (parti de 3 à 5 héros, difficulté 3-10, poids
`[0,150,200,250]`) et `siege` (parti de 4 à 5, difficulté 6-10, poids `[0,0,50,150]`). Mesuré sur les vingt
premiers jours : `siege` **n'est jamais proposée**, `purge` est proposée 288 fois — pour une difficulté
médiane de quête de **2** et un effectif moyen de 4 héros par manager [M].

### 1.6 Le goulot de la forge

| | valeur |
|---|---|
| `forge_capacity` | `[0, 1, 2, 3, 4]` — au niveau 1, **une seule place dans toute la guilde** [L] |
| `forge_work_per_day` | `[0, 10, 20, 30, 40]`, et `forgeAdvance` (sim.js:1615) ne les donne **qu'au premier travail de la file** [L] |
| jours-travail dans la file | **ami simulé 431 · joueur humain 0**, sur 1 797 jours [M] |
| commandes de forge émises par les plans | **ami simulé 406 · joueur humain 0** [M] |
| jours où le joueur peut commander **au moins une** des 23 recettes | **27 / 1 797 = 15 ‰** [M] |
| jours où l'inventaire du joueur contient au moins une ressource | 758 / 1 797 = 422 ‰ [M] |

La cause mesurée **n'est pas la file** : c'est l'inventaire. Les 23 refus sont tous « ressources
insuffisantes », parce que `planResources` (sim.js:1137) dépose la récolte à l'entrepôt pour le chantier voté
et que seul `planDragonCraft` sait faire un `withdraw` ciblé. Rappel du contrat (§T5.7) : le témoin
« Atelier » de `ui_v4_check` a dû passer de 60 à 250 graines pour être trouvé — 52 occasions de forge et
21 préréglages sur 250 graines.

### 1.7 L'échelle des héros au moment du mur

Profils au jour 20, 329 héros, 60 saisons [M] :

| grandeur | p10 | médiane | p90 |
|---|---|---|---|
| PV | 56 | **73** | 98 |
| ATQ | 33 | **60** | 77 |
| DÉF | 13 | **19** | 33 |
| CRIT | 70 ‰ | **95 ‰** | 185 ‰ |
| SOUTIEN | 36 | 47 | 100 |
| niveau | 4 | 5 | 6 |

### 1.8 Les repères de calibrage déjà mesurés (AUDIT_STATS, CONTRACT)

| repère | valeur |
|---|---|
| un bonus de **+1 %** | Δ apparié **0,00 ‰** sur 60 raids — strictement nul [M] |
| `pct(x, 105)` | ne change `x` que si `x ≥ 20` |
| **ATQ +20 plat** | +155 ‰ de réserve entamée (+25 %) |
| ATQ +5 plat | +28,7 ‰ (+4,7 %) |
| **DÉF +20** | KO par passage 6,60 % → **3,96 %** |
| DÉF +5 | 6,60 % → 5,94 % · **DÉF +1 : aucun changement** |
| PV +30 % | KO par passage 6,60 % → 3,96 % |
| CRIT +100 ‰ | +12 ‰ de dégâts (+2 %) |
| **le brûleur contre le Sylvain** | **sans : 9/20 · avec : 14/20 — 250 ‰ d'écart** |
| les six fioles en raid | `p.potion` non transmis : **six objets sur 47 entièrement morts en raid** |

---

## 2. LE DIAGNOSTIC EN UNE PAGE

Le craft ne décide rien, et ce n'est pas la faute de la courbe de rareté — elle est saine. C'est la faute de
cinq choses, toutes mesurées :

1. **La forge fabrique le même objet que celui qui tombe.** `r_epee_fer` produit `w_epee_fer`, qui est dans
   `weapon_pool`. Le craft est une seconde source du même butin, jamais une source propre.
2. **Ce qu'elle fabriquerait en propre est hors d'atteinte.** Les six objets `dragon_craft` exigent la forge
   niveau 3, jamais atteinte en 60 saisons.
3. **Un emplacement sur quatre n'a pas d'artisanat du tout** (babiole : 2 recettes, toutes deux au niveau 3).
4. **Le joueur humain ne forge rien** : 15 ‰ de jours commandables, 0 jour-travail dans la file.
5. **Rien de ce qui se fabrique ne répond à un mécanisme de raid.** Les trois fiches de dragon posent des
   mécanismes précis et nommés (§3) ; aucun objet du catalogue ne les regarde.

La conception qui suit attaque les cinq, dans cet ordre.

---

## 3. LES MÉCANISMES AUXQUELS UN OBJET DOIT RÉPONDRE

Tout ce qui suit est **lu dans le code**, pas inventé. Chaque objet de biome des tables du §6 cite l'un de ces
noms, et un seul objet sans mécanisme nommé est un objet à refuser.

### 3.1 Forêt de Brumes — Sylvain corrompu ancestral (`raids.raid_forest`, `tactic.js:sylvainTurn`)

| ce qui fait mal | où c'est écrit | chiffre |
|---|---|---|
| zone **`roots`** | `enterZone` tactic.js:262 puis `dotTick` 2033 | `immobilise` 1 tour + `raid.roots_damage` = **8** à l'entrée, **8 de plus par tour** passé dessus ; `roots_turns` = 2 |
| zone **`spores`** | `riposte` branche `sylvain`, `enterZone` 267 | `spores_power` = **90** (dégâts magiques) + état `poison` 3 tours ; `dotTick` : `(6 + niveau) × valeur` = **7 par tour** |
| **rejetons** `corrupted_sylvan` | `raid_forest.adds` | cap **4**, 2 par apparition, **`heal_boss` 10** à chaque apparition |
| **bouclier de phase 3** | `riposte`, `raid_forest.shield_p3` | **80 points reposés à CHAQUE riposte** |
| ce qui est fragile | `raid_forest.regen_pct` = 2, annulé par `B.regen_off` quand le boss porte `brule` ; `demand_states: ["brule"]` | c'est le **brûleur** : 9/20 sans, 14/20 avec [M] |

### 3.2 Mont Cendré — Drake des monts (`raids.raid_mountain`, `drakeTurn`, `resolveBreath`)

| ce qui fait mal | où c'est écrit | chiffre |
|---|---|---|
| **souffle annoncé** | `resolveBreath` tactic.js:2693 | `breath_power` **105** ; **`breath_shield_ignore` = 40** : un bouclier **strictement inférieur à 40 est mis à zéro** avant le calcul |
| zone **`cendres`** | `enterZone` 268 | `ash_damage` **12** par traversée, `ash_turns` 2 |
| **fournaise** | `riposte` branche `drake` | `furnace_power` **100**, puis le Drake avance de `furnace_move` 3 |
| **coup de queue** | `drakeTurn`, `attack2` | anneau 1, power **80**, `push` 1, dès que 2 héros sont au contact |
| **envol** | `checkPhase`, `flight_pass` 1 | phase 2 : un passage entier hors de portée |
| ce qui est fragile | **`crit_immune_above_pct` = 50** (`critImmune` 522) : au-dessus de la moitié, les critiques ne passent pas · **fissures** (`addFissure` 528, `defEff` 305 : `d -= 5 × fissures`), `fissure_step` 5, `fissure_cap` 4 → **−20 de DÉF sur 34** |

### 3.3 Marais Noir — Hydre des marais (`raids.raid_marsh`, `hydreTurn`, `regrowHeads`, `syncWater`)

| ce qui fait mal | où c'est écrit | chiffre |
|---|---|---|
| zone **`venin`** | `riposte` branche `hydre`, `enterZone` 269, `dotTick` 2035 | `venom_turns` 2 ; pose `poison` 3 tours **à l'entrée ET à chaque tour** sur la case |
| **trois gueules** | `hydreTurn` | trois attaques `power` 70 sur trois cibles séparées |
| **sangsues** `giant_leech` | `raid_marsh.adds` | cap 4, 2 par riposte en phase 2, **`drain` 8** |
| **immersion** | `syncWater` 2285 | `water_def_bonus` **+10 de DÉF**, `water_regen_pct` **+6 %/tour**, `water_pm_malus` 1 |
| ce qui est fragile | **`regrowHeads`** : `heads` 3, `head_hp_div` 6, **`regrow_turns` 2** — une gueule coupée repousse si rien ne brûle ; `demand_states: ["brule"]` |

---

## 4. SIX EMPLACEMENTS [P]

### 4.1 L'identité de chacun, et la règle qui interdit le doublon

| emplacement | identité en une phrase | ce qu'il ne porte JAMAIS |
|---|---|---|
| **Arme** | la puissance offensive brute et la marque qu'on imprime sur l'ennemi | PV, résistance, récolte |
| **Armure** | l'encaisse structurelle, en trois factures (étoffe / cuir / plaques) | attaque, critique |
| **Cape** | **survie et déplacement** : la résistance à l'ENVIRONNEMENT du boss (zones, états posés par les zones) et la garde plancher | attaque, critique, récolte |
| **Anneau** | **puissance et ressource** : ce qui multiplie plutôt que ce qui ajoute (critique, magie, perce-écaille) | PV plats, résistance, récolte |
| **Babiole** | **effet ponctuel et vie hors combat** : outils de récolte, savoir-faire, totems à effet unique | attaque brute, garde plancher |
| **Fiole** | le consommable, qui disparaît en s'employant | tout effet permanent |

**Règle de non-doublon, vérifiable mécaniquement sur `data.json` :** *aucune grandeur ne figure sur plus de
deux des six emplacements.*

| grandeur | arme | armure | cape | anneau | babiole | fiole |
|---|---|---|---|---|---|---|
| `atk` | ● | | | ● | | |
| `def` | | ● | ● | | | |
| `hp` | | ● | | | ● | |
| `crit` | ● | | | ● | | |
| `magic` | ● | | | ● | | |
| `heal` / `support` | | ● | | | ● | |
| `ward` / `ward_state` | | ● | ● | | | |
| `shield_floor` | | ● | ● | | | |
| `brand` | ● | | | ● | | |
| `pierce` / `smite` | ● | | | ● | | |
| `gather_*`, savoir-faire | | | | | ● | |
| usage à consommer | | | | | ● | ● |

Lecture : la **cape** et l'**armure** sont la paire défensive (l'une contre l'environnement, l'autre contre le
coup) ; l'**arme** et l'**anneau** sont la paire offensive (l'une frappe, l'autre ouvre) ; la **babiole** et la
**fiole** sont la paire utilitaire (l'une permanente, l'autre jetable). Trois paires, pas six cases
interchangeables.

### 4.2 Volume de contenu à produire

Aujourd'hui : 47 objets pour 4 emplacements = 11,75 par emplacement, et **11 objets morts** [M].
Proposition : **84 objets pour 6 emplacements = 14 par emplacement**, et zéro objet mort (critère C10, §10).

| emplacement | aujourd'hui | proposé | détail de l'ajout |
|---|---|---|---|
| arme | 15 | **18** | +3 armes d'agression de palier 2 (une par biome) |
| armure | 13 | **16** | +3 armures de protection de palier 2 |
| cape | 0 | **11** | 5 génériques (3 communes, 1 rare, 1 épique) + 3 capes de protection de palier 1 + 3 capes légendaires de dragon |
| anneau | 0 | **11** | 5 génériques (3 communs, 1 rare, 1 épique) + 3 anneaux d'agression de palier 1 + 3 anneaux d'agression de palier 3 |
| babiole | 13 | **16** | +3 totems de protection de palier 3 |
| fiole | 6 | **12** | +6 onguents de biome (§8) |
| **total** | **47** | **84** | **+37** |

Rareté visée par emplacement : **5 à 6 communs · 3 à 4 rares · 2 à 3 épiques · 2 à 3 légendaires**. Les
`loot_pools` passent de 3 à 5 entrées : `weapon_pool` 350, `armor_pool` 300, `cape_pool` 120, `ring_pool` 120,
`trinket_pool` 110 (somme 1 000). Les trois `dragons[].legendary_pool` passent de 3 à 4 objets, la quatrième
place étant une **cape légendaire** — pour que le butin de dragon couvre aussi le nouvel emplacement.

### 4.3 Où se pose l'équipement de biome sur les six emplacements

| palier | protection | agression | pourquoi cet emplacement |
|---|---|---|---|
| **1** | **cape** | **anneau** | les deux pièces les moins chères, celles qu'on jette sur ses épaules et qu'on passe au doigt — elles préparent le donjon, pas le dragon |
| **2** | **armure** | **arme** | les deux pièces lourdes : c'est le vrai matériel du jour du dragon, celui qui doit être prêt |
| **3** | **babiole** | **anneau** (remplace le palier 1) | le totem et la bague pris sur le cadavre du dragon : ils servent AILLEURS (§6.4) |

Et la **fiole** porte les onguents de biome (§8). **Les six emplacements sont donc touchés par la famille de
biome** : cape, anneau, armure, arme, babiole, fiole.

### 4.4 L'écran d'équipement à 400 px de large

* **Déplié.** Deux rangées de trois tuiles de **120 px**, gouttière 8 px, marges 12 px
  (`120 × 3 + 8 × 2 + 12 × 2 = 400`). Rangée du haut = **ce qu'on porte sur soi** : arme · armure · cape.
  Rangée du bas = **ce qu'on emporte** : anneau · babiole · fiole. Chaque tuile : glyphe 28 px, nom sur
  deux lignes au plus en 12 px, **une seule ligne de grandeur**, celle qui décide pour cet emplacement
  (ATQ pour l'arme, DÉF pour l'armure, RÉS pour la cape, CRIT pour l'anneau, l'effet pour la babiole, la
  durée pour la fiole).
* **Replié.** Une seule ligne de **six pastilles de 40 px** (`40 × 6 + 8 × 5 + 12 × 2 = 304`, reste pour le
  total) : pleine si l'emplacement est rempli, creuse sinon, la bordure colorée par la rareté. À droite, le
  total des trois grandeurs qui comptent : **ATQ · DÉF · PV**. Un tap sur une pastille déplie le volet sur
  cet emplacement.
* **Aucun calcul dans la page.** Les six entrées, leurs libellés, leurs grandeurs affichées et la raison d'un
  refus viennent toutes de `VM.roster[].equipment[]`, exactement comme les cinq sorts viennent de
  `VM.roster[].loadout` (contrat §T8.8).
* **C'est la raison du six et pas du douze.** À 400 px, sept tuiles imposent une troisième rangée ou des
  tuiles sous 100 px, où le nom d'objet ne tient plus sur deux lignes.

---

## 5. CINQ MÉTIERS [P]

### 5.1 Les métiers et leur couverture

| métier | emplacements couverts | ce qu'il fabrique |
|---|---|---|
| **Forgeron** | arme, armure (plaques) | épées, masses, pics, cottes, plates |
| **Tanneur** | arme (arcs), armure (cuir), cape (cuir), babiole (outils) | arcs, cuirs, capes huilées, pioches et haches |
| **Tisserand** | armure (étoffe), cape (étoffe) | robes, manteaux, capes tissées |
| **Joaillier** | **anneau**, babiole (talismans, totems) | anneaux, amulettes, gemmes serties |
| **Alchimiste** | fiole | potions, élixirs, **onguents de biome** |

**Table de couverture — aucun emplacement sans artisanat :**

| emplacement | métiers qui le couvrent | nombre |
|---|---|---|
| arme | Forgeron, Tanneur | 2 |
| armure | Forgeron (plaques), Tanneur (cuir), Tisserand (étoffe) | 3 |
| cape | Tanneur, Tisserand | 2 |
| anneau | Joaillier | **1** |
| babiole | Joaillier, Tanneur | 2 |
| fiole | Alchimiste | **1** |

L'anneau et la fiole n'ont qu'un métier : c'est assumé, ce sont les deux spécialistes. La compensation passe
par les affinités, qui donnent trois classes à chacun (§5.2).

### 5.2 Affinités de classe — jamais une exclusivité

`classes[].craft_specialty` (une catégorie, ou `"none"` pour cinq classes sur sept) est remplacé par
`classes[].job_affinity`, une table `{métier: 15 | 30}`.

| classe | affinité forte (+30) | affinité faible (+15) |
|---|---|---|
| Guerrier | Forgeron | Tanneur |
| Rôdeur | Tanneur | Alchimiste |
| Mage | Alchimiste | Joaillier |
| Clerc | Tisserand | Alchimiste |
| Voleur | Joaillier | Tanneur |
| Invocateur | Joaillier | Tisserand |
| Barde | Tisserand | Forgeron |

Chaque métier a **au moins une affinité forte** (Forgeron 1, Tanneur 1, Tisserand 2, Joaillier 2,
Alchimiste 1) et **au moins trois classes** au total sauf le Forgeron (2). Un effectif de quatre héros tirés
au hasard couvre au moins trois métiers dans la grande majorité des cas — à prouver par le contrôle C7.

**Ce qui empêche que ce soit punitif — quatre garde-fous, tous mécaniques :**

1. **L'affinité ne conditionne jamais l'accès.** N'importe quel héros peut lancer n'importe quelle recette.
   L'affinité ne change que la **vitesse de travail** : sans affinité **100 %**, faible **115 %**, forte
   **130 %**. Un écart de 30 %, c'est visible (le seuil mesuré est 5 % sur des opérandes ≥ 20, et la puissance
   d'artisanat médiane vaut 20 à 45) sans jamais être bloquant.
2. **Un plafond de durée.** Aucune recette de palier 1 ou 2 ne peut prendre plus de **8 jours** de file,
   quelle que soit l'affinité : passé ce compte, le travail restant est réputé fait. C'est le filet qui
   garantit qu'une guilde sans Joaillier finit quand même son anneau.
3. **La commande de guilde.** Un manager pose une recette avec les matériaux déposés à l'entrepôt ;
   **n'importe quel héros de la guilde** peut la prendre à l'atelier. C'est la vie de capitale demandée, et
   c'est ce qui permet d'emprunter le Tisserand d'un ami. Mécaniquement : `forge_queue[].taker_id` en plus
   de `owner`, et `craftSlotRun` cherche d'abord un travail de son propre manager, puis une commande de guilde
   ouverte.
4. **Le comptoir vend les onguents, jamais l'équipement.** Une guilde sans Alchimiste peut acheter un onguent
   au double du prix ; elle ne peut jamais acheter une cape de biome ni une arme de palier 2.

### 5.3 Un savoir-faire par métier, à la place de `forge`

`crafts` perd `forge` et gagne **`forgeron`, `tannerie`, `tissage`, `joaillerie`, `alchimie`**, tous
`bonus_kind: "craft_pct"`, `per_level: 5` (« +{n} % de points de travail »), sur la table d'XP existante
`craft_xp_table` = `[0, 0, 20, 50, 90, 140, 200, 270, 350, 440, 540]`.

**Le gain doit monter, et voici pourquoi.** L'XP d'artisanat est aujourd'hui de `craft_xp.craft` = **5** par
créneau, versée à une seule compétence, et le niveau médian de `forge` mesuré par l'audit est **1**. Répartie
sur cinq métiers, elle donnerait un niveau médian de **0** : cinq compétences mortes. Proposition :

| paramètre | aujourd'hui | proposé |
|---|---|---|
| `craft_xp.craft` (par créneau d'atelier) | 5 | **12** |
| bonus d'affinité forte sur l'XP | — | **+50 %** (18 par créneau) |
| effet du niveau | +5 % de travail | inchangé |

Conséquence arithmétique : dix journées d'atelier sur un même métier donnent 120 XP sans affinité
(**niveau 4**, +20 % de travail) et 180 avec affinité forte (**niveau 5**, +25 %). Cible de preuve : *le
niveau médian du métier principal d'un héros qui a passé au moins six journées à l'atelier est ≥ 3*.

---

## 6. LE CRAFT DE BIOME — trois paliers, deux familles [P]

### 6.1 La règle du matériau qui précède le mur

**Un palier se fabrique toujours avec un matériau qui vient d'un cran SOUS le mur qu'il prépare.**

| palier | ce qu'il prépare | d'où viennent ses matériaux | quand c'est disponible |
|---|---|---|---|
| **1** | le donjon du biome | **récolte ordinaire du biome** (`gather_split`) + quêtes faciles | dès les premiers jours |
| **2** | **le dragon** | **matériaux des boss de donjon du biome**, obtenus en montant la maîtrise — donc **avant** que le dragon se réveille | cible : jour 12 au plus tard (C3) |
| **3** | rien dans ce biome | **matériaux du dragon lui-même** | après l'avoir abattu une fois |

**Le palier 3 ne prépare PAS son propre dragon.** Ce serait circulaire. Son usage en aval est écrit
explicitement à la ligne de chaque objet (§6.4), et il est **vérifiable** : chaque objet de palier 3 porte au
moins une grandeur qui a un lecteur dans un autre raid que celui de son dragon.

### 6.2 Trois matériaux de boss de donjon, neufs

| id | nom | biome | boss qui le lâche | `sell` / `buy` | `gatherable` |
|---|---|---|---|---|---|
| `bark_sylvan` | Écorce de sylvain | forest | `ancient_sylvan` | 18 / 36 | false |
| `slag_drake` | Scorie de drake | mountain | `ash_drake` | 18 / 36 | false |
| `hydra_bile` | Bile d'hydre | marsh | `bog_hydra` | 18 / 36 | false |

Chaque `bosses[].loot` gagne une ligne `{ kind: "res", id: "<mat>", min: 2, max: 4, permille: 1000 }`.

**Mais la mesure du §1.5 dit que cela ne suffit pas** : 0,45 boss par saison, premier boss au jour 24-29.
Deux leviers, tous deux hors du moteur de combat :

**(a) Une septième sorte de quête : la Tanière** — l'antre modeste, tôt, à petit effectif.

| champ | valeur |
|---|---|
| `id` | `tanniere` · nom « Tanière » |
| `party_min` / `party_max` | **2 / 4** |
| `diff_min` / `diff_max` | **1 / 5** |
| `floors` / `rooms_per_floor` | 1 / 3 |
| `boss` | `biome_boss` · `objective` : `boss_killed` |
| `weights` (quatre paliers) | **`[250, 250, 200, 150]`** — contre `[0,150,200,250]` pour `purge` |
| `reward_gold_pct` / `reward_res_pct` | 90 / 110 · `event_permille` 250 |
| `room_weights.tanniere` | combat 600 · piège 150 · trésor 150 · autel 100 · campement 0 · filon 0 |

Le boss y est le boss de biome à **`hp_pct_den` = 250** (champ neuf, sur le modèle de `hp_pct_siege` = 500),
contre 400 en `purge`. Cible : **le premier boss du biome préféré tombe au plus tard au jour 12 dans au moins
800 ‰ des saisons** (C3).

**(b) Le plancher anti-blocage : l'autel.** La salle `altar` existe déjà (`room_types`, poids 100-150 dans
`exploration`, `purge`, `siege`) et chaque biome nomme le sien (« l'autel de la Sève », « l'autel de la
Braise », « l'autel des Noyés »). Elle rend désormais **1 unité** du matériau de boss du biome quand
l'expédition se termine en succès. C'est lent — une unité de temps en temps contre trois ou quatre d'un
coup — mais **aucune saison ne peut être définitivement privée du palier 2**.

### 6.3 Le vocabulaire minimal : cinq nouvelles grandeurs d'objet

Rien de tout cela n'existe aujourd'hui. **Chaque clé a un lecteur nommé, et une clé sans lecteur est une clé à
retirer** (invariant du studio : toute métrique qui classe ou calibre prouve d'abord sa variance — l'audit a
déjà mesuré sept grandeurs mortes en raid).

| clé | unité | lecteur exact | ce qu'elle fait |
|---|---|---|---|
| `ward` | **centièmes** | `damageFlat` appelé par `enterZone` (tactic.js:243) et `dotTick` (2025) | réduit de `ward` % les dégâts de **zone du boss** (`roots`, `spores`, `cendres`, `venin`) et de **brûlure / poison** subis par le porteur. **Plafond cumulé : 60.** |
| `ward_state` | **permille** | `enterZone`, `dotTick` | chance d'**annuler la pose** d'un état hostile par une zone du boss (`poison` des spores et du venin, `immobilise` des racines). **Plafond cumulé : 600 ‰.** |
| `shield_floor` | **points** | `startHeroTurn` (tactic.js:2039) | au début de chaque tour du porteur, son bouclier est **remonté à cette valeur** s'il est en dessous |
| `brand` | `"brule"` \| `"fissure"` | `applyHit` (tactic.js:322), **premier coup du passage seulement** | pose `brule` au niveau du porteur (→ `dotTick` : `8 + 2 × niveau`, et `B.regen_off` coupe la régénération), ou appelle `addFissure` (→ `defEff` : `−5` de DÉF, cap 4) |
| `smite` | **centièmes** | `damageFromPower` (tactic.js:461) | dégâts supplémentaires contre une catégorie nommée : les **rejetons** (`kind === 'add'`), une **gueule** (`damageHead`), ou un **boss sous 50 %** de sa réserve |
| `pierce` | **0 / 1** | `critImmune` (tactic.js:522) | les critiques du porteur passent `crit_immune_above_pct` |

**Pourquoi `ward` fonctionne là où `+5 %` échoue ailleurs.** L'audit a montré que `pct(x, 105)` ne change `x`
que si `x ≥ 20`. Ici les opérandes sont `roots_damage` **8**, `ash_damage` **12**, tick de poison **7** — et
`ward` vaut 25 ou 50, pas 5 : `trunc(12 × 75 / 100) = 9` et `trunc(8 × 50 / 100) = 4`. **Chaque valeur
proposée déplace l'entier.** C'est vérifié à la main, pas espéré.

### 6.4 Les dix-huit objets, par biome et par palier

Toutes les valeurs sont des entiers. `crit` en permille, `ward` / `smite` en centièmes, `ward_state` en
permille. « maîtrise » est le seuil sur `state.biome_mastery[biome]` (rappel : `dragon_wake_mastery` = **6**,
`mastery_success` = 1, `mastery_boss_bonus` = 2).

#### Forêt de Brumes

| palier | id | nom | empl. | rareté | statistiques | mécanisme visé | maîtrise | métier | forge | coût | or | travail |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1 P** | `c_cape_ecorce` | Cape d'écorce | cape | commun | `def 2` · `ward 25` · `ward_state 350` | `roots` (8 + immobilise) et `spores` (poison) | **2** | Tanneur ou Tisserand | 1 | `wood 6` `hide 4` `herbs 2` | 25 | 40 |
| **1 A** | `r_anneau_serpe` | Anneau de serpe | anneau | commun | `atk 3` · `smite 25` (rejetons) | `raid_forest.adds`, `heal_boss` 10 | **2** | Joaillier | 1 | `iron_ore 3` `wood 2` `herbs 2` | 20 | 35 |
| **2 P** | `a_plastron_seve` | Plastron de sève figée | armure (cuir) | rare | `def 8` · `hp 14` · `ward 25` · `ward_state 250` | `spores_power` 90 et son `poison` | **5** | Tanneur | 2 | **`bark_sylvan 3`** `hide 8` `herbs 6` | 90 | 110 |
| **2 A** | `w_torche_resinee` | Torche résinée | arme | rare | `atk 9` · **`brand "brule"`** | `regen_pct` 2, coupée par `brule` — **le brûleur portatif** | **5** | Forgeron ou Tanneur | 2 | **`bark_sylvan 4`** `iron_ore 6` `herbs 4` | 110 | 130 |
| **3 P** | `t_totem_sylve` | Totem de sylve | babiole | épique | `hp 20` · `ward 20` (tous biomes) · `ward_state 150` · `shield_floor 15` | — | **8** | Joaillier | 2 | `heartwood 2` `sylvan_sap 1` `crystal 2` | 200 | 200 |
| **3 A** | `r_anneau_coeur_noir` | Anneau de cœur noir | anneau | légendaire | `atk 6` · `crit 80` · `smite 25` (rejetons) | — | **8** | Joaillier | 2 | `heartwood 3` `sylvan_sap 2` `crystal 3` | 260 | 230 |

**Usage aval du palier 3 de la forêt :** `smite` contre les rejetons a un lecteur **au marais**
(`giant_leech`, cap 4, `drain` 8) et **au gué du Derby** (les rivaux). Le totem porte `ward 20` sur **les
trois** biomes. Aucun des deux n'a le Sylvain pour seule cible.

#### Mont Cendré

| palier | id | nom | empl. | rareté | statistiques | mécanisme visé | maîtrise | métier | forge | coût | or | travail |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1 P** | `c_cape_cendre` | Cape de cendre | cape | commun | `def 2` · `ward 25` · `shield_floor 20` | `cendres` (12) et « coup de queue » (80, push 1) | **2** | Tanneur | 1 | `hide 5` `stone 4` `iron_ore 2` | 25 | 40 |
| **1 A** | `r_anneau_burin` | Anneau de burin | anneau | commun | `crit 80` · **`pierce 1`** | `crit_immune_above_pct` 50 | **2** | Joaillier | 1 | `iron_ore 4` `crystal 1` | 30 | 35 |
| **2 P** | `a_plates_scorie` | Plates de scorie | armure (plaques) | rare | `def 10` · `hp 10` · `spd -1` · **`shield_floor 40`** · `ward 25` | **`breath_shield_ignore` = 40** | **5** | Forgeron | 2 | **`slag_drake 3`** `iron_ore 10` `stone 6` | 100 | 130 |
| **2 A** | `w_pic_faille` | Pic de faille | arme | rare | `atk 10` · **`brand "fissure"`** | `fissure_step` 5 / `fissure_cap` 4 → −20 de DÉF | **5** | Forgeron | 2 | **`slag_drake 4`** `iron_ore 8` `crystal 1` | 120 | 140 |
| **3 P** | `t_masque_fournaise` | Masque de fournaise | babiole | épique | `hp 18` · `ward 20` (tous biomes) · `shield_floor 25` · `ward_state 150` | — | **8** | Joaillier | 2 | `scales_iron 2` `drake_ember 1` `crystal 2` | 210 | 200 |
| **3 A** | `r_anneau_soufflet` | Anneau de soufflet | anneau | légendaire | `atk 7` · `crit 60` · `pierce 1` · `smite 25` (boss sous 50 %) | — | **8** | Joaillier | 2 | `scales_iron 3` `drake_ember 2` `crystal 3` | 270 | 230 |

**Le 40 n'est pas décoratif.** `resolveBreath` met à zéro tout bouclier **strictement inférieur** à
`raid_mountain.breath_shield_ignore` = 40. À 39, les plates ne font rien contre le souffle ; à 40, la garde
tient. C'est le palier 2 le plus lisible du jeu, et l'interface doit le dire en clair : *« la nappe de cendres
ne balaie plus votre garde »*. La cape de palier 1, elle, donne 20 — **volontairement en dessous** : elle
protège des cendres et de la queue, **pas du souffle**, et l'interface doit le dire aussi.

**Usage aval du palier 3 des monts :** `smite` sous 50 % de réserve a un lecteur **contre les trois dragons**
et contre le Capitaine rival du Derby ; `pierce` ne resservira que si le Drake revient
(`dragon_return_repelled` 5, `dragon_return_ravage` 3) — c'est dit honnêtement : **sur cet anneau, `pierce`
est un bonus de confort, `smite` est la vraie raison de le porter.**

#### Marais Noir

| palier | id | nom | empl. | rareté | statistiques | mécanisme visé | maîtrise | métier | forge | coût | or | travail |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1 P** | `c_cape_huilee` | Cape huilée | cape | commun | `def 2` · `ward 25` · `ward_state 350` | zone `venin` (poison à l'entrée **et** à chaque tour) | **2** | Tisserand | 1 | `swamp_moss 6` `hide 3` `herbs 2` | 25 | 40 |
| **1 A** | `r_anneau_faucille` | Anneau de faucille | anneau | commun | `atk 3` · `smite 25` (gueule) | `damageHead`, `head_hp_div` 6 | **2** | Joaillier | 1 | `venom 2` `iron_ore 3` `swamp_moss 2` | 25 | 35 |
| **2 P** | `a_robe_tourbe` | Robe de tourbe | armure (étoffe) | rare | `def 6` · `hp 12` · `magic 4` · `support 4` · `ward 25` · `ward_state 250` | `venom_turns` 2, `drain` 8 des sangsues | **5** | **Tisserand** | 2 | **`hydra_bile 3`** `swamp_moss 10` `herbs 6` | 95 | 120 |
| **2 A** | `w_serpe_cautere` | Serpe à cautériser | arme | rare | `atk 9` · **`brand "brule"`** | **`regrow_turns` 2** : une gueule coupée repousse si rien ne brûle | **5** | Forgeron | 2 | **`hydra_bile 4`** `iron_ore 6` `venom 4` | 110 | 130 |
| **3 P** | `t_fanal_noye` | Fanal des noyés | babiole | épique | `hp 18` · `heal 6` · `ward 20` (tous biomes) · `ward_state 150` | — | **8** | Joaillier | 2 | `hydra_venom 2` `hydra_fang 1` `crystal 2` | 200 | 200 |
| **3 A** | `r_anneau_tourbiere` | Anneau de tourbière | anneau | légendaire | `atk 6` · `magic 6` · `crit 60` · **`brand "brule"`** | — | **8** | Joaillier | 2 | `hydra_venom 3` `hydra_fang 2` `crystal 3` | 260 | 230 |

**Usage aval du palier 3 du marais :** l'anneau de tourbière porte `brand "brule"`, dont le lecteur est
`raid_forest.regen_pct` **autant que** `regrowHeads`. C'est l'objet qui permet à une guilde **sans Mage** de
partir brûler le Sylvain la saison d'après. C'est le meilleur des trois usages aval, et il est mécanique, pas
narratif.

**Le mage tisserand.** `a_robe_tourbe` est une armure d'étoffe, donc du Tisserand. Un Mage qui veut sa robe de
tourbe a besoin d'un Tisserand parmi ses amis — Clerc, Barde, ou Invocateur en affinité faible. C'est
exactement ce que demandait Pierre, et les quatre garde-fous du §5.2 empêchent que ce soit un mur.

### 6.5 Pourquoi `forge_level 2` partout, et pas 3

Mesuré : forge niveau 3 atteint **0 fois sur 60 saisons**, niveau 2 **1 fois**. Poser le palier 3 à
`forge_level 3` reviendrait à écrire du contenu que personne ne verra — exactement l'erreur que les six
recettes `dragon` commettent aujourd'hui. Les dix-huit objets s'arrêtent donc à **`forge_level 2`**, et c'est
la **maîtrise de biome**, pas le bâtiment, qui fait la progression. Corollaire : les quatre recettes `dragon`
conservées (§9) descendent elles aussi de 3 à 2.

Mais cela ne suffit pas non plus : la forge niveau 2 n'est atteinte qu'une fois sur 60. **Le palier 1 est donc
entièrement à `forge_level 1`**, et le vote de chantier doit pouvoir porter la forge au niveau 2 — ce qui est
traité au §7.

---

## 7. LE GOULOT DE LA FORGE [P]

C'est le risque signalé, et il est plus grave que prévu : ce n'est pas seulement que les amis simulés passent
devant, c'est que **le joueur humain ne peut rien commander du tout** (15 ‰ de jours, 0 jour-travail sur
1 797 [M]).

### 7.1 Trois correctifs, dans l'ordre de rendement

**(1) Le retrait automatique — le plus rentable, deux lignes.** `planDragonCraft` (sim.js:1267) sait déjà
retirer de l'entrepôt ce qui manque (`act('withdraw', …)`). La même règle s'applique à **toutes** les
recettes, pour **tous** les managers, y compris le joueur. Cible de preuve : la part de jours où le joueur
peut commander au moins une recette passe de **15 ‰** à **≥ 500 ‰**.

**(2) Une place par manager, et un travail réparti.** `forge_capacity` cesse d'être un nombre global et
devient un nombre de places **par manager** : `[0, 1, 1, 2, 2]`. Un ami ne peut plus jamais boucher la forge
du joueur.

*Attention arithmétique entière.* Si on répartissait les `forge_work_per_day` = 10 du niveau 1 entre cinq
files, chacune recevrait **2 points par jour** — un gambison (travail 30) sortirait en quinze jours. Il faut
donc recalibrer ensemble :

| constante | aujourd'hui | proposé | conséquence |
|---|---|---|---|
| `forge_capacity` | `[0,1,2,3,4]` (global) | **`[0,1,1,2,2]` par manager** | le joueur a toujours sa place |
| `forge_work_per_day` | `[0,10,20,30,40]` | **`[0,30,50,70,90]`** | réparti `div(base, files_actives)`, **plancher 8 par file** |
| répartition | tout au premier de la file | `div(base, n)`, reste au premier identifiant | déterminisme préservé |

À cinq files ouvertes au niveau 1 : `div(30, 5) = 6`, relevé au plancher **8** par file. Un gambison
(travail 30) sort en 4 jours ; une cape d'écorce (travail 40) en 5 ; un plastron de sève (travail 110) en
14 jours au niveau 1, **4 jours au niveau 2** (`div(50,5) = 10`, plus la puissance d'artisanat du héros de
créneau, 20 à 45 points). C'est ce qui rend la forge niveau 2 enfin désirable — et donc votée.

**(3) La commande de guilde.** `forge_queue[].taker_id` en plus de `owner` : un travail posé par un manager
peut être pris à l'atelier par le héros d'un autre. C'est ce qui donne à l'écran de forge l'allure d'une place
de capitale, et c'est le seul mécanisme qui rend les cinq métiers jouables à quatre héros.

### 7.2 Comment on le prouve

Contrôle **C5** (§10) : *le joueur humain obtient au moins un objet sorti de SA file dans au moins 900 ‰ des
saisons* (aujourd'hui : 0 jour-travail sur 1 797). Et un contrôle de non-régression : *aucun manager n'occupe
plus de `forge_capacity` places à la fois*, sur 60 saisons × 30 jours.

---

## 8. LES CONSOMMABLES DE BIOME [P]

### 8.1 Pourquoi ce n'est pas un doublon des six fioles

L'audit a mesuré que **les six fioles sont entièrement mortes en raid** : `combatProfile` calcule `p.potion`,
`raidEnvOf` ne le transmet pas, `heroUnitOf` ne le lit pas. Six objets sur 47 sans aucun effet sur la grille.
Refaire la même famille au même endroit serait refaire la même erreur.

Les **onguents de biome** sont d'une autre nature sur quatre points :

| | les six fioles | les six onguents |
|---|---|---|
| portée | un héros | **tous les héros d'un manager** |
| moment | à l'entrée d'une expédition (`use: "expedition"`) | **le matin, pour la journée** |
| emplacement | occupe l'emplacement fiole | **occupe l'emplacement fiole, et se consomme le soir** |
| lecteur | aucun en raid | **les mêmes lecteurs que `ward`, `ward_state`, `shield_floor`, `brand`** (§6.3) |

Ils n'ajoutent donc **aucun nouveau lecteur au moteur tactique** : ils réutilisent exactement les cinq clés du
palier d'équipement, à des valeurs plus faibles et pour une journée. C'est le seul dessin qui garantit qu'ils
ne seront pas morts : **s'ils sont morts, c'est que le palier 2 l'est aussi, et le contrôle C8 l'aurait vu.**

### 8.2 Les six onguents

| id | nom | biome | famille | effet pour la journée, sur tous les héros du manager | coût | or | travail | métier |
|---|---|---|---|---|---|---|---|---|
| `o_onguent_seve` | Onguent de sève | forêt | protection | `ward 20` · `ward_state 200` | `herbs 6` `swamp_moss 3` | 20 | 30 | Alchimiste 1 |
| `o_resine_ardente` | Résine ardente | forêt | agression | `brand "brule"` **au niveau 1** (pas au niveau du héros) | `herbs 4` `wood 4` `venom 2` | 30 | 35 | Alchimiste 2 |
| `o_baume_cendre` | Baume de cendre | monts | protection | `ward 20` · `shield_floor 15` | `herbs 4` `stone 4` `iron_ore 2` | 20 | 30 | Alchimiste 1 |
| `o_poudre_faille` | Poudre de faille | monts | agression | `brand "fissure"`, **une seule fissure par passage** | `crystal 1` `iron_ore 4` `venom 1` | 35 | 35 | Alchimiste 2 |
| `o_lait_tourbe` | Lait de tourbe | marais | protection | `ward 20` · `ward_state 200` | `swamp_moss 6` `herbs 3` | 20 | 30 | Alchimiste 1 |
| `o_fiel_cautere` | Fiel cautérisant | marais | agression | `brand "brule"` au niveau 1 | `venom 3` `swamp_moss 4` | 30 | 35 | Alchimiste 2 |

À 20-35 or et 8 à 10 unités de ressources, avec une bourse de manager médiane de **245 or** en fin de saison
[M], une guilde en brûle **deux à quatre par saison** : assez pour que ce soit un choix, pas assez pour que
ce soit une routine.

### 8.3 Ce qu'ils règlent, et c'est le point le plus important de ce document

**L'onguent d'agression est la version pauvre du palier 2.** `o_resine_ardente` pose `brule` au **niveau 1**
(`dotTick` : `8 + 2 × 1` = **10** par tour), là où `w_torche_resinee` le pose au niveau du porteur
(`8 + 2 × 5` = **18** au niveau médian mesuré). Une guilde qui n'a pas eu son arme de palier 2 à temps peut
donc **acheter ou distiller la même réponse le matin même, en moins fort**.

C'est la réponse mécanique à *« une guilde mal préparée doit pouvoir gagner quand même, plus difficilement,
jamais être bloquée »*. Elle n'est pas déclarative : elle est dans la table, et elle est gardée par le
contrôle **C4**.

---

## 9. CE QUE ÇA REMPLACE, CE QUE ÇA REND CADUC

### 9.1 Ce qui garde son sens — 14 recettes sur 23, reclassées par métier

| métier | recettes conservées |
|---|---|
| **Forgeron** | `r_epee_fer`, `r_dague`, `r_masse`, `r_cotte_fer`, `r_epee_acier`, `r_lame_venimeuse` |
| **Tanneur** | `r_arc_chasse`, `r_cuir`, `r_gambison`, `r_cuir_cloute`, `r_arc_if` |
| **Tisserand** | `r_robe_mousse` |
| **Alchimiste** | `r_potion_soin`, `r_antidote`, `r_baume` |

**Deux catégories fausses corrigées par construction.** `r_baton_cristal` (produit une arme) et
`r_robe_mousse` (produit une armure) portent aujourd'hui `category: "potions"`, ce qui donne au Mage le bonus
×120 de `craftSlotRun` pour forger un bâton et tisser une robe [L]. Avec les métiers, `r_baton_cristal`
devient **Joaillier** (c'est un sertissage de cristal) et `r_robe_mousse` **Tisserand** : le bug disparaît
sans correctif dédié.

### 9.2 Ce qui devient redondant — 4 recettes à reclasser

Les quatre recettes `dragon` conservées passent de `forge_level 3` à **`forge_level 2`** et gagnent un seuil
de maîtrise 8, faute de quoi elles restent inatteignables (forge niveau 3 : **0 saison sur 60** [M]) :
`r_d_lame_coeur`, `r_d_cuirasse_ecailles`, `r_d_amulette_braise`, `r_d_dague_hydre`.

### 9.3 Ce qu'il faut supprimer — 3 recettes et 1 objet

| id | pourquoi |
|---|---|
| **`r_d_couronne_dragons`** | exige les matériaux des **trois** dragons, donc n'est atteignable qu'après les avoir tous tués — soit après la fin de la saison utile. Mesuré : jamais fabriquée, `t_couronne_dragons` jamais porté en 60 saisons. Son rôle d'« objet des trois biomes » passe aux trois anneaux de palier 3, qui, eux, ont un usage aval prouvé. |
| **`r_d_manteau_marais`** | produit une armure légendaire qui double `a_peau_hydre`, butin du **même** dragon. Redondance par construction. Mesuré : jamais fabriquée, jamais portée. |
| **`r_elixir_force`** | produit `c_elixir_force`, mesuré **mort en raid** (fiole non transmise) et **jamais porté** en 60 saisons. Remplacé par les onguents, qui ont un lecteur. |
| objet **`c_elixir_pierre`** | jamais porté, aucune recette, jumeau exact de `c_elixir_force`. À retirer du catalogue, pas seulement de l'affichage — invariant du studio. |

### 9.4 Les objets morts restants, à trancher

Mesurés jamais portés en 60 saisons : `c_antidote`, `c_baume` (fioles mortes en raid mais **vivantes en
expédition** : `applyStartConsumables` lit `poison_immune` et `injury_days`) → **conservés**, mais leur
libellé d'interface doit dire « effet en expédition seulement ». `w_croc_drake` → conservé (légendaire du
Drake, tiré rarement par construction).

---

## 10. CRITÈRES D'ACCEPTATION MESURABLES

Protocole commun : **60 saisons × 30 jours, 5-6 managers, plans par défaut, graines `1000 + 7i`** — la même
population que les mesures du §1, pour que l'avant et l'après soient appariés.

### 10.1 La chaîne entière : le matériau doit précéder le mur

Pour chaque biome et chaque saison, enregistrer quatre jours :

* **J_mat** — le jour où les matériaux du palier 2 du biome (3 ou 4 unités du matériau de boss) sont réunis
  dans l'entrepôt **ou** dans un inventaire de manager ;
* **J_forge** — le jour où l'objet de palier 2 sort de la file de forge ;
* **J_porte** — le jour où il est **équipé** par un héros ;
* **J_mur** — le jour du **présage** du dragon du biome (l'attaque tombe le lendemain).

| id | contrôle | borne | d'où vient la borne |
|---|---|---|---|
| **C1** | `J_porte ≤ J_mur − 3` | **≥ 700 ‰** des saisons où le dragon se réveille | trois jours, c'est un jour pour s'équiper le matin, un jour de marge de fatigue (`ap_fatigue_threshold` 60), un jour de bruit |
| **C2** | `J_mat ≤ J_mur − 6` | **≥ 800 ‰** | 1 jour de commande + 3 à 4 jours de travail (110-140 points à 30-50 par jour) + la marge de C1 |
| **C3** | premier boss de donjon du biome préféré tombé | **au plus tard au jour 12, dans ≥ 800 ‰** | aujourd'hui : médiane **j24 / j25 / j29**, et seulement 11, 10 et 6 saisons sur 60 [M] |
| **C4** | **anti-blocage** : dans les saisons où C1 échoue, taux de victoire du raid | **≥ 400 ‰** | c'est le plancher déjà gardé par `season_t5_check (2)`. *Une guilde mal préparée gagne moins souvent, jamais « jamais ».* |
| **C5** | le joueur humain sort au moins un objet de **sa** file | **≥ 900 ‰** des saisons | aujourd'hui **0 jour-travail sur 1 797** [M] |

**Ce qu'on fait des saisons qui ratent C1.** Rien de punitif, et trois sorties mécaniques, toutes déjà dans
la conception : (a) les **onguents** du §8 donnent la même réponse le matin même, en plus faible ; (b) le
**plancher de l'autel** (§6.2 b) garantit qu'aucune saison n'est définitivement privée du matériau ; (c) le
dragon **revient** (`dragon_return_repelled` 5, `dragon_return_ravage` 3) — un raid perdu n'est pas une saison
perdue, c'est un second rendez-vous avec le matériel enfin prêt. La chronique doit dire les trois (§11.3).

### 10.2 Artisanat, emplacements, métiers

| id | contrôle | borne |
|---|---|---|
| **C6** | pour chacun des **six** emplacements, au moins **deux** recettes accessibles à `forge_level` 1 ou 2 | contrôle statique sur `data.json`, zéro exception (aujourd'hui : la babiole en a 2, toutes deux au niveau 3) |
| **C7** | part des créneaux d'atelier consacrée à chaque métier | **dans `[100 ‰, 400 ‰]`** — part uniforme 200 ‰ à cinq métiers, bande ±100 ‰, sur le modèle de `loadout_t8_check (7a-7c)`. *Aucun métier inutile, aucun métier obligatoire.* |
| **C8** | niveau médian du métier principal d'un héros ayant passé ≥ 6 journées à l'atelier | **≥ 3** |
| **C9** | au jour 20, part d'emplacements remplis sur les six | **≥ 600 ‰** au total, et **≥ 350 ‰** pour chacun des six pris séparément (aujourd'hui : 519 ‰ sur quatre [M]) |
| **C10** | objets du catalogue jamais portés en 60 saisons | **0** (aujourd'hui : **11 sur 47** [M]) |

### 10.3 Le calibrage : pencher la balance, jamais ouvrir la porte

Mesure **appariée** — même graine, même dragon, même jour de raid forcé — sur le modèle de l'audit §2.2.
Observable : **taux de victoire du raid** en permille, et **part de la réserve du boss entamée au premier
jour** en permille.

| id | contrôle | borne | ancrage mesuré |
|---|---|---|---|
| **C11** | valeur d'**un seul** objet de biome | **≤ 100 ‰** de taux de victoire | le brûleur, qui est le plus gros levier connu du jeu, vaut **250 ‰** (9/20 → 14/20) |
| **C12** | valeur du **trousseau complet** d'un biome (cape + anneau + armure + arme de palier 1 et 2) | **entre 200 et 300 ‰** | même ancrage : le trousseau entier vaut au plus ce que vaut le brûleur |
| **C13** | taux de victoire **sans aucun** équipement de biome | **≥ 400 ‰** | plancher de `season_t5_check (2)`. **C'est le contrôle qui interdit la corvée de résistance.** |
| **C14** | taux de victoire **avec** le trousseau complet | **≤ 850 ‰** | plafond de `season_t5_check (2)`. Un raid qui devient formalité n'est plus un raid. |
| **C15** | chaque nouvelle clé (`ward`, `ward_state`, `shield_floor`, `brand`, `smite`, `pierce`) prise seule | **Δ apparié mesurable**, `\|Δ\|/erreur-type ≥ 2` | l'audit a mesuré sept grandeurs à effet **strictement nul** ; une clé qui ne passe pas ce test est **retirée des données**, pas seulement de l'affichage |

**Prédiction honnête sur `pierce`.** `crit` médian mesuré = 95 ‰ ; l'audit donne **+100 ‰ ⇒ +2 % de dégâts**.
Rendre 95 ‰ utiles pendant la première moitié du raid vaut donc de l'ordre de **+1 %** — c'est-à-dire **sous
le seuil de perception mesuré**. C'est pourquoi `r_anneau_burin` porte `crit 80` **en plus** de `pierce 1` :
l'ensemble doit peser 2 à 3 %, et l'interface doit vendre `pierce` comme une **lisibilité** (« vos critiques
passent enfin les écailles »), jamais comme une puissance. Si C15 échoue sur `pierce` seul, c'est attendu ;
s'il échoue sur l'anneau entier, l'anneau est à refaire.

---

## 11. LA BOUCLE DE CAPITALE

### 11.1 Qui donne quoi — la table des sources

| ce qu'on obtient | d'où ça vient, et de nulle part ailleurs |
|---|---|
| `wood` `herbs` `hide` `stone` `iron_ore` `crystal` `swamp_moss` `venom` | **récolte** (`gather_split` du biome) et récompenses de quête |
| **`bark_sylvan` `slag_drake` `hydra_bile`** | **boss de donjon du biome uniquement** (`bosses[].loot`), plus 1 unité par **autel** réussi |
| `heartwood` `sylvan_sap` `scales_iron` `drake_ember` `hydra_venom` `hydra_fang` | **dragon abattu uniquement** (`dragons[].materials`, 4 à 8 unités) |
| armes / armures / babioles communes et rares | **butin** de donjon (`loot_pools`, `loot_rarity`) |
| **capes et anneaux de biome, armures et armes de palier 2, totems, onguents** | **forge uniquement — le butin ne les donne jamais** |
| légendaires de dragon | **dragon abattu uniquement** (`legendary_pool`, un seul exemplaire par saison) |

**La ligne qui manque aujourd'hui est la cinquième.** C'est elle, et elle seule, qui fait que le craft décide.

### 11.2 La journée du joueur, avant et après

| moment | aujourd'hui [M] | après [P] |
|---|---|---|
| matin | on répartit les points d'action entre récolte, entraînement et expédition | idem, plus : **on regarde ce qui manque à l'atelier** — l'écran de forge affiche « il manque 2 écorces de sylvain » |
| journée | on part en quête ; on remonte la maîtrise du biome | on part en quête, **et on choisit la Tanière quand on veut l'écorce** — la quête sert à deux choses à la fois |
| retour | le butin tombe, on équipe le meilleur objet | le butin tombe, **et le matériau de boss entre à l'entrepôt** |
| soir | la forge d'un ami livre une potion de soin | **chacun a sa place à la forge** ; la commande de guilde permet d'emprunter le Tisserand d'un ami |
| veille du dragon | présage, on va se coucher | présage, **on distille un onguent**, on vérifie qui porte quoi ; la chronique dit ce qui manque |
| jour du dragon | on lance le raid | on lance le raid **avec ou sans** — et l'après-raid donne les matériaux du palier 3, qui préparent **un autre** biome |

### 11.3 Ce que la chronique doit raconter

Cinq lignes nouvelles, toutes déterministes et toutes tirées de l'état, jamais d'un tirage :

1. **Quand un matériau de boss entre** — section `expedition` :
   *« Ils rapportent 3 écorces de sylvain : de quoi tremper un plastron. »*
2. **Quand la forge prend une commande de biome** — section `forge` :
   *« Maëlle pose une cape d'écorce à l'atelier ; Anselme, tanneur, s'en saisit. »*
3. **Quand un objet de biome est équipé** — section `matin` :
   *« Roxane boucle ses plates de scorie. Le souffle du Drake ne balaiera plus sa garde. »*
   (la phrase cite le mécanisme, `breath_shield_ignore`, sans le nommer)
4. **La veille du dragon, l'état de préparation** — section `presage`, et c'est la plus importante :
   *« Personne à la guilde ne porte de cape de cendre. Les cendres brûleront. »* — ou, à l'inverse,
   *« Trois plastrons de sève, deux torches résinées : la guilde a fait ses devoirs. »*
   **Un avertissement lisible vaut mieux qu'un échec muet.**
5. **Après le dragon** — section `raid` :
   *« Du cœur du Sylvain, on tire de quoi sertir un anneau qui servira au marais. »* — la ligne qui dit que
   le palier 3 regarde ailleurs.

C'est cette cinquième ligne qui donne la sensation de capitale : **la fin d'une boucle est le début d'une
autre**, et la chronique le dit.

---

## 12. COÛT D'IMPLÉMENTATION

### 12.1 Le fait qui commande tout l'ordonnancement

`golden/README.md` : `data_fnv` = `97a2d68a` est l'empreinte FNV-1a de `data.json` **canonisé**, et le premier
contrôle du portage est de la vérifier. **Toute modification de `data.json`, même d'une seule ligne, même sans
toucher au moteur, invalide les sept vecteurs de référence.** Et toute tranche ci-dessous touche `data.json`.

Il n'y a donc **aucune tranche sans régénération**. L'ordre honnête est :

> portage Godot validé contre `vectors.json` actuel → **gel** → tranches A à E → **régénération unique** des
> vecteurs par `port/gen_golden.mjs` → revalidation du portage par `port/godot/golden_check.gd`.

Proposer l'inverse (« commencer par les tranches qui ne touchent pas la grille ») serait faux : il n'y en a
aucune.

### 12.2 Les cinq tranches

| tranche | ce que ça touche | preuve mécanique attendue |
|---|---|---|
| **A — les six emplacements** | `data.json` : `slots` 4→6, +10 objets génériques (5 capes, 5 anneaux), `loot_pools` 3→5, +3 capes légendaires dans `dragons[].legendary_pool` · `sim.js` : `h.equipment` gagne deux clés (`itemStats` boucle déjà sur `sortedKeys(h.equipment)`, **aucun changement**), `planEquip`, `viewModel` publie six entrées · `index.html` : l'écran d'équipement · bancs : `ui_v4_check`, `ui_v5_check`, `harness` | « six emplacements pour tout héros, tout jour » sur 60 saisons × 30 jours (modèle `loadout_t8_check (1)`) ; **C9** |
| **B — les cinq métiers** | `data.json` : `crafts` (retire `forge`, ajoute cinq), `craft_by_class`, `craft_by_attribute`, `classes[].job_affinity`, `recipes[].job` · `sim.js` : `craftPower` (534), `craftSlotRun` (1513), `addCraftXp` (1569), `craftBonus` · bancs : `stats_t6_check`, `ui_v4_check` | **C6**, **C7**, **C8**, plus « aucune recette n'est refusée pour cause de métier » |
| **C — le matériau précède le mur** | `data.json` : 3 ressources de boss, `bosses[].loot`, quête `tanniere` + ses `room_weights` + `quest_type_weight_tiers`, `bosses[].hp_pct_den` · `sim.js` : `instantiateBoss`, `resolveAltar`, `expeditionRewards` · bancs : `engine_v4_check`, `season_t5_check` | **C2**, **C3** |
| **D — les 18 objets et les 6 grandeurs** | `data.json` : 18 objets, 18 recettes, `recipes[].mastery_min` · `sim.js` : `combatProfile` (480-510) somme les six clés, `raidEnvOf` (214) les transmet, `canAffordRecipe` (827) teste la maîtrise · **`tactic.js`** : `heroUnitOf` (2758) les pose, `enterZone` (243) et `dotTick` (2025) lisent `ward`/`ward_state`, `startHeroTurn` (2039) applique `shield_floor`, `applyHit` (322) applique `brand`, `critImmune` (522) lit `pierce`, `damageFromPower` (461) lit `smite` · bancs : `tactic_t1/t2/t3_check`, `stats_t6_check` | **C11 à C15**, mesure appariée |
| **E — onguents et goulot de forge** | `data.json` : 6 onguents + 6 recettes, `forge_capacity`, `forge_work_per_day` · `sim.js` : `forgeAdvance` (1613) répartit, `planEconomy` (1272) retire de l'entrepôt, `forge_queue[].taker_id`, action `use_onguent` · `index.html` : écran de forge par métier · bancs : `season_t5_check`, `ui_v4_check` | **C1**, **C4**, **C5** |

**Point d'attention pour la tranche D.** Les six clés doivent traverser **trois** frontières successives, et
l'audit a déjà mesuré qu'un oubli à la deuxième suffit à tuer un objet : `combatProfile` → `raidEnvOf` →
`heroUnitOf`. C'est exactement le chemin où `fire`, `dodge`, `hit_bonus` et les six fioles se sont perdus. Le
contrôle C15 est là pour ça, et il doit tourner **sur chaque clé prise seule**, pas sur le lot.

---

## 13. RISQUES

| risque | ce qui le borne |
|---|---|
| **Inflation d'objets** — 47 → 84 | **C10** : zéro objet jamais porté. Aujourd'hui 11 sur 47 sont morts ; si le catalogue grandit sans que ce nombre tombe à zéro, la conception a échoué. Trois recettes et un objet sont supprimés (§9.3). |
| **Craft obligatoire (la corvée de résistance)** | **C13** : ≥ 400 ‰ de victoire **sans aucun** équipement de biome, et **C11** : aucun objet ne vaut plus de 100 ‰ à lui seul. Plus les onguents (§8.3), qui donnent une version faible du palier 2 le matin même. |
| **Écran de forge sur téléphone** — 23 recettes → 41 | rangé par **métier** (cinq onglets), pas par catégorie : au plus 10 recettes par onglet. Une recette dont il manque un matériau est **grisée avec la ligne qui manque** (« il manque 2 écorces de sylvain »), jamais cachée — sinon le joueur ne sait pas quoi aller chercher. |
| **Guilde mal répartie entre les métiers** | quatre garde-fous mécaniques (§5.2) : l'affinité ne conditionne jamais l'accès, plafond de 8 jours, commande de guilde, onguents au comptoir. **C7** vérifie qu'aucun métier n'est ni inutile ni obligatoire. |
| **Le jour du dragon sans préparation** | **C4** (≥ 400 ‰ de victoire), les onguents, le retour du dragon (`dragon_return_*`), et la ligne de chronique n°4 (§11.3) qui prévient la veille. |
| **Les six nouvelles grandeurs peuvent être mortes** | le projet a déjà sept grandeurs mortes mesurées. **C15** l'oblige à prouver sa variance clé par clé ; une clé qui échoue est **retirée des données**. |
| **Les vecteurs de référence** | §12.1 : toutes les tranches les invalident, `data_fnv` compris. L'ordre portage → gel → tranches → régénération unique → revalidation doit être **ratifié par Pierre avant la tranche A**, pas découvert après. |
| **Le boss de donjon reste rare malgré la Tanière** | **C3** est le contrôle de sortie. S'il échoue, le palier 2 n'a pas de matériau à temps et **la tranche D ne doit pas être livrée** : il faut d'abord rendre le boss atteignable, sinon on reproduit exactement le défaut mesuré au §1.5. |
| **Le plancher de travail à 8 points casse l'équilibre de la forge** | `forge_work_per_day` est recalibré en même temps (§7.1) ; le contrôle de non-régression est le temps de sortie d'un gambison (aujourd'hui 3 jours à file unique, cible 4 jours à cinq files). |

---

## 14. CE QUI N'EST PAS VÉRIFIÉ

* Les valeurs des dix-huit objets et des six onguents sont **proposées**, jamais mesurées : aucune n'a été
  jouée, puisque le moteur n'a pas été touché. Leur ancrage est arithmétique (§6.3, §10.3), pas expérimental.
* Le taux de victoire attendu après la tranche D n'est pas prédit : **C11 à C14 sont des bornes à mesurer**,
  pas des résultats annoncés.
* L'effet de la quête `tanniere` sur le rythme de la saison (fatigue, blessures, maîtrise) n'est pas simulé :
  c'est un nouveau type de quête, il déplacera l'équilibre de `season_t5_check` et cela devra être remesuré.
* La répartition des affinités de métier (§5.2) n'a pas été éprouvée sur la distribution réelle des classes
  d'un effectif : **C7** est exactement le contrôle qui manque.

---

**software_verdict: OK** (conception ; aucun code, aucune donnée, aucun vecteur modifié)
**evidence_verdict: MECHANICAL_VALIDATION_ONLY**
**claim_verdict: NO_CLAIM_ALLOWED**
