# WFL-01 — Rollout run2 (N=2) — Résultats (2026-07-13)

- **Gabarit** : `docs/forge/WORKFLOW_LAB_PROTOCOL.md` §4, règle 4 (« N≥2 sur la branche
  gagnante avant toute conclusion »).
- **Pourquoi ce fichier** : run1 (`WFL-01/results.md`) est vert symétriquement mais N=1.
  Ce rollout rejoue le MÊME protocole (contrôle vs variante, même charter/contrat/oracle)
  avec un DEUXIÈME build indépendant, pour vérifier que le résultat de run1 n'est pas un
  coup de chance isolé.
- **claim_verdict** : NO_CLAIM_ALLOWED

## 1. Ce qui a été rejoué

`shared/{charter.yaml, blueprint.yaml, product_snapshot.md, wiremap_frozen.json}` sont
l'INPUT figé — réutilisés tels quels (aucune modification, c'est le même contrat qui doit
être satisfait). Les 10 fichiers de code (`{game,level,render,input,server}.mjs` ×
{control, variant}) ont été **réécrits de zéro** dans `run2/` — aucun fichier copié depuis
`run1/`, ni entre `run2/control` et `run2/variant`. Constantes, formules RNG, formats de
couleur, ordre des champs : tous différents de run1 et des deux côtés du run2 (nouvelle
tentative authentique, pas un rejeu du même texte).

L'isolation d'agent de la branche variante a été maintenue comme en run1 :
`run2/variant/level.mjs` écrit sans consulter `game.mjs` ; `run2/variant/game.mjs` écrit
en ne consultant QUE la forme publique documentée de `generateLevel()` (pas le corps de
`level.mjs`) ; `run2/variant/render.mjs` et `input.mjs` écrits en ne consultant QUE l'état
public de `game.mjs` (jamais son corps, jamais l'un l'autre).

## 2. Oracle réutilisé tel quel (aucune modification en run2)

`shared/{solvability,logic.test,properties.test}.mjs` — la version RÉÉCRITE en run1 (§2-3
de `results.md`) — copiés identiques dans `run2/control/` et `run2/variant/`. Sha256
vérifié identique aux 3 emplacements. **Aucune modification apportée à l'oracle pour faire
passer run2** : s'il avait fallu le retoucher ici, ç'aurait été un signal que la
réécriture de run1 était trop spécifique à ce build précis — ce n'est PAS le cas.

## 3. Résultat — VERT sur les deux branches, aucune modification d'oracle requise

```
run2/control/  : node --test logic.test.mjs properties.test.mjs → 25/25 pass, 0 fail
run2/variant/  : node --test logic.test.mjs properties.test.mjs → 25/25 pass, 0 fail

run2/control/  : node solvability.mjs → bot GAGNE en 26001 steps, score=1560, 32 briques cassées, exit 0
run2/variant/  : node solvability.mjs → bot GAGNE en 24541 steps, score=2376, 27 briques cassées, exit 0
```

## 4. run1 vs run2 — tableau de stabilité

| | run1/control | run1/variant | run2/control | run2/variant |
|---|---|---|---|---|
| Tests logic+properties | 25/25 | 25/25 | 25/25 | 25/25 |
| Solvabilité (bot gagne) | PASS (34696 steps) | PASS (30393 steps) | PASS (26001 steps) | PASS (24541 steps) |
| Oracle modifié pour ce build ? | oui (réécrit — run1 seulement) | oui (réécrit — run1 seulement) | **non** (réutilisé tel quel) | **non** (réutilisé tel quel) |

Les chiffres bruts (steps, score, nb de briques) varient d'un build à l'autre — attendu,
puisque chaque implémentation choisit ses propres constantes (nombre de rangées, valeur de
score) dans les marges laissées libres par le charter. Ce n'est pas un axe de comparaison
retenu par le panel §3 (règle 3 : pas de pondération choisie après coup). Le signal retenu
est binaire : **PASS partout, sans exception, sans retouche d'oracle**.

## 5. Conclusion — moins limitée qu'après run1, toujours pas définitive

- **Ce que N=2 ajoute par rapport à run1 seul** : le résultat « les deux architectures
  (agent unique vs agents bornés isolés) produisent un jeu conforme au contrat » n'est
  pas un artefact d'un seul build chanceux — il se reproduit sur un deuxième build
  entièrement indépendant, ET l'oracle réécrit en run1 s'est avéré réutilisable tel quel
  (signe qu'il teste le CONTRAT, pas les détails d'implémentation d'un build particulier).
- **Ce que ceci NE prouve toujours PAS** : aucune mesure de coût (tokens, temps de
  fabrication), aucune mesure de robustesse du PROCESSUS de fabrication multi-agent
  (nombre de renvois/erreurs pendant l'écriture, pas seulement le résultat final), aucun
  signal visuel (s10d). Le protocole (§3) prévoit ces axes ; ils restent hors de portée de
  cet oracle logique+solvabilité. Un jugement « pool de builders ≥ agent unique » n'est PAS
  ce que ce résultat établit — seulement : les deux PEUVENT produire un résultat conforme.
- **Prochaine étape recommandée (pas décidée ici)** : d'après la reprise de session,
  soit instrumenter un axe supplémentaire (coût/robustesse du processus, pas seulement le
  code final) avant toute promotion, soit passer à la prochaine expérience candidate
  (`search.mjs`) — décision Pierre, cf. `studio_brain/00_CURRENT_CONTEXT.md`.

```
software_verdict: OK (run2 complet, oracle réutilisé sans modification, vert sur les 2 branches)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
