# Rapport Red-Team CODE — card_engine (s11-redteam-code:card_engine-20260720a)

Auditeur aveuglé. Matériau : `games/card_engine/**`, artefacts du run, golden `llm-lego/experiments/belote-claude/src/` (lecture seule).
Findings ADVISORY (humangate_flags) — ne juge pas à la place des oracles. Chaque finding a une reproduction exécutée.

Contexte de preuve important : **l'oracle complet est VERT** (`node run-oracle.mjs` → exit 0 : logic+property PASS, parity 20/20, solvability 10/10, "All moves were legal throughout"). Les findings ci-dessous vivent SOUS ce vert.

---

## Compte par sévérité
- HIGH : 1
- MED : 3
- LOW : 2
- INFO : 1 (déterminisme — vérifié OK, pas une faille)

## Les 3 plus graves (une ligne)
1. **HIGH** — `compareInTrick`/`trickWinner` ignorent la couleur demandée → une défausse hors-couleur (ni atout ni couleur demandée) de fort rang gagne le pli à tort ; 3 plis/80 mal attribués dans le run seed=42 de l'oracle lui-même, qui reste vert.
2. **MED** — `adapters/belote/game.mjs::playGame` est cassé : lève `TypeError` quel que soit l'argument (jamais exécuté par l'oracle → défaut invisible).
3. **MED** — `solver.mjs` retourne `allMovesLegal:true` / `allDealsReachedScore:true` en **littéraux codés en dur** ; log "across multiple seeds" **faux** (un seul seed 42, un seul flux, `chooseMove=legal[0]`).

---

## HIGH-1 — `compareInTrick` ignore la couleur demandée : mauvais gagnant de pli

**Fichier** : `games/card_engine/adapters/belote/rules.mjs` L135-149 (`compareInTrick`), L158-175 (`trickWinner`).

**Faille**
`compareInTrick(cardA, cardB, led, contract)` reçoit `led` mais **ne l'utilise jamais**. Sa logique : atout > non-atout, puis comparaison de `cardStrength` par l'ordre de CHAQUE carte dans SA propre couleur. Résultat : une carte non-atout qui n'est PAS de la couleur demandée (défausse légale) est comparée à la carte maîtresse par son index d'ordre — et si cet index est supérieur, elle « gagne » le pli. En belote, une défausse hors-couleur ne peut jamais remporter le pli.

Le core `core/trick.mjs::resolveTrick` fait un fold sur `compareInTrick` (en lui passant correctement `led`) — il hérite donc du bug. Le `trickWinner` exporté (rules.mjs) fait le même fold. **Les deux chemins de résolution réellement câblés sont faux.**

Ironie/aggravant : le helper PRIVÉ `computeTrickWinner` (rules.mjs L104-123, utilisé DANS `legalMoves`) restreint correctement au `pool` couleur-demandée. Il y a donc **deux implémentations contradictoires du gagnant dans le même fichier** ; la correcte sert à calculer la légalité, la fausse sert à attribuer le pli. Conséquence : le bot peut se voir dire « partenaire maître » correctement (legalMoves) alors que le pli est attribué au mauvais siège (resolveTrick).

**Pourquoi les goldens ne l'attrapent pas** : `trick_winner.json` n'a que 2 cas. Le cas 2 contient bien une défausse hors-couleur (`A-carreau`) mais elle **égalise** (index 7 = index de l'`A-pique` maître) au lieu de dépasser → `cmp=0`, pas de bascule. Le bug ne se déclenche que si l'index de la défausse **dépasse** strictement celui du maître courant.

**Reproduction (primitive + core + comparaison golden)**
Commande :
```
node scratchpad/repro_trickwinner.mjs
```
(trick : `led=coeur` non-atout, `trump=pique` ; seat1 défausse `A-carreau` ; seats 0/2/3 = 7/8/9-coeur ; le plus fort coeur = 9-coeur seat3 devrait gagner)

Sortie :
```
CardEngine exported trickWinner winner seat: 1
CardEngine core resolveTrick winner seat  : 1
Golden belote-claude trickWinner winner   : 3
>>> DIVERGENCE: CE=1 golden=3 <<<
```

**Reproduction (dans le run seed=42 de l'oracle lui-même)**
Rejeu du run de solvabilité (même seed 42, même shuffle/cut/`legal[0]`), en recomputant chaque gagnant par la règle golden :
```
node scratchpad/repro_solver_wrongwinner.mjs
```
Sortie :
```
  deal#0 trick#2: CE winner=3 golden=1 | 1:R-coeur 2:D-coeur 3:10-carreau 0:V-coeur trump=pique led=coeur
  deal#6 trick#5: CE winner=0 golden=1 | 1:9-trefle 2:8-coeur 3:7-coeur 0:10-coeur trump=carreau led=trefle
  deal#8 trick#7: CE winner=1 golden=0 | 2:7-pique 3:8-pique 0:9-pique 1:10-carreau trump=trefle led=pique
Tricks checked: 80, WRONG winners (CE vs correct belote rule): 3
```
(deal#0 est bit-identique au 1er donne de l'oracle — pickup n'affecte que la donne N+1. Ex. deal#0 trick#2 : tous coeur sauf `10-carreau` ; le maître correct est `R-coeur` seat1, mais `10-carreau` gagne à tort car index PLAIN_ORDER '10'=6 > 'R'=5.)

**Impact**
- Attribution de plis erronée en jeu réel ⇒ `tricksWon`, `pointsByTeam`, détection `capot`, chaînage « le gagnant entame » (leader du pli suivant), et donc `scores` **faux**.
- Invisible pour l'oracle : l'invariant `base===162` (scoring.mjs L44, solver.mjs L126) somme TOUTES les cartes ; elles partent juste dans la mauvaise équipe ⇒ la somme reste 162 ⇒ vert. C'est exactement « les tests verts cachent la faille ».
- Portée : tout jeu consommant ce core (le core est vendu comme générique) hérite du bug de résolution de pli. Correctif conceptuel : `compareInTrick` doit traiter comme perdante toute carte non-atout dont `suit !== led` (le core lui passe déjà `led`).

---

## MED-1 — `playGame` (game.mjs) cassé, lève inconditionnellement

**Fichier** : `games/card_engine/adapters/belote/game.mjs` L79-123.

**Faille**
`playGame(opts, beloteRules)` fait `const { createRng, shuffle } = beloteRules;` puis `shuffle(fullDeck, rng)`. Aucun adaptateur ne fournit `shuffle`/`createRng` : l'adaptateur rules (`index.mjs::createBeloteRulesAdapter`) n'a pas ces clés ; l'adaptateur complet non plus. `createRng` destructuré n'est jamais utilisé (le code appelle `createRngStandard` local). C'est un chemin mort MAIS c'est la **seule API « jouer une partie entière »** de l'adaptateur belote, et elle est shippée cassée. La méthode duplique aussi `mulberry32` au lieu d'importer `core/rng.mjs` (TODO L128 laissé en place).

**Reproduction**
```
node scratchpad/repro_playgame.mjs
```
Sortie :
```
playGame THREW: TypeError - shuffle is not a function
playGame(rules) THREW: TypeError - beloteRules.fullDeck is not a function
```

**Impact** : toute consommation future de `playGame` casse immédiatement. Non couvert par l'oracle (solver.mjs réimplémente sa propre boucle de partie, ne l'appelle pas). Défaut réel masqué par l'absence de test.

---

## MED-2 — Solvabilité faible : verdicts codés en dur, seed unique, log mensonger

**Fichiers** : `games/card_engine/harness/solver.mjs` L145-152 ; `games/card_engine/solvability.mjs` L17.

**Failles**
1. `runSolver` retourne `allDealsReachedScore: true` et `allMovesLegal: true` en **littéraux** (L150-151), commentés « Already checked / Would have thrown ». Ce ne sont pas les résultats d'un contrôle : la solvability lit ces booléens (L26, L31) et déclare PASS. La seule vérif réelle est `base===162` (L126) + `assertLegalMove` dans `playTrick`.
2. `assertLegalMove` est une tautologie ici : `chooseMove` renvoie `legal[0]`, donc un élément de `legalMoves` par construction — « no illegal move » ne prouve rien sur la justesse de `legalMoves`.
3. `solvability.mjs` L17 logue « Running bot for 10 deals across multiple seeds » — **faux** : `runSolver` utilise seed=42, un seul flux RNG (solver.mjs L106). Un seul chemin de jeu est exploré.
4. `chooseMove=legal[0]` ⇒ le bot ne joue jamais de coup alternatif ; les branches de `legalMoves` (surcoupe obligatoire, défausse partenaire-maître) ne sont exercées que par accident, jamais couvertes exhaustivement. Aucune exigence qu'un bot « gagne » — seulement cohérence (cf. leçon studio « oracle vert ≠ jeu bon »).

**Reproduction (le vert est vacun sur la légalité)**
```
node run-oracle.mjs   # exit 0
```
Extrait : `[Solvability Oracle] ✓ All moves were legal throughout` — imprimé alors même que HIGH-1 prouve 3 plis mal résolus dans CE run. Le « legal » (verdict codé en dur) et le « winner correct » sont deux choses ; l'oracle n'affirme que le premier, en dur.

**Impact** : le verdict de solvabilité sur-affirme. 10 donnes d'un seul flux avec un sélecteur trivial ne couvrent pas l'espace des états ; l'oracle ne peut pas voir HIGH-1.

---

## MED-3 — Annonces (R10/R11) non vérifiées par la parité et déconnectées du jeu

**Fichiers** : `games/card_engine/adapters/belote/annonces.mjs` (tout) ; `game.mjs` `playDeal` L33-72 ; `harness/goldens/`.

**Faille**
`resolveAnnonces` / `detectSequences` / `detectCarres` / `compareAnnonce` existent mais :
- ne sont **jamais appelés** par `playDeal` (game.mjs) ni par `solveDeal` (solver.mjs) ni intégrés à `scoreDeal` → code mort vis-à-vis du produit jouable ; les bonus d'annonces n'entrent dans aucun score.
- **aucun golden** ne les couvre (`legal_moves`, `trick_winner`, `score_deal`, `deal_trajectory` — zéro annonce). La seule vérif est `properties.test.mjs` L12-32 : elle teste l'ordre-indépendance du **compte** et de la **somme de points** de `detectAnnonces(deck.slice(0,8))`, jamais confrontée au golden `annonces.mjs`. Donc `compareAnnonce` (départage carré>suite, atout, aînesse), l'annulation par égalité inter-équipes, et « seule la meilleure équipe marque » sont **non testés vs golden**.

**Reproduction (absence de couverture)**
```
node -e "const s=require('fs').readFileSync('games/card_engine/harness/run_parity.mjs','utf8'); console.log('annonce refs in parity:', (s.match(/annonce/gi)||[]).length)"
```
Sortie : `annonce refs in parity: 0`

**Impact** : la fidélité belote des annonces est revendiquée par l'existence du fichier, pas par une preuve d'exécution. R10/R11 sont hors du chemin scoré → un joueur ne verra jamais ces points ; une divergence vs golden passerait inaperçue.

---

## LOW-1 — Deux implémentations contradictoires du gagnant dans rules.mjs
Root cause de HIGH-1, notée séparément pour le correctif : `computeTrickWinner` (privé, correct, restreint au pool couleur-demandée) coexiste avec `trickWinner`/`compareInTrick` (exportés, faux). Aligner en réutilisant la logique `pool` (atouts sinon couleur-demandée) résout HIGH-1 et supprime la duplication.

## LOW-2 — `Math.max(...[])` = `-Infinity` non gardé (fragilité)
`rules.mjs` L62-63 et L91-93 : quand aucun atout n'est encore tombé, `Math.max(...trick.filter(trump).map(...))` vaut `-Infinity`. Le résultat reste correct aujourd'hui (tous les atouts > -Infinity), mais le golden garde explicitement ce cas avec `-1` (belote-claude rules.mjs L39-41). Fragile : une refactorisation de `cardStrength` en valeurs négatives casserait silencieusement. Pas de repro (comportement actuel correct).

## INFO — Déterminisme : vérifié OK (pas une faille)
Double exécution `runSolver({numDeals:10,seed:42})` → `[650,1030]` puis `[650,1030]` (DETERMINISTIC). RNG mulberry32 seedé, pas de `Date`/`Math.random` dans le chemin de jeu. Nuance : `annonces.mjs` itère `Object.keys(byRank)` avec des clés entier-like ('7'..'10') → ordre numérique JS, mais la détection est ordre-indépendante par construction et hors chemin scoré ⇒ sans effet. Les totaux `[650,1030]` sont déterministes mais **corrompus** par HIGH-1 (gagnants partiellement faux).

---

## Synthèse
Le produit passe l'oracle en vert, mais sous le vert : (HIGH-1) le cœur même de la résolution de pli attribue certains plis au mauvais camp — reproduit à 3 niveaux dont le run seed=42 de l'oracle — sans que l'invariant base-162 puisse le voir ; (MED) l'API « partie entière » est cassée, le verdict de solvabilité est partiellement codé en dur avec un log de couverture faux, et tout un pan (annonces R10/R11) est non testé vs golden et débranché du jeu. La parité golden (15 goldens / 20 checks) est réelle mais étroite : elle ne couvre ni la défausse-hors-couleur-dépassante, ni les annonces, ni une vraie partie générée par le bot. Recommandation advisory : traiter HIGH-1 comme humangate_flag bloquant avant toute revendication de fidélité belote.

software_verdict: FAIL
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
