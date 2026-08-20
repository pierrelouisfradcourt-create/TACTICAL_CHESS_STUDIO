# Product Snapshot — Lens Back(end) / Logique (WFL-02, panel ×5, coup A1)

> **Étape Forge (simulée)** : 1 — Prisme Produit, regard Back-end / logique de jeu
> **run_id** : breakout-20260711 (charter réutilisé de WFL-01, sha256 identique)
> **isolation** : écrit en ne consultant QUE `shared/charter.yaml` — jamais les autres
> lenses de ce panel, jamais le contrôle.
> **point de vue imposé** : responsable de l'état, du déterminisme et des invariants —
> pense en machine à états, preuve de terminaison, absence d'effets de bord cachés.
> **claim_verdict** : NO_CLAIM_ALLOWED.

## 1. CE QUE LE JOUEUR VOIT

Sans objet direct pour ce regard (le rendu n'est pas la préoccupation ici) — sauf en tant
que CONSÉQUENCE observable d'un état interne cohérent : si l'état est invariant-safe, ce
que le joueur voit est TOUJOURS représentable sans cas impossible (ex. vies négatives,
brique à la fois vivante et détruite, niveau hors bornes).

## 2. CE QUE LE JOUEUR FAIT

Ses actions (gauche/droite) sont des INTENTIONS transmises à la logique via une fonction
publique unique (`step`/`applyInput`), jamais une mutation directe. Le jeu doit rester
JOUABLE À REJOUER à l'identique : mêmes entrées + même seed ⇒ même déroulé, propriété
indispensable pour tout outil futur de replay, de bot de test ou de debug déterministe.

## 3. CE QUE LE JOUEUR RESSENT

Hors scope direct de ce regard — le back-end ne modélise pas le ressenti, il garantit
que RIEN d'incohérent ne puisse jamais être ressenti (pas de bug d'état qui casserait la
confiance dans la partie : vies qui remontent, brique qui réapparaît, victoire qui ne se
déclenche jamais alors que toutes les briques sont mortes).

## 4. RÈGLES OBSERVABLES (priorisées : invariants d'état, déterminisme, terminaison)

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

## Traçabilité — ancrage au charter

R1/R2 découlent des critères « CONDITIONS DE FIN ASSERTÉES STRICTEMENT ». R3 découle du
critère DÉTERMINISME. R4 découle de « SOLVABILITÉ PROUVÉE » (un bot doit pouvoir
conclure). R5 découle de « LOGIQUE SÉPARÉE DU RENDU » (R19). R6 découle du critère
« CONTRAT DE JOUABILITÉ RESPECTÉ » (`#restart`). Aucune règle nouvelle hors charter —
seule la priorité (invariants avant tout, le rendu et le ressenti sont hors du périmètre
de ce regard) est spécifique.

```
software_verdict: (aucun — artefact narratif)
evidence_verdict: (aucun — pas d'exécution)
claim_verdict: NO_CLAIM_ALLOWED
```
