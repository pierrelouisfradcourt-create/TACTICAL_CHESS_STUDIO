# Product Snapshot — Lens CEO (WFL-02, panel ×5, coup A1)

> **Étape Forge (simulée)** : 1 — Prisme Produit, regard CEO
> **run_id** : breakout-20260711 (charter réutilisé de WFL-01, sha256 identique)
> **isolation** : écrit en ne consultant QUE `shared/charter.yaml` — jamais les autres
> lenses de ce panel, jamais le contrôle.
> **point de vue imposé** : dirigeant qui doit pouvoir justifier CE produit précis avec un
> budget de production fini, sans promesse non tenable, sans périmètre qui dérive.
> **claim_verdict** : NO_CLAIM_ALLOWED — artefact narratif, aucun oracle mécanique sur le
> contenu (seulement sur la conformité structurelle, cf. `check_prisme.mjs`).

## 1. CE QUE LE JOUEUR VOIT

Une page web qui se charge et se joue instantanément, sans compte, sans réseau, sans
téléchargement d'assets — donc un coût d'acquisition et d'hébergement proche de zéro
(un fichier statique). Le joueur voit un jeu qui a l'air FINI, pas un prototype : HUD
complet (vies/score/niveau), état de victoire/défaite explicite, pas de zone morte à
l'écran. La sobriété visuelle (primitives canvas, pas d'assets externes) n'est pas une
contrainte technique cachée au joueur : elle DOIT se lire comme un choix de style
(minimaliste, lisible), jamais comme un manque.

## 2. CE QUE LE JOUEUR FAIT

Il joue une session complète (3 niveaux, fin nette) en quelques minutes — un produit à
COMPLÉTION RAPIDE, pas un produit à rétention forcée (aucun système de progression au-delà
d'une partie, aucune monétisation, aucun compte : le charter l'interdit explicitement, et
c'est un choix assumé pour cette itération, pas une lacune à combler plus tard sans le
dire). Le joueur relance via `#restart` sans friction — le produit doit inviter à
« encore une partie » par la qualité de la boucle elle-même, pas par un système externe de
rétention qui n'existe pas dans ce périmètre.

## 3. CE QUE LE JOUEUR RESSENT

Confiance dans la finition : rien ne doit avoir l'air cassé, débranché ou « à venir ».
Un produit qui se termine (victoire/défaite claire) plutôt qu'un système ouvert qui
traîne — cohérent avec un coût de production borné et un scope fermé, livrable une fois
et ré-évaluable ensuite (extension = décision séparée, pas un sous-entendu du produit
actuel).

## 4. RÈGLES OBSERVABLES (priorisées : viabilité du scope avant tout)

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

## Traçabilité — ancrage au charter

Chaque règle ci-dessus est une reformulation, filtrée par la priorité « scope tenable /
budget fini / rien de promis qui ne soit pas construit », des critères déjà présents dans
`shared/charter.yaml`. Aucune règle nouvelle n'a été inventée hors charter.

```
software_verdict: (aucun — artefact narratif)
evidence_verdict: (aucun — pas d'exécution)
claim_verdict: NO_CLAIM_ALLOWED
```
