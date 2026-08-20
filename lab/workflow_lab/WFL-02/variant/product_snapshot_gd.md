# Product Snapshot — Lens Game Designer (WFL-02, panel ×5, coup A1)

> **Étape Forge (simulée)** : 1 — Prisme Produit, regard Game Designer
> **run_id** : breakout-20260711 (charter réutilisé de WFL-01, sha256 identique)
> **isolation** : écrit en ne consultant QUE `shared/charter.yaml` — jamais les autres
> lenses de ce panel, jamais le contrôle.
> **point de vue imposé** : concepteur de jeu qui pense en courbe de difficulté, boucle
> de feedback et sensation de maîtrise — pas en fonctionnalités, en RESSENTI mesurable.
> **claim_verdict** : NO_CLAIM_ALLOWED.

## 1. CE QUE LE JOUEUR VOIT

Une raquette, une balle, un mur de briques — l'essentiel du genre, sans decoration qui
dilue la lisibilité de la trajectoire. Le VECTEUR de la balle doit être lisible d'un
regard (le joueur anticipe où elle va, sinon le jeu est injuste). La disposition de
briques doit visiblement se complexifier d'un niveau à l'autre (plus de rangées) — la
progression doit se VOIR, pas seulement se compter.

## 2. CE QUE LE JOUEUR FAIT

Il vise avec la raquette, pas seulement il la déplace : le point d'impact sur la
raquette doit changer l'angle de renvoi de façon perceptible et exploitable — sinon
« viser » n'est qu'un mot, pas une mécanique. Le joueur apprend, au fil des vies perdues,
à lire la trajectoire de la balle plus tôt — la courbe d'apprentissage doit venir de la
PRATIQUE du joueur, jamais d'un aléa qui rendrait l'échec immérité.

## 3. CE QUE LE JOUEUR RESSENT

Le ressenti central du genre casse-brique : la tension entre risque (rester agressif
près du filet pour renvoyer vite) et prudence (reculer pour sécuriser). Une défaite doit
toujours se sentir CAUSÉE par une décision du joueur (mauvais positionnement, mauvais
timing), jamais par une mécanique opaque. La victoire d'un niveau doit procurer un pic de
relâchement net (le mur qui se vide progressivement crée l'anticipation de ce pic).

## 4. RÈGLES OBSERVABLES (priorisées : la mécanique de visée et la courbe de difficulté)

- **R1 — L'angle de rebond raquette est une fonction CONTINUE et MONOTONE du point
  d'impact.** Plus l'impact est excentré, plus l'angle de sortie est excentré, sans
  saut ni plateau qui romprait la lisibilité du contrôle. *Preuve :* comparer 3+ points
  d'impact distincts, l'angle de sortie doit croître strictement avec l'excentration.
- **R2 — La difficulté croît avec le nombre de niveaux, de façon perceptible.** Le
  niveau 2 doit avoir visiblement plus de briques / une disposition plus dense que le
  niveau 1. *Preuve :* comparer le nombre de rangées générées niveau par niveau.
- **R3 — Aucune perte de vie non causée par le joueur.** La balle ne doit jamais
  disparaître, se téléporter, ou changer de trajectoire sans un événement de collision
  identifiable (mur, raquette, brique). *Preuve :* chaque changement de vecteur de
  vitesse doit être corrélé à une collision détectée, jamais spontané.
- **R4 — Le rebond mur/plafond est une réflexion PARFAITE (angle d'incidence = angle de
  réflexion sur l'axe concerné)**, condition nécessaire pour que le joueur puisse
  anticiper la trajectoire mentalement. *Preuve :* inversion stricte de la seule
  composante de vitesse concernée, l'autre inchangée.
- **R5 — Le service de balle après perte de vie a un angle FIXE et déterministe** (pas
  aléatoire) — sinon le joueur ne peut pas se repositionner en connaissance de cause
  avant le prochain lancer. *Preuve :* même seed, même angle de service à chaque fois.

## Traçabilité — ancrage au charter

R1 découle de « PHYSIQUE DE REBOND ASSERTÉE STRICTEMENT » (charter, angle fonction du
point d'impact). R2 découle de « niveaux à dispositions de briques SEEDÉES » comme
support de progression. R3/R4 découlent de « physique de rebond réelle ». R5 découle du
critère DÉTERMINISME. Aucune règle nouvelle n'a été inventée hors charter — seule la
PRIORITÉ (mécanique de visée et sensation de maîtrise avant tout) est spécifique à ce
regard.

```
software_verdict: (aucun — artefact narratif)
evidence_verdict: (aucun — pas d'exécution)
claim_verdict: NO_CLAIM_ALLOWED
```
