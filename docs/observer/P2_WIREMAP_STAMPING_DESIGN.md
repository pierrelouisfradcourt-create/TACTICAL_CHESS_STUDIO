# P2 — Wiremap vivante : design du stampage natif

*2026-08-02 · PROPOSED — design seul, migration sans casse, l'overlay reste la vérité observée en attendant*
*Fait d'appui : 52 lignes toutes à `state=REQUIRED` (51) / `DEFERRED` (1), champ
`preuve` vide partout, alors que 46/51 sont construites-observées (overlay
`wiremap_LIVING.json`, preuves SIGNED, dernière validation datée). La carte
prescrit, n'enregistre jamais.*

## Cible : chaque ligne porte son cycle de vie

```yaml
# champs AJOUTÉS au schéma de ligne (tous optionnels — migration douce)
lifecycle:
  state: required | implemented | tested     # remplace la lecture ambiguë de `state`
  evidence:                                   # vide interdit si state != required
    - kind: file_write | oracle | mutation | visual
      ref: <chemin ou reçu>
      sha256: <si disponible>
  last_verified: <ISO8601>
  verified_by: <oracle_id | run_id>           # jamais un agent LLM : un reçu
```

Sémantique dure, héritée des invariants du studio : `implemented` sans
`evidence` = INVALIDE (déclaré sans preuve) ; `tested` exige au moins un reçu
d'oracle ; le stampage est fait par du **code déterministe**, jamais par l'agent
qui a construit (un agent ne se note pas lui-même — leçon théâtre d'oracle).

## Qui stampe, quand

Candidat unique cohérent avec l'existant : **l'oracle standard `s10s`** (il lit
déjà la wiremap pour sa vérification de câblage). Après validation verte, il
écrit `lifecycle` sur les lignes dont les fichiers déclarés ont (a) une écriture
observée dans la fenêtre du run — ce qui exige le capteur P1-G4 (fichiers
touchés par étape), sinon la source serait les transcripts hors dépôt — et
(b) des reçus d'oracle couvrant le run. `last_verified` = ts du reçu.

Dépendance explicite : **ce design consomme P1-G4**. Sans lui, le stampage
reposerait sur une source purgeable — refusé.

## Migration sans casse (trois étages, chacun réversible)

1. **Étage 0 — aujourd'hui, déjà livré** : l'overlay Observer
   (`wiremap_LIVING.json`) porte la vérité observée SANS toucher la carte.
   Consommateur : vue s11. C'est l'étalon de comparaison du futur stampage.
2. **Étage 1 — schéma accepté, personne n'écrit** : les champs `lifecycle`
   deviennent VALIDES dans le schéma wiremap (optionnels) ; le validateur de
   wiremap (oracle wiremap existant) apprend à les vérifier S'ILS existent
   (implemented sans evidence = FAIL). Aucun producteur encore : les cartes
   existantes restent valides telles quelles — Breakout archive intouchée.
3. **Étage 2 — stampage actif** : `s10s` écrit `lifecycle` sur les runs FUTURS.
   Preuve de convergence : sur une campagne neuve, `wiremap_LIVING` (observé)
   et `lifecycle` (stampé) doivent CONCORDER ligne à ligne — tout écart est un
   drift nouveau (`stamp_vs_observed`), et c'est Observer qui le dira. L'overlay
   n'est PAS retiré : il devient le contre-pouvoir permanent du stampage.

## Fichiers touchés (étage 2, le seul qui code côté Forge)

`scripts/forge/static_oracles.py` ou le module s10s concerné (stampage,
~60 lignes) · schéma wiremap dans le standard (`scripts/forge/standard/`,
doctrine ratifiée) · rien d'autre. Étage 1 : schéma + validateur seulement.

## Consommateur · preuve · mesure de succès

- Consommateurs : la vue s11 (compare stampé/observé), les pré-morts de run
  (une ligne `tested` avec `last_verified` ancien = candidate à re-vérification),
  le graphe de production (états de nœuds enfin natifs).
- Preuve d'existence : première campagne dont la wiremap porte `lifecycle`
  stampé concordant avec l'overlay.
- Mesure de succès : l'écart « REQUIRED déclaré / construit observé » (46
  aujourd'hui) tombe à 0 sur les nouvelles campagnes — la carte dit enfin la
  vérité qu'elle prescrit.

**Arbitrage demandé** : ratifier les étages 1 puis 2 (gates séparées),
l'étage 2 étant conditionné à P1-G4.
