# V5 — RAID TACTIQUE ET LIGNÉE DE CLASSES (spécification)
Date : 2026-09-18. Source : sous-agent de conception (GO Pierre, mission « SPEC V5 »), à construire après la V4.
Entrées lues : CONTRACT.md (V2→V4), sim.js (combat automatique : initiative, ciblage, dégâts raw²/(raw+def),
critiques en permille, KO puis blessure, mécanismes roots/breath/heads), data.json (classes, skills, monstres,
boss, dragons, threats, constants). Statut : proposition. Aucun chiffre n'est ratifié ; chaque table est marquée
« à calibrer » quand un banc doit trancher. Tous les nombres sont des entiers (permille pour les probabilités,
pourcentages entiers pour les multiplicateurs), comme le reste du moteur.

Intention conservée mot pour mot dans l'esprit : « utiliser son personnage avec ses copains contre un gros vilain » ;
tactique à la Dofus réservée aux moments forts ; asynchrone (boss persistant, chacun joue ses tours seul, sur la
grille laissée par les copains) ; journal d'actions rejouable ; MMO à partie finie (30 jours, survivre) ; lignée
base → hybride → une de deux spécialisations, pas de quatrième génération.

Résumé des choix structurants
* Grille 9 colonnes × 11 lignes (portrait téléphone), distance de Manhattan, LdV par Bresenham entier.
* 6 PA + 3 PM par tour, passage = 3 tours du héros entrelacés avec 2 tours ordinaires du boss, puis une riposte
  télégraphiée qui laisse un état sur la grille pour le copain suivant.
* Le boss est un réservoir de PV persistant sur plusieurs jours, régénère 10 % la nuit, s'enrage au 3e soir.
* 6 classes de base, 15 hybrides, 30 spécialisations ; test de branche appliqué : 26 spés « vague A » sûres,
  2 hybrides (4 spés) en sursis avec plan de coupe explicite (§5.4).
* `tactic.js` pur, même RNG mulberry32, actions dans le journal, phase 7b de resolveDay remplacée par le raid persistant.

---

## 1. Grille et règles

### 1.1 Grille
| Paramètre | Valeur | Note |
|---|---|---|
| `grid_w` × `grid_h` | 9 × 11 | portrait ; 9 cases ≈ 40 px à 400 px de large ; le boss en haut, le héros entre en bas |
| Origine | (0,0) en haut à gauche, x colonne, y ligne | cellule = `y * grid_w + x` (index entier) |
| Distance | Manhattan `|dx| + |dy|` | comme Dofus ; jamais de diagonale |
| Kinds de case | `floor` 0 · `wall` 1 (bloque mouvement et LdV) · `water` 2 (coût 2 PM, sauf états) · `pit` 3 (infranchissable, ne bloque pas la LdV) | encodés dans `layout` (tableau de 99 entiers par arène) |
| Zones (calque) | au plus une zone par case : `{zone_id, turns_left, owner_kind:'boss'|'hero', source_id}` | tickée à chaque riposte (§1.9) |
| Arènes | une par raid, dans `data.raids[raid_id].layout` | ex. Sylvain : 4 souches (`wall`) en losange, 0 eau ; Hydre : 12 cases d'eau en croissant |

Entrée du héros : `spawn_cells` (liste ordonnée d'au plus 6 cases en bas) ; le héros apparaît sur la première libre
(ordre de la liste), jamais sur une zone active de boss.

### 1.2 Points d'action et de mouvement
| Unité | PA/tour | PM/tour | Règle |
|---|---|---|---|
| Héros | 6 | 3 (+1 si Adresse effective ≥ 30, +1 si trait `endurant` : max 5) | non reportables d'un tour à l'autre |
| Invocation | 4 | 2 | IA §3.7 |
| Add (rejeton, sangsue…) | 4 | 2 | IA §2.0 |
| Boss | 6 | selon fiche (Sylvain 0, Drake 3, Hydre 2) | corps 2×2, `mass` 3 |

Coût d'un déplacement = somme des coûts des cases traversées (`floor` 1, `water` 2, zone `roots` 2). Chemin = plus court
coût par Dijkstra entier sur 4-voisinage ; départage : coût, puis y croissant, puis x croissant (déterministe, sans RNG).

### 1.3 Portées et ligne de vue
Chaque sort porte `range_min`, `range_max`, `los` (bool), `line_only` (bool : cible sur la même ligne ou colonne).
LdV : Bresenham entier entre le centre de la case source et celui de la case cible ; une case `wall` sur le trajet
(hors extrémités) coupe la LdV ; les unités ne coupent pas la LdV (choix de simplicité, réversible). Pour un corps 2×2,
la distance et la LdV se mesurent vers la case du boss la plus proche (départage : y puis x croissants).
Modification de portée : état `portée +1` (durée en tours) ; jamais de portée modifiable par PA.

### 1.4 Formes de zone
Tout est exprimé en offsets Manhattan autour de la case visée, orientés par le vecteur source→cible quand la forme
est directionnelle (direction = composante dominante ; égalité → horizontale).
| Forme | Définition | Cases (r=1 / r=2 / r=3) |
|---|---|---|
| `single` | la case visée | 1 |
| `circle r` | `|dx|+|dy| ≤ r` | 5 / 13 / 25 |
| `cross r` | `dx=0` ou `dy=0`, `≤ r` | 5 / 9 / 13 |
| `line n` | n cases dans la direction, à partir de la cible incluse | n |
| `cone r` | cases `(a,b)` dans le repère (direction, perpendiculaire) avec `1 ≤ a ≤ r`, `|b| ≤ a−1`, depuis la SOURCE | 1 / 4 / 9 |
| `ring r` | `|dx|+|dy| = r` | 4 / 8 / 12 |

### 1.5 Dégâts, soins, critiques (mêmes formules que sim.js)
```
atk_eff  = pct(pct(profile.atk, moraleMod), fatigueAtkMod)        // profil du matin, comme combatProfile()
raw      = max(1, pct(pct(atk_eff, spell.power), 90 + rng.roll(21)))
def_eff  = cible.def  (÷2 si tags.magic ; ÷2 si tags.ignore_half ; −fissures*5 min 0)
dmg      = div(raw*raw, raw + def_eff)
crit     : rng.chance(profile.crit + bonus_sort) → dmg = pct(dmg, 150)   (boss crit_immune conservé selon fiche)
bouclier : absorbe avant les PV ; l'excédent passe
soin     = pct(profile.heal, spell.power) + spell.flat
```
Pas de jet de toucher en raid (lisibilité : l'aperçu montre min/max). `dodge` du profil est ignoré en raid (candidat V6).
Le boss frappe avec `power` de sa fiche ; ses dégâts ignorent la variance (télégraphe exact = valeur affichée).

### 1.6 Poussée, attirance, collision
* `push n` : la cible recule de n cases dans la direction source→cible (composante dominante). Elle s'arrête devant
  `wall`, bord, `pit` (tombe : `pit_damage` = 20 + 2×niveau_source, remise sur la case précédente) ou unité.
* Collision : si elle a parcouru k < n cases : `collision = (n − k) × (6 + 2 × niveau_source)` à la cible ;
  l'unité percutée reçoit `div(collision, 2)`.
* `pull n` : symétrique vers la source, s'arrête sur la case adjacente.
* `mass` : la distance effective = n − mass. Héros 0, add 0, invocation 0-1, boss 3 (0 quand `chancelant`).
  Un boss non chancelant est donc inamovible par une poussée ordinaire : c'est voulu, cela crée le besoin de fenêtres.
* Un corps 2×2 poussé se déplace d'un bloc ; il ne peut pas chevaucher une `wall`.

### 1.7 Contrôle
| État | Effet | Durée type | Sur le boss |
|---|---|---|---|
| `immobilise` | PM = 0 | 1-2 tours | tirage `control_permille` (§1.8) |
| `etourdi` | perd son prochain tour (pas la riposte) | 1 tour | tirage, jamais deux fois de suite |
| `marque` | dégâts subis +20 % (une marque ; les marques ne se cumulent pas, la plus longue reste) | 3 tours | oui, sans tirage, persiste entre passages |
| `aveugle` | ses attaques monocibles visent la case la plus proche du héros au lieu du héros (peut rater) | 1 tour | tirage |
| `entrave` | coût de déplacement +1 par case | 2 tours | oui |
| `brule` | 8 + 2×niveau_source par tour, coupe `regen` | 2 tours | oui |
| `poison` | 6 + niveau_source par tour, cumulable ×3 | 3 tours | oui |
| `chancelant` | mass 0, DEF ÷ 2, dégâts subis +30 % | 2 tours | seulement par fenêtre de fiche |
| `charme` | l'add rejoint le camp du héros (IA d'invocation) | 2 tours | jamais le boss |
| `scelle:<mecanisme>` | le mécanisme nommé ne se déclenche pas | 1 riposte | oui |

### 1.8 Résistance du boss au contrôle
`control_permille = max(150, 750 − 200 × controls_subis_aujourdhui)` ; `controls_subis_aujourdhui` remis à 0 la nuit.
La chronique dit « l'Hydre se dégage » ; le tableau affiche « ténacité 2/3 ». Objectif : un contrôle sûr par jour et
par guilde, pas une chaîne infinie. À calibrer (banc T1 : part des passages où le boss est contrôlé ∈ [25 %, 45 %]).

### 1.9 Protections et états à durée
* `bouclier {points, turns}` : cumulable par addition, plafonné à `hp_max`. Décrémenté à la fin du tour du porteur.
* `reduction {points, turns}` : −points par coup reçu (min 1 dégât).
* `garde:<unit_id>` : les attaques monocibles visant le gardé frappent le garde s'il est adjacent.
* Toute durée est en tours DU PORTEUR (un héros qui quitte la grille perd ses états, sauf blessure V4).
  Les états du boss se décrémentent à chaque tour du boss (ordinaire ou riposte) ; ils persistent donc d'un joueur à
  l'autre : c'est le premier levier de coopération asynchrone (marque, fissures, brûlure, scellé).
* Les zones se décrémentent à chaque riposte (`turns_left` en ripostes) ; `owner_kind:'hero'` persiste entre passages.

### 1.10 Ordre de jeu et initiative
* Un passage = le héros seul sur la grille avec ses invocations, les invocations persistantes des copains, les adds
  et le boss. Séquence fixe : `H1 · S · B · H2 · S · B · H3 · S · RIPOSTE` (H = tour du héros, S = tours des
  invocations/adds triés par `spd` décroissante puis id ASCII, B = tour ordinaire du boss).
* Le héros joue toujours en premier (il surprend le boss). Pas de tirage d'initiative : l'ordre est fonction de l'état.
* `end_pass` anticipé : saute directement à `RIPOSTE`.
* Tour ordinaire du boss (B) : `move` vers la cible selon `target_rule` (héros, sinon invocation la plus proche, sinon
  rien), puis `attack` de base si à portée, sinon mécanisme secondaire de fiche. Coût en PA de fiche.
* Riposte : action forte de fiche, télégraphiée UN passage à l'avance (`next_riposte` dans la vue), qui laisse un
  état ou une zone. Elle vise en priorité la case où le héros a terminé ; si le héros a quitté la grille, elle vise
  quand même (la zone reste pour le suivant).

### 1.11 Fin de passage, KO, mort
* Passage = `pass_turns` = 3 tours (constante ; 2 pour un héros `fatigue ≥ 60` — une journée de raid coûte comme
  `defend` : 3 PA, journée entière).
* Héros à 0 PV : passage terminé immédiatement, `KO`, blessure sévérité 1 par `injure()` (V4), fatigue +15, tirage
  de mort `death_permille.raid` = 150 (nouvelle clé, plus doux que `dragon` = 400 : le raid multiplie les KO par
  design). Héros KO = hors raid jusqu'au lendemain (repos forcé).
* Un héros ne fait qu'un passage par jour (l'activité `raid` occupe la journée). Option calibrable : deuxième passage
  autorisé si `pass_turns` réduits à 2 (`raid_second_pass:false` par défaut).

### 1.12 Nuit (raidNight, phase 11 du soir)
1. Héros déclarés `raid` sans passage joué → `raidDefaults` (§7.6) joue leur passage (2 tours, prudence).
2. Boss : `hp += pct(hp_pool_max, night_regen_pct)` (10 %), plafonné ; états du boss expirent sauf `fissures` (−1) ;
   adds vivants soignés à 100 % ; zones `owner_kind:'boss'` expirent, zones `owner_kind:'hero'` −1.
3. `nights += 1` ; à partir de `nights ≥ 2` : `enrage_pct = 15 × (nights − 1)` (+15 % dégâts par nuit au-delà de la
   première, plafond +45 %). C'est ce qui fait qu'une guilde qui s'y met tue en 1-2 jours et qu'une guilde qui traîne
   perd.
4. `nights ≥ raid_max_nights` (4) → échec : sortie V4 `ravage` (bâtiment, or −20 %, prestige −10, retour du dragon à
   J+3, chute possible du hall).
5. Chronique : section `raid` (« Le siège »), ≤ 8 lignes : passages du jour, PV restants en %, régénération, enrage.

### 1.13 Victoire, échec, butin
* Victoire : `boss.hp ≤ 0` pendant un passage → fin immédiate. Sortie V4 `vaincu` : or `gold_base + gold_per_day × day`,
  4-8 matériaux, prestige +40, trophée, UN légendaire (`legendary_pool` du dragon, jamais deux fois par saison) au
  héros ayant le plus de `damage_total` cumulé sur le raid (départage : id ASCII). XP V4 `xp_win` à tous les
  participants (moitié pour un KO), +10 % par passage joué.
* Échec : §1.12.4. Un héros mort → tombe, héritier (V4). La chute de la guilde reste possible.
* Raid de saison (§2.5) : victoire = derby gagné (+30 prestige, or 50 % de la quête) + un épique de `dragon_craft` ;
  échec = derby perdu.

### 1.14 Constantes proposées (`data.raid`)
```json
{ "grid_w": 9, "grid_h": 11, "pa_per_turn": 6, "pm_per_turn": 3, "pm_dex_threshold": 30, "pm_max": 5,
  "pass_turns": 3, "pass_turns_tired": 2, "raid_second_pass": false,
  "night_regen_pct": 10, "enrage_per_night_pct": 15, "enrage_cap_pct": 45, "raid_max_nights": 4,
  "control_base_permille": 750, "control_step_permille": 200, "control_min_permille": 150,
  "collision_base": 6, "collision_per_level": 2, "pit_base": 20, "pit_per_level": 2,
  "hp_pool_managers_div": 6, "hp_pool_managers_add": 2, "death_permille_raid": 150,
  "wall_shield_pct_of_defense": 50, "summon_cap": 2, "trap_cap": 3, "zone_cap_per_hero": 3 }
```
`hp_pool_max = div((hp_base + hp_per_day × day) × (n_managers + hp_pool_managers_add), hp_pool_managers_div)` :
avec 4 managers le facteur vaut 1 ; 3 managers 5/6 ; 6 managers 8/6. Le bouclier de muraille du héros à l'entrée
= `pct(hp_max, div(age.defense × wall_shield_pct_of_defense, 100))` (Ville fortifiée : +22 % de PV en bouclier).

---

## 2. Le boss comme problème tactique

### 2.0 Règles communes des fiches
* `hp_base`/`hp_per_day` de raid (distincts des valeurs V4 d'auto-combat qui restent pour l'auto-défense hors raid).
* Phases par seuil de `hp/hp_pool_max` en %. Passage de phase : ligne de chronique dédiée, `phase_label` dans la vue.
* IA des adds : cible = `target_rule` (`nearest` : distance puis id ; `weakest` : PV % ; `master` : rejoint le boss),
  déplacement Dijkstra puis attaque si à portée. Un add est un monstre V4 instancié à `level = div(day,2)`.
* Chaque fiche liste ses BESOINS (ce que la guilde doit savoir faire), la combinaison attendue et le récit.
* Attaques de base du boss : `power` en % de `atk`, portée, zone ; `atk`/`def` = valeurs V4 (`atk_base + atk_per_day × day`).

### 2.1 Sylvain corrompu ancestral (forêt) — « l'arbre qui se referme »
| Champ | Valeur |
|---|---|
| `hp_base` / `hp_per_day` | 900 / 60 (J15 × 4 managers : 1 800) |
| PM | 0 (enraciné) ; il ne bouge jamais : tout le combat est une question de cases autour de lui |
| Attaque de base | `fouet` : 100 %, portée 1-3, `line 3` depuis sa case la plus proche, coût 3 PA (deux fouets par tour B) |
| Régénération | +4 % `hp_pool_max` à chaque tour du boss (B et riposte), coupée par `brule` |
| Phases | P1 100-60 % · P2 60-30 % · P3 < 30 % |
Mécanismes (besoins) :
1. **Racines** (riposte, toutes phases) : pose `roots` sur `cross 2` autour de la case du héros (durée 2 ripostes) ;
   entrer sur `roots` = `immobilise` 1 tour + 8 dégâts par tour. BESOIN : mobilité / téléport / purification.
2. **Sève** (permanent) : la régénération de 4 % par tour du boss efface un passage moyen si personne ne brûle.
   BESOIN : `brule` entretenu (au moins un brûleur qui passe tous les 2 passages).
3. **Rejetons** (entrée en P2) : 2 `corrupted_sylvan` sortent de l'écorce sur les cases adjacentes libres (max 4 en vie) ;
   un rejeton adjacent au boss le soigne de 20 par tour ; `target_rule:'master'`. BESOIN : contrôle / attirance /
   charme / burst sur les adds.
4. **Écorce** (entrée en P3) : bouclier 250 rechargé à chaque riposte ; quand le bouclier tombe sous un passage, le
   boss devient `chancelant` 2 tours (fenêtre de burst : +30 % dégâts, mass 0 → une poussée le décolle de ses
   racines : `collision` contre une souche = 40). BESOIN : perceur / burst / poussée.
5. **Spores** (riposte en P2+, une riposte sur deux) : `cone 3` orienté vers la case du héros, 90 % magique, laisse
   `spores` (poison à l'entrée) 1 riposte. BESOIN : placement, protection de zone.
Combinaison attendue : un brûleur (Mage, Lame de feu, Médium de cendre), un gestionnaire d'adds (Piégeur, Charmeur,
Cyclone, Harponneur), un mobile ou un purificateur (Passe-muraille, Portier, Pèlerin), un burst pour la fenêtre P3
(Assassin, Censeur+Écorcheur). Sans brûleur, la guilde ne peut pas gagner : le tableau doit le dire (« la sève coule
sans obstacle »).
Récit : « Le feu de X a figé la sève » · « Y a traîné les rejetons loin du tronc » · « Z a fendu l'écorce ; le
Sylvain a chancelé » · « la forêt s'est refermée derrière W » (échec).

### 2.2 Drake des monts (montagne) — « le ciel de cendres »
| Champ | Valeur |
|---|---|
| `hp_base` / `hp_per_day` | 800 / 55 |
| PM | 3 ; `target_rule:'strongest'` (atk le plus haut, sinon le héros) |
| Attaque de base | `morsure` : 110 %, portée 1, coût 3 PA ; `coup de queue` : 80 %, `ring 1` autour de lui, push 1, 3 PA |
| Écailles de fer | `crit_immune` tant que hp > 50 % ; DEF +20 (V4 `def` + 20), réduite de 5 par `fissure` (max 4 fissures, persistantes) |
| Phases | P1 100-50 % · P2 50-25 % · P3 < 25 % |
Mécanismes :
1. **Souffle télégraphié** (riposte) : annonce `line 6` de largeur 3 (3 lignes parallèles) depuis sa gueule vers la
   case du héros ; le souffle frappe au début du passage suivant, après H1 (le copain suivant voit la zone, joue un
   tour, puis ça tombe : 120 % magique, ignore les boucliers de moins de 40). BESOIN : lecture du télégraphe,
   déplacement, mur ou bouclier fort, ou `scelle:souffle`.
2. **Cendres** : chaque case soufflée devient `cendres` 2 ripostes (12 dégâts à l'entrée, +1 PM de coût). La grille
   rétrécit. BESOIN : purification / terrain / portails / vol.
3. **Écailles** (P1) : sans fissures, un héros moyen fait ~55 % de ses dégâts. BESOIN : `fissurer` (Écorcheur), ou
   magie (÷2 DEF), ou vol d'état.
4. **Envol** (entrée en P2) : le Drake décolle 1 passage entier : inatteignable en mêlée et par `line_only`, seules
   les portées ≥ 4 avec `los:false` ou un `ancrer` (Harponneur, Fauconnier) le ramènent ; à l'atterrissage, il est
   `etourdi` 1 tour + `chancelant` 2 tours (fenêtre). BESOIN : ancre ou distance sans LdV, puis burst.
5. **Fournaise** (P3, une riposte sur deux) : `circle 2` sur sa position, 100 %, puis il se déplace de 3 vers le
   héros. BESOIN : garder de la distance, leurres.
Combinaison attendue : un lecteur de télégraphe (tout le monde) + un mur ou une case sûre (Templier, Veilleur), un
fissureur ou un mage, une ancre pour l'envol, un burst pour l'atterrissage.
Récit : « le souffle a rasé la case que X venait de quitter » · « Y a planté son bouclier ; la cendre a glissé
dessus » · « Z a harponné le Drake en plein vol » · « il s'est écrasé sur la place, W a frappé ».

### 2.3 Hydre des marais (marais) — « trois gueules, une seule vie »
| Champ | Valeur |
|---|---|
| `hp_base` / `hp_per_day` | 1 000 / 65 (la plus grosse : un combat d'endurance) |
| PM | 2 ; `target_rule:'weakest'` |
| Attaque de base | par tête vivante : `happe` 70 %, portée 1-2, 2 PA chacune (3 têtes = 3 attaques, cibles séparées : héros, puis invocations/leurres les plus proches) |
| Têtes | 3 têtes, chacune `head_hp = div(hp_pool_max, 6)` ; une tête à 0 = coupée ; elle repousse en 2 tours du boss (à `head_hp`, sans rendre de PV au corps) sauf si la souche est `brule` ou `gele` (« cautérisée ») |
| Phases | P1 100-66 % · P2 66-33 % · P3 < 33 % |
Mécanismes :
1. **Trois gueules** : 3 attaques par tour B ; des corps sur la grille (invocations, leurres, recrues) les absorbent.
   BESOIN : corps (Invocateur, Capitaine, Mirage, Maître-ours).
2. **Venin** (riposte) : `circle 1` sur 2 cases tirées parmi celles à distance ≤ 3 du héros → zone `venin`
   (poison ×1 à l'entrée, ×1 par tour dedans) 2 ripostes. BESOIN : purification / soin en zone / `scelle:venin`.
3. **Immersion** (riposte P2+) : l'Hydre se déplace sur la case d'eau la plus proche ; dans l'eau : +6 % de régén.
   par tour, DEF +10 ; les héros dans l'eau ont −1 PM. BESOIN : geler l'eau (Lame de givre), assécher (Sourcier),
   attirer hors de l'eau (Harponneur, Cyclone).
4. **Sangsues** (P2) : 2 `giant_leech` apparaissent à chaque riposte (max 4), `drain` sur les invocations et le héros.
   BESOIN : gestion d'adds, charme (« la sangsue se retourne contre l'Hydre »).
5. **Décapitation double** (fenêtre) : deux têtes coupées dans le même passage → le corps est `chancelant` 2 tours
   (mass 0 : une poussée contre un pieu du décor inflige `collision` + `pieu` = 60). BESOIN : burst réparti
   (Montreur, Tempête) puis poussée.
Combinaison attendue : corps absorbants, un cautériseur (feu ou givre), un purificateur ou soigneur de zone, un burst
multi-cible pour la fenêtre, un pousseur pour le pieu.
Récit : « le golem de X a pris deux morsures pour lui » · « Y a cautérisé la souche : la tête ne repoussera pas » ·
« deux têtes au sol, l'Hydre a chancelé ; Z l'a jetée sur les pieux ».

### 2.4 Paramètres additionnels par dragon (`data.raids`)
```json
{ "raid_forest":   {"dragon_id":"dragon_forest","hp_base":900,"hp_per_day":60,"pm":0,"regen_pct":4,"phases":[60,30],
                    "layout_id":"clairiere","adds":{"id":"corrupted_sylvan","cap":4,"heal_boss":20},
                    "shield_p3":250,"stagger_turns":2,"spores_power":90,"roots_turns":2},
  "raid_mountain": {"dragon_id":"dragon_mountain","hp_base":800,"hp_per_day":55,"pm":3,"regen_pct":0,"phases":[50,25],
                    "layout_id":"eboulis","def_bonus":20,"fissure_step":5,"fissure_cap":4,"breath_power":120,
                    "breath_len":6,"breath_width":3,"ash_turns":2,"ash_damage":12,"flight_pass":1,"furnace_power":100},
  "raid_marsh":    {"dragon_id":"dragon_marsh","hp_base":1000,"hp_per_day":65,"pm":2,"regen_pct":0,"phases":[66,33],
                    "layout_id":"tourbiere","heads":3,"head_hp_div":6,"regrow_turns":2,"venom_turns":2,
                    "adds":{"id":"giant_leech","cap":4,"per_riposte":2},"water_regen_pct":6,"stake_damage":60} }
```
Les mécanismes V4 (`roots`, `breath`, `heads`) restent utilisés par l'auto-combat de défense quand un raid n'est pas
possible (aucun manager ne joue) ; le raid en est la version tactique.

### 2.5 Raid de saison — « Le Derby des Lames » (jours 26-28, remplace le derby du jour 28)
| Champ | Valeur |
|---|---|
| Adversaire | la guilde rivale de la graine (`rival_guilds[fnv(seed) % 8]`) : un Capitaine rival (boss 1×1, `hp = 600 + 40 × day`, mass 1) et 3 compagnons (guerrier, clerc, rôdeur rivaux générés comme au derby V4, niveau moyen ± 1) |
| Objectif de la guilde | tenir la Bannière (case objectif au centre bas) 3 ripostes de suite ou abattre le Capitaine |
| Condition d'échec | un rival adjacent à la Bannière pendant 2 ripostes consécutives → derby perdu |
Mécanismes :
1. **Le clerc rival soigne** 60 par tour la cible la plus blessée : BESOIN : cible à contrôler ou à tuer en premier
   (ordre de priorité, contrôle, charme).
2. **Le rôdeur rival marque** le héros (dégâts +20 %) et pose un piège sur la Bannière : BESOIN : purifier /
   désamorcer / leurres.
3. **Le Capitaine « vole un tour »** (riposte) : −2 PA au début du passage suivant : BESOIN : `scelle`, `retarder`
   (Chronomancien), ou simplement jouer avec 4 PA.
4. **Cible à protéger** : la Bannière (PV 200, ne se déplace pas) : BESOIN : garder, mur, corps, ancrer.
Combinaison attendue : un gardien de Bannière (Templier, Sergent, Maître-ours), un contrôleur du clerc, un tueur de
rôdeur, un anti-vol de tour. Récit : « les Corbeaux de Sel ont touché la Bannière ; X l'a reprise à la charge ».
Persistance : les rivaux ne régénèrent pas la nuit (ce sont des gens), mais reviennent au complet le matin s'ils ont
été repoussés sans que le Capitaine tombe (« ils se sont regroupés au gué »).

---

## 3. Étape 1 — six classes de base

### 3.0 Règles communes
* Chaque héros dispose de `arme` (attaque d'arme, commune) + 4 sorts de classe + 1 passif. `arme` : 3 PA, portée 1
  (Guerrier, Voleur, Clerc, Invocateur) ou 1-5 avec LdV (Rôdeur, Mage), 100 % (magique pour le Mage).
* Les sorts existants de `data.skills` sont conservés dans l'auto-combat ; en raid ils sont RÉINTERPRÉTÉS par les tables
  ci-dessous (même id quand le sens est le même : `taunt`, `bulwark`, `fire_bolt`, `frost_hold`, `healing_prayer`,
  `shadow_strike`, `precise_shot`, `volley`, `storm`, `last_breath`).
* Niveau de sort : `power` +5 % par tranche de 3 niveaux du héros (entier) ; rien d'autre ne scale que le profil.
* Attribut principal : celui de `data.classes` (Guerrier Force, Rôdeur Adresse, Mage Esprit, Clerc Volonté, Voleur
  Chance) ; Invocateur : Volonté principal, Vigueur secondaire (ses créatures tirent leurs PV de sa vigueur).
* Mapping V4 : `warrior`→Guerrier, `ranger`→Rôdeur, `mage`→Mage, `cleric`→Clerc, `rogue`→Voleur, `summoner`→Invocateur
  (nouvelle classe dans `data.classes`, `craft_by_class: 'erudition'`, `attackBase = will + mind`, `glyph ⚚`).

### 3.1 Guerrier — « celui qui tient la ligne » (rôles : tank, contrôle de proximité ; verbe : tenir)
| Sort | PA | Portée | Zone | Effet | Verbe |
|---|---|---|---|---|---|
| Taillade | 3 | 1 | `single` | 110 % ; relance 0 | frapper |
| Provocation (`taunt`) | 2 | 1-3 | boss/add | la cible ne vise que le guerrier 2 tours ; guerrier : `reduction 5` 2 tours | attirer l'attention |
| Charge | 4 | 2-4, `line_only`, LdV | trajet | se déplace jusqu'à la case adjacente (coût 0 PM) et frappe 130 % ; `push 1` (add) | bousculer |
| Rempart (`bulwark`) | 3 | 0 | soi | `bouclier 30 + 3×niveau`, 2 tours ; relance 3 | encaisser |
Passif « Provocation innée » : dégâts subis −10 % (V4). Terrain : le Guerrier est le seul à pouvoir se faire mordre
trois fois par l'Hydre sans tomber ; il ne gère ni les zones ni les adds à distance.

### 3.2 Clerc — « celui qui remet debout » (rôles : soin, purification ; verbe : soigner en zone)
| Sort | PA | Portée | Zone | Effet | Verbe |
|---|---|---|---|---|---|
| Prière de soin (`healing_prayer`) | 3 | 0-5 | `single` | soin 200 % + 10 (soi, invocation, recrue) ; relance 1 | soigner |
| Bénédiction | 2 | 0-4 | `single` | `bouclier 20 + 2×niveau` 2 tours | protéger |
| Lumière | 3 | 1-4, LdV | `single` | 90 % magique ; retire `poison`/`brule` d'un allié visé ; `aveugle` 1 tour sur un add | purifier une cible |
| Cercle sacré | 4 | 0-2 | `circle 1` | zone `sanctuaire` 2 ripostes (persiste) : +15 PV/tour aux alliés dedans, annule `venin`/`spores` sur ces cases | poser une zone de soin |
Passif « Onction » : ses zones durent une riposte de plus. Terrain : le Clerc seul ne tue pas un dragon ; il rend
possibles les passages des autres (le sanctuaire laissé est le geste asynchrone de base).

### 3.3 Voleur — « celui qui prend ce qui n'est pas à lui » (rôles : burst, vol, mobilité ; verbe : voler)
| Sort | PA | Portée | Zone | Effet | Verbe |
|---|---|---|---|---|---|
| Coup de l'ombre (`shadow_strike`) | 4 | 1 | `single` | 150 % ; 220 % si depuis le dos (côté opposé au `facing` du boss) ; relance 2 | frapper dans le dos |
| Pas de côté | 2 | 1-2, sans LdV | case libre | téléportation courte ; relance 1 | se déplacer |
| Vol de temps | 3 | 1-2 | boss/add | la cible perd 2 PA à son prochain tour (boss : tirage `control_permille`) ; relance 3 | voler un tour |
| Poudre aveuglante | 3 | 1-3, LdV | `cross 1` | `aveugle` 1 tour ; adds : `etourdi` 1 tour | aveugler |
Passif « Chanceux » : critique +100 ‰ (Chance au cœur du profil). Terrain : le Voleur joue la position (le dos) et
le temps du boss ; il est fragile (PV bas, pas de protection).

### 3.4 Rôdeur — « celui qui prépare la chasse » (rôles : distance, marque, pièges ; verbe : marquer)
| Sort | PA | Portée | Zone | Effet | Verbe |
|---|---|---|---|---|---|
| Tir précis (`precise_shot`) | 3 | 3-7, LdV | `single` | 100 % ; critique +100 ‰ | frapper de loin |
| Flèche entravante | 3 | 2-6, LdV | `single` | `entrave` 2 tours ; add : `immobilise` 1 tour ; boss : tirage `control_permille` pour `immobilise` 1 tour ; relance 2 | entraver |
| Piège | 2 | 1-3 | case libre | zone `piege` (persiste, cap 3 par héros) : première unité ennemie qui entre : 80 % + `immobilise` 1 tour | piéger |
| Marque du chasseur | 2 | 1-8, sans LdV | boss/add | `marque` 3 tours (boss) — persiste entre passages | marquer |
Passif « Pistage » : ses marques et pièges durent une riposte de plus. Terrain : le Rôdeur prépare le passage du
suivant (marque + pièges) ; sans mur ni corps, il subit le souffle de plein fouet.

### 3.5 Mage — « celui qui change la grille » (rôles : zones, éléments, contrôle ; verbe : poser une zone)
| Sort | PA | Portée | Zone | Effet | Verbe |
|---|---|---|---|---|---|
| Trait de feu (`fire_bolt`) | 3 | 1-6, LdV | `single` | 120 % magique ; `brule` 2 tours ; relance 1 | brûler |
| Emprise de givre (`frost_hold`) | 4 | 1-5, LdV | `single` | add : `etourdi` 1 tour ; boss : tirage `control_permille` → `immobilise` 2 tours ; case d'eau visée → `glace` (sol) 2 ripostes ; relance 3 | geler |
| Tempête (`storm`) | 5 | 2-5, sans LdV | `circle 2` | 70 % magique à toutes les unités ennemies (adds et têtes compris) ; relance 2 | frapper en zone |
| Mur de glace | 3 | 1-4 | `line 3` perpendiculaire | 3 cases `wall` temporaires 1 riposte (persistent pour le suivant) ; bloque LdV et souffle | ériger |
Passif « Arcanes » : magie ÷2 DEF (V4). Terrain : le Mage répond aux trois dragons (brûler la sève, murer le
souffle, geler l'eau) mais jamais deux fois par tour : il faut choisir.

### 3.6 Invocateur — « celui qui n'est jamais seul » (rôles : corps, absorption, sacrifice ; verbe : invoquer)
| Sort | PA | Portée | Zone | Effet | Verbe |
|---|---|---|---|---|---|
| Golem d'argile | 4 | 1-3 | case libre | corps 1×1 : `hp = 30 + 4×niveau + 2×Vigueur`, `def = 10 + niveau`, atk 60 % du maître, mass 1 ; `garde` du maître ; relance 3 | invoquer un mur |
| Nuée | 3 | 1-4 | case libre | corps 1×1 : `hp = 12 + 2×niveau`, atk 50 % du maître à portée 1-3 (sans LdV), PM 3 ; relance 2 | invoquer un harceleur |
| Lien vital | 2 | 0-6 | invocation | transfère 20 + niveau PV du maître vers l'invocation (ou l'inverse si le maître < 50 %) | partager |
| Sacrifice | 3 | 1-4 | invocation | l'invocation explose : 100 % du maître en `cross 1`, `push 1` ; libère la case | sacrifier |
Passif « Présence » : les invocations RESTENT sur la grille après le passage (elles appartiennent à la guilde ;
le copain suivant peut leur donner un `Lien vital` s'il est Invocateur, et le boss les vise comme corps).
Limite : `summon_cap` = 2 par héros et 4 par guilde présentes en même temps (les plus anciennes disparaissent).

### 3.7 IA d'invocation (déterministe, sans RNG)
```
tour d'une invocation (4 PA, 2 PM) :
 1. si charme/garde : la cible = la plus menaçante pour le gardé (add adjacent, sinon boss)
 2. sinon cible = add le plus proche (distance, puis id ASCII), sinon boss
 3. si cible à portée : attaquer (3 PA) ; sinon déplacement Dijkstra vers la case libre la plus proche de la cible, puis attaquer si possible
 4. golem : s'il est adjacent au boss et le maître aussi → Provocation gratuite (le boss vise le golem 1 tour)
 5. jamais d'entrée volontaire sur une zone de boss (coût +99 dans Dijkstra)
```

### 3.8 Grille de complémentarité (ce que chaque base apporte, pour le tableau « besoins du groupe »)
| Besoin | Guerrier | Clerc | Voleur | Rôdeur | Mage | Invocateur |
|---|---|---|---|---|---|---|
| Tenir / encaisser | 3 | 1 | 0 | 0 | 0 | 2 |
| Soigner / purifier | 0 | 3 | 0 | 0 | 0 | 1 |
| Contrôler | 1 | 0 | 2 | 2 | 2 | 0 |
| Dégâts | 2 | 0 | 3 | 2 | 2 | 1 |
| Zones / terrain | 0 | 1 | 0 | 2 | 3 | 0 |
| Corps sur la grille | 0 | 0 | 0 | 0 | 0 | 3 |
| Mobilité | 1 | 0 | 3 | 0 | 0 | 0 |
Score de besoin de la guilde = somme par colonne des héros présents ; un besoin < 2 est « manquant » (affiché).

---

## 4. Étape 2 — quinze hybrides

Principe : le second choix ajoute une RESSOURCE ou une MÉCANIQUE qui change la manière de dépenser les 6 PA, et deux
sorts qui n'existent qu'avec cette mécanique. Les 4 sorts de base restent ; le héros a donc 6 sorts + arme à l'hybride.
Notation : base A + base B. Les noms sont des hypothèses de travail.

| # | Paire | Nom | Ce que le second choix CHANGE (ressource / mécanique) | Sort hybride 1 | Sort hybride 2 | Territoire |
|---|---|---|---|---|---|---|
| 1 | G+C | Paladin | **Ferveur** (0-5) : +1 par coup encaissé ; dépensée pour soigner en zone autour de soi | Serment (2 PA, 0, soi : `garde` de l'invocation/recrue la plus proche, 2 tours) | Onde de ferveur (3 PA, `circle 1`, soin 40 + 20×ferveur, ferveur → 0) | ligne de front qui se soigne en encaissant |
| 2 | G+V | Duelliste | **Riposte** : contre-attaque automatique (60 %) après chaque attaque du boss subie à portée 1 ; max 2 par tour ennemi | Défi (2 PA, 1-2 : le boss ne vise que lui 2 tours ; il inflige +30 % au boss) | Feinte (3 PA, 0 : le prochain coup subi est annulé, relance 3) | tank-burst monocible qui veut être frappé |
| 3 | G+R | Chasseur de monstres | **Traque** : chaque coup sur une cible marquée pose 1 `fissure` (DEF −5, cap 4, persiste) | Filet (3 PA, 1-4, LdV : `immobilise` 1 tour + `pull 2` sur add) | Coup de grâce (4 PA, 1 : 120 % +20 % par fissure) | mêlée qui prépare l'armure du boss pour les copains |
| 4 | G+M | Lame runique | **Runes** (0-3) : +1 par sort lancé ; à 3, la prochaine `arme` devient `cross 1` élémentaire | Lame enchantée (2 PA, 0 : choisit feu ou givre, 3 tours) | Onde runique (4 PA, `line 3` : 90 % magique, applique l'élément) | mêlée de zone élémentaire |
| 5 | G+I | Capitaine | **Recrues** : invocations `soldat` (`hp = 20 + 3×niveau`, atk 50 %) ; **Ordre** : 2 PA pour faire rejouer une recrue | Lever une recrue (3 PA, 1-2 : soldat, cap 3) | Formation (2 PA, 0 : les recrues adjacentes deviennent `wall` pour la LdV et les souffles 1 tour) | corps disciplinés, murs vivants |
| 6 | C+V | Inquisiteur | **Stigmate** : 30 % des dégâts qu'il subit sont rendus au boss à la fin du tour du boss (dégâts fixes) | Confession (3 PA, 1-3 : retire un état bénéfique de la cible et le pose sur soi : bouclier, régén.) | Sentence (4 PA, 1-3 : 100 % + 25 % par état négatif sur la cible) | débuffeur-voleur d'états |
| 7 | C+R | Ermite | **Sentiers** : cases `sentier` (cap 6, persistantes 2 ripostes) : −1 PM pour les alliés, +1 pour les ennemis | Tracer (2 PA, `line 3` : pose 3 `sentier`) | Eau vive (3 PA, 1-4, `cross 1` : purifie `venin`/`cendres`/`spores`/`roots`, soin 30 aux alliés) | maître du terrain à distance |
| 8 | C+M | Oracle | **Prophétie** : voit la prochaine riposte ET la suivante ; peut réécrire une cible de riposte par passage | Présage (2 PA, 0 : écrit sur la grille la `case sûre` du prochain souffle/venin, visible par le copain suivant) | Sablier (4 PA, 1-6, sans LdV : le boss perd sa prochaine riposte OU le héros suivant gagne +2 PA à son H1 ; relance 99 par raid/jour) | temps et prévision |
| 9 | C+I | Spirite | **Esprits** : invocations sans corps (auras attachées à une case ou à une unité, `hp` = 1 charge par riposte) | Esprit gardien (3 PA, 0-4 : aura `bouclier 25` sur une case, 3 ripostes, persiste) | Esprit de cendre (3 PA, 1-5 : aura sur le boss : `brule` 1 tour à chaque riposte, 2 ripostes) | soutien qui reste après le départ |
| 10 | V+R | Traqueur | **Ombre** (0-3) : +1 par tour sans être frappé ; à 3, prochain sort = critique garanti | Embuscade (3 PA, 1-6 : 100 % ; ×2 si le héros est sur un `piege` non déclenché — il le consomme) | Fil de fer (2 PA, 1-3 : relie deux pièges, un add qui traverse subit les deux) | burst préparé à distance |
| 11 | V+M | Illusionniste | **Double** : un corps 1×1 `hp 1` qui absorbe une attaque entière et vaut comme cible de riposte (cap 2) | Double (3 PA, 1-4 : crée le double) | Échange (2 PA, 1-6, sans LdV : permute avec un double ou un add) | leurres et positions |
| 12 | V+I | Marionnettiste | **Fils** : `charme` sur un add (2 tours, tirage `control_permille` add = 900) ; l'add charmé suit l'IA d'invocation | Fils (3 PA, 1-4 : charme) | Pantin (4 PA, 1-3 : invocation `pantin` `hp 10`, qui répète le dernier sort du maître à 50 % sur sa propre cible) | retourner le camp adverse |
| 13 | R+M | Tisse-vent | **Souffle** (0-2) : +1 par sort à distance ; chaque sort à `souffle ≥ 1` gagne `push 1` ou `pull 1` (choisi) | Rafale (3 PA, 2-6, `cone 2` depuis la cible : 70 %, `push 2`) | Appel d'air (3 PA, 1-6, `circle 1` : `pull 2` vers la case visée) | déplacement à distance |
| 14 | R+I | Dresseur | **Bête** : une invocation unique et forte (`hp = 40 + 5×niveau`, atk 80 %, PM 4), persistante ; **Ordres** 1 PA (attaque / garde / rapporte) | Bête (4 PA, 1-3 : appelle ou repositionne la bête) | Rapporte (1 PA : la bête `pull 1` sa cible vers le maître) | duo maître-bête |
| 15 | M+I | Conjurateur | **Élémentaire** : invocation `hp = 25 + 3×niveau` qui pose une zone à chaque tour (feu : `brule` ; terre : `wall` 1 riposte) ; **Fusion** : le maître absorbe l'élémentaire | Élémentaire (4 PA, 1-3 : feu ou terre) | Fusion (3 PA, 0 : `mass 2`, immunité au contrôle, `arme` devient `cross 1` élémentaire, 3 tours) | zones vivantes, transformation |

### 4.1 Challenge du tableau
* **Redondances repérées et traitées** : (a) Ermite / Spirite — même famille « soutien persistant » ; tranché en
  Ermite = TERRAIN (sentiers, purification), Spirite = AURAS (bouclier, débuff du boss). (b) Capitaine / Dresseur —
  même famille « corps » ; tranché en plusieurs corps faibles disciplinés vs une bête forte et mobile qui tire.
  (c) Inquisiteur / Oracle — l'ancien « Théurge » (C+M) n'apportait que des sorts ; remplacé par l'Oracle (prophétie
  et temps), seule ressource asynchrone du tableau à agir sur le passage du copain SUIVANT.
* **Hybrides faibles (en sursis)** :
  - Lame runique (G+M) : ses éléments sont déjà donnés par le Mage de base (brûler, geler). Sa raison d'exister est
    « frapper en zone au contact ». Si le banc T2 montre que sa part de dégâts en zone n'est pas ≥ 1,5× celle d'un
    Guerrier de base, FUSION : la paire G+M mène au Chasseur de monstres avec l'option « fissure élémentaire ».
  - Marionnettiste (V+I) : dépend des adds (absents du Drake). Le Pantin compense mais complexifie (écho de sort).
    Si le banc T2 montre < 1 charme utile par raid en moyenne, FUSION : la paire V+I mène à l'Illusionniste avec
    l'option « double charmeur ».
* **Pourquoi pas une autre architecture** : une architecture « rôles d'abord » (tank/soin/dps/contrôle × 2) donnerait
  des rôles plus nets mais tuerait la question « pourquoi j'ai mon hybride » : la paire de bases est ce que le joueur
  comprend (« je suis Guerrier ET Clerc, donc Paladin »). On garde les paires, on tranche les spés.

---

## 5. Étape 3 — trente spécialisations

Format : verbe propre · 2 sorts signature (PA, portée, zone, effet) · situation de boss où elle est la meilleure
réponse · différence lisible avec sa sœur. Le troisième choix conserve tout (base 4 + hybride 2) et ajoute 2 sorts
signature : 8 sorts + arme au total, dont 1 « journalier » (relance 99 : une fois par passage).

### 5.1 Tableau des 30
| # | Hybride | Spé A | Verbe A | Spé B | Verbe B |
|---|---|---|---|---|---|
| 1 | Paladin | Templier | ancrer (mur planté) | Hospitalier | relever (soigner en zone, relever une invocation) |
| 2 | Duelliste | Bretteur | riposter | Matador | déplacer le boss (provoquer sa charge) |
| 3 | Chasseur de monstres | Harponneur | attirer / ancrer le vol | Écorcheur | fissurer |
| 4 | Lame runique | Lame de feu | embraser (zones de feu au contact) | Lame de givre | geler le terrain |
| 5 | Capitaine | Porte-étendard | rallier (aura de PA) | Sergent | former (mur de corps) |
| 6 | Inquisiteur | Confesseur | voler un état | Censeur | sceller un mécanisme |
| 7 | Ermite | Pèlerin | purifier | Sourcier | façonner le terrain (eau ↔ sol) |
| 8 | Oracle | Devin | révéler | Chronomancien | retarder |
| 9 | Spirite | Médium | hanter (aura de débuff sur le boss) | Veilleur | protéger (aura de bouclier sur une case) |
| 10 | Traqueur | Assassin | exécuter (dans le dos) | Piégeur | piéger en chaîne |
| 11 | Illusionniste | Mirage | leurrer | Passe-muraille | échanger (positions) |
| 12 | Marionnettiste | Charmeur | retourner un add | Montreur | dupliquer (écho) |
| 13 | Tisse-vent | Bourrasque | pousser en zone | Cyclone | rassembler (attirer en zone) |
| 14 | Dresseur | Maître-ours | garder (corps massif) | Fauconnier | survoler (frapper sans LdV, rabattre l'envol) |
| 15 | Conjurateur | Avatar | se transformer | Portier | relier (portails persistants) |

### 5.2 Fiches
**1A Templier** — Bouclier planté (4 PA, 0-1 : la case devient `wall` héroïque 2 ripostes, persiste ; bloque souffle et
LdV, `hp 120`) · Charge de foi (4 PA, 2-4 `line_only` : charge + `bouclier 40` à l'arrivée). Meilleure réponse :
Drake, souffle télégraphié — le mur reste pour le copain suivant. Sœur : l'Hospitalier soigne, le Templier bloque.
**1B Hospitalier** — Onction de zone (4 PA, 0-3, `circle 1` : soin 60 + retire `poison`, persiste comme `sanctuaire`
1 riposte) · Relever (5 PA, 1-2 : une invocation/recrue/bête tombée ce passage revient à 50 %, journalier). Meilleure
réponse : Hydre, venin + sangsues sur les corps. Sœur : voir 1A.

**2A Bretteur** — Riposte double (passif signature : 2 ripostes par attaque subie, 70 %) · Botte secrète (4 PA, 1 :
130 %, +40 % si ≥ 2 ripostes ce tour). Meilleure réponse : Hydre, trois têtes = trois ripostes par tour B. Sœur :
le Matador ne rend pas les coups, il fait bouger le boss.
**2B Matador** — Cape (3 PA, 1-3 : le boss charge vers la cape : `move` forcé de 2 vers la case visée si mass ≤ 3 ;
collision contre `wall` = 40, journalier) · Esquive (2 PA, 0 : prochain coup subi annulé, +1 PM). Meilleure réponse :
Sylvain P3 chancelant (la Cape le décolle de ses racines) et Drake atterri (l'amener sur les pieux). Sœur : voir 2A.

**3A Harponneur** — Harpon (4 PA, 2-6, LdV : `pull 3` un add, ou ancre le Drake en vol : atterrissage immédiat,
journalier) · Chaîne (2 PA, 1 : `immobilise` 2 tours sur add). Meilleure réponse : Drake, envol. Sœur : l'Écorcheur
n'attire rien, il use l'armure.
**3B Écorcheur** — Entaille (3 PA, 1 : 90 % + 2 fissures) · Dépeçage (5 PA, 1 : 60 % par fissure présente, consomme
les fissures, journalier). Meilleure réponse : Drake P1, écailles de fer (DEF +20). Sœur : voir 3A.

**4A Lame de feu** — Pas de braise (3 PA, 0 : les 3 prochaines cases traversées deviennent `feu` 1 riposte : `brule`
à l'entrée) · Fendoir ardent (4 PA, 1, `cone 2` : 100 %, `brule` 2 tours). Meilleure réponse : Sylvain, sève (un
brûleur de mêlée qui n'a pas besoin de LdV). Sœur : la Lame de givre gèle, elle ne brûle pas.
**4B Lame de givre** — Pas de givre (3 PA, 0 : les cases d'eau adjacentes deviennent `glace` 2 ripostes) · Estoc glacé
(4 PA, 1 : 100 % + `entrave` 2 tours ; boss dans l'eau gelée : `immobilise` sans tirage). Meilleure réponse : Hydre,
immersion. Sœur : voir 4A.

**5A Porte-étendard** — Étendard (4 PA, 0-2 : zone `etendard` 3 ripostes, persiste : tout héros qui commence son
H1 adjacent gagne +1 PA ce tour ; les recrues autour ont +20 % atk) · Ralliement (2 PA, 0 : toutes les recrues
rejoignent l'étendard, coût 0 PM). Meilleure réponse : Derby des Lames, tenir la Bannière ; secondairement tout raid
long (le +1 PA est un cadeau au copain suivant). Sœur : le Sergent forme des murs, pas des cadeaux.
**5B Sergent** — Mur de boucliers (3 PA, 0 : les recrues adjacentes deviennent `mass 2`, `wall` pour souffle, 2 tours)
· Sacrifice ordonné (2 PA, 1-3 : une recrue prend la prochaine attaque de riposte à la place du héros). Meilleure
réponse : Hydre, trois gueules. Sœur : voir 5A.

**6A Confesseur** — Vol de bouclier (3 PA, 1-3 : transfère le bouclier de la cible sur soi, jusqu'à 200 points) ·
Vol de sève (4 PA, 1-3 : copie la régénération du boss 2 tours, la sienne est coupée 1 tour). Meilleure réponse :
Sylvain P3, écorce (250 de bouclier deviennent 200 pour le héros). Sœur : le Censeur interdit, le Confesseur prend.
**6B Censeur** — Interdit (5 PA, 1-6, sans LdV : `scelle:<mecanisme>` au choix pour la prochaine riposte, journalier)
· Silence (3 PA, 1-3 : un add ne peut pas soigner/drainer 2 tours). Meilleure réponse : Derby des Lames (sceller le
vol de tour, museler le clerc rival) ; Drake (sceller le souffle avant un passage vulnérable). Sœur : voir 6A.

**7A Pèlerin** — Grande purification (4 PA, 0-4, `circle 2` : retire toutes les zones de boss, soin 20 aux alliés,
journalier) · Pas léger (passif signature : ignore le coût des zones de boss, jamais `immobilise` par `roots`).
Meilleure réponse : Drake P2-P3, cendres qui rétrécissent la grille. Sœur : le Sourcier crée du terrain, le Pèlerin
en enlève.
**7B Sourcier** — Source (3 PA, 1-4 : une case `floor` devient `water` 2 ripostes ; les adds y perdent 1 PM) ·
Assèchement (4 PA, 1-4, `cross 1` : `water` → `floor` 2 ripostes ; l'Hydre hors d'eau perd sa régén.). Meilleure
réponse : Hydre, immersion. Sœur : voir 7A.

**8A Devin** — Vision (2 PA, 0 : la vue montre les DEUX prochaines ripostes ; pose une `case sûre` persistante
visible par le suivant) · Détourner (4 PA, 1-8, sans LdV : la prochaine riposte vise la case choisie au lieu du héros,
journalier). Meilleure réponse : Drake, souffle (le Devin joue avant et écrit la case sûre pour le copain). Sœur : le
Chronomancien touche au temps, pas aux cibles.
**8B Chronomancien** — Sablier renversé (5 PA, 0 : le boss saute sa prochaine riposte, journalier, tirage
`control_permille`) · Legs (3 PA, 0 : le prochain héros à jouer gagne +1 tour de passage — `pass_turns` +1, une fois par
raid et par jour). Meilleure réponse : n'importe quel raid au 3e soir (enrage) : offrir un tour de plus au burst.
Sœur : voir 8A.

**9A Médium** — Esprit de cendre majeur (4 PA, 1-5 : aura sur le boss, `brule` permanent 3 ripostes, coupe la
régén.) · Hantise (3 PA, 1-5 : aura sur le boss : DEF −10, 2 ripostes, persiste). Meilleure réponse : Sylvain, sève
(un brûleur qui n'a pas besoin de repasser). Sœur : le Veilleur protège une case, le Médium hante le boss.
**9B Veilleur** — Esprit gardien majeur (4 PA, 0-4 : aura `bouclier 60` sur une case, 3 ripostes, persiste) · Veille
(2 PA, 0 : toutes les auras de la guilde gagnent 1 riposte). Meilleure réponse : Drake, souffle — la case sûre est
blindée pour trois copains d'affilée. Sœur : voir 9A.

**10A Assassin** — Lame dans le dos (5 PA, 1 : 200 % depuis le dos, 300 % si boss `chancelant`, journalier) ·
Ombre longue (2 PA, 0 : `ombre` = 3 immédiatement, relance 3). Meilleure réponse : Drake atterri / Hydre chancelante
(fenêtres). Sœur : le Piégeur prépare, l'Assassin conclut.
**10B Piégeur** — Piège lourd (3 PA, 1-4 : `piege` 120 % + `immobilise` 2 tours, cap séparé 2) · Rabattage (3 PA,
1-5, `circle 1` : `pull 1` vers le piège le plus proche). Meilleure réponse : Sylvain P2, rejetons. Sœur : voir 10A.

**11A Mirage** — Triple (4 PA, 1-4 : 2 doubles d'un coup) · Miroir (3 PA, 0 : la prochaine riposte vise le double le
plus proche, pas le héros, et ne laisse pas de zone). Meilleure réponse : Hydre, trois gueules (les doubles prennent
les morsures). Sœur : le Passe-muraille bouge, le Mirage fait viser à côté.
**11B Passe-muraille** — Grand échange (3 PA, 1-8, sans LdV : permute avec n'importe quelle unité non-boss, adds
compris) · Passage (2 PA, 1-3 : traverse un `wall` ou une zone sans la subir). Meilleure réponse : Sylvain, racines
(traverser) ; Drake, cendres. Sœur : voir 11A.

**12A Charmeur** — Fils solides (3 PA, 1-4 : `charme` 3 tours, sans tirage sur add ≤ niveau du héros) · Retourne-
ment (4 PA, 1-4 : l'add charmé explose : 120 % `cross 1` au boss). Meilleure réponse : Sylvain P2, rejetons (un
rejeton charmé soigne le héros au lieu du boss). Sœur : le Montreur ne charme pas, il copie.
**12B Montreur** — Écho (4 PA, 0 : le pantin répète le prochain sort du héros à 70 % sur une autre cible) · Deux
pantins (5 PA, journalier). Meilleure réponse : Hydre, décapitation double (deux têtes dans le même passage). Sœur :
voir 12A.

**13A Bourrasque** — Tempête de vent (5 PA, 2-6, `cone 3` : 60 %, `push 3`, journalier) · Souffle court (2 PA, 1-3 :
`push 1`). Meilleure réponse : Hydre chancelante → pieux (collision 60 + 3×(6+2×niveau)) ; adds éjectés du boss.
Sœur : le Cyclone rassemble, la Bourrasque disperse.
**13B Cyclone** — Œil du cyclone (5 PA, 1-6, `circle 2` : `pull 2` de tout vers le centre, journalier) · Aspiration
(3 PA, 1-6 : `pull 2` sur une unité). Meilleure réponse : Sylvain P2 (regrouper les rejetons pour une Tempête) ;
Hydre, sortir le corps de l'eau. Sœur : voir 13A.

**14A Maître-ours** — Ours (la bête devient `mass 2`, `hp` ×150 %, `garde` du maître) · Grondement (2 PA : l'ours
`Provocation` 2 tours sur le boss). Meilleure réponse : Hydre, trois gueules ; Derby, garder la Bannière. Sœur : le
Fauconnier vole, l'ours tient.
**14B Fauconnier** — Faucon (la bête ignore `wall`, eau et zones, PM 6, attaque 1-4 sans LdV) · Rabattre (3 PA :
le faucon force l'atterrissage du Drake ou `pull 1` un add, journalier). Meilleure réponse : Drake, envol et cendres.
Sœur : voir 14A.

**15A Avatar** — Grande fusion (5 PA, 0 : `mass 3`, immunité au contrôle et aux zones, `arme` en `circle 1`
élémentaire 120 %, 3 tours, journalier) · Rémanence (2 PA : à la fin de la fusion, l'élémentaire renaît à 50 %).
Meilleure réponse : Drake P3, fournaise (le seul héros qui peut rester dans le cercle). Sœur : le Portier ne se
transforme pas, il relie.
**15B Portier** — Portail (3 PA, 1-6 : deux cases liées, 2 ripostes, persistent : entrer sur l'une = sortir sur
l'autre pour tous les alliés) · Bannissement (4 PA, 1-4 : un add est envoyé sur l'autre portail, `etourdi` 1 tour).
Meilleure réponse : Sylvain, racines (un portail posé par un copain rend le passage suivant libre). Sœur : voir 15A.

### 5.3 Test de branche (verbe propre + situation de boss + différence avec la sœur)
Réponse mécanique attendue au banc T3 (§8) : pour chaque spé, un scénario scripté où elle réduit le nombre de
tours nécessaires pour résoudre la situation d'au moins 25 % par rapport à sa sœur ET à son hybride nu.
Résultat du test sur le papier :
| Statut | Spés | Motif |
|---|---|---|
| Passent nettement (22) | Templier, Hospitalier, Bretteur, Matador, Harponneur, Écorcheur, Porte-étendard, Sergent, Confesseur, Censeur, Pèlerin, Devin, Chronomancien, Médium, Veilleur, Assassin, Piégeur, Mirage, Passe-muraille, Bourrasque, Maître-ours, Avatar | verbe unique, situation évidente |
| Passent de justesse (4) | Sourcier (Hydre seule), Cyclone (proche de Harponneur), Fauconnier (deux réponses à l'envol), Portier (proche de Passe-muraille) | situation unique mais étroite ; on garde, on surveille au banc |
| Échouent sur le papier (4) | Lame de feu, Lame de givre, Charmeur, Montreur | voir §5.4 |

### 5.4 Fusions proposées (liste des échecs et de leur traitement)
1. **Lame de feu** (4A) — verbe « embraser » déjà tenu par le Mage de base (Trait de feu), le Médium (aura de
   cendre) et l'élémentaire de feu du Conjurateur. Trois brûleurs suffisent. Fusion : la Lame de feu disparaît avec son
   hybride ; sa signature « Pas de braise » est absorbée par l'Écorcheur (3B) sous forme d'option « fissure ardente ».
2. **Lame de givre** (4B) — verbe « geler » tenu par le Mage de base (Emprise, glace sur l'eau) et le Sourcier
   (assécher) répond aussi à l'immersion. Fusion : disparaît avec son hybride ; « Estoc glacé » absorbé par le
   Harponneur (3A) sous forme « Chaîne de givre ».
   → **Paire G+M** : redirigée vers le Chasseur de monstres (le Mage apporte l'élément à la fissure). Le joueur
   Guerrier+Mage lit : « ton Guerrier a appris à user l'armure avec l'élément du Mage ».
3. **Charmeur** (12A) — le charme dépend d'adds absents du Drake et le Piégeur/Cyclone/Harponneur gèrent déjà les
   adds. Fusion : le charme devient la signature B de l'Illusionniste (« Double charmeur » : Mirage garde ses leurres,
   Passe-muraille gagne « Fils » comme sort signature 2 à la place de « Passage »).
4. **Montreur** (12B) — l'écho de sort est le mécanisme le plus coûteux à implémenter (copie d'un sort avec sa
   cible) pour un bénéfice que la Tempête du Mage ou la Bourrasque couvrent déjà (décapitation double).
   Fusion : disparaît. → **Paire V+I** : redirigée vers l'Illusionniste (le Voleur et l'Invocateur font des corps qui
   trompent).
Bilan recommandé : **13 hybrides, 26 spécialisations** en vague A ; les 2 hybrides et 4 spés ci-dessus restent
spécifiés ici en vague B, construits SEULEMENT si le gate fun de T3 dit « il manque un brûleur de mêlée / un
retourneur d'adds ». Structure 1 → 2 → hybride → 2 spés préservée ; aucune paire de bases n'est interdite (deux
paires mènent à un hybride partagé, avec une ligne de chronique qui l'explique).

---

## 6. Progression dans les 30 jours

### 6.1 Seuils
| Étape | Condition (la première atteinte) | Jour visé | Présentation |
|---|---|---|---|
| Base | jour 1, choix à la création du héros (les IA reçoivent la classe de leur profil) | J1 | fiche de création |
| Hybride | niveau ≥ 5 (700 XP) OU jour ≥ 8 | ~J8 | soir : « X a mûri : quelle voie ? » ; choix dans l'app, sinon auto à J+2 (§6.3) |
| Spécialisation | niveau ≥ 12 (3 300 XP) OU jour ≥ 20 | ~J20 | idem, deux cartes côte à côte |
| Premier dragon | `dragon_wake_day_min` 10 + maîtrise 6 (V4, inchangé) | J13-J29 mesuré V4 | la fenêtre J10-J20 est jouée avec les hybrides ; les spés arrivent pour les derniers dragons et le Derby des Lames |
Le filet « OU jour ≥ » garantit que tous les copains changent de classe la même semaine, même les moins actifs ;
l'XP V4 (expéditions, solo, raids +10 %/passage) reste la voie rapide. Vérification au banc : 30 graines × 30 jours,
`planDefaults` → 90 % des héros hybrides à J10, 80 % spécialisés à J22 ; sinon ajuster les jours-filet.

### 6.2 Comment le choix est présenté (chronique + tableau)
* Tableau vivant : bandeau « Besoins du groupe » calculé avec §3.8 étendu aux hybrides/spés (chaque hybride ajoute
  +2 dans une colonne, chaque spé +2 dans une autre) : les 2 colonnes les plus basses sont écrites en clair, ex.
  « Le groupe manque de contrôle et de corps sur la grille ».
* Cartes de choix : nom, une phrase d'identité, le verbe, la ressource, les deux sorts, et une ligne générée :
  « Utile contre : le Drake (envol), l'Hydre (immersion) » à partir des besoins des fiches §2 (table
  `spec_answers[spec_id] = [raid_id…]`). Une pastille « Recommandé pour le groupe » sur la carte qui comble un
  besoin manquant. Le choix reste libre.
* Chronique du soir : « Aldric a prêté serment : Paladin. Son bouclier saura protéger ce que la guilde n'a pas. »
  (gabarits ≥ 6 par étape, variables : nom, hybride, verbe, besoin comblé).

### 6.3 Question ouverte 1 — second choix libre ou influencé par le vécu ?
| Option | Règle chiffrée | Pour | Contre |
|---|---|---|---|
| A. Libre | 5 hybrides proposés, aucun bonus | simple, « je choisis avec mes copains » | le vécu du héros (savoir-faire, expéditions) ne compte pas |
| B. Libre + affinité (recommandée) | `affinite(hybride) = (savoir-faire de la 2e base ≥ 3 : +1) + (≥ 4 expéditions avec un héros de la 2e base dans l'équipe : +1) + (trait compatible : +1)` ; l'hybride d'affinité maximale démarre avec sa ressource à +1 (Ferveur 1, Rune 1, Ombre 1…) et une ligne de chronique | le vécu se voit, le choix reste au joueur ; coût d'implémentation faible (3 compteurs déjà dans `hero.history`/`crafts`) | bonus faible, il faut le dire clairement pour qu'il soit perçu |
| C. Contraint par le vécu | seules les 2 hybrides d'affinité maximale sont proposées (départage ASCII) | forte narration | frustre le joueur qui avait un plan avec ses copains ; incompatible avec « émulation d'équipe » |
| Auto (joueur absent) | après 2 jours sans choix : hybride qui comble le besoin manquant le plus bas (B), départage affinité puis ASCII | | |
Recommandation : **B**. Le vécu colore, la table des copains décide.

### 6.4 Question ouverte 2 — changer de spécialisation en cours de partie ?
| Option | Règle chiffrée | Pour | Contre |
|---|---|---|---|
| A. Jamais | choix définitif | lisible, chaque choix pèse | une erreur se paie 10 jours ; adaptation du groupe impossible |
| B. Une reconversion par saison (recommandée) | action `respec` : coûte 100 or de guilde + une journée entière du héros (`rest` forcé), disponible du jour du choix jusqu'à J27, une seule fois par héros ; ne change QUE la spé (la sœur), jamais l'hybride ; ressource et journaliers remis à zéro ; chronique « X a changé de voie » | permet à la guilde de s'adapter au dragon réveillé (« il nous faut un ancreur ») ; borné | une journée perdue avant un raid = un vrai coût, à expliquer |
| C. Libre entre deux raids | reconversion sans limite hors raid, 1 jour de délai | adaptation maximale | les choix ne pèsent plus ; les spés deviennent des « loadouts » |
Recommandation : **B**, avec un rappel dans le tableau quand un dragon se réveille : « Le Drake s'éveille : un
Harponneur ou un Fauconnier serait précieux (reconversion possible pour X, Y) ». Hors du raid seulement
(`state.raid == null` ou héros non déclaré ce jour).

---

## 7. Contrat technique proposé

### 7.1 Module `tactic.js`
* UMD comme sim.js (`module.exports` / `window.GuildeTactic`), aucune dépendance sauf les helpers exposés par sim.js
  (`makeRng`, `div`, `pct`, `fnvStr`, `clone`, `sortedKeys`) — sim.js exporte un objet `_internal` en lecture seule.
* Pur : chaque fonction retourne un nouvel état ; jamais de Math.random/Date/flottant ; itération toujours par
  listes triées (`units` triées par id ASCII, cellules par index).
* Tables : `data.raid` (constantes), `data.raids` (fiches), `data.layouts`, `data.tactic_spells` (tous les sorts de
  base/hybride/spé, une entrée par id avec `{cost_pa, range_min, range_max, los, line_only, shape, r, power, tags,
  effects:[{kind, value, turns, target}], cooldown, daily, verb}`), `data.lineage` (`bases`, `hybrids`, `specs`,
  `spec_answers`).

### 7.2 État (`state.raid`, privé au moteur, hashé comme le reste)
```
state.raid = { id:'raid_forest', dragon_id, day_start, nights:int, status:'active'|'won'|'lost',
  rng_s:int, rng_count:int,                     // flux RNG propre au raid, sérialisé
  boss:{id, x,y, w:2,h:2, facing:'S', hp, hp_max, shield, states:[{id,turns,value}], phase:int, heads:[{hp,alive,regrow}]|null,
        fissures:int, controls_today:int, riposte_next:{kind, cells:[idx…], label}, riposte_after:{…}|null},
  cells:{ layout:[int×99], zones:{ "idx": {zone_id, turns_left, owner_kind, source_id} } },
  units:[{id, kind:'hero'|'summon'|'add'|'recruit'|'double'|'aura', owner, master_id|null, x,y, hp,hp_max, shield, pa,pm,
          states:[], profile:{atk,def,heal,crit,spd}, born_pass:int}],
  pass:{ hero_id, manager_id, turn:int, turn_max:int, pa:int, pm:int, seq:int, ko:false }|null,
  passes_done:[{day, hero_id, damage, healing, ko, turns}], damage_total:{hero_id:int},
  journal:[{pass, hero_name, lines:[string]}]  }
```
Le héros en passage garde son profil V4 du matin (`combatProfile`), copié dans `units` au début du passage.

### 7.3 API
```
startRaid(state, raid_id) -> state'            // crée state.raid, place le boss (fiche), rng_s = fnvU32(seed ^ day ^ fnvStr(raid_id))
raidView(state, managerId) -> VM.raid           // §7.5, null si aucun raid
validateRaidAction(state, action) -> {ok, reason}
raidAction(state, action) -> {state, log, events}   // begin_pass | move | cast | end_pass ; invalide => état inchangé, reason
raidPreview(state, managerId, spell_id, x, y) -> {valid, reason, cells:[idx], targets:[{unit_id, dmg_min, dmg_max, heal, effects:[label]}], path:[idx]|null}
raidEndPass(state) -> {state, log, events}     // riposte + tick des états ; appelé par end_pass et par le KO
raidNight(state) -> {state, log, events}       // §1.12 ; appelé par sim.js en phase 11
raidDefaults(state, hero_id) -> Action[]       // passage prudent automatique (§7.6)
```
Actions : `{manager_id, day, type:'raid', payload}` avec `payload.op` :
`begin_pass {hero_id}` · `move {to:{x,y}}` (chemin calculé, coût vérifié) · `cast {spell_id, x, y}` · `end_pass {}`.
Validation : c'est bien le héros du manager, il a l'activité `raid` planifiée ce jour, aucun autre passage en cours,
`pass.seq` attendu = `payload.seq` (protection contre un état périmé : « l'état a changé, rejoue ton passage »),
PA/PM suffisants, portée/LdV/forme, cible compatible (`target:'enemy'|'ally'|'cell'|'self'|'summon'`).

### 7.4 Intégration dans sim.js
* Activité `raid` (journée entière, 3 PA, `activity_options` quand `state.raid.status === 'active'` et héros apte :
  sévérité < 2, fatigue < 100) ; remplace `defend` les jours de raid ; `presets.defense` → `raid`.
* Phase 7b : si `state.raid` actif → rien à combattre automatiquement ; sinon (aucun manager n'a de héros apte, ou
  option `raid_enabled:false`) → comportement V4 inchangé. Réveil (11c) : quand la menace du lendemain est due,
  `startRaid` est appelé au matin (phase 1) du jour d'attaque à la place de `phaseThreat`.
* Phase 11 : `raidNight` ; issue `won`/`lost` → routage vers la sortie V4 correspondante (`vaincu`/`ravage`) réalisée
  par la même fonction que phaseThreat (extraite en `applyThreatOutcome(ctx, outcome, fighters)`), puis `state.raid = null`.
* Les actions `raid` sont acceptées ENTRE deux `resolveDay` : le journal exporté devient
  `{seed, days:[{day, actions:[…]}]}` où les actions de raid sont dans la liste du jour, dans l'ordre de réception, avec
  `seq`. Rejeu : `newGame` puis, pour chaque jour, appliquer les actions `raid` dans l'ordre via `raidAction`, puis
  `resolveDay` avec les autres. `hashState` couvre `state.raid`. `btn-replay` inchangé (IDENTIQUE/DIVERGENCE).
* Sans serveur : un passage est atomique (un bloc d'actions avec le même `pass.seq` de départ) ; deux copains ne
  jouent jamais en même temps par construction (le second reçoit « X est sur la grille » via `waiting_on`).

### 7.5 `VM.raid` (tout prêt à afficher)
```
{ active:true, id, name, day_start, nights, status, phase_label, hp_pct:int, hp_label:'1 240 / 1 800',
  boss:{name, x,y,w,h, facing, shield, states:[{label, turns}], next_riposte:{label, cells:[{x,y}]}, heads:[{hp_pct,alive}]|null, fissures},
  grid:{w,h, cells:[{x,y, kind, zone:{id,label,turns_left,mine}|null, safe:bool}]},
  units:[{id, kind, name, owner_name, x,y, hp,hp_max, shield, states:[{label,turns}], is_mine}],
  me:{ hero_id|null, can_play:bool, reason:string|null, pass:{turn,turn_max,pa,pa_max,pm,pm_max,seq}|null,
       spells:[{id,name,cost_pa,range_label,zone_label,verb,cooldown_left,castable,reason,description}],
       reachable:[{x,y,cost}] },
  passes_today:[{hero_name, manager_name, damage, ko}], waiting_on:[string],
  journal:[{hero_name, lines:[string]}],          // dernier jour, ≤ 8 lignes par passage
  lineage:{ base, hybrid|null, spec|null, choice:{step:'hybrid'|'spec', options:[{id,name,verb,identity,spells:[…],answers:[string],recommended:bool}]}|null,
            respec:{available:bool, reason:string|null, cost_gold:100} } }
```
`raidPreview` est appelé par l'UI à chaque tap (fonction pure, sans effet).

### 7.6 `raidDefaults` (passage automatique, déterministe)
2 tours : 1) si une zone de boss couvre la case → `move` vers la case sûre la plus proche (Dijkstra, hors `next_riposte`) ;
2) `cast` du sort de dégâts au meilleur ratio `power/cost_pa` jouable sur le boss (marque d'abord s'il est Rôdeur, soin
d'abord s'il est Clerc et qu'une invocation < 50 %) ; 3) `end_pass`. Mêmes règles pour les IA de profil.

### 7.7 Interface tactile (écran Raid, 400 px)
* Bandeau : nom du boss, barre de PV avec seuils de phase, « nuit 1/4 », badge « riposte suivante : souffle → 6 cases »
  avec bouton « voir » (surligne les cases).
* Grille 9×11 en Canvas (cases 40 px, un tap = une case) ; unités en glyphes de classe ; zones en aplats de couleur
  tokens (feu = alerte, poison = bon inversé, racines = atténué, case sûre = accent) ; télégraphe hachuré.
* Flux : **tap un sort** (barre en bas, coût en PA, grisé si injouable avec raison au tap long) → **portée surlignée**
  → **tap une case** → **aperçu** (zone colorée, dégâts min-max et effets par cible dans une bulle) → **Confirmer** ou
  tap ailleurs pour annuler. **Tap une case sans sort** → chemin et coût PM → **Confirmer**. Bouton « Terminer le
  passage » avec confirmation (« il te reste 3 PA »). Aucune annulation après confirmation (journal).
* Après `end_pass` : animation courte de la riposte, puis « Passage transmis » et retour au tableau vivant.
* Tableau vivant (widget) : « Sylvain 61 % · 2 copains ont joué · à toi » — la ligne `waiting_on`.
* Ce qui reste automatique : quêtes ordinaires (phase 7 V4), missions solo, adds, invocations, boss, passages non
  joués (`raidDefaults`), auto-défense V4 quand personne ne peut jouer.

---

## 8. Plan de construction en tranches vérifiables

| Tranche | Contenu | Preuve mécanique (banc, ENGINE_ONLY) | Gate fun (ce que Pierre doit ressentir) |
|---|---|---|---|
| T1 Grille + 6 bases + Sylvain | `tactic.js` (grille, PA/PM, LdV, formes, dégâts, états, riposte, nuit), `data.tactic_spells` des 6 bases, fiche Sylvain, `raidDefaults`, intégration 7b/11, journal | `test/tactic_t1_check.mjs` : (1) rejeu 30 graines × 30 jours identique au hash ; (2) invariants : entiers, hp ∈ [0,max], zones ≤ caps, LdV symétrique ; (3) 1 000 raids simulés (4 héros de bases variées, `raidDefaults`) : victoire en ≤ 2 nuits ∈ [55 %, 80 %], KO/passage ≤ 25 %, part de dégâts max par classe ≤ 45 %, sève non brûlée → victoire < 20 % (le besoin existe) | jouer un passage sur téléphone en < 2 min ; comprendre la riposte annoncée ; voir sur la grille ce qu'un copain a laissé (sanctuaire, marque, pièges) et s'en servir |
| T2 Hybrides + Drake + Hydre | 13 hybrides vague A (ressources, 2 sorts), fiches Drake/Hydre, choix J8 avec bandeau « besoins », option B d'affinité | `tactic_t2_check.mjs` : chaque ressource varie (≥ 2 valeurs distinctes sur 100 raids, ADR-002 : une métrique prouve sa variance) ; chaque mécanique hybride se déclenche ≥ 1 fois par raid en moyenne ; envol non ancré → victoire Drake < 25 % ; 3 gueules sans corps → KO/passage > 40 % ; hybrides ≤ 45 % de dégâts | expliquer en une phrase pourquoi son héros a cet hybride ; sentir que le Drake ne se joue pas comme le Sylvain |
| T3 Spés + Derby des Lames | 26 spés vague A, choix J20, reconversion (option B), raid de saison | `tactic_t3_check.mjs` : test de branche mécanisé : 30 scénarios scriptés (état de départ + objectif) ; chaque spé résout le sien en ≥ 25 % de tours de moins que sa sœur et son hybride nu ; sinon rapport « FUSION » automatique | choisir entre deux cartes sans hésiter longtemps mais en hésitant un peu ; le Derby des Lames donne envie de se coordonner (« qui garde la Bannière ? ») |
| T4 UI Raid + tableau vivant | écran Raid, aperçu, journal de passage, widget, chronique de siège (≥ 30 gabarits) | `ui_v5_check.mjs` (Chromium) : tap sort → aperçu → confirmer produit l'action attendue ; rejeu IDENTIQUE via l'UI ; 400 px sans défilement horizontal ; thèmes | « c'est là qu'on fait la différence » : la chronique du soir raconte le siège avec les prénoms des copains |
| T5 Calibrage + vague B | calibrage nuit/enrage/pools, décision vague B (G+M, V+I), morts/héritiers en raid | 30 graines complètes : 0 raid impossible, taux de chute ≤ 5 %, morts ≤ 8 % des héros (V4 : 5,1 %) | une saison entière avec 4 amis : au moins un dragon abattu, une défaite qui fait mal, une reconversion utile |

Rapport de fin de chaque tranche : software_verdict / evidence_verdict : MECHANICAL_VALIDATION_ONLY / claim_verdict :
NO_CLAIM_ALLOWED. Le gate fun est de Pierre seul.

---

## 9. Risques et coupes possibles

| Risque | Signal | Coupe / parade |
|---|---|---|
| Trop de contenu : 8 sorts + arme par héros à la spé, 26-30 spés, 4 fiches | T3 dépasse 2× T2 en effort | couper à 13 hybrides / 26 spés (déjà recommandé) ; réduire à 6 sorts (base 3 + hybride 2 + spé 1) si le tap-flow est lent |
| Le solo sur la grille ne fait pas « équipe » | au gate T1, Pierre ne remarque pas ce que les copains ont laissé | rendre les traces visibles ET nommées (« sanctuaire de Léa », « pièges de Marc ») ; forcer une trace par passage (le boss garde toujours un état) |
| Boss trop dur / trop mou selon le nombre de copains | victoire hors [55 %, 80 %] au banc | le facteur `(n+2)/6` est la première vis ; ensuite `night_regen_pct` et `enrage` |
| Contrôle du boss dégénéré (chaîne d'étourdissements) | part de passages sous contrôle > 45 % | `control_step_permille` 200 → 300 ; `etourdi` jamais consécutif (déjà) |
| Actions entre deux resolveDay = nouveau contrat de journal | rejeu divergent | `seq` obligatoire, passage atomique, `hashState` couvre `state.raid` ; banc T1 (1) |
| Écho de sort (Montreur), échange avec adds (Passe-muraille) : cas limites | bugs de cible | Montreur en vague B ; Grand échange limité aux non-boss, jamais sur `wall` |
| Corps 2×2 : LdV, poussée, chemins | anomalies aux bords | tests unitaires dédiés (LdV vers chaque case du corps, poussée contre bord/wall) ; coupe : boss 1×1 avec `mass 3` si T1 patine |
| Mort en raid trop fréquente | > 8 % de morts | `death_permille_raid` 150 → 100 ; KO = blessure seulement en vague T1 (mort réservée aux nuits ≥ 3) |
| Le joueur absent bloque la guilde | un héros déclaré `raid` sans passage | `raidDefaults` le soir (déjà) ; un passage non joué n'empêche jamais les autres (pas de tour de table) |
| Reconversion utilisée comme loadout | > 1 respec/héros/saison demandé | option B verrouille à une fois ; pas d'option C |
| UI mobile : 9×11 trop petit pour les doigts | erreurs de tap au gate T4 | cases 40 px + confirmation obligatoire ; coupe : 7×9 avec fiches recalibrées (`breath_len` 5, `roots cross 1`) |
| Le raid de saison (rivaux intelligents) coûte une IA | T3 déborde | rivaux = IA d'add (`nearest`/`weakest`) avec 2 règles de plus (le clerc soigne, le rôdeur va à la Bannière) ; pas de planification |

Coupes ordonnées si le budget manque : (1) vague B (déjà hors plan) · (2) Derby des Lames (garder le derby V4) ·
(3) affinité (option A à la place de B) · (4) Hydre (2 dragons tactiques, l'Hydre reste en auto-combat V4) ·
(5) portails/auras persistantes (garder marques, pièges, sanctuaires comme seules traces).
