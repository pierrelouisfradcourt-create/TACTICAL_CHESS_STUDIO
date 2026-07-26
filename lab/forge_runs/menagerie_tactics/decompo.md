# Décomposition fonctionnelle — Menagerie Tactics (s3)

Décompose le produit fini (product_snapshot R1..R13) en modules et features implémentables, bornés par ownership. Convention lane JEUX : moteur pur headless testable + rendu canvas séparé (aucune règle dans le rendu/entrée).

## Modules

### `game` (moteur pur — TOUTE la logique de règles)
Fichier : `games/menagerie_tactics/game.mjs`. Classe `MenagerieBattle`. Aucune API DOM. Expose `view()` (snapshot d'état lisible par le rendu et les oracles), `step(intent)` (applique une intention joueur puis, si fin de tour, l'IA ennemie), `reset(seed)`, `debugHit()` (hook e2e : force la défaite).
- R1 `cellOccupied`, R2 `turnOrder`, R3 `moveBeast`, R4 `canAttack`, R5 `typeMultiplier`, R6 `computeDamage`, R7 `knockOut`, R8 `terrainMitigation`, R9 `threatenedCells`, R10 `resolveCapture`, R11 `checkVictory`, R12 `checkDefeat`.

### `level` (génération pure)
Fichier : `games/menagerie_tactics/level.mjs`. Fonction `generateBattle(battleNumber, seed)` pure → `{grid, beasts}`. RNG xorshift32 seedé déterministe. Garantit pour seed=1 une bataille SOLVABLE : au moins un ennemi affaibli/lent capturable près d'un mur.
- R13 `generateBattle`.

### `input` (entrée — aucune règle)
Fichier : `games/menagerie_tactics/input.mjs`. Traduit clics/clavier en intentions `{type:'select'|'move'|'attack'|'endTurn', ...}`. Ne connaît aucune règle.

### `render` (rendu — lecture seule)
Fichier : `games/menagerie_tactics/render.mjs`. Dessine la grille, les bêtes, les surbrillances (déplacement/portée/menace/capture), le HUD, l'overlay. Lit `view()`, n'écrit jamais l'état. Toute la logique présentationnelle (couleurs, libellés) vit ici pour garder `game.mjs`/`level.mjs` lean (surface de mutation minimale).

## Harnais (hors ownership de règles, requis par le contrat de jeu)
- `index.html` — entrypoint : câble game/render/input, expose `window.__game` (view) + `window.__game_debug.hit()`, DOM `#overlay.hidden`/`#restart`/`#overlayTitle`.
- `server.mjs` — statique zéro-dépendance, log `interface jouable`.
- `logic.test.mjs` — `node --test`, une règle testée strictement + section anti-mutants (tue les mutants d'opérateurs).
- `properties.test.mjs` — invariants sur ~40 seeds (déterminisme, bête dans la grille, captures monotones, défaite monotone).
- `e2e.mjs` — Playwright/chromium réel : sélection+déplacement au clic, attaque, capture observable, défaite forcée, `#restart`.
- `solvability.mjs` — mesure l'enveloppe d'action (portée move+attack), vérifie que tous les ennemis requis sont atteignables, fait jouer un bot qui doit GAGNER et réussir ≥1 capture.
- `run-oracle.mjs` — enchaîne logic → properties → e2e → solvability, exit 0 ssi tout passe.

## Ordre de construction
1. `game.mjs` (règles pures) + `logic.test.mjs` en parallèle (TDD-ish).
2. `level.mjs` (génération solvable) + propriétés.
3. `render.mjs` / `input.mjs` / `index.html` / `server.mjs` (jouable navigateur).
4. `solvability.mjs` (bot gagnant+captureur) puis `e2e.mjs`.
5. `run-oracle.mjs` + entrée `oracles.json`.
