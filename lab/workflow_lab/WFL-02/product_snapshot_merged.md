# Prisme — sortie RECOMBINÉE mécaniquement (coup A2 v0)

> Généré par `merge_prisme.mjs` — UNION par critère charter cité, AUCUN arbitrage sémantique.
> `claim_verdict` : NO_CLAIM_ALLOWED — recombinaison mécanique, pas un jugement de qualité.

## Périmètre produit (dérivé du contrôle réel, pas deviné)

Le contrôle (artefact s1 réel déjà produit) cite 6/9 critères charter : `SOLVABILITÉ PROUVÉE`, `LOGIQUE SÉPARÉE DU RENDU`, `DÉTERMINISME`, `PHYSIQUE DE REBOND ASSERTÉE STRICTEMENT`, `CONDITIONS DE FIN ASSERTÉES STRICTEMENT`, `CONTRAT DE JOUABILITÉ RESPECTÉ`.

## Couverture par critère (union du panel ×5)

### SOLVABILITÉ PROUVÉE

Couvert par 1/5 lens : variant/product_snapshot_back.md.

### LOGIQUE SÉPARÉE DU RENDU

Couvert par 2/5 lens : variant/product_snapshot_front.md, variant/product_snapshot_back.md.

### DÉTERMINISME

Couvert par 2/5 lens : variant/product_snapshot_gd.md, variant/product_snapshot_back.md.

### PHYSIQUE DE REBOND ASSERTÉE STRICTEMENT

Couvert par 1/5 lens : variant/product_snapshot_gd.md.

### CONDITIONS DE FIN ASSERTÉES STRICTEMENT

Couvert par 2/5 lens : variant/product_snapshot_ceo.md, variant/product_snapshot_back.md.

### CONTRAT DE JOUABILITÉ RESPECTÉ

Couvert par 4/5 lens : variant/product_snapshot_ceo.md, variant/product_snapshot_front.md, variant/product_snapshot_back.md, variant/product_snapshot_joueur.md.

## Règles observables — union brute, groupée par lens (rien fusionné, rien tranché)

Chaque bloc ci-dessous est le texte VERBATIM de la section « Règles observables » d'un lens. Aucune reformulation, aucune sélection d'une version « meilleure » qu'une autre — la fusion de texte ou l'arbitrage entre versions divergentes reste une décision HumanGate (hors scope v0).

### Source : variant/product_snapshot_ceo.md

- **R1 — Zéro dépendance runtime externe.** Le jeu tourne hors-ligne, sans CDN, sans
  compte, sans backend. *Preuve :* le charter l'exige (hors_scope) ; vérifiable par
  absence d'import réseau dans le code livré.
- **R2 — Session complète et bornée.** 3 niveaux, une fin nette (victoire de partie ou
  défaite), pas de boucle infinie ni de contenu qui nécessiterait un renouvellement
  continu de production. *Preuve :* le dernier niveau nettoyé déclenche VICTOIRE
  (critère charter « CONDITIONS DE FIN ASSERTÉES STRICTEMENT »).
- **R3 — Relance sans friction.** `#restart` remet la partie à zéro immédiatement — le
  coût de « recommencer » pour le joueur doit être nul (pas de rechargement de page,
  pas d'attente). *Preuve :* critère charter « CONTRAT DE JOUABILITÉ RESPECTÉ ».
- **R4 — Aucune fonctionnalité hors périmètre livrée « en douce ».** Pas de son, pas de
  power-up, pas de multi — le charter les exclut explicitement ; toute tentation de les
  ajouter « pendant qu'on y est » est un risque de dérive de scope et de budget, refusé
  ici. *Preuve :* audit du hors_scope charter vs code livré.
- **R5 — Le produit doit se juger fini au premier coup d'œil.** HUD complet visible en
  permanence (vies, score, niveau) — un juge externe (testeur, investisseur, joueur)
  qui regarde 5 secondes doit comprendre l'état du jeu sans explication. *Preuve :*
  critère charter « CONTRAT DE JOUABILITÉ RESPECTÉ » (hooks `window.__game_debug`,
  `#overlay`).

### Source : variant/product_snapshot_gd.md

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

### Source : variant/product_snapshot_front.md

- **R1 — Le rendu ne mute JAMAIS l'état qu'il dessine.** Aucune écriture sur l'objet de
  jeu depuis le module de rendu. *Preuve :* oracle d'architecture statique (le charter
  l'exige : « rendu et input consomment l'état, jamais l'inverse »).
- **R2 — Chaque champ nécessaire au rendu est un champ PUBLIC et stable de l'état**
  (position balle/raquette, liste de briques vivantes, score, vies, niveau, statut) —
  aucun champ interne/privé ne doit être indispensable pour dessiner correctement.
  *Preuve :* le rendu doit fonctionner sans jamais accéder à un champ préfixé privé.
- **R3 — `#overlay` est le SEUL élément DOM d'état de fin/pause**, et `#restart` le SEUL
  élément DOM actionnable — aucun autre élément interactif n'est nécessaire (input
  clavier only). *Preuve :* critère charter « CONTRAT DE JOUABILITÉ RESPECTÉ ».
- **R4 — Le rendu doit rester correct même si appelé à une fréquence différente de la
  simulation logique** (pas de couplage dur entre le pas de temps logique et le taux de
  rafraîchissement visuel). *Preuve :* dessiner deux fois de suite sans step() entre les
  deux doit produire un rendu identique (rendu idempotent tant que l'état ne change pas).
- **R5 — `window.__game_debug` expose un instantané LISIBLE sans navigation d'objet
  imbriqué complexe** (vies, niveau, position balle/raquette, statut à plat) — pour que
  le rendu (et l'oracle e2e) n'ait pas besoin de connaître la structure interne de
  `BreakoutGame`. *Preuve :* critère charter « CONTRAT DE JOUABILITÉ RESPECTÉ ».

### Source : variant/product_snapshot_back.md

- **R1 — Invariant : `lives` ne descend jamais sous 0.** Aucune séquence d'entrées ne
  doit produire un compteur de vies négatif. *Preuve :* test de propriété sur une longue
  séquence d'entrées aléatoires (bornées, déterministes par seed).
- **R2 — Invariant : le nombre de briques cassables vivantes ne peut ni devenir négatif
  ni augmenter à niveau constant** (seule une progression de niveau peut introduire de
  nouvelles briques). *Preuve :* test de propriété niveau-par-niveau.
- **R3 — Déterminisme total : même seed + même séquence d'entrées ⇒ état final identique
  bit à bit**, sur `n` steps arbitraires. *Preuve :* deux instances indépendantes, mêmes
  entrées, comparaison stricte de `ball`, `paddle`, `score`, `lives`, `level`, `status`.
- **R4 — Terminaison garantie : toute partie atteint un statut terminal (victoire ou
  défaite) en un nombre BORNÉ de steps**, jamais une boucle infinie silencieuse — sinon
  aucun bot/oracle de solvabilité ne peut jamais conclure. *Preuve :* un bot qui pilote
  jusqu'à `MAX_STEPS` doit toujours atteindre un statut terminal avant la borne, sur au
  moins une stratégie de jeu correcte.
- **R5 — Aucune mutation d'état hors des fonctions publiques de la classe de jeu** —
  toute écriture directe sur les champs internes depuis l'extérieur (render/input/tests)
  est une violation de frontière, même si elle « marche » ponctuellement. *Preuve :*
  audit statique des imports/usages croisés (R19 du charter).
- **R6 — `reset()` restaure un état BIT-À-BIT identique à l'état initial** (vies, score,
  niveau, position raquette/balle de service) — pas seulement « proche » ou « visible
  à l'écran ». *Preuve :* capturer l'état juste après construction, muter, `reset()`,
  comparer à la capture initiale par égalité stricte sur chaque champ.

### Source : variant/product_snapshot_joueur.md

- **R1 — Réponse immédiate au clavier.** Le mouvement de la raquette doit suivre la
  touche sans délai perceptible — pas de temporisation artificielle entre l'appui et le
  déplacement. *Preuve :* e2e — touche pressée, lecture de `paddle.x` au tick suivant,
  déplacement effectif dès le premier `step` après l'appui.
- **R2 — Je ne perds jamais une vie « sans voir venir ».** La balle qui passe sous la
  raquette doit être une trajectoire que j'ai pu suivre à l'écran — aucune téléportation
  ni saut de position d'un frame à l'autre. *Preuve :* le déplacement de la balle entre
  deux frames reste borné par sa vitesse × le pas de temps, jamais un saut disproportionné.
- **R3 — Un bon impact « paye » visiblement.** Taper la balle près du bord de la raquette
  produit un angle de sortie clairement plus latéral qu'un impact au centre — un joueur
  qui expérimente doit pouvoir SENTIR la différence, pas seulement la lire dans un
  changelog. *Preuve :* comparaison stricte des angles de sortie pour 3 points d'impact
  distincts (centre, bord gauche, bord droit).
- **R4 — La fin de partie est SANS AMBIGUÏTÉ.** Victoire et défaite doivent afficher un
  message distinct, immédiatement visible, sans action supplémentaire du joueur pour le
  découvrir. *Preuve :* `#overlay` affiche un libellé différent pour chaque issue
  (critère charter « CONTRAT DE JOUABILITÉ RESPECTÉ »).
- **R5 — Recommencer coûte un geste, pas une réflexion.** `#restart` doit ramener
  instantanément à une partie neuve et jouable, sans état résiduel de la partie
  précédente visible (score/vies/niveau remis à l'état de départ). *Preuve :* après clic
  sur `#restart`, `window.__game_debug` reflète l'état initial exact.

