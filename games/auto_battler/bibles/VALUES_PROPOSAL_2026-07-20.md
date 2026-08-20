# Auto Battler — Proposition de valeurs (TBD des bibles ratifiées)

**Statut : DRAFT PROPOSE-ONLY — cycle de gates Pierre requis avant toute opposabilité.**
Date : 2026-07-20 · Auteur : Opus (sous-agent, contexte propre) · Cycle : gate 1 BAS V2 (P0).

## Ce document, et ce qu'il n'est pas

Ce fichier NE modifie AUCUNE bible ratifiée. Il rassemble en un seul endroit chaque champ
**TBD** des bibles existantes (Meta, Economy, Core Rules, Combat, DSL) et propose pour
chacun **une valeur**, **une justification d'une ligne**, et **une source**. Trois natures
de source, distinguées explicitement :

- **DÉJÀ EN CODE** — la valeur existe déjà dans `params.v0.mjs` ou `content/units.v0.mjs`,
  souvent sourcée TFT/HSBG et ratifiée en dispatch s9-build ou HumanGate 2026-07-19. Ici la
  bible ne fait que **documenter le réel** : la proposition = « graver ce qui tourne déjà ».
  Risque de contradiction bible↔code = nul par construction (on recopie le code).
- **SOURCE EXTERNE** — pas encore en code, mais une norme de genre (TFT/HSBG, packet) donne
  un point d'ancrage citable.
- **CHOIX DESIGN PUR — décision Pierre** — aucune base n'existe (ni code, ni source, ni
  calcul). La valeur proposée est un **point de départ discutable**, jamais une vérité.
  Ces lignes sont celles qui demandent réellement l'arbitrage de Pierre ; elles sont
  récapitulées en fin de document.

Règle respectée (doctrine Forge) : jamais une invention sèche. Quand aucune base n'existe,
c'est dit — pas maquillé en chiffre d'autorité.

---

## Table 1 — Paramètres économiques (Economy Bible §Paramètres L206-222 · Core Rules §Paramètres)

| # | Champ TBD (bible) | Valeur proposée | Justification (1 ligne) | Source |
|---|---|---|---|---|
| V-01 | Gold initial d'un Seat | **0** (revenu du Round 1 = premier Gold) | Aucune constante `INITIAL_GOLD` en code ; le premier Income (3) sert de mise de départ, cohérent avec HSBG où le premier tour donne l'or. À trancher : Pierre peut vouloir une mise > 0. | CHOIX DESIGN PUR — décision Pierre (défaut = 0, dérivé du modèle Income) |
| V-02 | Income de base par Round (courbe) | **`min(3 + round_index, 10)`** | Déjà en code (`INCOME_BASE = 3`, commentaire l.14). Revenu de base seul (Interest/streaks rejetés QE-4/QE-5). | DÉJÀ EN CODE `params.v0.mjs:14` (source HSBG) |
| V-03 | Composantes additionnelles d'Income | **AUCUNE** (Interest, primes de série exclus) | Rejetées gate #3 ; réintroduction = gate. | Ratifié HumanGate 2026-07-18 (déjà acté) |
| V-04 | Coût d'un Buy, par Rarity | **coût = rank** (1..5) | Déjà en code : `rank === Buy cost`, source unique de vérité. | DÉJÀ EN CODE `units.v0.mjs:10`, `preparation.mjs` |
| V-05 | Contrepartie d'un Sell, par Rarity × Star | **`rank × [1, 2, 6][star-1]`** | Déjà en code : `SELL_STAR_MULTIPLIER = [1,2,6]`, vérifié byte-for-byte contre l'ancienne table. | DÉJÀ EN CODE `params.v0.mjs:28` |
| V-06 | Coût d'un Reroll | **2 Gold** | Déjà en code : `REROLL_COST = 2` (source TFT). | DÉJÀ EN CODE `params.v0.mjs:13` |
| V-07 | Coût d'un LevelUp, par Level cible | **{2:2, 3:3, 4:4, 5:5, 6:10, 7:18, 8:30, 9:34, 10:34}** | Déjà en code : `LEVEL_UP_COSTS`, ratios TFT transposés (pas copie littérale) à un revenu plafonné à 10. | DÉJÀ EN CODE `params.v0.mjs:228` (source TFT, transposition documentée) |
| V-08 | Level initial du Player | **1** | Implicite au code (paliers `LEVEL_UP_COSTS` commencent à 2 = « atteindre 2 »). Pas de constante nommée. | DÉJÀ EN CODE (implicite) — proposer d'expliciter `LEVEL_INITIAL = 1` |
| V-09 | Level maximal du Player | **10** | Déjà en code : absence de clé > 10 dans `LEVEL_UP_COSTS` ⇒ LevelUp refusé (R14). | DÉJÀ EN CODE `params.v0.mjs:226-238` |
| V-10 | Taille d'Army par Level (plafond Board) | **`capacité = level × 1`** | Déjà en code : `BOARD_SLOTS_PER_LEVEL = 1`, `boardCapacityForLevel` (source TFT). | DÉJÀ EN CODE `params.v0.mjs:154,160` |
| V-11 | Nombre d'Units proposées par Shop | **5** | Déjà en code : `SHOP_SIZE = 5` (source TFT). | DÉJÀ EN CODE `params.v0.mjs:12` |
| V-12 | Table d'odds de la Shop (Level × Rank) | **`SHOP_ODDS_TABLE`** (6 lignes level 1..6+) | Déjà en code, provisoire propriété Balance Bible, testée (pas de rank-5 au level 1). | DÉJÀ EN CODE `params.v0.mjs:186-193` |
| V-13 | Taille du Pool par Rarity (exemplaires/UnitDef) | **10 exemplaires par UnitDefinition** (uniforme) | Déjà en code : `POOL_EXEMPLARS_PER_UNIT = 10`. NB : uniforme, non différencié par Rarity — cf. V-13b. | DÉJÀ EN CODE `params.v0.mjs:29` |
| V-13b | Différenciation du Pool par Rarity | **proposition : décroissant par rank** (ex. r1:22, r2:16, r3:13, r4:11, r5:9 — barème TFT indicatif) | Le code est uniforme (10) ; le schéma Economy dit « taille par Rarity calibrée sur N ». Un Pool uniforme rend les unités rares trop disponibles. Non implémenté. | SOURCE EXTERNE (barème TFT) — **écart code↔intention à arbitrer** |
| V-14 | Capacité du Bench | **9 places** | Déjà en code : `BENCH_CAPACITY = 9` (source TFT). NB : moteur historiquement à 8, à aligner (déjà noté Core Rules l.169). | DÉJÀ EN CODE `params.v0.mjs:11` |
| V-15 | Rewards de Round Resolution (nature/montants) | **AUCUN reward direct en v0** (seul l'Income de Round porte le Gold) | Aucun mécanisme de reward en code ; l'Income couvre la boucle. Ajouter des rewards = design neuf. | CHOIX DESIGN PUR — décision Pierre (défaut = aucun) |

## Table 2 — Vie et résolution de Round (Core Rules · Combat Bible · déjà en code E1/E2)

| # | Champ TBD (bible) | Valeur proposée | Justification (1 ligne) | Source |
|---|---|---|---|---|
| V-16 | Life initiale du Seat | **30** | Déjà en code : `LIFE_INITIAL = 30` (valeur HSBG, pas d'armure de héros). | DÉJÀ EN CODE `params.v0.mjs:62` |
| V-17 | Life floor (élimination) | **0** | Déjà en code : `LIFE_FLOOR = 0` (INV-9). | DÉJÀ EN CODE `params.v0.mjs:65` |
| V-18 | Dégâts au Seat après Combat perdu (formule) | **`niveau du vainqueur + Σ rangs des survivants`** | Déjà en code : `computeLifeDamage`, transposition directe HSBG, propriétés vérifiées par test. | DÉJÀ EN CODE `params.v0.mjs:90` |
| V-19 | tick_limit (Ticks max d'un Combat) | **50** | Déjà en code : `TICK_LIMIT = 50` (calcul sourcé TFT, ~40s / 0.8s par Tick). | DÉJÀ EN CODE `params.v0.mjs:20` |

## Table 3 — Multiplicateurs de Star et règles de mots-clés (déjà en code E3/G1)

| # | Champ TBD (bible) | Valeur proposée | Justification (1 ligne) | Source |
|---|---|---|---|---|
| V-20 | Multiplicateur d'Attack par Star | **[1, 1.5, 2.25]** (indexé star-1) | Déjà en code : `STAR_ATTACK_MULTIPLIER` (source TFT vérifiée). | DÉJÀ EN CODE `params.v0.mjs:124` |
| V-21 | Multiplicateur de Health par Star | **[1, 1.8, 3.24]** | Déjà en code : `STAR_HEALTH_MULTIPLIER` (source TFT). | DÉJÀ EN CODE `params.v0.mjs:125` |
| V-22 | Furie des vents (attaques/cycle) | **2** | Déjà en code : `WINDFURY_ATTACKS_PER_CYCLE = 2` (HSBG). | DÉJÀ EN CODE `params.v0.mjs:175` |
| V-23 | Renaissance (Health au retour) | **1** | Déjà en code : `REBORN_HEALTH = 1` (HSBG). | DÉJÀ EN CODE `params.v0.mjs:178` |
| V-24 | Thresholds de Synergy (ex. V1 : 2/4/6/8) | **AUCUN — modèle « meneur » retenu** (TRIBE_BOOST, pas de palier de comptage) | Le contenu v0 abandonne les paliers TFT au profit du modèle HSBG « meneuse renforce la tribu ». La ligne Core Rules l.171 (2/4/6/8) est un exemple V1 non retenu par le contenu. | DÉJÀ EN CODE `units.v0.mjs:47-48` (modèle, pas palier) — **à acter : thresholds non applicables** |

## Table 4 — Contenu paramétrique (Content Bible — stats des 15 unités, tribus, mots-clés)

Voir `10_CONTENT_BIBLE_DRAFT.md` pour l'inventaire complet. Toutes ces valeurs sont
**DÉJÀ EN CODE** (`content/units.v0.mjs`), déclarées « v0 PROVISOIRE, propriété Balance
Bible — matière première à juger en jouant ». La proposition = documenter l'existant et
soumettre chaque unité à l'enveloppe 08. Aucune stat d'unité n'est réinventée ici.

## Table 5 — Seuils de méta (Meta Bible OBJ-1..10 + E1..E3 · QM-1..12)

Ces objectifs sont **ADVISORY** (META-2) : ils ne bloquent jamais un verdict. Les valeurs
ci-dessous sont des **cibles de mesure proposées**, pas des constantes de jeu. Détail chiffré
et bandes attendues : `09_SIMULATION_BIBLE_DRAFT.md`. La grande majorité sont des CHOIX
DESIGN PUR (aucune valeur ne peut être « en code » — ce sont des objectifs, pas des règles).

| # | Objectif (QM) | Cible proposée | Justification (1 ligne) | Source |
|---|---|---|---|---|
| V-25 | OBJ-1 archetypes viables simultanés (QM-1) | **≥ 4** (au moins une comp viable par tribu) | Le contenu v0 a 4 tribus (Chevalerie/Sylve/Compagnie/Arcane) ; viser ≥ 1 archetype viable par tribu est le plancher naturel. | SOURCE (4 tribus en code) + CHOIX DESIGN PUR sur le seuil |
| V-26 | OBJ-1 def. « viable » (QM-2) | **archetype présent dans ≥ X% des armées finales top-4** (X ≈ 15%) | Rend « viable » opérationnel via placement top-4 ; X est un curseur. | CHOIX DESIGN PUR — décision Pierre |
| V-27 | OBJ-2 durée cible (QM) | **20–30 min** / proxy Rounds à calibrer | Ratifié V1. La correspondance Rounds↔minutes reste à mesurer. | Ratifié V1 (déjà acté) |
| V-28 | OBJ-3 part du Placement (QM-7) | **≈ 30%** via protocole de permutation | Ratifié V1 ; protocole de permutation proposé (re-sim Placements seuls). | Ratifié V1 + protocole proposé (Sim Bible) |
| V-29 | OBJ-5 fréquence de Pivot (QM-4) | **plancher ≥ 1 Pivot/Match médian ; plafond ≤ 3** | L'adaptation doit payer (plancher) sans dissoudre les identités (plafond). Bornes indicatives. | CHOIX DESIGN PUR — décision Pierre |
| V-30 | OBJ-7 win-rate max toléré/archetype (QM-6) | **≤ 25% de victoires de Match** (2× l'espérance à 8 Seats = 12.5%) | Ancrage arithmétique : 8 Seats ⇒ espérance 12.5% ; un archetype > 2× l'espérance = dominance à examiner. | CALCUL (espérance 1/8) + CHOIX DESIGN PUR sur le facteur 2× |
| V-31 | OBJ-9 usage min par UnitDefinition (QM-9) | **≥ 5% de présence en armée finale** sur la Campaign | « Aucune unité morte » ; 5% est un plancher indicatif à calibrer sur le nombre d'unités (15). | CHOIX DESIGN PUR — décision Pierre |
| V-32 | OBJ-4/6/8/10/E1/E2/E3 métriques (QM-3,5,8,10,12) | **métriques proposées, seuils TBD** | Les pistes de métrique sont dans la Meta Bible ; les seuils exigent des Campaigns calibrées (dépend de L2/agent-à-niveau — risque de recherche). | CHOIX DESIGN PUR + conditionné L2 |

---

## Récapitulatif — les « CHOIX DESIGN PUR » remontés à Pierre

Ces champs n'ont **aucune base** en code, source ou calcul : ils exigent une décision de
design, pas une documentation. Ce sont les vrais points de gate.

1. **V-01 Gold initial d'un Seat** — défaut proposé 0 (premier Income = mise) ; Pierre peut vouloir une mise de départ.
2. **V-15 Rewards de Round Resolution** — défaut proposé « aucun » ; ajouter des rewards serait un mécanisme neuf.
3. **V-26 Définition opérationnelle d'« archetype viable »** (QM-2) — curseur X%.
4. **V-29 Fréquence de Pivot cible** (QM-4) — bornes plancher/plafond.
5. **V-31 Usage minimal par UnitDefinition** (QM-9) — plancher %.
6. **Seuils partiellement design** : V-25 (nombre d'archetypes), V-30 (facteur de tolérance win-rate), et l'ensemble V-32 (métriques OBJ-4/6/8/10/E1-E3).

Deux **écarts code↔intention** distincts d'un simple TBD, à trancher séparément :
- **V-13b** — le Pool est uniforme (10) en code alors que le schéma Economy prévoit une taille **par Rarity**. Choix : graver l'uniforme, ou implémenter un barème décroissant.
- **V-24** — les Thresholds de Synergy 2/4/6/8 (exemple V1) ne sont **pas** le modèle du contenu (modèle « meneur »). Choix : acter que les thresholds ne s'appliquent pas à ce set.

---

**Compte** : 32 champs proposés (dont 19 « DÉJÀ EN CODE », 3 « SOURCE EXTERNE », 6+ « CHOIX
DESIGN PUR », 2 écarts code↔intention).

*Fin du DRAFT PROPOSE-ONLY.*
