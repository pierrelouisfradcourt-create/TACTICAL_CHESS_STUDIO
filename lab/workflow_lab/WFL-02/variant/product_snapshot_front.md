# Product Snapshot — Lens Front(end) (WFL-02, panel ×5, coup A1)

> **Étape Forge (simulée)** : 1 — Prisme Produit, regard Front-end
> **run_id** : breakout-20260711 (charter réutilisé de WFL-01, sha256 identique)
> **isolation** : écrit en ne consultant QUE `shared/charter.yaml` — jamais les autres
> lenses de ce panel, jamais le contrôle.
> **point de vue imposé** : personne responsable du rendu/de l'input/de ce qui touche le
> DOM — pense en état observable, hooks de debug, et ce qui est FAISABLE avec les
> primitives canvas imposées par le charter (pas d'assets, pas de framework).
> **claim_verdict** : NO_CLAIM_ALLOWED.

## 1. CE QUE LE JOUEUR VOIT

Tout dessiné en primitives canvas (rects, arc) — le charter l'impose, donc la lisibilité
visuelle doit venir de la COMPOSITION (contraste fond/éléments, alignement du HUD, taille
lisible du texte) et non d'assets qu'on n'a pas le droit d'utiliser. Chaque état de jeu
(en cours / victoire / défaite / pause) doit être visuellement distinguable sans lire le
texte — pas seulement via `#overlay`, mais par la scène elle-même (le mouvement s'arrête,
l'overlay assombrit le fond).

## 2. CE QUE LE JOUEUR FAIT

Il interagit UNIQUEMENT au clavier (charter : pas de souris/tactile pour cette
itération) — donc aucune zone cliquable n'est nécessaire dans le rendu, sauf `#restart`
qui EST un élément DOM actionnable (le charter l'exige explicitement comme hook, donc il
existe en dehors du canvas). Le rendu ne doit jamais avoir besoin de lire l'état pour le
modifier — un render.mjs qui muterait l'état serait une violation d'architecture détectée
par l'oracle statique (R19 du charter), donc AUCUNE logique de jeu ne doit fuiter dans le
rendu, même « pour simplifier ».

## 3. CE QUE LE JOUEUR RESSENT

De la fluidité perçue même si la simulation logique tourne à un pas de temps fixe côté
logique — c'est le rendu qui doit interpoler/rafraîchir assez souvent pour que le
mouvement ne saccade pas, sans jamais avoir besoin de connaître les détails internes de
la physique (juste lire x/y/status à chaque frame). Aucune surprise visuelle : un état
qui change dans les données DOIT se refléter au rendu suivant, sans délai perceptible ni
état visuel obsolète affiché.

## 4. RÈGLES OBSERVABLES (priorisées : contrat d'état lisible, séparation stricte rendu/logique)

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

## Traçabilité — ancrage au charter

Toutes les règles découlent du critère « LOGIQUE SÉPARÉE DU RENDU » et « CONTRAT DE
JOUABILITÉ RESPECTÉ » du charter — reformulées du point de vue de qui doit CONSOMMER
l'état sans jamais le connaître de l'intérieur. Aucune règle nouvelle hors charter.

```
software_verdict: (aucun — artefact narratif)
evidence_verdict: (aucun — pas d'exécution)
claim_verdict: NO_CLAIM_ALLOWED
```
