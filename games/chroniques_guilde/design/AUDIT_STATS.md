# AUDIT DU SYSTÈME DE STATISTIQUES — « Chroniques de Guilde »

**Date : 2026-09-19.**
**Source :** mission « vérifie les statistiques, voir si le système correspond à un jeu de ce niveau »
(Pierre → orchestrateur → ce sous-agent). Audit **en lecture seule** du dossier de travail
`scratchpad/guilde` : `CONTRACT.md` (toutes sections), `sim.js`, `tactic.js`, `data.json`.
Aucun fichier du prototype n'a été modifié (`sim.js`, `tactic.js`, `data.json`, `data.js`,
`index.html`, les treize bancs : horodatages inchangés).

**Protocole de mesure.** Toutes les mesures marquées **[M]** proviennent de l'exécution du moteur
réel sous node 22, par des sondes jetables écrites dans `test/_a_*.mjs` et **supprimées après
mesure** (`_a_scale`, `_a_season`, `_a_marginal`, `_a_forced`, `_a_sweep`, `_a_heal`, `_a_train`,
`_a_rar`, `_a_share`, `_a_perf`, `_a_dead`, `_a_stack`, `_a_spec`, `_a_items`, `_a_prog`,
`_a_exp`, `_a_solo`). Les sondes n'appellent que l'API publique de `sim.js`/`tactic.js` et
`sim._internal.raidEnvOf / combatProfile / probeExpedition`. Les affirmations marquées **[L]**
sont déduites de la **lecture** du code et ne sont pas prouvées par exécution.
Graines : 1000 + 7 i. Configurations : soit le défaut de `newGame` (3 managers), soit les
6 managers du banc `season_t5_check`. Plans par défaut, aucun geste humain.
Contrôle de santé avant/après : `ENGINE_ONLY=1 node test/harness.mjs` → **10/10** [M].

---

## 1. L'échelle réelle

### 1.1 Attributs — théorique contre atteint

Formule (sim.js:152) : `base = start[a] + trunc(growth[a] × (niveau − 1) / 100)`, puis
`attrEff` ajoute `bonus_attrs`, `trained`, ±3 chance (Veinard), −2 vigueur (Fragile), et
borne à `[1, 60]`.

Valeurs **théoriques** de l'attribut primaire [M, calcul sur data.json] :

| classe | primaire | N1 | N10 | N20 |
|---|---|---|---|---|
| Guerrier | Force | 16 | 34 | 54 |
| Rôdeur | Adresse | 16 | 34 | 54 |
| Mage | Esprit | 16 | 34 | 54 |
| Clerc | Volonté | 16 | 34 | 54 |
| Voleur | Chance | 16 | 36 | 58 |
| Invocateur | Volonté | 16 | 34 | 54 |

Valeurs **réellement atteintes en saison** (30 graines × 30 jours, config par défaut, tous
héros vivants confondus) [M] :

| jour | attribut | min | p10 | méd. | p90 | max |
|---|---|---|---|---|---|---|
| J1 | tous | 5 | 5 | 8-12 | 15-20 | 20 |
| J10 | tous | 5 | 5 | 8-13 | 17-22 | 25 |
| J20 | tous | 5 | 6 | 9-14 | 20-25 | 30 |
| **J30** | **tous** | **5** | **6** | **10-16** | **23-28** | **37** |

**L'échelle déclarée (1-60, niveau 1-20) n'est utilisée qu'au tiers.** Niveau atteint au J30 :
min 3, médiane 6-7, **max 10** sur 359 héros [M]. Les entrées 11 à 20 de `xp_table`, la borne
`attr_max 60`, la borne `trained_max 10` ne sont **jamais** approchées.

### 1.2 Grandeurs dérivées — plage effectivement atteinte au J30 [M]

| grandeur | formule (sim.js:391-410) | min | p10 | méd. | p90 | max | amplitude |
|---|---|---|---|---|---|---|---|
| PV | `pct(pct(20+3×vig+2×niv, perf), 100+endurance) + objets` | 52 | 72 | 97 | 127 | 161 | ×3,1 |
| ATQ | `pct(attackBase, perf) + objets` | 27 | 43 | 71 | 91 | 121 | ×4,5 |
| DÉF | `vigueur + trunc(force/2) + objets` | 12 | 18 | 26 | 41 | 52 | ×4,3 |
| VIT | `7 + trunc(niv/2) + trunc(adresse/8) + objets` | 8 | 10 | 11 | 14 | 17 | ×2,1 |
| CRIT ‰ | `min(400, 30+5×chance) + objets + tir précis` | 65 | 75 | 155 | 225 | 350 | ×5,4 |
| SOIN | `pct(2×volonté + esprit, perf) + objets` | 20 | 27 | 39 | 84 | 97 | ×4,9 |
| Puissance de travail | `trunc((10+attr)×(100+affinité)/100)` ×perf ×(100+forge) | 20 | — | ~28 | — | 45 | ×2,3 |

**Écart entre le meilleur et le pire héros d'une même saison** (ATQ au J30, 30 graines) [M] :
ratio min 2,02 · **médiane 2,56** · max 4,04. Exemple graine 1014 : 40 → 105.

**Verdict 1 : la plage n'est PAS écrasée, elle est TRONQUÉE.** L'amplitude utile (×2 à ×5 entre
le pire et le meilleur héros, ×4,5 sur l'attaque) est confortable pour un jeu de ce genre. Mais
elle est obtenue dans le **tiers bas** d'une échelle conçue pour aller trois fois plus loin.
Le jeu tourne avec des attributs à deux chiffres bas (5-37) là où le code prévoit 1-60.

---

## 2. La valeur marginale d'un point

### 2.1 La formule de dégâts (tactic.js:309-311)

```
raw = max(1, trunc(trunc(atk_eff × power/100) × variance/100))     variance ∈ [90,110]
dmg = trunc(raw² / (raw + def))
```

`raw²/(raw+def)` est **asymptotiquement linéaire** en `raw` dès que `raw ≫ def`. Comme
`def` du boss vaut 12 (Hydre), 15 (Sylvain) ou 34 (Drake) et que `raw` vaut 30-120, on est
déjà dans la zone linéaire : **la formule ne mange pas le signal** [M].

Dégâts d'un coup (power 100) contre le Sylvain (DÉF 15), espérance sur les 21 variances [M] :

| ATQ | dégâts | Δ(+1 ATQ) | Δ(+2 ATQ) | %/+1 ATQ | Δ(+5 % ATQ) | %/+5 % |
|---|---|---|---|---|---|---|
| 30 | 19,2 | +0,76 | +1,62 | +3,96 % | +0,76 | +3,96 % |
| 50 | 37,8 | +0,76 | +1,76 | +2,02 % | +1,76 | +4,67 % |
| 70 | 56,6 | +0,95 | +1,95 | +1,68 % | +2,95 | +5,22 % |
| 90 | 76,5 | +0,91 | +1,86 | +1,18 % | +3,76 | +4,92 % |
| 120 | 105,6 | +0,91 | +1,91 | +0,86 % | +5,91 | +5,59 % |

**+1 d'ATQ vaut ≈ +0,9 de dégâts.** Sur la plage ATQ 20→150, on compte **125 paliers de
dégâts entiers distincts** : la longueur moyenne d'un palier est de **1,04 point d'ATQ** [M].
Autrement dit, quasiment chaque point d'attaque déplace l'entier affiché. La résolution
arithmétique de la formule de dégâts est bonne.

### 2.2 Effet observable en raid tactique (bout en bout)

Raids forcés au J20, 24 graines × 3 dragons (60 raids exploitables), 6 managers, `raidDefaults`.
Observable : **part de la réserve du boss entamée au premier jour, en ‰**. Comparaison
**appariée** (même graine, même dragon) [M].

| perturbation (une seule grandeur) | part ‰ | Δ apparié ‰ | erreur-type | \|Δ\|/ET | séparable ? |
|---|---|---|---|---|---|
| référence | 610,2 | — | 32,6 (écart entre raids : 252) | — | — |
| **ATQ +1 % ** | **610,2** | **0,00 (écart-type 0,00)** | — | — | **NON — strictement nul** |
| ATQ +2 % | 616,8 | +6,60 | 2,83 | 2,3 | oui |
| ATQ +5 % | 629,8 | +19,63 | 7,04 | 2,8 | oui |
| ATQ +10 % | 647,2 | +37,09 | 9,61 | 3,9 | oui |
| ATQ +20 % | 696,0 | +85,84 | 13,65 | 6,3 | oui |
| ATQ +50 % | 803,2 | +193,09 | 19,11 | 10,1 | oui |
| ATQ +1 (plat) | 620,0 | +9,84 | 2,96 | 3,3 | oui |
| ATQ +2 (= +1 attribut primaire) | 629,1 | +18,99 | 5,45 | 3,5 | oui |
| ATQ +5 (plat) | 638,9 | +28,70 | 9,56 | 3,0 | oui |
| ATQ +20 (plat) | 765,6 | +155,45 | 17,83 | 8,7 | oui |

| perturbation défensive | KO / passage | dégâts J1 ‰ |
|---|---|---|
| référence | 6,60 % | 610,2 |
| DÉF +1 | **6,60 %** | 609,8 |
| DÉF +2 | 6,27 % | 611,8 |
| DÉF +5 | 5,94 % | 614,5 |
| DÉF +10 | 4,95 % | 614,2 |
| DÉF +20 | 3,96 % | 618,1 |
| DÉF +40 | 3,63 % | 617,9 |
| PV +2 % | **6,60 %** | 610,4 |
| PV +10 % | 5,94 % | 614,8 |
| PV +30 % | 3,96 % | 618,7 |
| PV +100 % | 0,66 % | 624,9 |
| CRIT +25 ‰ | 6,60 % | 617,7 |
| CRIT +100 ‰ | 6,62 % | 622,3 |
| CRIT +250 ‰ | 6,64 % | 645,2 |

### 2.3 Effet observable en expédition (résolution automatique)

Sonde pure `probeExpedition`, 60 états × 3 quêtes × 6 graines de sonde = **1080 expéditions**
par cas. On modifie `bonus_attrs` de TOUS les héros, une grandeur à la fois. Erreur-type
binomiale du taux de succès ≈ 1,1 point [M].

| cas | succès % | PV restants % | KO % |
|---|---|---|---|
| référence | 84,72 | 76,58 | 9,81 |
| +1 Force | 85,00 | 77,28 | 9,30 |
| +1 Adresse | 84,44 | 77,17 | 10,02 |
| +1 Esprit | 85,37 | 76,65 | 9,91 |
| +1 Vigueur | 86,20 | 77,57 | 9,14 |
| +1 Volonté | 84,72 | 76,72 | 9,91 |
| +1 Chance | 84,72 | 76,44 | 9,99 |
| **+5 Force** | 87,69 | 79,53 | 7,34 |
| **+5 Adresse** | 87,22 | 80,33 | 7,18 |
| +5 Esprit | 85,65 | 76,54 | 9,91 |
| **+5 Vigueur** | 90,28 | 81,97 | 5,53 |
| +5 Volonté | 84,63 | 77,02 | 9,89 |
| +5 Chance | 85,37 | 76,83 | 9,65 |
| **+1 niveau** | 89,17 | 81,59 | 6,22 |
| moral à 100 | 84,81 | 76,50 | 9,94 |
| forme à 100 | 86,02 | 78,15 | 8,75 |

### 2.4 Effet observable en mission solo

`soloAptitude` (sim.js:2730) : `pct(niveau×5 + primaire + secondaire + 4×savoir-faire (+6/+3/−3), perf)`,
puis `+ jet(0..29) ≥ solo_dc[difficulté]`. Le jet est **uniforme sur 30 valeurs**, donc
**+1 d'aptitude = +3,33 points de pourcentage de réussite** — à condition d'être dans la bande.
Mesure sur 11 448 couples héros × mission (20 graines, tous les cinq jours) [M] :
marge médiane **−1**, p10 −45, p90 +42 ; **60,1 % des couples sont dans la bande où le jet
décide**, 19,1 % sont en réussite certaine, 20,8 % en échec certain.

### 2.5 Conclusion du point 2

**Un point d'attribut se voit — mais seulement là où il n'est pas noyé.**

| lieu | +1 attribut primaire | verdict |
|---|---|---|
| mission solo | +3,3 pp de réussite (60 % des cas) | **très visible** |
| dégâts d'un coup en raid | +2 ATQ ⇒ +1,7 % de dégâts | **visible mais fin** |
| journée de raid complète | +19 ‰ sur 610 ‰ = +3,1 % | **visible (\|Δ\|/ET = 3,5)** |
| expédition | +0,3 à +1,5 pp de succès | **sous le bruit** |
| PV / DÉF | +3 PV (vigueur) / +1 DÉF | **invisible sur une journée** |

**Un bonus de cinq pour cent se voit — sauf sur les petites valeurs.**
`pct(x, 105)` ne change `x` que si `x ≥ 20`. Sur l'ATQ (27-121) c'est vérifié ; sur la
puissance d'entraînement (opérande 4 ou 12) c'est faux (§3).
**Un bonus de UN pour cent ne se voit jamais** : mesuré strictement nul, écart-type 0,00,
sur 60 raids [M] — parce que `pct(x, 101) = x` pour tout `x < 100`, et qu'aucun héros
n'atteint ATQ 100 au J20 (médiane 57).

---

## 3. Les zones mortes de l'arithmétique entière

### 3.1 La règle

`pct(x, 100+b) = trunc(x × (100+b) / 100)` ne change `x` que si **`x × b ≥ 100`**, donc :

> **bonus minimal visible (%) = plafond(100 / x)**

| valeur x | 1 | 2 | 4 | 5 | 8 | 10 | 15 | 20 | 30 | 50 | 100 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| bonus min visible | 100 % | 50 % | 25 % | 20 % | 13 % | 10 % | 7 % | 5 % | 4 % | 2 % | 1 % |

### 3.2 Les zones mortes RÉELLES trouvées, avec le calcul

**(D1) L'entraînement — la zone morte la plus grave.** `trainSlotRun` (sim.js:1357-1370) :

```
tp = tp_base[niveau du terrain]            // [4, 12, 16, 20, 24]
tp = pct(tp, 120) si attribut primaire
tp = pct(tp,  80) si attribut « dump »
tp = pct(tp, 125) si Appliqué · pct(tp, 70) si Paresseux
tp = pct(tp, 120) si < 6 saisons · pct(tp, 50) si ≥ 12 saisons
tp += 2 si Sanguin
tp = max(1, trunc(tp / 3))                 // slot_divisor = 3
```

Table complète après la division par 3 [M] :

| niv. terrain | tp_base | normal | primaire +20 % | dump −20 % | Appliqué +25 % | Paresseux −30 % | jeune +20 % | vieux −50 % |
|---|---|---|---|---|---|---|---|---|
| **0** | 4 | **1** | **1** | **1** | **1** | **1** | **1** | **1** |
| **1** | 12 | **4** | **4** | 3 | 5 | 2 | **4** | 2 |
| 2 | 16 | 5 | 6 | 4 | 6 | 3 | 6 | 2 |
| 3 | 20 | 6 | 8 | 5 | 8 | 4 | 8 | 3 |
| 4 | 24 | 8 | 9 | 6 | 10 | 5 | 9 | 4 |

Niveau du terrain d'entraînement au J30, mesuré sur 24 saisons : **min 0, médiane 1, max 1,
moyenne 0,83** [M]. Le jeu ne dépasse donc **jamais** les deux lignes où le bonus « attribut
primaire » est **exactement nul**, et où au niveau 0 **les sept modificateurs donnent tous 1**.

Conséquence mesurée : points d'attribut gagnés à l'entraînement par héros sur une saison
entière de 30 jours — **médiane 0, moyenne 0,25, max 2** (359 héros, 30 graines) [M].
Seuil du premier point : 20 `tp`, soit ~7 jours de créneaux à 3 `tp`/jour ; second point : 30 `tp`.
**Le système d'entraînement, qui est l'un des deux leviers quotidiens du joueur-manager,
ne produit presque rien.**

**(D2) Le bonus de +1 % — nul par construction.** Mesuré : Δ apparié **0,00 ‰, écart-type
0,00** sur 60 raids [M]. Tout bonus déclaré à 1 % dans une fiche future serait décoratif
tant que l'ATQ reste sous 100.

**(D3) La performance est plafonnée et le moral sature.** `perfPct` (sim.js:159) :
`clamp(50 + 2×forme/5 + moral/5 − 3×max(0,fatigue−50)/5, 20, 110)`. À forme 100 et moral 100,
le terme vaut exactement 110 : **le plafond est la valeur maximale naturelle**.
Mesure de la saturation (30 graines, config par défaut) [M] :

| jour | forme moy. | moral moy. | % héros à moral 100 | % héros à forme 100 |
|---|---|---|---|---|
| J1 | 50 | 60 | 0 % | 0 % |
| J5 | 66,2 | 85,8 | 44,6 % | 0 % |
| J10 | 86,3 | 95,3 | 70,8 % | 11,4 % |
| J15 | 95,9 | 98,8 | 88,1 % | 48,6 % |
| J20 | 98,7 | 98,9 | 92,5 % | 62,4 % |
| **J30** | **99,5** | **99,1** | **92,8 %** | **75,8 %** |

À partir du jour ~8, plus de 60 % des héros sont à moral 100. Or `h.morale = clamp(h.morale + mor, …, 100)`
(sim.js:2924). Donc **chapelle (+1 moral/jour), décorations (+1 à +3 moral/jour), trait Jovial
(+1 aux copains) sont morts sur les deux tiers de la saison** [M + L].
Répartition du moral dans les trois paliers de `moraleMod` au J30 : **357 héros sur 359 dans
le palier « ≥ 70 → ×105 »** [M]. `moraleMod` est une fonction en escalier à trois valeurs dont
**une seule est utilisée** en pratique.

**(D4) Le seuil de points de mouvement de l'Adresse est hors de portée.**
`heroUnitOf` (tactic.js:2391) : `if (dexterity >= raid.pm_dex_threshold) pm += 1`, seuil **30**.
Adresse mesurée au J30 : min 7, **médiane 11**, p90 26, **max 30**. Héros atteignant le seuil :
**3 sur 144 = 2,1 %** [M]. C'est le seul usage de l'Adresse dans le raid tactique : pour
98 % des héros, l'Adresse **n'a aucun effet sur la grille**.

**(D5) Le bonus d'affinité de voie (+1 ressource) vaut de 50 % à 1,7 % selon la voie.**
`lineage.affinity_resource_bonus = 1`, appliqué à l'identique à toutes les voies (tactic.js:2400) [L+M] :

| voie | ressource | max | part du +1 |
|---|---|---|---|
| Oracle / Illusionniste / Tisse-vent | prophétie / doubles / souffle | 2 | **50 %** |
| Capitaine / Spirite / Traqueur / Dresseur / Conjurateur | — | 3 | 33 % |
| Chasseur de monstres | traque | 4 | 25 % |
| Paladin | ferveur | 5 | 20 % |
| Duelliste / Ermite | riposte / sentiers | 6 | 17 % |
| **Inquisiteur** | **stigmate** | **60** | **1,7 %** |

Le même « bonus d'affinité » offre la moitié de la jauge à l'Oracle et **rien** à l'Inquisiteur.

**(D6) Le bouclier de muraille du village.** `wall_shield_pct = trunc(defense × 50 / 100)`,
puis `pct(hp_max, wall_shield_pct)` [M] :

| âge | défense | % muraille | bouclier sur 90 PV | sur 160 PV |
|---|---|---|---|---|
| Campement | 0 | 0 % | 0 | 0 |
| Hameau | 10 | 5 % | 4 | 8 |
| Bourg | 25 | 12 % | 10 | 19 |
| Ville | 45 | 22 % | 19 | 35 |
| Château | 70 | 35 % | 31 | 56 |

Le premier âge (Hameau) donne **4 points de bouclier** sur un héros à 90 PV — un tiers d'un
coup de fouet. Il est à la limite du perceptible ; les deux derniers âges comptent vraiment.

**(D7) Les petits sorts contre une grosse garde.** `rawOf` puis `dmgOf` sur un héros faible
(ATQ 30, perf 90, moral < 70, fatigue ≥ 60) avec un sort à `power 50` contre le Drake (DÉF 34) :
`raw = 12`, `dmg = trunc(144/46) = 3`, valeur exacte 2,66 → écart de troncature **24,8 %** [M].
Le garde-fou `Math.max(1, …)` empêche le zéro mais pas l'écrasement.

**(D8) Bonus déclarés qui NE PRODUISENT AUCUN CHANGEMENT MESURABLE — liste** (détail au §4.3) :
VIT (vitesse) en raid · SOIN en raid · `magic` d'objet pour tout héros non-Mage · `fire`
d'objet en raid · fioles en raid · `dodge` / `hit_bonus` en raid · trait Loyal (partout) ·
trait Héritier (partout) · rareté de héros au-delà de « commun » (quasi jamais tirée) ·
« +20 % attribut primaire » à l'entraînement · moral au-delà de 100 · tout bonus à +1 %.

---

## 4. Inventaire complet des buffs, passifs et malus

### 4.1 Ce qui atteint réellement le combat tactique

`sim.js:raidEnvOf` (ligne 205-211) transmet à `tactic.js` exactement :
`hp_max, atk, def, heal, crit, spd, magic, morale, fatigue, dexterity, vigor, traits,
injury_severity, level, class_id, hybrid, spec, hybrid_bonus, gender` [L].
`tactic.js:heroUnitOf` (ligne 2388) **consomme** : `hp_max`, `atk` (→ `atk_eff`), `def`, `crit`,
`dexterity` (seuil PM 30), `vigor` (PV du golem), `traits` (uniquement `endurant`),
`morale`/`fatigue` (deux escaliers à 3 valeurs). **`spd` est copié puis jamais relu**
(`unitsOrderS` exclut explicitement `kind === 'hero'`, tactic.js:2082) [L].
**Ne sont PAS transmis** : `dodge`, `hit_bonus`, `priority`, `presence`, `skills`, `potion`,
`fire`, `xp_pct` [L].

### 4.2 Groupe 1 — CEUX QUI COMPTENT (effet mesuré)

| source | forme | magnitude | effet mesuré |
|---|---|---|---|
| Niveau de héros | plat (attributs) | +2 primaire / niveau | **+9,2 % de dégâts de guilde pour +5 niveaux** ; +4,5 pp de succès d'expédition pour +1 niveau [M] |
| Objets — ATQ | plat | +2 à +22 | ATQ +22 (légendaire) = **+155 ‰ de réserve entamée** (+25 %) [M]. Part des objets dans l'ATQ au J30 : médiane 8 %, max 46 % [M] |
| Objets — PV | plat | +4 à +60 | PV +30 % ⇒ KO/passage 6,6 → 4,0 % [M] |
| Objets — DÉF | plat | +2 à +18 | DÉF +20 ⇒ KO/passage 6,6 → 4,0 % [M]. Part des objets dans la DÉF : médiane 15 % [M] |
| Objets — CRIT | plat ‰ | +30 à +160 ‰ | +100 ‰ ⇒ +12 ‰ de dégâts (+2 %) ; +250 ‰ ⇒ +35 ‰ (+5,7 %) [M] |
| Moral (palier bas) | ×90/×100/×105 | 3 valeurs | **moral 0 ⇒ −20,6 % de dégâts de guilde** [M] |
| Fatigue | ×100/×90/×75 + tours de passage 3→2 | 3 valeurs | **fatigue 0 ⇒ +7,4 % de dégâts** [M] |
| Savoir-faire Endurance | +3 % PV / niveau | niveau 1-5 atteint (méd. 3) | niveau 10 (+27 % PV) ⇒ +3,5 pp de succès d'expédition, KO 9,8 → 6,9 % [M] |
| Savoir-faire Herboristerie | +4 % récolte / niveau | méd. 2 | opérande 20-50 ⇒ +4 % visible [M, arithmétique] |
| Savoir-faire Forge | +5 % travail / niveau | méd. 1 | opérande 20-45 ⇒ visible dès le niveau 2 [M, arithmétique] |
| Savoir-faire Érudition | +3 % XP / niveau | méd. 1 | opérande XP 38-310 ⇒ visible [M, arithmétique] |
| Âges du village (Ville, Château) | % de PV en bouclier | 22 % / 35 % | 19 à 56 points de bouclier par passage [M] |
| Trait Endurant | +1 PA, +1 PM | plat | le seul trait qui touche la grille [L] |
| Trait Veinard / Fragile | +3 chance / −2 vigueur | plat | +15 ‰ crit / −6 PV [L] |
| Les 13 voies | sorts + mécanique | — | **part de réserve entamée : 457 à 618 ‰** contre 582 ‰ pour les classes nues (30 raids par voie) [M] |
| Les 26 spécialisations | sorts signature | — | **328 à 671 ‰** (amplitude ×2,05) [M] |
| État `marque` | ×120 dégâts subis | — | sur dégâts 8-90 ⇒ visible dès 5 points de dégâts [M] |
| État `chancelant` | ×130 + DÉF/2 | — | très visible [L] |
| Fissure (Chasseur de monstres) | −5 DÉF, cap 4 | plat | −20 DÉF sur un Drake à 34 ⇒ +≈20 % de dégâts [M, arithmétique] |
| Passive Curée (Assassin) | 60 % + 13 %/dixième perdu | % | 60 % → 190 % de ses dégâts selon les PV manquants. Mesuré : **+34 ‰ contre la voie nue sur le seul Sylvain** (4 graines) mais **−41 ‰ en moyenne sur les trois dragons** (10 graines) — la passive **coûte** plus qu'elle ne rend contre un boss qu'on n'entame pas assez [M] |

### 4.3 Groupe 3 — CEUX QUI NE FONT RIEN (effet mesuré NUL)

| source | où c'est écrit | preuve |
|---|---|---|
| **VIT (vitesse)** en raid | `tactic.js:2396` copie `spd`, `unitsOrderS` (2082) exclut les héros | **VIT +5 et VIT +100 donnent un résultat identique au bit près** : 733,5 ‰, 1,45 nuit, 7,5 % KO, 28,1 soins — exactement comme la référence [M] |
| **SOIN** en raid | `tactic.js:1607` `heal` | **SOIN +5 et SOIN +100 : résultat identique au bit près** à la référence [M]. Cause : un seul héros à la fois sur la grille, il y entre à **pleins PV** ; `healing_prayer` n'est lancé que 5 fois sur 13 raids et soigne le lanceur ou un golem ; 228 PV de soin au total sur 13 raids [M] |
| **`magic` des objets** pour un non-Mage | `sim.js:399` `h.class_id === 'mage' ? it.magic : 0` | **37 héros sur 144 portent un objet à stat `magic` entièrement perdue** (227 points gaspillés) [M]. L'interface affiche pourtant « MAG » (sim.js:3274) |
| **`fire` des objets** en raid | `sim.js:406` le calcule, `raidEnvOf` ne le transmet pas | 3 objets concernés (`w_glaive_braise`, `w_croc_drake`, `t_amulette_braise`) [L] |
| **Les 6 fioles** en raid | `p.potion` non transmis | `c_potion_soin`, `c_antidote`, `c_elixir_force`, `c_elixir_pierre`, `c_baume`, `c_ration` : **6 objets sur 47 entièrement morts en raid** [M] |
| **Esquive / toucher** en raid | `dodge` et `hit_bonus` non transmis | savoir-faire **Archerie** (+1/+2 toucher) et **Discrétion** (+5/+8 ‰ esquive) : aucun effet sur la grille. En expédition : archerie niveau 5 ⇒ +0,6 pp (sous le bruit) ; discrétion niveau 5 ⇒ +1,8 pp (limite) [M] |
| **Compétences de classe** en raid | `p.skills` non transmis | Provocation, Rempart, Frappe brisante, Pistage, Volée, Emprise de givre, Tempête, Bénédiction, Souffle ultime, Crochetage, Doigts de fée, Nuée, Sacrifice : elles ne servent **qu'en expédition** ; le raid utilise `tactic_spells` [L]. Seul `precise_shot` passe, via `+100 ‰` dans `crit` |
| **Trait Loyal** | — | **0 occurrence** dans `sim.js` + `tactic.js` : uniquement un jeton d'affinité pour 3 voies [M, grep] |
| **Trait Héritier** | `sim.js:2855` | posé, **jamais relu** : pur décor [M, grep] |
| **Rareté de héros** au-dessus de « commun » | `genBonusAttrs` (sim.js:474) : +2/+4/+6 primaire | mesuré sur 359 héros au J30 : **354 communs, 5 peu communs, 0 rare, 0 légendaire**. `bonus_attrs` non nul pour **5 héros sur 359** [M] |
| **« +20 % attribut primaire » à l'entraînement** | `sim.js:1363` | identique à « normal » aux niveaux de terrain 0 et 1, les seuls atteints [M] |
| **Chapelle / décorations / trait Jovial** après J8 | `sim.js:2920-2924` | 92,8 % des héros à moral 100 au J30, clamp à 100 [M] |
| **Tout bonus de +1 %** | `pct(x,101)` | Δ apparié 0,00 ‰ sur 60 raids [M] |
| **Plafond de critique 400 ‰** | `sim.js:403` | atteint à 74 de chance ; chance max mesurée **37** [M] |
| **Plafond d'attribut 60, niveau 20, entraînement 10** | `data.constants` | jamais approchés (max mesurés 37 / 10 / 2) [M] |

### 4.4 Groupe 2 — À LA LIMITE DU PERCEPTIBLE

| source | magnitude | mesure |
|---|---|---|
| +1 attribut isolé, en expédition | +1 à +2 ATQ ou +3 PV | +0,3 à +1,5 pp de succès pour une erreur-type de 1,1 pp : **dans le bruit** [M] |
| +1 DÉF | plat | KO/passage 6,60 → **6,60 %** (aucun changement) ; dégâts J1 610,2 → 609,8 ‰ [M] |
| +2 % de PV | % | KO/passage inchangé (6,60 %) [M] |
| +25 ‰ de critique | ‰ | dégâts J1 +7,5 ‰ sur 610 (+1,2 %) [M] |
| Bouclier de muraille au Hameau | 5 % des PV | **4 points** sur 90 PV [M] |
| Bonus d'affinité de l'Inquisiteur | +1 stigmate sur 60 | 1,7 % de la jauge [M] |
| Savoir-faire Archerie / Discrétion | +1-2 toucher, +5-8 ‰ esquive | +0,6 / +1,8 pp en expédition ; nuls en raid [M] |
| Trait Appliqué / Paresseux à l'entraînement | ×125 / ×70 | identiques à « normal » au niveau 0 du terrain [M] |

**Invariant du studio appliqué.** Chaque valeur du groupe 3 est une valeur qui **prétend
classer ou calibrer sans prouver sa variance** : `spd`, `heal`, `magic`, `fire`, les six fioles,
`dodge`, `hit_bonus`, la rareté des héros, le +20 % primaire, la chapelle après J8. Elles
doivent être soit rebranchées, soit retirées des données et de l'affichage.

---

## 5. La résolution disponible pour régler

### 5.1 Combien de crans entre « négligeable » et « cassé » ?

Observable de référence : part de la réserve du boss entamée au premier jour (‰), 60 raids
appariés au J20. Référence 610 ‰. « Cassé » = 1000 ‰ (le dragon tombe en une journée).

| axe de réglage | plus petit cran séparable (mesuré) | borne « cassé » | **nombre de crans utilisables** |
|---|---|---|---|
| ATQ en points plats | **+1 ATQ** (Δ = +9,8 ‰, \|Δ\|/ET = 3,3) | ≈ +50 ATQ | **≈ 50** |
| ATQ en pourcentage | **+2 %** (Δ = +6,6 ‰, \|Δ\|/ET = 2,3) — +1 % est nul | ≈ +110 % | **≈ 55** |
| PV en pourcentage | +5 % (KO 6,6 → 5,9 %) ; +2 % nul | +100 % (KO 0,7 %) | **≈ 20** |
| DÉF en points plats | **+2** (KO 6,6 → 6,3 %) ; +1 nul | +40 (saturé) | **≈ 20** |
| CRIT en ‰ | +50 ‰ | +400 ‰ | **≈ 8** |
| Attribut primaire | **+1** (= +2 ATQ, Δ = +19 ‰) | +25 | **≈ 25** |
| Dégâts d'un coup (arithmétique pure) | +1 ATQ = 1 palier entier (1,04 pt/palier) | — | **125 paliers sur ATQ 20→150** |
| Puissance d'entraînement | **aucun** aux niveaux de terrain 0-1 | — | **1 (un seul cran : « 1 »)** |
| Ressource de voie (jauge 2 à 60) | 1 point | la jauge | **2 à 60 selon la voie** |

### 5.2 Verdict du point 5

**La formule de dégâts offre largement de quoi régler : ≈ 50 crans sur l'attaque, 125 paliers
entiers de dégâts.** Ce n'est pas « trois ou quatre ». **La résolution arithmétique n'est pas
le problème.**

**Le problème est ailleurs : l'ÉCHELLE DES ATTRIBUTS est trop courte, et surtout personne ne
s'en sert pour différencier.** Sur une saison, un héros gagne **≈ 8 points d'attribut primaire**
(3 à 6 niveaux × 2) et **0,25 point d'entraînement**. Un objet commun (+6 ATQ) vaut **3 points
d'attribut**, soit 1,5 niveau ; un légendaire (+22 ATQ) vaut **11 points**, soit 5,5 niveaux —
**plus que toute la progression de niveau d'une saison**. Le butin écrase la montée en niveau,
et l'entraînement ne pèse rien.

---

## 6. Saturation et empilement

### 6.1 Comment les bonus se cumulent

| étage | mode de cumul | preuve |
|---|---|---|
| attributs (niveau + rareté + entraînement + traits) | **additif**, puis borné à [1,60] | sim.js:155 [L] |
| attributs → ATQ | **linéaire** (×2 primaire + ×1 secondaire selon la classe) | sim.js:381 [L] |
| performance (forme/moral/fatigue) | **multiplicatif**, borné à 110 | sim.js:159 [L] |
| objets | **additifs et APRÈS la performance** — un objet n'est jamais multiplié par la forme | sim.js:399 [L] |
| moral et fatigue en raid | **deux multiplicateurs en escalier chaînés** (×105 puis ×100) | tactic.js:2396 [L] |
| puissance du sort | **multiplicatif** (`power` 50 à 224 %) | tactic.js:309 [L] |
| critique / défi / Curée / marque / chancelant | **multiplicatifs chaînés** (×150, ×130, ×60-190, ×120, ×130) | tactic.js:370-378 [L] |
| `reduction` | **soustraction plate**, plancher à 1 | tactic.js:318 [L] |
| bouclier | additif, **plafonné à `hp_max`** | tactic.js:486 [L] |
| ressource de voie | additive, **plafonnée à `resource_max`** | tactic.js:398 [L] |
| corps invoqués | **plafonnés** : 2 par héros, 4 par guilde, 3 pièges, 3 zones par héros | data.raid [L] |

### 6.2 Ce que la troncature mange quand on empile

Cinq bonus de +5 % chaînés (soit +27,6 % en exact) [M] :

| valeur de départ | 5 × pct(·,105) | exact | perte |
|---|---|---|---|
| 10 | **10** | 12,76 | **21,6 %** |
| 20 | 25 | 25,53 | 2,1 % |
| 30 | 35 | 38,29 | 8,6 % |
| 50 | 60 | 63,81 | 6,0 % |
| 80 | 100 | 102,10 | 2,1 % |
| 120 | 151 | 153,15 | 1,4 % |
| 200 | 254 | 255,26 | 0,5 % |

Un coup de héros traverse **jusqu'à 10 troncatures entières** (performance, moral, fatigue,
puissance, variance, division de mitigation, critique, défi, Curée, marque). Perte totale
mesurée sur des cas réalistes [M] : **1,4 % à 4,7 %** dans la plage normale ;
**24,8 %** sur un héros faible avec un sort à faible puissance contre une grosse garde.

### 6.3 Un héros qui cumule tout

Cumul voie + spécialisation + deux objets + trait + savoir-faire :

* **Il n'y a pas d'empilement qui casse l'équilibre.** Les caps (2/4 corps, 3 pièges,
  3 zones, 1 installation de voie + 1 de spé par passage, bouclier ≤ PV, ressource ≤ max)
  bornent proprement le cumul. Mesure : aucune spécialisation ne dépasse **671 ‰** de réserve
  entamée au premier jour contre 582 ‰ pour les classes nues, soit **+15 %** [M] — loin
  d'une rupture.
* **Il y a en revanche des plafonds qui rendent les derniers bonus inutiles** : moral et forme
  à 100 (atteints par 93 % / 76 % des héros au J30), performance à 110, critique 400 ‰ jamais
  atteint, attribut 60 jamais atteint, niveau 20 jamais atteint, entraînement 10 jamais atteint.
* **Et un plancher qui écrase les premiers** : `max(1, trunc(tp/3))` à l'entraînement.

---

## 7. Comparaison avec l'ambition

**Ambition : trois étages de progression sur trente jours, rôles nettement différenciés
en combat tactique.**

### 7.1 Les trois étages, mesurés

Raid forcé sur le Sylvain, 20 graines, 6 managers, à six moments de la saison [M] :

| jour | niveau moyen | ATQ moyenne | % voie | % spé | dégâts J1 | réserve du boss | part ‰ |
|---|---|---|---|---|---|---|---|
| J8 (classes nues) | 2,98 | 41,5 | 0 % | 0 % | 354 | 922 | **384** |
| J12 (voies acquises) | 3,44 | 49,8 | 100 % | 0 % | 568 | 997 | **569** |
| J16 | 4,09 | 54,7 | 100 % | 0 % | 639 | 1072 | **596** |
| J20 | 4,81 | 57,1 | 100 % | 0 % | 745 | 1146 | **650** |
| **J24 (spés acquises)** | **5,51** | **62,1** | 100 % | **100 %** | 628 | 1221 | **514** |
| J28 | 6,08 | 64,4 | 99 % | 99 % | 723 | 1296 | **558** |

* **Étage 1 → 2 (classe → voie) : très net.** 384 ‰ → 569 ‰, **+48 %** en quatre jours.
* **Étage 2 → 3 (voie → spécialisation) : invisible, voire négatif.** 650 ‰ au J20 → 514 ‰
  au J24. Mesure appariée confirmatoire : sur 26 spécialisations jouées par toute la table,
  **18 sur 26 font MOINS de dégâts que leur voie nue** ; la meilleure (Écorcheur, +53 ‰) et
  la pire (Bourrasque, −209 ‰) [M]. La spécialisation change la **forme** du jeu, pas la
  **puissance**.
* **La courbe de puissance de la guilde est plate, celle du boss ne l'est pas.** ATQ moyenne
  41,5 → 64,4 (×1,55) pendant que la réserve du boss passe de 922 à 1296 (×1,41) — le contrat
  V5 T5 §2 le dit déjà ; cette mesure indépendante le confirme.

### 7.2 Les rôles sont-ils différenciés ?

**Oui, et fortement — mais par les SORTS, pas par les statistiques.** Mesure sur 30 raids par
configuration (10 graines × 3 dragons, J20, toute la table portant la même voie/spé) [M] :

| population | plage de « part de réserve entamée au J1 » | amplitude |
|---|---|---|
| classes de base (référence) | 582 ‰ | — |
| 13 voies | 457 → 618 ‰ | ×1,35 |
| **26 spécialisations** | **328 → 671 ‰** | **×2,05** |
| à comparer : ATQ +50 % sur tout le monde | 610 → 803 ‰ | ×1,32 |

**Une spécialisation déplace le résultat deux fois plus qu'un bonus d'attaque de +50 %.**
C'est la bonne nouvelle de cet audit : le système de différenciation **ne repose pas** sur les
statistiques et **n'en a pas besoin**. 24 des 26 spécialisations n'ont **aucune** passive
chiffrée (`specs[*].passive = null`) — seuls le Bretteur et l'Assassin en ont une.

### 7.3 Verdict du point 7 — direct

**Le système de statistiques NE DOIT PAS être refondé. Il n'est pas le porteur de la
différenciation, et il n'a jamais été conçu pour l'être.** Les treize voies et les
vingt-six spécialisations se distinguent par des verbes, des zones, des corps posés, des
ripostes détournées — pas par des chiffres. La preuve mécanique est faite : ×2,05 d'amplitude
sur l'observable, contre ×1,32 pour un bonus d'attaque massif.

**En revanche, trois sous-systèmes de la couche « manager » sont cassés ou morts, et ce sont
justement ceux que Pierre appelle « buffs et passifs » :**

1. **L'entraînement ne produit rien** (0,25 point d'attribut par héros et par saison).
2. **Le moral sature au jour 8** et rend inutiles chapelle, décorations et trait Jovial.
3. **Sept statistiques transmises ou affichées ne font rien en raid** (VIT, SOIN, MAG hors
   Mage, feu, fioles, esquive, toucher).

Et **le troisième étage de progression (la spécialisation) n'ajoute pas de puissance**, ce qui
est défendable en conception mais doit être une décision consciente, pas un accident.

---

## 8. Recommandation

### 8.1 Faut-il démultiplier l'échelle interne ?

**Non.** La mesure ne le justifie pas :

* la formule de dégâts donne **125 paliers entiers** sur la plage d'ATQ utilisée [M] ;
* **+1 point d'ATQ est statistiquement séparable** en bout de chaîne (\|Δ\|/ET = 3,3 sur
  60 raids) [M] ;
* le plus petit bonus en pourcentage qui survive est **2 %**, ce qui laisse **≈ 55 crans** ;
* le vrai levier de différenciation (voies et spés) a une amplitude de ×2,05, très au-dessus
  de tout ce qu'un réglage chiffré pourrait apporter.

Démultiplier l'échelle (×10 en interne, affichage ÷10, comme le permille pour les
probabilités) coûterait : réécriture de `combatProfile`, `attackBase`, `attrEff`, `rawOf`,
`dmgOf`, `defEff`, toutes les fiches `data.json` (attributs de classe, objets, dragons,
103 sorts, 26 passives), le `hp_base`/`hp_per_day` des quatre raids, et **rendrait faux tous
les calibrages chiffrés des treize bancs** (`season_t5_check` verrouille des bornes mesurées ;
`tactic_t1/t2/t3_check` verrouillent des taux de victoire et des dégâts). C'est un coût de
tranche entière pour un gain que la mesure ne montre pas. **Non — ni maintenant, ni jamais,
tant que la différenciation passe par les sorts.**

### 8.2 Ce qu'il faut corriger à la place, par ordre de rendement

**(R1) Réparer l'entraînement — le plus rentable, le moins risqué.**
Fichiers : `data.json` (`constants.tp_base`, `constants.tp_threshold_base/step`) et rien d'autre.
Le défaut est arithmétique : `tp_base[0] = 4` et `tp_base[1] = 12` passent par
`max(1, trunc(tp/3))`, ce qui écrase les sept modificateurs. **Correctif proposé : multiplier
`tp_base` par 10 (`[40, 120, 160, 200, 240]`) et les seuils par 10
(`tp_threshold_base 200`, `tp_threshold_step 100`)** — même vitesse de progression, mais les
modificateurs ×120 / ×80 / ×125 / ×70 / ×50 redeviennent tous distincts et le terrain
d'entraînement se met à compter. C'est exactement le remède « échelle démultipliée en interne »
que Pierre évoque, appliqué **au seul endroit où la mesure le réclame**.
*Ce que ça casse :* rien dans les dégâts ni dans les raids ; `ui_v2/v3/v4_check` peuvent lire
un libellé de points d'entraînement, à revérifier. `season_t5_check` peut bouger à la marge
(héros légèrement plus forts) — à remesurer, les bornes sont larges.
**À faire maintenant.**

**(R2) Décider du sort des sept statistiques mortes.**
Deux options par statistique, aucune intermédiaire :
* **VIT** : soit la brancher (ordre d'initiative des héros, ou un PM de plus au-dessus d'un
  seuil ATTEIGNABLE), soit la retirer des objets et de la fiche. Aujourd'hui `w_arc_chasse`,
  `w_masse`, `a_cotte_fer`, `w_dague_hydre`, `a_manteau_marais`, `a_plates_ecailles`,
  `t_croc_loup`, `a_cotte_acier`, `a_plates_cendre` affichent un chiffre qui ment.
* **SOIN** : il ne peut pas compter tant qu'un seul héros est sur la grille à la fois et qu'il
  y entre à pleins PV. Le rebrancher voudrait dire : soigner les **corps posés** (invocations,
  recrues, bête) et **reporter les PV manquants d'un passage au suivant**. C'est une décision
  de conception, pas une correction — elle appartient à Pierre.
* **`magic` d'objet hors Mage** : le plus simple est de le faire compter pour toute classe
  dont l'attaque est bâtie sur Esprit ou Volonté (Mage, Clerc, Invocateur), c'est-à-dire
  remplacer `h.class_id === 'mage'` par un test sur `attackBase`. **37 héros sur 144 portent
  aujourd'hui un chiffre perdu.**
* **`fire`, fioles, esquive, toucher** : ils vivent en expédition. Le choix honnête est de le
  **dire dans l'interface** (« en expédition seulement ») plutôt que de les rebrancher.
* **Traits Loyal et Héritier** : ou bien on leur donne un effet, ou bien on assume qu'ils sont
  du décor et on l'écrit dans le contrat.
Fichiers : `sim.js` (`combatProfile`, `raidEnvOf`), `tactic.js` (`heroUnitOf`), `data.json`
(fiches d'objet), `index.html` (libellés). *Casse potentielle :* `ui_v2_check` et `ui_v4_check`
vérifient des libellés de statistiques d'objet. **À faire avant l'habillage final, pas avant.**

**(R3) Sortir le moral de sa saturation.**
Le moral atteint 100 chez 93 % des héros dès le milieu de saison ; la chapelle, les dix
décorations et le trait Jovial deviennent gratuits. Correctif le moins coûteux :
**abaisser le gain quotidien passif** (ou augmenter l'usure du soir) pour que le moral se
gagne et se perde toute la saison, et **utiliser les trois paliers de `moraleMod`** au lieu
d'un seul (357 héros sur 359 sont dans le palier haut). Fichiers : `data.json`
(`activity_deltas`, `chapel_morale`, `decoration_morale_cap`), `sim.js` (phase du soir).
*Casse :* `season_t5_check` (bornes de saison) et `engine_v4_check` sont à remesurer.
**À faire dans la même tranche que R1, sinon le levier « manager » reste creux.**

**(R4) Donner au seuil de PM une valeur atteignable.**
`raid.pm_dex_threshold = 30` est franchi par **2,1 % des héros**. À 20, il serait franchi par
environ un quart d'entre eux (adresse p90 = 26 au J30) et l'Adresse deviendrait un attribut
qui compte sur la grille. Un seul entier à changer dans `data.json`.
*Casse :* `tactic_t1/t2/t3_check` et `season_t5_check` — les héros gagnent un PM, les taux de
victoire montent ; à remesurer. **Attention : mesuré ici, forcer l'adresse à 30 pour tous
DÉGRADE le résultat (681 ‰ contre 610 ‰ de référence) parce que la politique par défaut
utilise le PM supplémentaire pour se déplacer au lieu de frapper. Le seuil ne doit donc pas
être abaissé sans retoucher `raidDefaults`.**

**(R5) Décider ce que fait le troisième étage.**
La spécialisation ne donne pas de puissance (18 spés sur 26 font moins de dégâts que leur voie
nue). Si c'est voulu — « la spé change le verbe, pas la force » — **il faut l'écrire dans le
contrat** et le montrer au joueur autrement que par un chiffre. Si ce n'est pas voulu, le
correctif le moins cher est de **donner à chaque spé une passive chiffrée** comme en ont déjà
le Bretteur (`{cap 6, per_hit 2, power_pct 70, reach 3}`) et l'Assassin (`{full_pct 60,
step_pct 13}`) : `data.specs[*].passive` existe déjà dans le schéma et **24 fiches sur 26 le
laissent à `null`**. Ordre de grandeur utile, d'après le §5 : **+8 à +15 % sur une grandeur
dérivée** (≈ +5 à +10 ATQ, ou +10 % de PV), ce qui est au-dessus du bruit et loin de casser.

**(R6) Ne rien changer à la formule de dégâts, à la variance 90-110, ni au permille.**
Ils sont mesurés sains.

### 8.3 Réponse en une phrase à Pierre

**L'échelle n'est pas trop étroite pour le combat — la formule de dégâts offre cinquante crans
utilisables et un point d'attaque se voit ; ce qui est cassé, c'est la couche « manager »
(entraînement inerte, moral saturé) et sept statistiques affichées qui ne font rien en raid.**

---

## 9. Bugs trouvés en chemin

Rien n'a été corrigé. Chaque entrée donne le fichier, la ligne, le scénario et le correctif proposé.

**B1 — `sim.js:1361-1370` (`trainSlotRun`) : tous les modificateurs d'entraînement sont
annulés par la troncature aux niveaux de terrain réellement atteints.**
*Scénario :* terrain d'entraînement niveau 0 (le cas de départ, et le cas médian au J30 est 1).
`tp_base[0] = 4` ; `pct(4,120) = 4`, `pct(4,80) = 3`, `pct(4,125) = 5`, `pct(4,70) = 2` ; puis
`max(1, trunc(tp/3))` → **1 dans les cinq cas**. Au niveau 1, `tp_base = 12` : normal et
primaire donnent tous deux 4.
*Effet mesuré :* 0,25 point d'attribut gagné par héros sur une saison de 30 jours (359 héros,
30 graines) ; médiane 0.
*Correctif proposé :* multiplier `constants.tp_base` et `constants.tp_threshold_base/step`
par 10, sans rien changer d'autre.

**B2 — `sim.js:399` : la statistique `magic` d'un objet est perdue pour toute classe autre que
Mage, alors que l'interface l'affiche (`sim.js:3274`, libellé « MAG »).**
*Scénario :* un Clerc équipe `a_robe_mousse {def 4, magic 6, heal 4}`. Seuls les 4 de défense
comptent ; les 6 de magie sont ignorés et les 4 de soin n'ont aucun effet mesurable en raid (B4).
*Effet mesuré :* 37 héros sur 144, 227 points de magie perdus au J30.
*Correctif proposé :* tester la formule d'attaque de la classe plutôt que `class_id === 'mage'`,
ou retirer `magic` des objets destinés aux classes non magiques.

**B3 — `tactic.js:2396` + `tactic.js:2082` : la vitesse (`spd`) des héros est calculée,
sérialisée dans l'unité, et jamais lue.**
*Scénario :* `unitsOrderS` trie par `spd` mais filtre `u.kind !== 'hero'`. Aucun autre site ne
lit `u.spd` pour un héros.
*Effet mesuré :* `spd +5` et `spd +100` donnent un résultat identique au bit près à la
référence sur 60 raids (733,5 ‰, 1,45 nuit, 7,5 % KO, 28,1 soins).
*Correctif proposé :* soit brancher la vitesse (initiative, ou PM), soit la retirer du profil
transmis et des fiches d'objet.

**B4 — `sim.js:398-400` + `tactic.js:1607` : la statistique SOIN n'a aucun effet mesurable en
raid.**
*Scénario :* un seul héros est sur la grille à la fois (`finishPass` retire l'unité) et il y
entre à `hp = hp_max`. `healing_prayer` (power 200 + 10) ne peut soigner que son lanceur ou une
invocation persistante.
*Effet mesuré :* `heal +5` et `heal +100` → résultat identique au bit près ; 5 lancers de
`healing_prayer` sur 13 raids, 228 PV de soin cumulés.
*Correctif proposé :* décision de conception (reporter les PV entre passages, ou soigner les
corps posés). En l'état, tout objet ou toute spé « soigneur » doit être considéré comme
décoratif sur la grille.

**B5 — `sim.js:403-404` : les plafonds de critique (400 ‰) et d'esquive (350 ‰) sont appliqués
AVANT l'ajout des objets, donc contournés par l'équipement.**
*Scénario :* `crit = min(400, 30 + 5×chance) + it.crit + (tir précis ? 100 : 0)`. Un Voleur
avec `w_dent_hydre` (crit 150) et `t_oeil_hydre` (crit 100) dépasse le plafond.
*Effet mesuré :* crit max observé 350 ‰ au J30 (le plafond n'est pas encore atteint), donc
latent mais réel.
*Correctif proposé :* appliquer le `min` après la somme, ou assumer que le plafond ne porte que
sur la part d'attribut (et le dire).

**B6 — `data.raid.pm_dex_threshold = 30` est hors de portée.**
*Scénario :* seul usage de l'Adresse dans le raid tactique (`tactic.js:2391`).
*Effet mesuré :* 3 héros sur 144 au J30 (2,1 %) ; adresse médiane 11, max 30.
*Correctif proposé :* abaisser à 20 **et** revoir `raidDefaults` — mesuré ici, donner le PM
supplémentaire à tout le monde **dégrade** le résultat (681 ‰ contre 610 ‰) parce que la
politique par défaut le dépense en déplacement.

**B7 — `sim.js:474-483` (`genBonusAttrs`) : la rareté des héros ne sert pas.**
*Scénario :* `rollRarity` peut produire peu commun / rare / légendaire à la taverne, avec
+2/+4/+6 sur l'attribut primaire. Avec les plans par défaut, presque aucun recrutement de
rareté supérieure n'aboutit.
*Effet mesuré :* 354 communs, 5 peu communs, 0 rare, 0 légendaire sur 359 héros au J30 ;
`bonus_attrs` non nul pour 5 héros sur 359.
*Correctif proposé :* vérifier la politique de recrutement des plans par défaut, ou assumer
que la rareté des héros est un contenu réservé au joueur humain — et le mesurer avec des
gestes humains avant de conclure.

**B8 — `sim.js:2920-2924` : moral plafonné à 100 atteint par 93 % des héros dès le milieu de
saison, ce qui annule chapelle, décorations et trait Jovial.**
*Scénario :* `mor += chapel + décorations + jovial − râleur`, puis `clamp(…, 0, 100)`.
*Effet mesuré :* % de héros à moral 100 : 44,6 % au J5, 70,8 % au J10, 92,8 % au J30 ;
357 héros sur 359 dans le palier haut de `moraleMod`.
*Correctif proposé :* voir R3.

**B9 — `data.specs` : 24 fiches sur 26 ont `passive: null`.**
*Scénario :* le schéma prévoit une passive chiffrée (le Bretteur et l'Assassin en ont une, et
elles se mesurent : Bretteur **+30 ‰** contre sa voie nue sur les trois dragons ; Assassin
**−41 ‰** sur les trois dragons (mais **+34 ‰** sur le seul Sylvain)). Les 24 autres n'ont
aucun levier chiffré.
*Effet mesuré :* 18 spécialisations sur 26 font MOINS de dégâts que leur voie nue.
*Correctif proposé :* voir R5. Ce n'est un bug que si le troisième étage est censé ajouter de
la puissance — c'est une question pour Pierre, pas pour le moteur.

**B10 — `sim.js:402` : la défense n'est pas modulée par la performance.**
*Scénario :* `def: A.vigor + div(A.strength, 2) + it.def` — ni `perfPct`, ni `fatigueDefMod`.
En expédition, `applyDamage` applique bien `fatigueDefMod` au défenseur (sim.js:2079) ; en raid,
`heroUnitOf` copie `h.def` tel quel. Un héros épuisé frappe moins fort (×75) mais se défend
aussi bien qu'au repos.
*Effet mesuré :* non isolé (incohérence relevée par lecture, cohérente avec le fait que
DÉF +1 ne change rien en raid).
*Correctif proposé :* cohérence à trancher ; l'écart est faible, ce n'est pas urgent.

**B11 — `data.constants` : trois plafonds déclarés jamais approchés.**
`attr_max 60` (max mesuré 37), `level_max 20` (max mesuré 10), `trained_max 10` (max mesuré 2),
et `xp_table` défini jusqu'au niveau 20 dont les entrées 11 à 20 sont mortes.
*Correctif proposé :* aucun code à changer ; c'est une information à porter au contrat pour que
personne ne calibre une future spécialisation en supposant un héros niveau 15.

---

## Verdicts

```
software_verdict: OK          (le moteur tourne, ENGINE_ONLY=1 node test/harness.mjs → 10/10 ;
                               aucun fichier du prototype modifié)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED
```

Les mesures marquées **[M]** sont reproductibles : elles n'utilisent que l'API publique de
`sim.js` / `tactic.js` et les graines 1000 + 7 i. Les sondes ont été supprimées après mesure,
conformément à la consigne ; leur contenu est décrit assez précisément dans l'en-tête « Protocole de mesure » et dans les
sections où chaque chiffre apparaît pour être réécrit.
Les affirmations marquées **[L]** sont des lectures de code, non prouvées par exécution.
