# Décomposition — Casse-briques (breakout)

> **Étape Forge** : 3 — Décomposition (modules à responsabilité unique + featuremap)
> **run_id** : breakout-20260711
> **amont** : `charter.yaml` (étape 0), `product_snapshot.md` (étape 1, R1..R20), `worldscan.json` (étape 2, advisory)
> **point de vue** : analyste — énumère les fonctions attendues, les range en modules à responsabilité unique,
> et mappe chaque Règle observable Rn à son module porteur.
> **date** : 2026-07-11
> **claim_verdict** : NO_CLAIM_ALLOWED — artefact de décomposition, aucun code, aucun oracle mécanique exécuté ici.

Découpage aligné sur les deux invariants du charter : (a) **séparation logique / rendu / input**
(critère « LOGIQUE SÉPARÉE DU RENDU », R19) ; (b) **solvabilité prouvée par un bot** (critère
« SOLVABILITÉ PROUVÉE », R20). Chaque **feuille** (capacité) porte sa `preuve_attendue`, **héritée**
de la « Preuve » de la Règle Rn correspondante dans `product_snapshot.md` — jamais inventée.

Convention de flux de dépendances (une seule direction, jamais l'inverse) :

```
level.mjs ──┐
            ├─►  game.mjs (logique pure, AUCUN DOM)  ◄── consommé par ──┐
input.mjs ──┘         │                                                 │
                      ▼ (état lisible seulement)                        │
                render.mjs (dessin canvas, AUCUNE logique)              │
                      ▲                                                 │
                index.html (canvas, #overlay, #restart, window.__game*) ┘
                      ▲
                server.mjs (sert la page, hors-ligne)

Preuve : logic.test.mjs · properties.test.mjs · solvability.mjs · e2e.mjs ─┐
                                                                run-oracle.mjs (enchaîne tout)
```

Interdit structurel (charter `actions_interdites` + R19) : `game.mjs` et `level.mjs` n'importent
**ni** `render.mjs` **ni** `input.mjs`, et ne référencent **aucune** API DOM (`document`, `window`,
`canvas`, `addEventListener`, `requestAnimationFrame`). Toute mutation d'état passe par une fonction
exportée de `game.mjs`.

---

## Arbre Système → Module → capacité (feuilles)

Système = **breakout** (jeu web déterministe et solvable). Features = **modules**. Feuilles = **capacités**,
chacune `{capacité, règle Rn, preuve_attendue}`.

---

### Module 1 — `game.mjs` (logique pure : état, physique, collisions, vies/score, conditions de fin)

- **Responsabilité (unique)** : détenir l'état de jeu et être le **seul** à le muter, via des fonctions
  pures/déterministes. Physique de la balle, rebonds, collisions briques, déplacement raquette borné,
  vies, score, progression et conditions de fin. **AUCUN accès DOM, aucun import de render/input.**
- **Dépendances** : `level.mjs` (pour charger/regénérer la disposition des briques d'un niveau). Rien d'autre.
- **Interface (exportée)** :
  - `createGame({ seed, lives, levelCount }) -> state` — construit l'état initial (niveau 1 chargé via `level.mjs`, balle au service).
  - `step(state) -> state` — avance la logique d'un tick (intègre position balle, teste et résout collisions/rebonds, applique conditions de fin). Détection de collision continue / pas borné (anti-tunneling, worldscan CCD).
  - `applyInput(state, intent) -> state` — applique une intention d'entrée (`LEFT` | `RIGHT` | `NONE` | `PAUSE` | `SERVE`) ; borne la raquette dans l'aire.
  - `reset(state) -> state` — remet vies/score/niveau aux valeurs initiales, recharge niveau 1 seedé.
  - `readDebug(state) -> {lives, level, bricksRemaining, ball:{x,y,vx,vy}, paddle:{x,w}, status}` — projection **lecture seule** de l'état (source de `window.__game_debug`).
  - `Status` — enum `PLAYING | WON | LOST | PAUSED`.
- **Capacités (feuilles) & preuves attendues** :

  | Capacité | Règle | preuve_attendue (héritée du Prisme) |
  |---|---|---|
  | La balle avance de `(vx,vy)` par tick | R1 | après un tick, `pos != pos_précédente`, delta **égal strictement** à `(vx,vy)` — test unitaire strict (`logic.test.mjs`) |
  | Rebond mur latéral : `vx -> -vx`, `vy` inchangé | R2 | état posé au contact, un tick, `vx` **strictement** l'opposé, `vy` inchangé (`logic.test.mjs`) |
  | Rebond plafond : `vy -> -vy`, `vx` inchangé | R3 | assertion **stricte** `vy` opposé, `vx` inchangé (`logic.test.mjs`) |
  | Rebond raquette, angle selon point d'impact | R4 | ≥ 3 points d'impact (bord gauche, centre, bord droit) : `vx` **exact** par formule, `vy` opposé strict (`logic.test.mjs`) |
  | Rebond brique selon face touchée | R5 | contact d'une face donnée, un tick, composante concernée **strictement** son opposé (`logic.test.mjs`) |
  | Déplacement raquette d'un pas déterministe (`applyInput`) | R6 | pas exact appliqué, vérifié bout-en-bout par clavier réel (`e2e.mjs`) ; logique du pas testable (`logic.test.mjs`) |
  | Raquette bornée `[bord_gauche, bord_droit - largeur]` | R7 | pousser au-delà du bord, X raquette **strictement** égal à la borne, jamais au-delà (`logic.test.mjs`) |
  | Brique touchée = détruite + score `+valeur` | R8 | avant/après contact : briques restantes **`-1` exact**, score **`+valeur` exact** (`logic.test.mjs`) |
  | Brique cassée ne réapparaît pas | R9 | après destruction, N ticks, brique absente de l'état, compte inchangé sans nouveau contact (`logic.test.mjs`) |
  | Balle sous la raquette = perte d'une vie + service | R11 | vies `v -> v-1` (**égalité stricte**) sur sortie basse, balle remise au service si vies restantes (`logic.test.mjs`) |
  | Défaite **ssi** vies == 0 | R12 | `vies == 0 => status == LOST` **et** `vies > 0 => status != LOST` (assertion stricte, `logic.test.mjs`) |
  | Victoire de niveau **ssi** briques cassables restantes == 0 | R13 | égalité **stricte** à 0 ; un compte de 1 ne déclenche pas la victoire (`logic.test.mjs`) |
  | Progression de niveau (index +1, rechargement seedé) | R14 | après nettoyage non-dernier, `index_niveau` **strictement** `précédent + 1`, briques rechargées (`properties.test.mjs`) |
  | Victoire de partie au dernier niveau | R15 | nettoyage du dernier index, `status` **strictement** `WON` (`logic.test.mjs`) |
  | `reset` remet l'état initial exact | R17 (part logique) | vies/score/niveau **strictement** égaux aux valeurs initiales après `reset` (`logic.test.mjs`) ; câblage `#restart` prouvé e2e |

---

### Module 2 — `level.mjs` (génération de niveaux seedée déterministe)

- **Responsabilité (unique)** : produire la disposition des briques d'un niveau de façon **déterministe**
  à partir de `(seed, index)`. RNG **xorshift** seedé (worldscan : « RNG seedable déterministe »). **Aucun**
  `Math.random()`/`Date.now()`/`performance.now()`. **AUCUN accès DOM.**
- **Dépendances** : aucune (module feuille). Consommé par `game.mjs`.
- **Interface (exportée)** :
  - `makeRng(seed) -> rng` — générateur xorshift déterministe (`rng() -> entier/float dérivé de la seed`).
  - `generateLevel(seed, index) -> { bricks: [{x, y, w, h, breakable}], meta }` — disposition reproductible.
  - `LEVEL_COUNT` — nombre de niveaux de la campagne (borne de R14/R15).
- **Capacités (feuilles) & preuves attendues** :

  | Capacité | Règle | preuve_attendue (héritée du Prisme) |
  |---|---|---|
  | Disposition **identique** à `(seed, index)` égaux | R10 | régénérer deux fois, **égalité stricte** des structures (positions, dimensions, cassable/non) ; aucun aléa non seedé (`properties.test.mjs` + scan statique dans `run-oracle.mjs`) |
  | Rechargement seedé du niveau suivant | R14 (part génération) | disposition du niveau `index+1` reproductible et non vide après progression (`properties.test.mjs`) |

---

### Module 3 — `render.mjs` (dessin canvas, lecture seule)

- **Responsabilité (unique)** : dessiner l'état sur le canvas en **primitives** (rects, arcs) — raquette,
  balle, briques, bords, HUD. **Lit** l'état, ne le **mute jamais**. **AUCUNE logique de jeu.**
- **Dépendances** : le contexte canvas 2D (fourni par `index.html`) + une projection lecture seule de l'état
  (`readDebug`/état). N'importe **pas** `game.mjs` pour muter — consomme seulement.
- **Interface (exportée)** :
  - `createRenderer(ctx, dims) -> renderer`
  - `renderer.draw(state) -> void` — dessine une frame (idempotent, sans effet de bord sur `state`).
  - `renderer.drawOverlay(status) -> void` — rendu visuel de l'overlay selon statut (support de R16).
- **Capacités (feuilles) & preuves attendues** :

  | Capacité | Règle | preuve_attendue (héritée du Prisme) |
  |---|---|---|
  | Le rendu ne mute jamais l'état | R19 (part rendu) | oracle d'architecture statique : aucune écriture d'état depuis `render.mjs`, aucune mutation (`run-oracle.mjs`) |
  | Overlay affiché/libellé selon VICTOIRE/DÉFAITE/PAUSE | R16 (part rendu) | e2e : provoquer chaque état, lire contenu/visibilité `#overlay` (`e2e.mjs`) |

---

### Module 4 — `input.mjs` (mapping clavier → intentions)

- **Responsabilité (unique)** : traduire les événements clavier en **intentions** de jeu
  (`LEFT`/`RIGHT`/`NONE`/`PAUSE`/`SERVE`) transmises à `applyInput` de `game.mjs`. Ne mute pas l'état
  directement ; ne dessine rien.
- **Dépendances** : DOM `addEventListener` (côté page, autorisé ici — ce n'est **pas** un module de logique
  pure). Émet des intentions consommées par la boucle qui appelle `game.mjs`.
- **Interface (exportée)** :
  - `createInput(target) -> input` — attache les écouteurs clavier.
  - `input.poll() -> intent` **ou** `input.onIntent(cb)` — expose l'intention courante/flux d'intentions.
  - `KEYMAP` — table touche → intention (gauche/droite/pause/service), déterministe et testable.
- **Capacités (feuilles) & preuves attendues** :

  | Capacité | Règle | preuve_attendue (héritée du Prisme) |
  |---|---|---|
  | Touche gauche/droite → intention correspondante | R6 (part input) | e2e Playwright : touche gauche puis lecture `__game_debug`, X raquette diminué du **pas exact** ; idem droite (`e2e.mjs`) |
  | L'input ne mute pas l'état directement | R19 (part input) | oracle d'architecture statique : toute mutation passe par `applyInput`/fonctions de `game.mjs` (`run-oracle.mjs`) |

---

### Module 5 — `server.mjs` (sert la page, hors-ligne)

- **Responsabilité (unique)** : servir `index.html` et les `.mjs` statiques en local (hors-ligne, aucune
  dépendance réseau externe) pour permettre le jeu réel et l'e2e Playwright. Log « interface jouable » au
  démarrage.
- **Dépendances** : runtime Node (serveur HTTP statique local). **Aucune** dépendance runtime externe/CDN
  (charter `actions_interdites`).
- **Interface (exportée)** :
  - `startServer({ port, root }) -> { url, close }` — démarre, retourne l'URL et un `close()`.
  - Log stdout « interface jouable » + URL (preuve de disponibilité pour l'e2e).
- **Capacités (feuilles) & preuves attendues** :

  | Capacité | Règle | preuve_attendue (héritée du Prisme) |
  |---|---|---|
  | Sert la page réelle sans dépendance externe | support R6/R16/R17/R18 (habilite l'e2e) | e2e charge l'URL servie et exécute ses assertions (code retour 0, artefact de preuve) (`e2e.mjs`) |

---

### Module 6 — `index.html` (page : canvas, overlay, restart, hooks de jouabilité)

- **Responsabilité (unique)** : composer la page — `<canvas>`, `#overlay`, `#restart` — câbler la boucle
  (input → `applyInput`/`step` de `game.mjs` → `render.mjs`), et **exposer** `window.__game` (instance
  pilotable) + `window.__game_debug` (état lisible via `readDebug`). C'est **le seul** point où logique,
  rendu et input se rejoignent, par consommation — jamais par fusion.
- **Dépendances** : `game.mjs`, `level.mjs` (via `game.mjs`), `render.mjs`, `input.mjs`, servie par `server.mjs`.
- **Interface (surface DOM/globale exposée)** :
  - `window.__game` — instance/état pilotable (avance de tick, `applyInput`, `reset`).
  - `window.__game_debug` — `readDebug(state)` : vies, niveau, briques restantes, position balle/raquette, statut.
  - `#overlay` — élément masqué en jeu, affiché/libellé pour VICTOIRE/DÉFAITE/PAUSE.
  - `#restart` — élément actionnable qui invoque `reset`.
- **Capacités (feuilles) & preuves attendues** :

  | Capacité | Règle | preuve_attendue (héritée du Prisme) |
  |---|---|---|
  | `#overlay` masqué en jeu, affiché/libellé aux 3 états | R16 | e2e : provoquer chaque état, lire contenu/visibilité `#overlay` (`e2e.mjs`) |
  | `#restart` remet l'état initial exact | R17 | e2e : altérer l'état, cliquer `#restart`, lire `__game_debug`, vies/score/niveau **strictement** aux valeurs initiales (`e2e.mjs`) |
  | Hooks `window.__game` / `window.__game_debug` / `#overlay` / `#restart` exposés | R18 | e2e : présence et lisibilité de chacun des hooks (`e2e.mjs`) |

---

### Module 7 — `logic.test.mjs` (tests unitaires à assertion stricte)

- **Responsabilité (unique)** : prouver la logique pure par **assertions strictes** (jamais `>=`/`<=`
  tautologique). Cible : physique/rebonds et conditions de fin ; tests **forts à la mutation** (tuent les
  mutants sur inversion de vitesse, décrément de vie, comptage de briques, condition de victoire).
- **Dépendances** : `game.mjs`, `level.mjs`. Aucun DOM.
- **Interface** : suite de tests exécutable (`node logic.test.mjs` / runner), code retour 0 = vert.
- **Capacités (feuilles) & preuves attendues** :

  | Capacité | Règle(s) | preuve_attendue |
  |---|---|---|
  | Assertions strictes physique/rebonds | R1,R2,R3,R4,R5 | valeurs exactes attendues, mutants tués, zéro test tautologique (sortie de test = evidence_path) |
  | Assertions strictes score/briques/vies/fin | R7,R8,R9,R11,R12,R13,R15,R17(logique) | égalités exactes (compte briques, score, vies, statut) ; mutants critiques tués |

---

### Module 8 — `properties.test.mjs` (tests de propriété / déterminisme)

- **Responsabilité (unique)** : prouver les **invariants de reproductibilité** — déterminisme de génération
  et de simulation, progression de niveau — par régénération/rejeu et **égalité stricte**.
- **Dépendances** : `level.mjs`, `game.mjs`. Aucun DOM.
- **Interface** : suite exécutable, code retour 0 = vert.
- **Capacités (feuilles) & preuves attendues** :

  | Capacité | Règle(s) | preuve_attendue |
  |---|---|---|
  | Niveau seedé identique à `(seed,index)` égaux | R10 | deux générations comparées par **égalité stricte** de structure |
  | Simulation identique à séquence d'entrées égale | R10/R1 (déterminisme physique) | deux rejeux d'une même séquence → états **strictement** égaux |
  | Progression de niveau reproductible | R14 | `index+1` et rechargement seedé prouvés après nettoyage |

---

### Module 9 — `solvability.mjs` (bot déterministe — oracle de solvabilité)

- **Responsabilité (unique)** : **prouver la jouabilité**. Un bot déterministe pilote la raquette **via
  l'API d'entrée publique** (`applyInput`/`window.__game`), suit la balle, et **gagne réellement** le
  niveau 1 (seed de référence). **Interdit** de forcer/placer l'état à la main.
- **Dépendances** : `game.mjs` (+ `level.mjs` via lui), l'API d'entrée publique. Peut tourner en pur logique
  (sans DOM) ou via `window.__game`.
- **Interface** : `runBot({ seed }) -> { won: bool, ticks, bricksBroken }` ; process **code retour 0 =
  SOLVABLE**, **code non nul = INJOUABLE**.
- **Capacités (feuilles) & preuves attendues** :

  | Capacité | Règle | preuve_attendue (héritée du Prisme) |
  |---|---|---|
  | Bot gagne le niveau 1 via l'entrée publique | R20 | exécution : toutes briques cassées + statut `WON`, **code retour 0 (SOLVABLE)** ; sur jeu volontairement cassé, **code non nul (INJOUABLE)** ; aucun forçage d'état ; evidence_path fourni |

---

### Module 10 — `e2e.mjs` (Playwright — contrat de jouabilité bout-en-bout)

- **Responsabilité (unique)** : charger la **page réelle** (servie par `server.mjs`), piloter la raquette
  **au clavier**, lire `window.__game_debug` et `#overlay`, prouver une **transition de jeu observable**
  et le fonctionnement de `#restart`. Produit un **artefact de preuve** (capture/log).
- **Dépendances** : Playwright, `server.mjs`, `index.html` (et toute la chaîne runtime).
- **Interface** : test exécutable, **code retour 0 = vert** + artefact référençable en `evidence_path`.
- **Capacités (feuilles) & preuves attendues** :

  | Capacité | Règle(s) | preuve_attendue (héritée du Prisme) |
  |---|---|---|
  | Déplacement raquette au clavier (pas exact) | R6 | touche gauche/droite → `__game_debug` X raquette varie du pas exact |
  | Overlay reflète les états de fin/pause | R16 | provoquer chaque état, lire `#overlay` |
  | Restart remet l'état initial | R17 | altérer, cliquer `#restart`, relire `__game_debug` |
  | Hooks de jouabilité présents et lisibles | R18 | présence/lisibilité `window.__game`, `window.__game_debug`, `#overlay`, `#restart` |
  | Transition de jeu observable (≥ 1 brique cassée par jeu réel + état de fin) | R8/R12/R15 (observable) | capture/log e2e, code retour 0 |

---

### Module 11 — `run-oracle.mjs` (enchaînement des oracles + architecture statique)

- **Responsabilité (unique)** : orchestrer les preuves — enchaîner `logic.test.mjs` → `properties.test.mjs`
  → `solvability.mjs` → `e2e.mjs`, **plus** l'**oracle d'architecture statique** (scan des imports/références
  DOM interdites dans `game.mjs`/`level.mjs`). Un seul FAIL arrête tout ; agrège les `evidence_path`.
- **Dépendances** : les 4 suites ci-dessus + accès lecture des sources pour le scan statique.
- **Interface** : `main() -> exit code` ; **code retour 0 = tous verts**, non nul = au moins un rouge ;
  émet un rapport agrégé (evidence_path par étape).
- **Capacités (feuilles) & preuves attendues** :

  | Capacité | Règle | preuve_attendue (héritée du Prisme) |
  |---|---|---|
  | Logique pure sans import render/input ni API DOM | R19 | oracle d'architecture **statique déterministe** : scan des imports/références interdites (`document`, `window`, `canvas`, `addEventListener`, `requestAnimationFrame`) dans `game.mjs`/`level.mjs` — zéro occurrence |
  | Chaîne de preuve complète et bloquante | tous (agrégat) | exécution enchaînée, un FAIL stoppe, evidence_path par oracle ; sans evidence_path => BLOCKED |

---

## Couverture R1..R20 (module porteur → module(s) de preuve)

| Règle | Module(s) porteur(s) | Module(s) de preuve |
|---|---|---|
| R1  | `game.mjs` (step) | `logic.test.mjs`, `properties.test.mjs` |
| R2  | `game.mjs` (physique) | `logic.test.mjs` |
| R3  | `game.mjs` (physique) | `logic.test.mjs` |
| R4  | `game.mjs` (rebond raquette) | `logic.test.mjs` |
| R5  | `game.mjs` (collision brique) | `logic.test.mjs` |
| R6  | `input.mjs` + `game.mjs` (applyInput) | `e2e.mjs` (+ `logic.test.mjs` pour le pas) |
| R7  | `game.mjs` (borne raquette) | `logic.test.mjs` |
| R8  | `game.mjs` (destruction + score) | `logic.test.mjs` (+ `e2e.mjs` observable) |
| R9  | `game.mjs` (état briques) | `logic.test.mjs` |
| R10 | `level.mjs` (RNG seedé) | `properties.test.mjs` + scan statique (`run-oracle.mjs`) |
| R11 | `game.mjs` (vies/service) | `logic.test.mjs` |
| R12 | `game.mjs` (défaite) | `logic.test.mjs` |
| R13 | `game.mjs` (victoire niveau) | `logic.test.mjs` |
| R14 | `game.mjs` + `level.mjs` (progression) | `properties.test.mjs` |
| R15 | `game.mjs` (victoire partie) | `logic.test.mjs` |
| R16 | `index.html` + `render.mjs` (overlay) | `e2e.mjs` |
| R17 | `index.html` (#restart) + `game.mjs` (reset) | `e2e.mjs` (+ `logic.test.mjs` pour reset) |
| R18 | `index.html` (hooks window.__game*) | `e2e.mjs` |
| R19 | frontières `game.mjs`/`level.mjs` purs vs `render.mjs`/`input.mjs` | `run-oracle.mjs` (oracle architecture statique) |
| R20 | `solvability.mjs` (bot) + `game.mjs` (API publique) | `solvability.mjs` (oracle solvabilité) |

**20/20 règles couvertes.** Chaque règle a ≥ 1 module porteur et ≥ 1 module de preuve. Aucune feuille orpheline :
chaque capacité listée ci-dessus porte `{capacité, règle Rn, preuve_attendue}`, la `preuve_attendue` étant
**héritée** de la « Preuve » du Prisme (`product_snapshot.md`), jamais inventée.

---

## Rapport final (Règle de restitution)

- **Oracle de complétude cité** : le vérificateur de complétude de la featuremap (contrat étape 3 §ORACLES) —
  invariant « chaque feuille porte {capacité, preuve_attendue}, aucune feuille orpheline ». Appliqué
  manuellement ici sur les 20 règles : chaque Rn a un module porteur, un module de preuve, et une
  `preuve_attendue` héritée du Prisme. **Aucune feuille sans `preuve_attendue`.**
- **Feuilles sans preuve_attendue** : aucune (0/20).
- **Ancre non-LLM disponible sur ce livrable** : à cette étape, l'oracle mécanique (script vérificateur de
  complétude) n'a **pas été exécuté** sur le fichier — la décomposition est un artefact de spécification.
  La validité mécanique (imports interdits, assertions strictes, déterminisme, solvabilité) sera **prouvée**
  aux étapes aval par les modules 7→11.
- **software_verdict** : sans objet (aucun code produit ici).
- **evidence_verdict** : sans objet (aucune exécution d'oracle sur cet artefact).
- **claim_verdict** : **NO_CLAIM_ALLOWED**.
- **fog (besoin HumanGate)** : (a) **tension de contrat** — le contrat générique étape 3 borne la sortie à une
  « featuremap » et exclut le découpage en modules (« c'est l'archi, étape 4 ») ; le dispatch de ce run
  (`FORGE_DISPATCH:s3-decompo`) demande explicitement une décomposition **en modules** dans `decompo.md`.
  Ce livrable honore le dispatch tout en respectant le garde-fou dur du contrat (chaque feuille = {capacité,
  preuve_attendue}, aucune orpheline). Le partage exact décompo-fonctionnelle vs archi (étape 4) relève du
  jugement de Pierre. (b) Valeurs laissées au design d'implémentation (bornées « exactes/déterministes ») :
  pas de déplacement raquette (R6) et formule d'angle d'impact (R4) — à figer en étape 4/5, non bloquant ici.
