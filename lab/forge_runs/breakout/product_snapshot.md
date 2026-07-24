# Product Snapshot — Casse-briques (breakout)

> **Étape Forge** : 1 — Prisme Produit
> **run_id** : breakout-20260711
> **ancre** : `lab/forge_runs/breakout/charter.yaml` (étape 0)
> **point de vue** : réalisateur décrivant le produit FINI tel que le joueur le vit
> **date** : 2026-07-11
> **claim_verdict** : NO_CLAIM_ALLOWED — artefact narratif, aucun oracle mécanique à cette étape

Ce document décrit le produit **fini**, pas le chemin pour l'atteindre. Chaque Règle
observable Rn est formulée pour être **strictement testable** à l'étape aval (WireMap + tests +
oracle de solvabilité + e2e Playwright). Aucun champ « à définir ».

---

## 1. CE QUE LE JOUEUR VOIT

Le joueur ouvre une page web (HTML5 canvas plein écran de jeu, JavaScript vanilla, aucun
asset externe : tout est dessiné en primitives canvas — rectangles et arcs).

Il voit, en permanence sur le canvas :

- **La raquette** : un rectangle horizontal en bas de l'aire de jeu, qu'il pilote.
- **La balle** : un petit disque (arc) qui se déplace dans l'aire de jeu.
- **Le mur de briques** : une grille de rectangles colorés dans la partie haute, disposée
  selon le niveau courant (disposition seedée, donc identique à chaque partie de même seed).
- **Les bords de l'aire** : mur gauche, mur droit, plafond (haut). Le bas est la zone de
  perte (sous la raquette).
- **Le HUD (état lisible)** : le nombre de **vies** restantes, le **score**, le **numéro de
  niveau** courant, le nombre de **briques cassables restantes**.
- **L'overlay** (`#overlay`) : masqué pendant le jeu ; affiché pour l'état **VICTOIRE**,
  l'état **DÉFAITE**, et l'état **PAUSE**. Il porte un libellé lisible distinguant les trois.
- **Le bouton/élément de relance** (`#restart`) : visible et actionnable pour relancer une
  partie depuis l'état initial.

Le rendu est purement visuel : il **lit** l'état de jeu et le dessine, il ne le modifie
jamais (contrainte charter : rendu et input consomment l'état, jamais l'inverse).

---

## 2. CE QUE LE JOUEUR FAIT

- Il **déplace la raquette** vers la gauche et vers la droite au **clavier** (aucune souris,
  aucun tactile, aucune manette pour cette itération).
- Il **oriente la balle** indirectement : l'angle de rebond dépend du **point d'impact** de la
  balle sur la raquette (impact près d'un bord → renvoi plus latéral ; impact au centre →
  renvoi plus vertical). C'est son seul levier de visée.
- Il **casse les briques** en amenant la balle à leur contact ; chaque brique cassée augmente
  le score et fait progresser vers la condition de victoire.
- Il **enchaîne les niveaux** : à niveau nettoyé (toutes briques cassables détruites), il
  passe au niveau suivant ; au dernier niveau nettoyé, il **gagne la partie**.
- Il **relance** une partie complète via `#restart`, ce qui remet vies, score et niveau à
  l'état initial.
- (Optionnel de confort, prévu par l'overlay) il peut **mettre en pause** — l'overlay affiche
  l'état PAUSE ; la logique de jeu est figée tant que la pause est active.

L'entrée publique (l'API clavier / d'input) est le **seul** moyen d'agir : c'est aussi par
cette API qu'un **bot déterministe** pilotera la raquette pour prouver la solvabilité (interdit
de forcer l'état à la main).

---

## 3. CE QUE LE JOUEUR RESSENT

- **Contrôle et responsabilité** : la balle ne dévie jamais « toute seule » ; l'angle vient de
  son geste (point d'impact raquette). Il sent qu'il vise, pas qu'il subit.
- **Lisibilité immédiate** : à tout instant il sait où il en est — vies, score, niveau, briques
  restantes affichés ; les fins de partie sont annoncées sans ambiguïté par l'overlay.
- **Équité et cohérence** : la physique est reproductible et le niveau est seedé ; deux parties
  identiques se jouent pareil. Aucun aléa injuste, aucune mort inexpliquée : la balle ne meurt
  que quand elle passe réellement sous la raquette.
- **Tension maîtrisée** : perdre une balle coûte une vie mais pas la partie tant qu'il reste des
  vies ; la défaite n'arrive qu'à court de vies, la victoire qu'au dernier niveau nettoyé. La
  fin, quelle qu'elle soit, est méritée et claire.
- **Fluidité hors-ligne** : la page se joue localement, sans réseau, sans dépendance externe,
  sans temps de chargement d'assets.

---

## 4. RÈGLES OBSERVABLES (R1..R20)

Chaque règle est un comportement **observable et strictement testable**. « Preuve attendue »
indique le type d'oracle aval (test unitaire à assertion stricte, test de déterminisme,
oracle de solvabilité, e2e Playwright, oracle d'architecture statique). Les assertions strictes
sont exigées par le charter : aucune comparaison tautologique `>=`/`<=`/« existe » là où une
égalité ou une valeur exacte est observable.

### Mouvement & rebonds

- **R1 — La balle avance en continu.** À chaque tick de logique, la position de la balle change
  de `(vx, vy)` (vitesse non nulle). *Preuve :* après un tick, `pos != pos_précédente` avec delta
  égal strictement à `(vx, vy)`.
- **R2 — Rebond mur gauche/droit.** Quand la balle atteint un mur latéral, la composante
  horizontale de la vitesse s'inverse (`vx -> -vx`), la verticale est inchangée. *Preuve :* état
  posé au contact, un tick, `vx` égal strictement à l'opposé, `vy` inchangé.
- **R3 — Rebond plafond.** Quand la balle atteint le plafond, la composante verticale s'inverse
  (`vy -> -vy`), l'horizontale est inchangée. *Preuve :* assertion stricte sur `vy` opposé,
  `vx` inchangé.
- **R4 — Rebond sur la raquette, angle selon point d'impact.** Au contact raquette, `vy`
  s'inverse (la balle repart vers le haut) et `vx` est déterminé par la position relative du
  point d'impact sur la raquette : impact au centre → renvoi vertical (vx minimal), impact vers
  un bord → renvoi latéral de ce côté (signe de vx = côté de l'impact). *Preuve :* pour au moins
  trois points d'impact distincts (bord gauche, centre, bord droit), `vx` attendu à une valeur
  **exacte** calculée par la formule, `vy` opposé strict.
- **R5 — Rebond sur une brique.** Au contact d'une brique, la balle rebondit (inversion de la
  composante de vitesse correspondant à la face touchée). *Preuve :* état posé au contact d'une
  face donnée, un tick, composante concernée égale strictement à son opposé.

### Contrôle joueur

- **R6 — Déplacement raquette gauche/droite au clavier.** Une entrée « gauche » décrémente la
  position X de la raquette, une entrée « droite » l'incrémente, d'un pas déterministe. *Preuve :*
  e2e Playwright — touche gauche puis lecture `#__game_debug`, X raquette diminué de la valeur
  exacte du pas ; idem droite.
- **R7 — La raquette reste dans l'aire de jeu.** La raquette ne sort pas des murs : sa position
  X est bornée à `[bord_gauche, bord_droit - largeur_raquette]`. *Preuve :* pousser au clavier
  au-delà du bord, X raquette égal strictement à la borne, jamais au-delà.

### Briques, score, niveau

- **R8 — Brique touchée = détruite + score.** Une brique cassable au contact de la balle est
  retirée du niveau et le score augmente d'une valeur déterministe. *Preuve :* avant/après un
  contact, compte de briques restantes `-1` exact et score `+valeur` exact.
- **R9 — Une brique cassée ne réapparaît pas.** Une brique détruite reste détruite jusqu'au
  restart ou au niveau suivant. *Preuve :* après destruction, N ticks, la brique n'est plus dans
  l'état ; compte inchangé sans nouveau contact.
- **R10 — Niveau seedé déterministe.** À `seed + index_de_niveau` égaux, la disposition des
  briques générée est **identique** (positions, dimensions, cassable/non). *Preuve :* régénérer
  deux fois et comparer par égalité stricte des structures ; aucun `Math.random()`/`Date.now()`/
  `performance.now()` non seedé dans la génération.

### Vies & conditions de fin

- **R11 — Balle sous la raquette = perte d'une vie.** Quand la balle passe sous la raquette
  (franchit le bas de l'aire), le nombre de vies décrémente de 1 exactement, et la balle est
  remise en jeu à l'état de service tant qu'il reste des vies. *Preuve :* vies passe de `v` à
  `v-1` (égalité stricte) sur l'événement de sortie basse.
- **R12 — Défaite ssi vies == 0.** La partie est perdue **si et seulement si** le nombre de vies
  restantes atteint 0 après une balle perdue ; l'overlay affiche l'état DÉFAITE. *Preuve :*
  assertion stricte `vies == 0 => statut == DEFAITE` et `vies > 0 => statut != DEFAITE`.
- **R13 — Victoire de niveau ssi briques cassables restantes == 0.** Un niveau est gagné **si et
  seulement si** le compte de briques cassables restantes est **exactement** 0. *Preuve :*
  assertion stricte sur l'égalité à 0 ; un compte de 1 ne déclenche pas la victoire.
- **R14 — Progression de niveau.** À niveau nettoyé qui n'est pas le dernier, le jeu passe au
  niveau suivant (index +1) avec une nouvelle disposition seedée et la balle remise au service.
  *Preuve :* après nettoyage, `index_niveau` égal strictement à `précédent + 1`, briques
  rechargées.
- **R15 — Victoire de partie au dernier niveau.** Le dernier niveau nettoyé déclenche l'état
  VICTOIRE de la partie ; l'overlay affiche VICTOIRE. *Preuve :* nettoyage du dernier index,
  statut égal strictement à VICTOIRE.

### Overlay, restart, contrat de jouabilité

- **R16 — Overlay reflète l'état de fin/pause.** `#overlay` est masqué en jeu actif, affiché et
  correctement libellé pour VICTOIRE, DÉFAITE et PAUSE (trois libellés distincts). *Preuve :*
  e2e — provoquer chaque état et lire le contenu/visibilité de `#overlay`.
- **R17 — Restart remet l'état initial.** Actionner `#restart` remet vies, score et index de
  niveau **exactement** à leurs valeurs initiales et recharge le niveau 1 seedé. *Preuve :* e2e —
  altérer l'état, cliquer `#restart`, lire `#__game_debug` : vies/score/niveau égaux stricts aux
  valeurs initiales.
- **R18 — Hooks de jouabilité exposés.** La page expose `window.__game` (instance pilotable),
  `window.__game_debug` (état lisible : vies, niveau, briques restantes, position balle et
  raquette, statut victoire/défaite/pause), l'élément `#overlay` et l'élément `#restart`.
  *Preuve :* e2e — présence et lisibilité de chacun de ces hooks.

### Invariants d'architecture & déterminisme global

- **R19 — Logique séparée du rendu et de l'input.** Les modules de logique pure (état, physique,
  collisions, génération de niveau, conditions de fin) n'importent ni le rendu ni l'input et ne
  référencent **aucune** API DOM (`document`, `window`, `canvas`, `addEventListener`,
  `requestAnimationFrame`). Toute mutation d'état passe par une fonction de la logique. *Preuve :*
  oracle d'architecture statique déterministe (scan des imports/références interdites).
- **R20 — Solvabilité prouvée par un bot.** Un bot déterministe pilotant la raquette **via l'API
  d'entrée publique** joue le niveau 1 (seed de référence) du début à la fin et **gagne
  réellement** (toutes briques cassées, statut VICTOIRE). L'oracle de solvabilité sort SOLVABLE
  (code retour 0) sur le jeu correct et INJOUABLE (code non nul) sur un jeu volontairement cassé.
  *Preuve :* exécution de l'oracle de solvabilité, evidence_path fourni ; aucun forçage d'état à
  la main.

---

## Traçabilité — ancrage au charter (étape 0)

| Règle(s) | Ancre charter |
|---|---|
| R1, R2, R3, R4, R5 | critère « PHYSIQUE DE REBOND ASSERTÉE STRICTEMENT » |
| R6, R7 | objectif « raquette contrôlée au clavier » + entrée clavier uniquement |
| R8, R9 | objectif « briques » + critère fin (comptage strict) |
| R10, R14 | objectif « niveaux seedés » + critère « DÉTERMINISME » |
| R11, R12, R13, R15 | critère « CONDITIONS DE FIN ASSERTÉES STRICTEMENT » |
| R16, R17, R18 | critère « CONTRAT DE JOUABILITÉ RESPECTÉ » + « E2E PLAYWRIGHT VERT » |
| R19 | critère « LOGIQUE SÉPARÉE DU RENDU » |
| R20 | critère « SOLVABILITÉ PROUVÉE » + action interdite « certifier sans oracle de solvabilité » |

Toutes les règles héritent des assertions **strictes** exigées par le charter (interdiction des
tests tautologiques `>=`/`<=`). Aucun aléa non seedé (R10) ; aucune dépendance externe runtime.

---

## Rapport final (Règle de restitution)

- **Ancre non-LLM disponible à cette étape** : oui — le `charter.yaml` (étape 0) et son oracle de
  schéma déterministe. Chaque section et chaque règle Rn est cohérente avec un critère de succès
  ou une action interdite du charter (voir table de traçabilité).
- **Oracle mécanique sur le livrable lui-même** : aucun à l'étape 1 (artefact narratif). La
  validité observable/testable de chaque règle sera **prouvée** aux étapes aval (WireMap, tests à
  assertion stricte, oracle de solvabilité, e2e Playwright, oracle d'architecture statique).
- **software_verdict** : sans objet (aucun code produit à cette étape).
- **evidence_verdict** : sans objet (pas d'exécution d'oracle sur cet artefact).
- **claim_verdict** : **NO_CLAIM_ALLOWED**.
- **fog (besoin HumanGate)** : la cohérence narrative Voit/Fait/Ressent ↔ charter relève du
  **jugement de Pierre** (aucun oracle mécanique ne la certifie à l'étape 1). Points à trancher en
  gate si souhaité : (a) le pas exact de déplacement raquette et la formule d'angle d'impact (R4,
  R6) sont laissés au design d'implémentation, bornés par « valeur déterministe exacte » ; (b)
  l'inclusion de la PAUSE (R16) est prévue par l'overlay du charter mais non listée comme critère
  de fin — à confirmer comme facette de confort, non bloquante.
