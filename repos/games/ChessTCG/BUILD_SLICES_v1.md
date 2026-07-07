# Chess TCG — Plan de tranches v1 (moteur de règles pur)

status: DOCUMENTED_ONLY (plan) · claim_verdict: NO_CLAIM_ALLOWED
Méthode : **même que le moteur Belote** — logique pure, **tests écrits AVANT l'implémentation (TDD)**, verts avant de
passer à la tranche suivante. **Zéro 3D, zéro générateur, zéro UI.** Déterministe (seedable), headless, batchable.
Lignée **T** (HP/ATK/ARM). Chaque tranche = son **oracle** (suite de tests) → répond à **P0-E** (aucun oracle hors échecs/Snake).

> Boucle cible (Pierre) : **jouer une carte → bouger une pièce → brawl**. Le moteur ci-dessous la rend jouable en headless.
> **Frontière** : `[GATE]` réutiliser le socle Rust d'échecs (mouvement/plateau) ou repartir propre — voir CERFA Q4.

## Dépendances aux décisions (gates)
| Tranche | Gate bloquant | Autres gates |
|---|---|---|
| 0, 1 | **C5** (formule dégâts) | — |
| 2 | C5 | — |
| 3 | **C6** (BRAWL) | — |
| 4 | **C7** (pression) + **C8** (victoire) | — |
| 5 | — | C13/C14/C15 (au fil des cartes) |

→ **La tranche 1 démarre dès que C5 + C8 sont tranchés** (CERFA Q5). Le reste se débloque au fil de l'eau.

## Tranches

### T0 — Scaffold + types + harnais de test
- `Board` 8×8, `Piece{ id, type, owner, pos, HP, maxHP, ATK, ARM, flags{canAttack,canBrawl,canControl} }`, `GameState{ board, activePlayer, turn }`.
- Sérialisation d'état déterministe (pour asserts).
- **Oracle** : instancier un plateau, placer/retirer des pièces, round-trip de sérialisation, invariants (pas 2 pièces/case, positions dans 0..7).

### T1 — Mouvement + combat direct + **ordre attaque→mort→prise de case** (règle implicite n°1)
- Mouvement type échecs par pièce (sauf modif ultérieure par carte).
- Combat : `directDamage = max(1, ATK − ARM)` **[C5]**. Séquence canonique : 1) calcul dégâts, 2) application, 3) si HP≤0 → suppression cible, 4) **attaquant prend la case**, 5) +1 kill, 6) check promotion. **Si la cible survit : PAS de prise de case.**
- Promotion : nouvelle pièce `canAttack=false, canBrawl=true, canControl=true` ; `canAttack=true` au tour suivant.
- **Oracle** : mouvements légaux/illégaux par type ; attaque qui tue → attaquant sur la case ; attaque non-létale → attaquant reste ; `max(1,·)` (jamais 0) ; invocation non promouvable.
- **= pilote IMP-246** : consigner coût tokens / itérations / temps.

### T2 — Traversée + riposte
- Traversée case par case ; `traversalDamage = max(1, controllerATK − moverARM)` sur cases **contrôlées** ; **arrêt immédiat si le mover meurt** ; **cavalier = exception** (pas de traversée).
- Riposte : `retaliationDamage = max(1, defenderATK − attackerARM)` si la cible survit.
- **Oracle** : pièce non-cavalier subit N contre-attaques sur un chemin contrôlé ; mort en cours de chemin stoppe ; cavalier ignore ; baseline « ~morts de traversée » reproductible sur seed fixe.

### T3 — BRAWL
- Snapshot des engagements adjacents ; `brawlDamage = max(1, ATK − ARM)` **[C6]** ; résolu **après l'action, avant la pression**.
- **Oracle** : attrition locale déterministe sur position fixe ; le BRAWL ne remplace pas le combat (accélère les positions perdantes) ; ordre snapshot correct.

### T4 — Pression du roi + collapse + fatigue + victoire
- `kingPressure = directThreat + floor(supporters/4) + floor(blockedEscapes/3) + brawlPressure` **[C7]**.
- `collapse if kingPressure ≥ kingHP + 2 − fatigueReduction` ; fatigue : début t48, −1 / 18 tours, max −2.
- Victoire **[C8]** : king kill / pressure collapse / (mat strict selon mode).
- **Oracle** : seuils de collapse ; fatigue monotone ; `victoryCheck` termine la partie ; rejouer la baseline 50 parties headless → métriques (p1/p2 winrate, mean_turns, pressure vs kill victories) dans les fourchettes attendues.

### T5 — Couche cartes (données) + statuts → **boucle complète carte→mouvement→brawl**
- Une carte = **donnée** (pas de branche runtime) : `jouer 1 carte` applique un effet déterministe (statut, buff/debuff, invocation…) sur l'état.
- 13 statuts (burn/poison/root/freeze/stun/charm…) ; stacking **[C14]** (un buff + un debuff de même nature) ; event ordering **[C15]**.
- **Oracle** : tour complet = jouer carte → bouger → brawl → pression → victoire, rejouable à l'identique sur seed ; stacking borné ; statuts hard-control durée 1 tour max.

## Sortie de v1
Un **moteur de règles pur, headless, testé, déterministe**, jouable en boucle carte→mouvement→brawl, avec un set
main-crafted minimal — **sans** 3D, **sans** générateur, **sans** UI. Base saine pour brancher ensuite (a) le générateur
(`08_GENERATOR_UNIFIED_CANDIDATE`), (b) une UI, (c) une IA de test — chacun sur décision séparée.

## Ce qu'on NE fait PAS en v1
3D · générateur de cartes · UI/UX riche · IA neuronale · magic mode complet · terrain avancé · économie deck/main/ressources.
