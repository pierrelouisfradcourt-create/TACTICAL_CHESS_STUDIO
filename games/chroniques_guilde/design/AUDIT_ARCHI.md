# AUDIT ARCHITECTURAL — « Chroniques de Guilde »

Date : 2026-09-18.
Source : mission d'audit en lecture seule (demande de Pierre : « voir si on part en spaghetti ou si c'est propre »),
conduite par un sous-agent Claude Code sur le dossier `scratchpad/guilde` à l'état du 2026-09-18 18:46
(`sim.js` 3 077 l. · `tactic.js` 1 399 l. · `index.html` 2 418 l. · `data.json` 6 107 l. · `CONTRACT.md` · `V5_SPEC.md`).
Aucun fichier du prototype n'a été modifié. Les mesures marquées **[mesuré]** proviennent de l'exécution des bancs
existants ou de scripts d'analyse jetables (supprimés) ; les autres sont des lectures de code citées par fichier:ligne.
Les jugements de conception sont marqués **[jugement]**.

---

## 1. Verdict global

> **Propre, avec trois dettes localisées et un défaut de conception dans le raid asynchrone : ce n'est pas du
> spaghetti, mais deux choses doivent être réglées avant la tranche T2.**

Justification, par les chiffres **[mesuré]** :

| Indicateur | Valeur | Lecture |
|---|---|---|
| Copier-coller exact entre `sim.js` et `tactic.js` | **26 lignes** (makeRng, utf8Bytes, div/clamp/pct) | duplication volontaire et documentée |
| Copier-coller exact interne (≥ 3 l.) | `index.html` **0** · `sim.js` **0** · `tactic.js` **6 l.** | quasi nul |
| Fonctions > convention (80 moteur / 60 page) | `sim.js` **1** (`validateInner` 92 l.) · `tactic.js` **1** (`policyAction` 132 l.) · `index.html` **0** | exceptionnel |
| Longueur médiane d'une fonction | `sim.js` 7 l. · `tactic.js` 4 l. · `index.html` 1 l. | découpage fin |
| Profondeur d'imbrication max (hors IIFE) | 6 (`phaseRaid`, `phaseSolo`, `castSpell`) | raisonnable |
| Accès de la page à `app.state` hors `viewModel` | **0** pour le jeu au jour le jour ; **9 sites** pour l'écran Raid | frontière tenue partout sauf le raid |
| `Math.random` / `Date` / `Intl` / `localeCompare` / `toLocale*` / `Math.round\|floor\|ceil` dans les moteurs | **0** | déterminisme discipliné |
| `Object.keys` sans tri dans les moteurs | **4**, toutes sûres (comptage ou tri explicite ensuite) | vérifié une à une |
| Dépendance `tactic.js → sim.js` | **aucune** ; `sim.js → tactic.js` : 8 appels, tous par l'API publique | dépendance à sens unique |
| Bancs verts | **262 contrôles** sur 8 bancs courants | preuve d'exécution |
| Bancs pourris | **2** (`real_check.mjs` 5/10, `ui_check.mjs` sur une doublure de V1) | vestiges |
| Perfs (30 jours, 5 managers) | `resolveDay` 2,6 ms/jour · `viewModel` 2,0 ms (3,9 ms pendant un raid) · rejeu 30 j = 45 ms | large marge Android |
| État sérialisé au J30 | 21,2 Ko · journal de saison 50,4 Ko | tient sans effort |

Ce qui empêche le verdict « propre » tout court, dans l'ordre de gravité :

1. **Le raid asynchrone donne au joueur une grille périmée** : 44 passages humains sur 58 sont interrompus au rejeu
   du soir, après **0,77 action jouée en moyenne** (§9, bug B1). C'est un défaut de conception, pas un bug de frappe.
2. **Le derby vole l'instant du jour** : 17 chroniques de derby sur 160 titrent sur une expédition de la guilde
   rivale, avec quatre noms de héros qui n'existent pas (§9, bug B2).
3. **L'écran Raid contourne le modèle de vue** : 9 sites lisent `state.raid` brut et rappellent
   `TACTIC._internal.*`, dont ~39 lignes qui réécrivent `spellVm` / `reachableCells` du moteur (§2, §4).

---

## 2. Couplage et frontières

### 2.1 « La page ne calcule aucune règle » — **tenu**, sauf sur un point

Vérifié mécaniquement : `app.state` n'apparaît que **25 fois** dans `index.html`, dont 24 pour le passer à
`SIM.newGame / resolveDay / validateAction / planDefaults / viewModel / hashState` et 1 pour lire `app.state.day`
(index.html:725). Aucun `app.state.<champ de jeu>` n'est lu. Toute décision passe par le moteur :

* `validateDay` (index.html:928-934) fabrique l'action et demande `SIM.validateAction` — jamais de règle locale.
* `setVote` (994), `addOrder` (1000), `toggleHeir` (980), `heirOffers` (977) : même discipline.
* `chooseSolo` (964) vérifie l'éligibilité via `h.activity_options`, pas via une table locale.

**La seule règle recalculée dans la page** est `raidForecast` (index.html:1152-1170) : elle rejoue les passages par
défaut des copains puis appelle `validateRaidPass`. Ce n'est pas une règle réécrite (tout vient du moteur), mais
c'est un **ordonnancement de journée reconstruit côté page** (`if (mid >= mine) return;` ligne 1159 reproduit le tri
ASCII des managers de `phaseRaid`, sim.js:2388). Si l'ordre change dans le moteur, la page ment sans que rien n'échoue.

### 2.2 « L'UI n'accède à l'état que par viewModel » — **violé sur l'écran Raid**

Neuf sites, tous dans le bloc « V5 T4 : écran Raid » :

| index.html | Ce qui est lu / appelé | Devrait venir de |
|---|---|---|
| 1065 `raidUnit()` | `rd.draft.raid.units`, `rd.draft.raid.pass` | `VM.raid.units` |
| 1070 | `SIM._internal.raidEnvOf(app.state, null)` | rien (interne du moteur) |
| 1100-1101 | `rd.draft.raid.pass`, `.status` | `VM.raid.me.pass` |
| 1110 | `TACTIC.raidView(rd.draft, …)` + `R = rd.draft.raid` | `VM.raid` |
| 1118 | `TACTIC._internal.ripostePlan(R, env, x, y)` | `VM.raid.boss.next_riposte` |
| 1136-1138 | `TACTIC._internal.classSpells / spellFor / powerOf` | `VM.raid.me.spells` |
| 1173 | `TACTIC._internal.dijkstra` | `VM.raid.me.reachable` |
| 1179 | `TACTIC._internal.dijkstra` + `.pathTo` | absent du contrat (§7.5 ne prévoit pas le chemin) |
| 1425 | `rd.draft.raid.units` (pour retrouver `class_id`) | `VM.raid.units[].class_id` (absent du VM) |

**Cause racine, identifiée** : `raidView` (tactic.js:1288-1312) construit toujours le bloc `me` pour le **début**
d'un passage — il clone `R`, appelle `beginPass` sur la copie et jette le passage réel en cours. Pendant le passage,
la page n'a donc plus de vue valide et se reconstruit la sienne (`raidMe` 1126, `raidSpells` 1135, `raidReach` 1172,
`raidRetelegraph` 1117). Le commentaire de l'auteur (index.html:1106-1108 et 1053-1057) l'assume explicitement.
**[jugement]** Le correctif est court et rend les 9 sites inutiles : dans `raidView`, si `R.pass` existe, n'est pas
`done` et appartient au manager demandé, bâtir `me` depuis `R` au lieu de `clone(R)+beginPass`, et ajouter
`me.path_to(x,y)` (ou `reachable[].prev`) + `units[].class_id` au VM.

### 2.3 Constantes de jeu dupliquées dans la page

| index.html | Duplique | Risque |
|---|---|---|
| 645 `ACT_LABEL` (8 entrées) | `activityLabel` sim.js:717 — **libellés identiques au caractère près** | divergence silencieuse |
| 648 `FULL_DAY` | `isFullDay` sim.js:186 (le commentaire le dit) | idem |
| 664 `rd.paMax = 6` | `data.raid.pa_per_turn = 6` | **si T5 recalibre les PA, la page affiche « x / 6 » faux** |
| 700 `a.ap_max = 3` (repli de `normalizeVM`) | `data.constants.ap_max` | repli défensif, faible |
| 2110 `slotCount` plafonné à 4 | `ap_max` (3) + 1 (endurant / terrain ≥ 3) | un héros à 5 PA (T2) perdrait un créneau à l'écran |
| 1056 `ZONE_SHAPE` | table inline de `spellVm` tactic.js:1279 | la page ajoute `ring`, le moteur non |
| 1149 `/PA insuffisants|relance/` | même regex, tactic.js:1282 | couplage par chaîne de caractères |

### 2.4 Présentation dans le moteur

Le contrat veut un VM « tout prêt à afficher » : que le moteur produise du français est donc **conforme**, pas une
dette. Ce qui est discutable **[jugement]**, ce sont les libellés **codés en dur dans le code plutôt que dans
`data.json`**, parce que T2/T3 obligeront à éditer le code pour chaque nouvel état, zone ou classe :

* `tactic.js:603 zoneLabel` (6 zones) · `604 stateLabel` (13 états) · `1298 phase_label` (« l'arbre veille »,
  « les rejetons », « l'écorce » — **texte propre au Sylvain écrit dans `raidView`**).
* `sim.js:717 activityLabel` · `2066-2067 outcomeLabel/outcomeVm` · `2485 soloRiskLabel` · `2897 statusLabel` ·
  `2194-2195 biomeLe/biomeDe`.

Autre point : `sim.js:2371 RAID_NOTABLE` est une **regex sur le texte du journal du moteur** pour choisir la ligne
« fait marquant » de la chronique. Le moteur relit donc sa propre prose. Toute reformulation d'un gabarit T2 dégrade
silencieusement la chronique du raid. Le journal devrait porter un drapeau (`{text, notable:true}`).

### 2.5 Sens des dépendances — **impeccable**

`tactic.js` ne contient **aucun** `require`, aucun `GuildeSim`, aucun appel à `sim.` : il ne reçoit que l'`env`
construit par `sim._internal.raidEnvOf`. `sim.js` l'appelle en 8 endroits (667, 2394, 2396, 2448, 2728, 3051, 3075,
3076), tous par l'API publique. Aucun accès DOM dans les deux moteurs (`document|window|navigator|localStorage|
fetch|setTimeout|requestAnimationFrame` : **0 occurrence**, hors un commentaire).

---

## 3. Cohésion interne

### 3.1 Les plus longues fonctions **[mesuré]** (hors l'IIFE de chaque fichier)

**`sim.js`** (convention : 80 l.)

| l. | lignes | fonction | params | prof. | verdict |
|---|---|---|---|---|---|
| 581 | **92** | `validateInner` | 2 | 4 | **dette légère** : `switch` sur 14 types d'action, chaque branche 2-8 l. C'est la table de validation ; la découper par famille (héros / votes / économie / raid) serait plus lisible, mais rien n'y est enchevêtré. |
| 2255 | 79 | `applyThreatOutcome` | 4 | 4 | légitime : les trois issues (vaincu / repoussé / ravage) partagent butin, prestige, bâtiment, XP. Sous la limite. |
| 442 | 70 | `newGame` | 3 | 5 | légitime : c'est la forme de l'état, à plat. |
| 2379 | 65 | `phaseRaid` | 1 | **6** | **surveiller** : double boucle managers × héros + boucle d'événements + la victoire. Extraire le bloc « victoire » (2431-2442) suffirait. |
| 3002 | 55 | `viewModel` | 2 | 5 | légitime : c'est le contrat, écrit à plat. |
| 2199 | 54 | `phaseThreat` · 2486 `phaseSolo` (54) | 1 | 3-6 | légitimes |
| 2019 | 47 | `applyToHeroes` | 3 | 4 | légitime |
| 2566 | 44 | `phaseTavern` · 2070 `phaseExpedition` (41) | 1 | 3-4 | légitimes |
| 891 | 38 | `planAssign` | **8** | 5 | **dette** : 8 paramètres (voir 3.3) |

**`tactic.js`** (convention : 80 l.)

| l. | lignes | fonction | params | prof. | verdict |
|---|---|---|---|---|---|
| 1025 | **132** | `policyAction` | 3 | 5 | **la dette la plus nette du fichier** : 6 `case` de classe (1062-1155) dans une même fonction, chacun 10-18 l., partageant 7 fermetures locales (`cast`, `safeMove`, `moveTo`, `chargeAny`, `losTo`, `spawnDist`, `offSpawn`). À 6 classes c'est encore lisible ; à 13 hybrides + 26 spés (T2/T3) c'est 40 `case` dans une fonction de 600 lignes. |
| 490 | 67 | `castSpell` | 7 | 5 | **acceptable** : 20 sorts sur 25 passent par `s.effects[]` (données) ; 5 `if (s.id === …)` pour les mécaniques spéciales (charge, sacrifice, vital_link, sidestep, light) + `shadow_strike`. |
| 1340 | 55 | `previewCast` | 3 | 5 | légitime : duplication assumée et prouvée (§4). |
| 1288 | 51 | `raidView` | 3 | 5 | légitime : c'est le contrat §7.5. |
| 924 | 37 | `applyPassAction` · 774 `riposte` (36) · 321 `pushUnit` (34) | 4-8 | 3-4 | légitimes |

**`index.html`** (convention : 60 l.) — **aucune fonction ne dépasse 33 lignes**. La plus longue est
`onAction` (2353, 33 l., routeur d'événements `data-act`). Médiane : **1 ligne**. C'est le fichier le plus propre des
trois au sens de la cohésion, ce qui est contre-intuitif pour une page de 2 418 lignes.

### 3.2 Profondeur d'imbrication

Maximum réel 6, atteint dans `phaseRaid` (sim.js:2379), `phaseSolo` (2486) et l'IIFE de `tactic.js`.
Rien au-delà. Aucune fonction de la page ne dépasse 5.

### 3.3 Fonctions à plus de 5 paramètres **[mesuré]**

* `sim.js` — 7 : `planAssign(8)@891`, `applyDamage(7)@1861`, `fillSlots(6)@886`, `planEconomy(6)@975`,
  `resolveRoom(6)@1457`, `applyEvent(6)@1595`, `onHit(6)@1896`.
  **[jugement]** `planAssign(D, state, P, heroes, quest, needs, act, m)` est le seul vrai signal : ses 8 arguments
  sont le contexte du planificateur. Un objet `PlanCtx` remplacerait aussi les 6 de `fillSlots` et `planEconomy`.
  Les autres (`resolveRoom`, `applyEvent`, `onHit`, `applyDamage`) portent `(ctx, exp, …, rng)` : c'est la signature
  de tout le moteur d'expédition, cohérente, à laisser.
* `tactic.js` — 18, dont `damageFromPower(9)@288`, `tryControl(8)@310`, `pushUnit(8)@321`, `castSpell(7)@490`,
  `applyEffectOn(7)@557`. **[jugement]** Elles partagent toutes le préfixe `(R, env, src, target, …, log)` : c'est
  un style « contexte explicite, aucune variable libre », qui est exactement ce qui rend le module pur et testable.
  Ce n'est pas de la dette, c'est le prix du zéro-état-global. À ne pas refactorer.
* `index.html` — 11, toutes des fonctions de dessin Canvas (`drawEmptyLot(9)`, `drawFigures(7)`, `drawBuilding(7)`…)
  qui reçoivent `(ctx, x, y, dim, T, evening, t)`. Idiome Canvas, à laisser.

### 3.4 Fichiers / sections qui font trop de choses

Découpage mesuré :

* `sim.js` : 18 sections numérotées, la plus grosse **321 l.** (« 7. JOURNÉE — contexte, phases 1 à 6 »), puis
  COMBAT 314, EXPÉDITION 301, PLANS PAR DÉFAUT 278, PHASES 8-13 257, MENACE 255. Réparti, lisible.
* `index.html` : 199 lignes de balisage, 433 de CSS, 1 786 de script réparties en 18 sections commentées.
  La plus grosse est **« scène : dessin » (407 l., 48 fonctions de tracé)** — cohésion forte, à laisser groupée.
* `tactic.js` : 9 sections, la plus grosse « 5. SORTS » (~230 l.).

**[jugement]** Le seul endroit qui « fait trop de choses » est `sim.js` §2 (AVENTURIERS, 241 l.) qui mélange
attributs, savoir-faire, points d'action, profil de combat, génération et **quatre helpers de raid**
(`raidActive` 188, `raidTableFor` 189, `raidEnabled` 190, `canRaid` 191, `raidEnvOf` 193) posés là faute de section
raid. Faible gravité.

---

## 4. Duplication réelle

### 4.1 Entre `sim.js` et `tactic.js` : **26 lignes, toutes voulues** **[mesuré]**

| Bloc | sim.js | tactic.js | lignes |
|---|---|---|---|
| `makeRng` (mulberry32 + roll/chance) | 51 | 42 | 12 |
| `utf8Bytes` (corps) | 25-38 | 27-38 | 7+4 |
| `div` / `clamp` / `pct` | 20-22 | 21-23 | 3 |

Plus, non détectées par comparaison exacte mais sémantiquement identiques : `clone`, `sortedKeys`, `sum`,
`fnvBytes`, `fnvStr`, `fnvU32`, `fill`, `joinFr`, `moraleMod`, `fatigueAtkMod`. Total réel ≈ **45 lignes**.

**À garder dupliqué.** C'est le prix explicite de « `tactic.js` : module pur, aucune dépendance » (en-tête du
fichier, CONTRACT.md §V5 T1). Factoriser dans un `core.js` ajouterait un troisième `<script>` à charger dans le bon
ordre et un troisième module à porter sous Godot, pour 45 lignes de primitives triviales. **Mais** il manque une
garde : rien ne vérifie que les deux `makeRng` restent identiques (voir §6, garde G1).

### 4.2 Duplication assumée et **prouvée** : `previewCast` ↔ `castWhy`

`tactic.js:1340-1394 previewCast` réimplémente les règles de portée / ligne / LdV / cible de
`castWhy` (414-437), sur la **vue** au lieu de l'état, pour que la page puisse afficher un aperçu sans muter.
C'est de la duplication à dessein, et elle est **mécaniquement gardée** : banc `tactic_t1_check` contrôle (7)
compare les deux sur **8 910 couples (sort, case)** — validité identique, dégâts réels dans [min, max critique],
0 écart **[mesuré, ré-exécuté]**. Modèle à imiter partout ailleurs.

### 4.3 Duplication **non voulue** : ~39 lignes de la page qui réécrivent le moteur

| index.html | Réécrit | Preuve |
|---|---|---|
| 1135-1150 `raidSpells` (16 l.) | `tactic.js:1276-1283 spellVm` | mêmes 21 champs, même regex `/PA insuffisants|relance/`, même table de formes |
| 1172-1176 `raidReach` (5 l.) | `tactic.js:1001 reachableCells` | même Dijkstra, même tri par index |
| 1117-1125 `raidRetelegraph` (9 l.) | bloc `ripCells`/`ripSet`/`safe` de `raidView` (1310-1317) | même formule de case sûre |
| 1126-1131 `raidMe` (6 l.) | bloc `me` de `raidView` (1300-1308) | même forme |
| 1177-1181 `raidPath` (5 l.) | rien (chemin absent du VM §7.5) | manque au contrat |

**À factoriser** : les 4 premiers disparaissent si `raidView` sait décrire un passage en cours (§2.2).
Le cinquième est un ajout à faire au contrat (`VM.raid.me.path_to`).

### 4.4 Duplication interne **[mesuré]**

`index.html` : **0 bloc** répété de ≥ 3 lignes. `sim.js` : **0**. `tactic.js` : **2 blocs de 3 lignes**
(662↔684 « étourdi → tickStates, return » ; 1070↔1086 « repli sur l'arme au contact »).
Les rendus répétitifs de la page (jauges, raretés, cartes) sont déjà factorisés :
`gaugeHtml`/`gaugesHtml` (2074-2075), `rarityClass` (672), `xpBar`, `traitsChips`, `pipsHtml`, `stars`,
`bannerHtml`, `equipList`, `costList`. **Rien à faire.**

### 4.5 Entre les bancs

Les 5 bancs Playwright partagent le même préambule (lancement Chromium, `check()`, serveur de fichiers) : ~40 lignes
répétées 5 fois ≈ **200 lignes**. Les 4 bancs moteur répètent la liste `MANAGERS` (5 entrées) et le chargement
`data.json` : ~15 l. × 4. **[jugement]** Faible valeur à factoriser tant que `harness.mjs` est « NE PAS MODIFIER »
et que chaque banc doit rester exécutable seul. À laisser.

---

## 5. Code mort et vestiges

### 5.1 Liste **sûre** à supprimer **[mesuré]**

| Quoi | Où | Poids | Preuve |
|---|---|---|---|
| `bEffect(D, state, id, key, fallback)` | sim.js:368-372 | 5 l. | **0 appel** dans les 3 fichiers |
| `clamp(x, lo, hi)` | tactic.js:22 | 1 l. | 0 appel |
| `sum(a)` | tactic.js:26 | 1 l. | 0 appel |
| `isEnemyOf(u, v)` | tactic.js:164 | 1 l. | 0 appel |
| Gabarits `templates.greedy_theft` (2) | data.json | 2 entrées | **jamais tirés** : aucune chaîne `'greedy_theft'` dans le code |
| Gabarits `templates.empty_guild` (2) | data.json | 2 entrées | idem |
| `test/index_stub.html` + `test/stub_sim.js` + `test/ui_check.mjs` | test/ | **145 Ko** | doublure de V1 (2026-09-17) ; le banc passe 58/58 mais ne prouve rien du produit actuel |
| `test/index_real.html` + `test/data_real.js` + `test/real_check.mjs` | test/ | **137 Ko** | **le banc échoue déjà : 5/10**, `pageerror: Cannot read properties of undefined (reading 'gather')` — page V1 contre moteur V5 |
| `test/index_v1_backup.html` `index_v2_backup.html` `index_v3_backup.html` `index_v4_backup.html` `sim_v1_backup.js` `sim_v3_backup.js` `data_v3_backup.json` | test/ | **836 Ko** | sauvegardes de version ; aucun banc ne les lit |

Total supprimable : **~1,12 Mo** dans `test/`, 8 lignes de code, 4 gabarits de données.
Aucun banc courant ne régresse : après suppression, les 8 bancs restants couvrent 262 contrôles → 204
(les 58 de `ui_check` étant les seuls perdus, et ils portent sur une page morte).

### 5.2 Liste **douteuse**, à vérifier avant de toucher

| Quoi | Pourquoi douteux |
|---|---|
| Formes `line`, `cone`, `ring` de `shapeCells` (tactic.js:112-114) | `ring` n'est utilisée par **aucun** sort ni riposte aujourd'hui ; `line` non plus ; `cone` sert à la riposte « spores ». `ring`/`line` sont annoncées au contrat V5 T1 et attendues par le Drake (souffle) et T2. **Garder.** |
| États `charme`, `chancelant`, `garde`, `reduction` | déclarés dans `stateLabel` ; `charme` n'est produit par aucun sort T1 (prévu pour le Marionnettiste, V5_SPEC §4 n°12). **Garder.** |
| `sim._internal.probeExpedition` (3060-3070) | sonde de test, appelée par aucun banc courant. Vérifier avec Pierre avant retrait. |
| `sim._internal.combatProfile`, `.canonical`, `.craftLevel`, `.apToday` | exposés « pour les bancs » ; `harness.mjs` est intouchable, donc vérifier son usage réel avant retrait. |
| Effets de données `kind:'teleport'`, `'vital_link'`, `'sacrifice'` (data.json) | **`applyEffectOn` ne les connaît pas** (`default: return false`, tactic.js:580) : le comportement réel est codé par `s.id` en amont dans `castSpell`. La donnée décrit un effet que le moteur ignore. Pas mort, mais **mensonger** : à aligner (§6, garde G3). |
| `test/engine_extra.mjs`, `test/harness.mjs` | **ne pas toucher** : verts (13/13 et 10/10), `harness.mjs` est marqué NE PAS MODIFIER au contrat. |

### 5.3 Ce qui n'est **pas** du code mort, contrairement aux apparences

Une recherche naïve d'identifiants « orphelins » dans `data.json` fait ressortir 16 missions solo, 19 recettes,
10 monstres, 8 décorations, 6 objets : **tous faux positifs**. Ces tables sont consommées génériquement
(`m.class_id`, `it.pool`, `m.biome`, catalogue du quartier, `r.category`), et le banc `engine_v4_check` prouve leur
usage réel (835 missions solo jouées sur 30 graines) **[mesuré]**. **Aucun identifiant orphelin dans `data.json`.**
Les seules données mortes sont les 4 gabarits de chronique du §5.1.

---

## 6. Déterminisme et invariants

### 6.1 L'état des lieux : très solide **[mesuré]**

* `sim.js` et `tactic.js` : **0** occurrence de `Math.random`, `new Date`, `Date.now`, `Intl.`, `localeCompare`,
  `toLocale*`, `Math.round`, `Math.floor`, `Math.ceil`, `Math.pow`, `Math.sqrt`, `Math.hypot`, `parseFloat`.
  Une seule primitive de troncature, `Math.trunc`, dans `div()`.
* **0** littéral flottant dans le code (les 8 détectés sont des numéros de §, « §2.1 », dans des commentaires).
* **0** `for…in`. 4 `Object.keys` sans tri immédiat, toutes vérifiées à la main : tactic.js:434 et 435 (comptage de
  pièges / zones, l'ordre n'entre pas), 652 (`.map(Number).sort()` sur la même ligne), 1001 (idem).
* `canonical()` (sim.js:76-81) trie les clés récursivement ; `hashState` = FNV-1a sur cette forme.
* Départages explicites partout : Dijkstra trie coût → index (tactic.js:193, commenté) ; `prevBetter` (209) ;
  `unitsSorted` par id ASCII (165) ; `cellsSorted` par index (94) ; votes à égalité par id ASCII (sim.js:1090).
* Le flux RNG du raid est **séparé** et sérialisé dans l'état (`rng_s`, `rng_count`) : une modification du raid ne
  décale pas le flux de la journée. Excellente décision.
* Preuve d'exécution ré-obtenue : `engine_v4_check` « déterminisme : 30 graines rejouées deux fois, hachages
  identiques — **0 divergence** » ; `harness` « aucun nombre non entier dans l'état », « aucun NaN ».

### 6.2 Résultat neuf de cet audit : le rejeu avec de **vrais** `raid_pass` humains tient

Le contrat V5 T1 liste comme **non vérifié** « le rejeu du journal de la page avec des `raid_pass` humains réels ».
Sonde exécutée ici (12 graines × 30 jours, passage humain construit coup par coup par `TACTIC.raidAction` comme le
fait la page, puis rejeu complet depuis `newGame`) : **58 jours de raid humains, 12/12 rejeux IDENTIQUES, 0
divergence, 0 exception** **[mesuré]**. La voie page est donc déterministe elle aussi.

### 6.3 Où ça peut casser aux prochaines tranches, et les gardes manquantes

| # | Risque | Où | Garde mécanique proposée |
|---|---|---|---|
| **G1** | Les deux `makeRng` divergent (un correctif dans l'un, pas dans l'autre) | sim.js:51 / tactic.js:42 | banc : comparer 10 000 tirages de `sim._internal.makeRng(s)` et `TACTIC._internal.makeRng(s)` pour 100 graines |
| **G2** | Un nouveau sort T2 introduit un flottant (`×1.5`, `/2` sur un impair) | `castSpell`, `applyEffectOn` | banc : après 100 raids, parcourir `state.raid` et échouer sur tout `Number.isInteger === false` (le harness le fait pour `state`, **pas** pour `state.raid` en profondeur — à étendre) |
| **G3** | Un `effects[].kind` inconnu est ignoré en silence | tactic.js:580 `default: return false` | banc : l'union des `kind` de `data.tactic_spells` ⊆ liste servie par `applyEffectOn` ∪ ids traités par `castSpell`. **Échoue aujourd'hui** sur `teleport`, `vital_link`, `sacrifice` (§5.2) |
| **G4** | Une nouvelle classe sans entrée `data.skills` fait planter le moteur | sim.js:248, 295, 2991 | voir §9 bug B3 ; garde : banc qui ajoute une classe nue et joue 5 jours |
| **G5** | Un `Object.keys` non trié se glisse dans un nouveau bloc | partout | garde statique : grep de CI interdisant `Object.keys(` non suivi de `.sort` hors comptage (ou lint maison) |
| **G6** | Une égalité non départagée dans un nouveau tri | tris de cibles, de butin | convention déjà tenue (`|| a.id < b.id ? -1 : 1`) ; garde : rejouer chaque graine deux fois **avec les clés d'objet mélangées** avant `resolveDay` — détecte toute dépendance à l'ordre d'insertion |
| **G7** | `ripostePlan` des 2e/3e dragons introduit un tirage dans une phase déjà consommée | tactic.js:765 | garde : `rng_count` du raid après une journée doit être identique entre deux rejeux (déjà couvert par le hash, mais l'exposer facilite le diagnostic) |
| **G8** | `phaseDerby` simule une expédition complète **sur le flux RNG du jour** (sim.js:2743-2761) | — | toute modification du moteur d'expédition décale le derby **et tout ce qui suit**. Garde : donner au derby son propre flux (`fnv(seed ^ day ^ 'derby')`), comme le raid. Coût faible, gain de découplage fort. |

---

## 7. Passage à l'échelle des tranches restantes

Ce que T2/T3 demandent : **+13 classes hybrides, +26 spécialisations, +26 sorts hybrides, +52 sorts de spé,
+2 fiches de dragon, 1 raid de saison**, soit ×6,5 sur le nombre de classes et ×4 sur le nombre de sorts.

### 7.1 Ce qui tient sans rien changer

* **`data.json`** : toutes les tables sont par identifiant et consommées génériquement. Ajouter une classe, un sort,
  un dragon n'exige aucun changement de forme. Le poids passerait de 136 Ko à ~350 Ko : sans effet mesurable
  (chargement ponctuel, index construit une fois par `index(data)` et mémoïsé sur `__idx`).
* **Le vocabulaire d'effets de `castSpell`** : 20 sorts sur 25 sont **entièrement en données**
  (`state / heal / shield / purify / push / zone / wall / summon / freeze`). Les mécaniques hybrides du V5_SPEC §4
  (ferveur, runes, ombre, souffle, double, fils, bête, élémentaire) demandent ~8 nouveaux `kind`, pas une refonte.
* **Les phases de `resolveDay`** (sim.js:2852-2887) : 16 appels alignés, un par phase, aucune logique.
  Ajouter une phase = une ligne. Structure exemplaire.
* **La construction du `viewModel`** : littéral à plat, 55 lignes. Ajouter un champ = une ligne.
* **Le rendu Canvas du raid** (index.html:1299-1467) : la grille est dessinée depuis `VM.raid.grid.cells` sans
  connaître les sorts ; seules `STATE_GLYPH` (1055) et `ZONE_COLOR` (1054) sont des tables à compléter.
* **Les perfs** : 3,9 ms de `viewModel` pendant un raid à 6 managers, 19 ms pour résoudre un jour de raid **[mesuré]**.
  Il y a un ordre de grandeur de marge.

### 7.2 Ce qui va craquer, nommément

| # | Endroit | Ce qui se passe à T2/T3 |
|---|---|---|
| **S1** | `tactic.js:1025-1156 policyAction` — `switch (cls)` à 6 `case` | une classe sans `case` **ne fait rien du tout** (`return null` final, l. 1155) : passage muet, aucune erreur, aucune notice. À 39 classes c'est une fonction de ~600 l. Refonte nécessaire : une politique par classe en table (`POLICY[classId] = fn`) ou, mieux, déclarative dans `data.json` (priorités de sorts + distance voulue), avec repli sur la classe de base de l'hybride. |
| **S2** | `sim.js:248` `D.skills_by_class[h.class_id].filter(…)` (idem 295, 2991) | **crash immédiat** sur une classe sans compétence — reproduit mécaniquement (§9 bug B3). Correctif : `(… || [])`. C'est le tout premier obstacle de T2. |
| **S3** | `tactic.js:765-809 ripostePlan` + `riposte` | les deux ripostes du Sylvain (`roots`, `spores`) sont codées en dur, avec leurs libellés français dans la fonction, et lisent des champs de fiche propres au Sylvain (`spores_power`, `roots_turns`). Le Drake (`breath`) et l'Hydre (`heads`) demandent soit deux branches de plus dans un `if/else` déjà à 36 lignes, soit — mieux — une table `data.raids[].ripostes[]` décrivant forme, rayon, effet, libellé. |
| **S4** | `tactic.js:810-846 checkPhase` / `spawnAdds` | phases 1/2/3 et apparition des rejetons « autour du tronc » : propres au Sylvain. Même traitement que S3. |
| **S5** | `tactic.js:393` `spellFor('arme')` : `ranged = class_id === 'ranger' \|\| 'mage'` | un hybride à distance (Tisse-vent, Oracle) sera au corps-à-corps. À passer en `data.classes[].weapon_range`. |
| **S6** | `sim.js:220-228 attackBase` (switch 5 classes, `default: will+strength`) et `952-959 gatherTargetFor` (4 `if`, `default: 'wood'`) | dégradation silencieuse : un hybride prend une formule d'attaque et une ressource de récolte par défaut, sans que rien ne le signale. À passer dans `data.classes[]` (les champs `primary/secondary/craft_attr/gather_affinity` existent déjà — le modèle de données est prêt, pas le code). |
| **S7** | `tactic.js:603-604 zoneLabel` / `stateLabel` + `1298 phase_label` | chaque nouvel état, zone ou dragon impose une édition de code. À passer en `data.tactic_states[]` / `data.tactic_zones[]` / `data.raids[].phase_labels[]`. |
| **S8** | `index.html:664 rd.paMax` / `2110 slotCount` plafonné à 4 / `645 ACT_LABEL` | constantes gelées côté page (§2.3). |
| **S9** | `sim.js:2743 phaseDerby` | le « Derby des Lames » (V5_SPEC §2.5, jours 26-28) remplace le derby aux jours 26-28 : il faudra faire cohabiter `phaseDerby` (qui simule une expédition complète sur le flux du jour) avec un raid de saison. C'est le point où le couplage RNG du derby (G8) fera mal. |
| **S10** | `sim.js:2371 RAID_NOTABLE` | la sélection du « fait marquant » par regex sur la prose dégrade à mesure que les gabarits T2/T3 s'ajoutent. |

**[jugement]** Ordre de traitement : **S2 d'abord** (une ligne, sinon rien ne démarre), puis **S1 et S3** (les deux
refontes ciblées, ~1 journée chacune), puis S5/S6/S7 (mise en données, mécanique et sans risque), S8 et S10 ensuite.
Aucune refonte générale n'est nécessaire.

---

## 8. Portabilité Android

### 8.1 Ce qui est bon

* Les deux moteurs sont **UMD, purs, sans DOM, sans horloge, sans réseau** : `document|window|navigator|
  localStorage|fetch|setTimeout|requestAnimationFrame` = **0 occurrence** dans `sim.js` et `tactic.js` **[mesuré]**.
* Dépendance à sens unique `sim → tactic`, 8 appels. Un portage Godot (GDScript/C#) ou natif peut reprendre
  `tactic.js` seul pour l'écran tactique.
* L'état est du JSON pur : 21,2 Ko au J30, 0 flottant, 0 NaN (prouvé par `harness`). Le journal d'une saison fait
  50,4 Ko — un widget ou un fond d'écran peut le lire sans coût.
* Le rejeu est la preuve : `newGame(seed)` + journal → hash identique, **45 ms pour 30 jours** **[mesuré]**.
  C'est exactement le modèle « état à écrivain unique, actions vérifiées et rejouées » visé.
* Le VM fait 47 Ko et se calcule en 2,0 ms : un widget peut se contenter de `viewModel(state, me)` sans porter
  le moteur de rendu.

### 8.2 Ce qui bloque — un seul point, mais réel

**Un état rechargé depuis le stockage ne peut pas être lu sans `newGame`.** Reproduit mécaniquement :

```
__data survit à JSON ?            false
viewModel sans newGame :          ÉCHEC — TypeError: Cannot read properties of null (reading '__idx')
resolveDay sans newGame :         ÉCHEC — idem
hashState sans newGame :          OK
```

Mécanisme : `attachData` (sim.js:2845) pose la table sur `state.__data` en propriété **non énumérable** — donc
perdue par `JSON.stringify`. Au rechargement, `viewModel` (3003) et `resolveDay` (2853) retombent sur la variable de
module `GLOBAL_DATA`, renseignée **uniquement par `newGame`**. Dans un processus neuf (widget Android, fond d'écran,
worker, service de fond, port natif), `GLOBAL_DATA` vaut `null` et l'appel jette une `TypeError` — alors que le
contrat exige « jamais d'exception, raison en français ».

La page ne le voit pas parce qu'elle **rejoue toujours depuis `newGame`** (`replayFrom`, index.html:821, appelée par
`restoreGame` 863 et `importJournal` 845).

**Correctif proposé** (non appliqué) : exposer `sim.attach(state, data) -> state` dans l'API publique, et accepter un
3e argument `data` optionnel sur `viewModel(state, managerId, data)` / `resolveDay(state, actions, data)` ; faire
retourner une raison française plutôt que jeter quand la table manque. ~10 lignes. Sans cela, tout consommateur
« lecture seule » de l'état (widget, fond d'écran animé, écran de partage) devra embarquer le moteur complet et
rejouer la saison pour afficher un chiffre.

### 8.3 Ce qui n'est pas portable et ne prétend pas l'être

Les 407 lignes de « scène : dessin » (index.html:1510-1916) et les 169 de la grille de raid (1299-1467) sont du
Canvas 2D web. Elles devront être réécrites en Godot. **[jugement]** Ce n'est pas une dette : la géométrie
(`SPOTS`, `ROAD`, `WALL_A/B`, `spotFor`, `roadPoint`) est isolée dans sa propre section de 42 lignes
(1468-1509) et pourrait être transcrite telle quelle. Le point important est que **rien de ces 576 lignes ne décide
d'une règle** — vérifié : aucune d'elles ne touche `app.state`.

Deuxième point mineur : la page suppose `window.GuildeTactic` chargé **avant** `sim.js` (index.html:631-632, et le
contrat l'exige). Si un portage charge dans le désordre, `TACTIC` vaut `null` et le raid se désactive **en silence**
(`raidEnabled`, sim.js:190). Une trace explicite serait préférable.

---

## 9. Bugs trouvés en chemin

> Aucun n'a été corrigé. Chacun est reproduit mécaniquement, sauf mention contraire.

### B1 — **Le joueur planifie son raid sur une grille périmée : 76 % des passages sont coupés net** (grave)

* **Où** : `sim.js:2379-2412 phaseRaid` (les managers sont rejoués triés par id ASCII, l. 2388) + `sim.js:3051`
  (`VM.raid` est bâti sur l'état **du matin**) + `tactic.js:1194 playPass` (interruption à la première action illégale).
* **Scénario** : `p1` (le joueur) trie après tous les `f_*`. Le matin, il compose un passage sur la grille telle
  qu'elle est. Le soir, `resolveDay` rejoue d'abord les 4 copains ; chacun laisse une riposte « racines » (croix de 2,
  5 cases, coût de déplacement +1). Quand le passage du joueur est rejoué, sa première destination n'est plus
  atteignable en 3 PM.
* **Mesure** (12 graines × 30 jours, 5 managers, passage humain = `VM.raid.me.default_actions` du matin) **[mesuré]** :

| | |
|---|---|
| jours de raid humains | 58 |
| passages **interrompus** (notice « passage de X interrompu ») | **44 (76 %)** |
| actions planifiées | 508 |
| actions effectivement jouées sur les passages coupés | **33 au total**, soit **0,77 par passage** |
| raisons | « case hors d'atteinte (3 PM) » ×33 · « hors de portée » ×10 |
| case d'entrée matin ≠ case d'entrée soir | 9 / 45 (donc la cause principale est la **grille**, pas l'entrée) |
| la page prévient (`raidForecast` renvoie « ne tient plus ») | 45 / 58 — l'UI dit vrai, mais après coup |

* **Asymétrie aggravante** : un joueur **absent** n'est jamais interrompu, puisque `phaseRaid` appelle
  `TACTIC.raidDefaultsFor(state, …)` avec l'état **courant** (sim.js:2394). Celui qui joue est puni ;
  celui qui ne joue pas ne l'est pas.
* **Correctifs possibles** **[jugement]**, du moins au plus coûteux :
  1. Faire calculer `VM.raid` **après** les passages du jour déjà connus des autres managers — c'est exactement ce
     que `raidForecast` (index.html:1152) construit déjà ; le remonter dans `raidEnvOf`/`viewModel` rendrait la
     grille affichée conforme à la grille de rejeu.
  2. Rejouer les passages dans l'ordre de **réception** (le journal porte déjà le jour et l'ordre) plutôt qu'en
     ordre ASCII de manager : un passage soumis en premier est rejoué en premier et reste légal.
  3. Rendre un passage **tolérant** : sur une case devenue inatteignable, replanifier le déplacement vers la case
     atteignable la plus proche au lieu d'interrompre (une ligne dans `applyPassAction`, mais change les règles).
* **Note** : ce n'est pas une divergence de rejeu — le hash reste identique (§6.2). C'est une perte d'intention du
  joueur, et c'est le cœur de la promesse V5.

### B2 — **Le derby vole l'« instant du jour » à la guilde** (moyen, très visible)

* **Où** : `sim.js:2743-2761 phaseDerby` appelle `runExpedition(ctx, quest, fighters, rng)` avec les combattants de la
  guilde **rivale** en lui passant le **`ctx` de la journée**. À l'intérieur, `monsterDown` (1917, `moment(ctx,100,…)`),
  `applyDamage` (1861, `moment(ctx,55,…)`), `knockOut` (1907, `moment(ctx,60,…)`) et `applyEvent` (1595,
  `moment(ctx,65/80,…)`) empilent des « moments » dans `ctx.moments`, où `buildChronicle` (2834) choisit le titre du
  jour par score décroissant. Le score 100 d'une mise à mort de boss bat tout.
* **Mesure** (40 graines × 30 jours, 3 managers) **[mesuré]** : sur **160 jours de derby**, **17 titres (10,6 %)**
  nomment des héros inexistants. Exemples littéraux :
  * graine 5, J28 : « *Sylvain Ancestral est vaincu par Élise Trois-Doigts, Enguerrand Main-Froide, Nolwenn du Val
    Gris et Élise Brise-Fer !* » — la guilde n'était **pas partie en expédition** ce jour-là.
  * graine 16, J21 : « *Hydre des Marais est vaincu par Gaultier de la Combe et Thibault aux Yeux de Cendre !* »
  * graine 28, J14 : « *Ulric Œil-de-Lynx accomplit un exploit dans Forêt de Brumes…* »
* **Effet de bord** : la guilde peut lire « le dragon est vaincu » un soir où il ne l'est pas.
* **Correctif proposé** : mémoriser `const n = ctx.moments.length` avant `runExpedition` et faire
  `ctx.moments.length = n` après (2 lignes) ; ou poser `ctx.silent = true` honoré par `moment()`.
  À valider par : chercher, sur 40 graines, tout `chronicle.headline` d'un jour de derby dont aucun nom ne figure
  dans `viewModel().roster` — doit tomber à 0.

### B3 — **Ajouter une classe sans compétence fait planter le moteur** (bloque T2)

* **Où** : `sim.js:248` `skills: D.skills_by_class[h.class_id].filter(…)` — `skills_by_class` est bâti à partir de
  `data.skills` seulement (129). Même défaut en `295` (montées de niveau) et `2991` (`rosterVm`).
* **Reproduit** : ajouter `{id:'paladin', …}` à `data.classes`, sans entrée dans `data.skills`, puis
  `newGame` (OK) → premier `resolveDay` → `TypeError: Cannot read properties of undefined (reading 'filter')
  at combatProfile (sim.js:248:45)` **[mesuré]**.
* **Correctif** : `(D.skills_by_class[h.class_id] || [])` aux trois sites.
* **Validé par** : le banc de garde G4 (§6.3).

### B4 — **Un état rechargé sans `newGame` jette une exception** (bloque le widget / le portage)

Voir §8.2. `viewModel` et `resolveDay` lèvent `TypeError: … (reading '__idx')`, alors que le contrat interdit
l'exception. **[mesuré]**

### B5 — **`rd.paMax = 6` fige les PA par tour côté page** (latent)

* **Où** : `index.html:664`, consommé par `raidMe` (1129) pour `pass.pa_max`, affiché par `renderRaidTurn` (1241).
  Le moteur lit `data.raid.pa_per_turn` (= 6 aujourd'hui).
* **Déclenchement** : T5 est explicitement une tranche de calibrage ; si `pa_per_turn` passe à 5 ou 7, la page
  affiche « 3 / 6 » alors que le moteur en donne 7. Aucun banc ne l'attrape.
* **Correctif** : lire `VM.raid.me.pass.pa_max` (déjà fourni par `raidView`, tactic.js:1305) au lieu de `rd.paMax`.

### B6 — **`slotCount` plafonne l'affichage à 4 créneaux** (latent)

* **Où** : `index.html:2110` `Math.max(3, Math.min(4, h.ap_today), …)`. Aujourd'hui `ap_max` ≤ 4, donc invisible.
  Un trait ou un bâtiment T2 portant un héros à 5 PA rendrait le 5e créneau injoignable alors que
  `validateAction` l'accepterait.

### B7 — **Les effets de données `teleport` / `vital_link` / `sacrifice` sont ignorés** (latent, piège)

* **Où** : `data.json` déclare ces `kind` dans `tactic_spells[].effects` ; `applyEffectOn` (tactic.js:557-581) les
  renvoie par `default: return false`. Le comportement réel vient de `castSpell` par `s.id` (l. 501, 506, 515, 520).
* **Déclenchement** : renommer un identifiant de sort, ou écrire un sort T2 en réutilisant `kind:'teleport'` en
  croyant qu'il fonctionne — le sort ne fera rien, sans erreur.
* **Correctif** : implémenter réellement ces trois `kind`, ou les retirer des données, et ajouter la garde G3.

### B8 — **Les marqueurs du tableau vivant sont récupérés par correspondance de préfixe sur du texte français** (faible)

* **Où** : `index.html:1019 managerOfHeroName` fait `s.indexOf(a.name) === 0` sur les chaînes de
  `chronicle.summary.injuries` / `.level_ups` / `threat.defenders`, produites par `sim.js:1264`
  (`heroName(h) + ' (' + jours + ' j)'`). Idem `buildingIdByName` (714) sur `summary.construction`.
* **Déclenchement** : tout changement de gabarit côté moteur (et T2/T3 en ajouteront) fait disparaître les
  marqueurs « blessé », « monté de niveau », « défenseur » du tableau — **sans aucune erreur**.
* **Correctif** : que la chronique porte les identifiants (`summary.injuries: [{hero_id, label}]`).
  Le contrat du VM devra évoluer ; la page perd 12 lignes.

---

## 10. Plan de remise en forme, par rapport qualité / coût

### À faire **avant** la tranche suivante

| # | Action | Coût | Gain | Preuve mécanique |
|---|---|---|---|---|
| **A1** | `(D.skills_by_class[h.class_id] \|\| [])` en sim.js:248, 295, 2991 (**bug B3**) | 3 lignes | T2 devient possible | nouveau contrôle dans `engine_v4_check` : ajouter une classe nue à `data.classes`, jouer 5 jours, `viewModel` — doit passer. (Banc de garde G4.) |
| **A2** | Tronquer `ctx.moments` autour du `runExpedition` du derby (**bug B2**) | 2 lignes | la chronique cesse de mentir un soir de derby sur dix | `engine_v4_check` : sur 30 graines, aucun `headline` d'un jour de derby ne doit nommer un héros absent de `viewModel().roster` — doit passer de 17/160 à 0/160 |
| **A3** | Trancher **B1** : faire décrire à `VM.raid` la grille **telle qu'elle sera au rejeu** (remonter ce que `raidForecast` calcule déjà), ou rejouer les passages dans l'ordre de réception | 1 journée, décision de conception d'abord (Pierre) | c'est la promesse du raid asynchrone | `tactic_t1_check` : nouveau contrôle « passages humains interrompus ≤ 10 % sur 12 graines » — aujourd'hui **76 %** |
| **A4** | `raidView` sait décrire un **passage en cours** ; ajouter `me.path_to` et `units[].class_id` au VM ; supprimer les 9 accès bruts et les ~39 lignes dupliquées de la page (§2.2, §4.3) | ~1/2 journée | la frontière du contrat redevient vraie ; le portage Godot n'a plus à réimplémenter `spellVm`/Dijkstra | `ui_v5_check` inchangé doit rester 39/39 ; **nouveau contrôle** : `grep "TACTIC._internal\|rd.draft.raid" index.html` = 0 |
| **A5** | Exposer `sim.attach(state, data)` et le 3e argument `data` sur `viewModel`/`resolveDay` ; raison française au lieu de l'exception (**bug B4**) | ~10 lignes | débloque widget, fond d'écran, portage | `engine_extra` : sérialiser un état, le recharger dans un module neuf, appeler `viewModel` — doit rendre un VM, pas jeter |
| **A6** | Gardes **G1** (RNG jumeaux), **G2** (entiers dans `state.raid`), **G3** (vocabulaire d'effets) | ~40 l. de banc | protège le bien le plus précieux du projet avant qu'il grossisse | ajouts à `tactic_t1_check` ; G3 **échoue aujourd'hui** (B7) et documente la dette |

### Ce qui peut attendre (à faire pendant T2, pas avant)

| # | Action | Pourquoi ça peut attendre |
|---|---|---|
| **B1'** | Mettre en table la politique de raid (`POLICY[classId]`, S1) | tant qu'on est à 6 classes, `policyAction` reste lisible ; c'est la première chose à faire **le jour où** le premier hybride arrive |
| **B2'** | Mettre `ripostePlan`/`checkPhase`/`spawnAdds` en données par fiche de dragon (S3, S4) | à faire avec le Drake, pas avant : on ne sait pas encore ce qui se généralise |
| **B3'** | `weapon_range`, `attack_formula`, `gather_pref` dans `data.classes` (S5, S6) | les replis actuels sont silencieux mais pas faux pour les 6 bases |
| **B4'** | `zoneLabel`/`stateLabel`/`phase_label` en données (S7) | pur confort tant que le vocabulaire ne bouge pas |
| **B5'** | Lire `pa_max` et le nombre de créneaux depuis le VM (B5, B6) | latents, invisibles jusqu'à T5 |
| **B6'** | Identifiants au lieu de noms dans `chronicle.summary` (B8) | change le contrat du VM : à grouper avec un autre changement de contrat |
| **B7'** | Flux RNG propre au derby (G8) | découplage utile avant le « Derby des Lames » de T3 |
| **B8'** | Objet `PlanCtx` pour `planAssign`/`fillSlots`/`planEconomy` (§3.3) | cosmétique |
| **B9'** | Ménage de `test/` : supprimer les 1,12 Mo de vestiges et les 2 bancs pourris (§5.1) | 5 minutes, aucun risque, mais aucune urgence — sauf que `real_check.mjs` **échoue** et pollue tout tableau de bord |

### Ce qu'il ne faut **surtout pas** toucher

| Quoi | Pourquoi |
|---|---|
| Les 45 lignes de primitives dupliquées `sim.js` / `tactic.js` | c'est ce qui garantit « `tactic.js`, aucune dépendance ». Les factoriser coûterait un 3e module à charger et à porter. Ajouter la garde G1, pas un `core.js`. |
| `previewCast` vs `castWhy` | duplication à dessein, prouvée sur 8 910 couples. Modèle à imiter. |
| Les 6-9 paramètres de `tactic.js` (`damageFromPower`, `pushUnit`, `tryControl`…) | c'est le prix du zéro-état-global qui rend le module pur. |
| `resolveDay` (sim.js:2852-2887) | 16 lignes, une par phase. La meilleure page du projet. |
| Le flux RNG séparé du raid (`rng_s`/`rng_count`) | c'est ce qui permet de toucher au tactique sans décaler la saison. |
| La section « scène : dessin » (index.html:1510-1916) | 407 lignes de Canvas, aucune règle, zéro duplication interne. Ce n'est pas du spaghetti, c'est un pinceau. |
| `test/harness.mjs` | marqué NE PAS MODIFIER au contrat ; vert (10/10). |
| Les 4 bancs `ui_v2/v3/v4/v5_check` | 194 contrôles verts sur la page **courante** ; ils se recouvrent peu (tableau vivant / âges-dragon / journée composée / raid). |

---

## Annexe — bancs ré-exécutés pendant l'audit (2026-09-18)

| Banc | Résultat | Durée |
|---|---|---|
| `test/engine_v4_check.mjs` | **25/25 PASS** | 11,4 s |
| `test/tactic_t1_check.mjs` | **20/20 PASS** | 8,1 s |
| `test/engine_extra.mjs` | **13/13 PASS** | < 1 s |
| `ENGINE_ONLY=1 test/harness.mjs` | **10/10 PASS** (30 jours en 174 ms) | < 1 s |
| `test/ui_v2_check.mjs` | **52/52 PASS** | Chromium |
| `test/ui_v3_check.mjs` | **48/48 PASS** | Chromium |
| `test/ui_v4_check.mjs` | **55/55 PASS** | Chromium |
| `test/ui_v5_check.mjs` | **39/39 PASS** | Chromium |
| `test/ui_check.mjs` | 58/58 PASS — **mais sur `index_stub.html`, une doublure de V1** | vestige |
| `test/real_check.mjs` | **5/10 FAIL** — `index_real.html` (V1) contre `sim.js` (V5) | vestige cassé |

Total sur le produit courant : **262 contrôles verts, 0 échec.**

---

software_verdict: OK · evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED
