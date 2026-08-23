# Kitten Clicker — Direction produit V1 (P0, PROPOSED — à ratifier par Pierre)
*Date : 2026-08-23 · Source : Fable, sur le HumanGate FAIL de Pierre après le run 9 (`kitten_clicker-20260823a`) et ses 4 causes
(chatons décoratifs · prestige = bouton · espace pauvre · guidage illisible). Baseline produit = build `_run9_20260823a/game_build9`.*

## Principe
Le joueur doit percevoir **une colonie qui se développe**, pas un compteur. Chaque élément visible est soit jouable, soit une
promesse explicitement marquée comme « à débloquer ». Rien n'est affiché avant d'être gagné, sauf sous forme de silhouette.

## NIVEAU 1 — « Le refuge »
**État de départ** : refuge vide (1 panier = 1 place libre), pelote, album de 6 **silhouettes grisées « ? »** (promesse
explicite, non cliquable). HUD : objectif (en haut, grand), ronrons, places `0/1`.
**Objectif 1** : « Caresse la pelote pour gagner 10 ronrons, puis adopte ton premier chaton ».
**Déblocages, dans l'ordre (chaque flèche = une possibilité NOUVELLE, pas un nombre)** :
```text
pelote → ronrons → ADOPTER (10) → chaton 1 occupe le panier, produit +1/s
      → apparaît : affordance « placer » (déplacer un chaton vers un lieu) — n'existait pas avant
      → objectif 2 : « Place ton chaton, puis gagne 30 ronrons pour une 2e place »
ACHETER UNE PLACE (30) → places 1/2 → ADOPTER chaton 2
      → décision récurrente (déjà mesurée) : ADOPTER (passif) vs AMÉLIORER la pelote (actif)
places pleines (2/2) → « impossible d'adopter » n'est PAS un mur : l'objectif dit « Ouvre le jardin pour 3 places de plus »
OUVRIR LE JARDIN (100) → lieu 2 visible, +3 places, les chatons placés au jardin produisent ×1,5
      → objectif 4 : « Place 2 chatons au jardin » → objectif 5 : « Remplis le refuge (5 chatons) — la portée suivante t'attend »
```
**Contrainte spatiale = règle de jeu lisible** : `places occupées / places totales` toujours affiché ; adopter est grisé avec
la raison (« plus de place : ouvre un lieu »), jamais un bouton mort.
**Fin de niveau 1** : 5 chatons placés ET jardin ouvert → l'affordance **PRESTIGE** apparaît (elle n'existe pas avant).

## PRESTIGE — « Nouvelle portée »
- **Reset observable** : ronrons → 0, chatons retirés (album conservé), places → 1, lieux → refuge seul, améliorations → 0.
- **Ce qui reste** : l'album (chatons découverts, désormais en couleur), le compteur de portées, les **cœurs**.
- **Bonus permanent** : +1 cœur par prestige ; chaque cœur = +25 % de ronrons (clic ET production) — lisible dans le HUD.
- **Changement de la partie suivante** : dès la portée 2, le **grenier** (lieu 3) est achetable et les chatons **rares** (silhouettes
  dorées de l'album) deviennent adoptables → c'est le niveau 2.
Un prestige qui ne fait pas ces 4 choses n'est pas un prestige.

## NIVEAU 2 — « La maison entière » (portée ≥ 2)
- **Nouvelle situation** : départ plus rapide (cœurs), grenier disponible, chatons rares.
- **Nouvelle ressource** : les **croquettes**, produites uniquement par le jardin ; un chaton rare coûte ronrons + croquettes.
- **Nouvelle décision (2ᵉ DECISION du contrat)** : développer le **jardin** (croquettes → chatons rares, production ×2) ou le
  **grenier** (+places, ronrons ×1,5) — les deux ne sont pas achetables en même temps au seuil courant ; non-dominance :
  jardin meilleur si le joueur vise l'album (rares), grenier meilleur s'il vise la production.
- **Nouvelle boucle** : compléter l'album des rares (3) → portée 3 → objectif final visible dès le départ : « album complet ».

## GUIDAGE (hiérarchie visuelle, règle de contrat — pas un oracle nouveau)
```text
OBJECTIF ACTUEL   — en haut, police la plus grande, contraste maximal (jamais gris sur beige)
ACTION À FAIRE    — l'affordance concernée est la seule mise en évidence (bordure/pulse)
CONSÉQUENCE       — sous chaque bouton : coût ET effet, sans chevauchement (conteneurs VBox, jamais de positions absolues)
PROCHAINE POSSIBILITÉ — une ligne « Ensuite : … » sous l'objectif
```
Test de lecture (HumanGate) : regarder l'écran 5 secondes et répondre « je dois faire quoi maintenant ? ».

## Ce que le contrat existant mesure déjà, sans rien ajouter
A→J + DECISION ×2 (niveau 1 : adopter/améliorer ; niveau 2 : jardin/grenier) · `appears` sur `placer`, `jardin`, `prestige`,
`grenier` (possibilités nouvelles, pas des nombres) · META_LOOP `resets` + ADVANTAGE (cœurs) · NEXT_GOAL `new_distinct` avec
des phrases réellement différentes (l'objectif nomme l'action). Ce que seul le HumanGate mesure : « j'ai envie de continuer
après le premier prestige ».
