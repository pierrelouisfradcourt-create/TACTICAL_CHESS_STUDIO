# Prisme Produit — Collect Runner (s1)

Produit fini : jeu 2D web (HTML5 canvas + JS vanilla), style arcade, jouable au clavier.
Le joueur ne pilote pas l'avance — il pilote l'évitement et la collecte pendant que le
niveau défile sous lui.

## Voit

- Un personnage sur un canvas 2D qui avance en continu de gauche à droite.
- Des pièces (coins) à ramasser, disposées le long du niveau.
- Des obstacles à éviter, disposés le long du niveau.
- Un compteur de pièces affiché à l'écran, mis à jour en temps réel.
- Un écran de victoire quand le dernier niveau est terminé.
- Un écran de défaite quand un obstacle est touché.
- Plusieurs niveaux distincts, générés automatiquement (disposition différente à chaque
  seed, mais reproductible pour une même seed).

## Fait

- Ne contrôle pas l'avance (automatique) — contrôle uniquement gauche / droite / saut.
- Se déplace latéralement (gauche/droite) pour se positionner sur les pièces et hors des
  obstacles.
- Saute pour franchir un obstacle ou atteindre une pièce en hauteur, puis retombe
  (gravité) et se repose au sol.
- Ne peut pas ré-enchaîner un saut tant qu'il n'a pas retouché le sol (pas de double
  saut).
- Termine un niveau en atteignant sa fin sans avoir été touché par un obstacle, ce qui
  enchaîne automatiquement sur le niveau suivant.
- Termine le jeu en terminant le dernier niveau.
- Recommence (implicite : nouvelle seed / nouvelle partie) après victoire ou défaite.

## Ressent

- Progression continue et sans friction (l'avance auto donne le tempo, le joueur gère
  la trajectoire).
- Tension courte à chaque obstacle/pièce en approche (décision gauche/droite/saut).
- Satisfaction immédiate et lisible à chaque pièce ramassée (compteur qui monte).
- Sanction claire et immédiate au contact d'un obstacle (pas d'ambiguïté sur la cause
  de la défaite).
- Équité perçue : la disposition d'un niveau donné (même seed) est toujours la même —
  pas de mort injuste due au hasard non reproductible.

## Règles observables

Chaque règle est formulée pour être vérifiable par une assertion mécanique sur l'état
du jeu (pas de jugement humain requis). Correspondance 1:1 avec `wiremap.json`.

1. **R1 — Avance automatique** : sans aucune touche pressée, appeler la boucle de mise
   à jour (`step`) plusieurs fois de suite fait strictement augmenter la position `x`
   du joueur.
2. **R2 — Déplacement gauche** : avec l'input gauche actif, `x` progresse moins vite (ou
   recule) sur le même intervalle de temps `dt` que sans input.
3. **R3 — Déplacement droite** : avec l'input droite actif, `x` progresse plus vite sur
   le même intervalle de temps `dt` que sans input.
4. **R4 — Saut** : déclencher un saut alors que le joueur est au sol (`onGround === true`)
   donne au joueur une vélocité verticale vers le haut et bascule `onGround` à `false`.
5. **R5 — Pas de double saut** : déclencher un saut alors que le joueur n'est pas au sol
   (`onGround === false`) est un no-op : la vélocité verticale ne change pas.
6. **R6 — Gravité / retombée** : appeler la gravité en boucle après un saut fait
   redescendre le joueur jusqu'à ce qu'il retouche le sol, moment où `onGround` repasse
   à `true`.
7. **R7 — Collecte de pièce → compteur** : faire chevaucher le joueur avec une pièce non
   encore ramassée incrémente le compteur de pièces de exactement 1 et retire cette
   pièce des pièces actives.
8. **R8 — Collision obstacle → défaite** : faire chevaucher le joueur avec un obstacle
   fait passer l'état du jeu à `defeat`.
9. **R9 — Défaite fige la progression** : une fois l'état à `defeat`, rappeler `step`
   ne fait plus avancer `x` (l'avance automatique de R1 s'arrête).
10. **R10 — Fin de niveau → niveau suivant** : quand `x` atteint/dépasse la longueur du
    niveau courant sans que l'état soit `defeat`, et qu'il reste au moins un niveau après
    le courant, l'index de niveau est incrémenté et un nouveau niveau est généré.
11. **R11 — Dernier niveau terminé → victoire** : la même condition de fin de niveau,
    atteinte sur le dernier niveau, fait passer l'état du jeu à `victory` au lieu de
    charger un niveau suivant.
12. **R12 — Génération de niveau seedée déterministe** : générer un niveau avec le même
    couple `(seed, levelIndex)` produit à chaque appel exactement la même disposition de
    pièces et d'obstacles (égalité stricte, pas juste même longueur).
