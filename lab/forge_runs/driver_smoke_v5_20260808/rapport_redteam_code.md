# Rapport red-team CODE — driver_smoke_v5_20260808 / s11-redteam-code

> Posture : auditeur AVEUGLÉ. Je n'ai lu que le code produit à l'étape 9
> (`src/logic.mjs`, `src/logic.test.mjs`) et les ancres mécaniques non-LLM
> (`evidence/oracle_driver_smoke_v5_20260808.log`, `oracles_override.json`,
> `state.json`). Je n'ai PAS consommé les justifications du builder comme
> autorité. Advisory uniquement — je critique, les oracles prouvent.
> Permissions : `run: aucun` → chaque reproduction est une ancre déterministe
> exécutable par un oracle non-LLM en aval, pas une commande que j'exécute.

## Périmètre réel du code audité

```js
// src/logic.mjs
export function clamp(x, lo, hi) {
  return Math.min(Math.max(x, lo), hi);
}
```

3 tests stricts (`assert.equal`, node:test) : x au-dessus (15→10), x en dessous
(-5→0), x dans la plage (5→5). `is_game: false`, `profile: patch` : smoke test de
pipeline, pas un jeu → le pré-mortem « oracle de SOLVABILITÉ » ne s'applique pas
(aucun objectif de jeu à atteindre ici). Le pré-mortem « pas de `>=` tautologique »
est **respecté** : les 3 assertions sont des égalités strictes.

## Ce qui tient (contrôles négatifs — pas de faille)

- **Correction du mécanisme** : `clamp` est l'idiome canonique `min(max(...))`.
  Ancre : `evidence/oracle_driver_smoke_v5_20260808.log` → `node --test` = `pass 3
  / fail 0`, `returncode 0`, `evidence_path` présent dans `state.json` (le
  pré-mortem s12 « reçu sans evidence_path ⇒ BLOCKED » est couvert).
- **Force de la suite (analyse de mutation à la main)** : les mutants évidents
  sont TUÉS par les 3 tests existants — retirer `Math.min` ⇒ `clamp(15,0,10)=15≠10`
  (test 1 échoue) ; retirer `Math.max` ⇒ `clamp(-5,0,10)=-5≠0` (test 2 échoue) ;
  échanger min/max ⇒ `clamp(-5,0,10)=10≠0` (test 2 échoue). Aucune mécanique morte
  masquée par un test faible détectée. Reproduction en aval : un oracle de mutation
  (ex. Stryker) sur `src/` confirmerait le kill de ces mutants.
- **Pas de preuve factice** : la sortie citée par le builder (`pass 3`) correspond
  exactement au log d'oracle indépendant sur disque. Pas de divergence claim↔oracle.
- **Pas de zone morte** : `clamp` est exporté et consommé par la suite ; module
  standalone par conception (smoke), donc l'absence de consommateur produit n'est
  pas un orphelin dormant ici.

## Failles (advisory)

### 1. Bornes inversées (`lo > hi`) silencieusement mal gérées — aucun garde, aucun test
- **Angle** : robustesse d'entrée / garde-fou implicite du contrat `clamp(x, lo, hi)`.
- **Faille** : quand l'appelant intervertit les bornes, la fonction ne signale rien
  et renvoie une valeur qui n'est PAS dans l'intervalle attendu. `clamp(5, 10, 0)`
  → `Math.min(Math.max(5,10), 0)` = `Math.min(10, 0)` = **0**. Le résultat dépend
  d'un accident d'ordre d'arguments et vaut toujours `hi`, jamais `x`. Aucun test
  ne couvre `lo > hi`, donc un futur refactor qui casserait ce cas ne serait pas
  détecté. C'est un écart contrat/code au sens faible : la signature promet un
  « clamp » mais ne défend pas sa précondition `lo <= hi`.
- **Sévérité** : LOW (comportement standard d'un clamp minimal, mais non prouvé et
  non documenté — le contrat n'exige pas explicitement de le garder).
- **Reproduction** (déterministe, exécutable en aval) :
  `node --input-type=module -e "import {clamp} from './logic.mjs'; import a from 'node:assert/strict'; a.equal(clamp(5,10,0), 0)"`
  (cwd = `src/`) → sort 0. Un oracle en aval peut asserter le comportement voulu
  (throw ? renvoyer `x` ? normaliser les bornes ?) — actuellement AUCUN choix n'est
  fixé ni testé.

### 2. Entrées non numériques / NaN propagées sans validation
- **Angle** : validation d'entrée (règle projet « valider en entrée de fonction »,
  CLAUDE.md §« Avant toute implémentation » — un parser/algo doit gérer input vide,
  caractères spéciaux).
- **Faille** : `clamp` n'a aucune garde de type. `clamp(NaN, 0, 10)` → `Math.max(NaN,
  0)=NaN` → `Math.min(NaN,10)=NaN` = **NaN** ; `clamp(5, NaN, 10)` = **NaN** ;
  `clamp("abc", 0, 10)` = **NaN**. Une valeur `NaN` se propage silencieusement au
  lieu d'être rejetée ou ramenée dans la plage — un `NaN` en aval casse tout
  comparateur/rendu sans trace. Aucun test ne couvre une entrée non finie.
- **Sévérité** : LOW (comportement `Math.*` standard, mais non prouvé et non borné
  par le contrat ; devient MEDIUM dès que `clamp` alimente un système où `NaN` est
  observable — hors périmètre de ce smoke).
- **Reproduction** (déterministe, exécutable en aval) :
  `node --input-type=module -e "import {clamp} from './logic.mjs'; console.log(Number.isNaN(clamp(NaN,0,10)))"`
  (cwd = `src/`) → sort `true`. Un oracle en aval peut asserter la politique voulue
  sur entrée non finie.

## Verdicts séparés (règle de restitution)

- **software_verdict: OK** — appuyé UNIQUEMENT par l'oracle vérifié
  `evidence/oracle_driver_smoke_v5_20260808.log` (`pass 3 / fail 0`, `returncode 0`)
  + `state.json` (`s10a-oracle-code` OK, `evidence_path` présent). Le mécanisme
  `clamp` est correct et sa suite tue les mutants de bornes. **Advisory** : ce
  verdict d'audit NE remplace PAS le verdict signé de s12 — je constate l'ancre
  oracle, je ne signe rien.
- **evidence_verdict: MECHANICAL_VALIDATION_ONLY** — toutes mes affirmations
  positives citent le log d'oracle non-LLM ou une analyse de mutation manuelle
  reproductible ; les 2 failles citent une reproduction `node -e` déterministe.
- **claim_verdict: NO_CLAIM_ALLOWED** — les 2 failles décrivent des comportements
  d'entrée non gardés dont la POLITIQUE voulue (throw / renvoyer x / normaliser)
  relève d'un choix de conception, pas d'un oracle existant.
  **fog → HumanGate (Pierre)** : faut-il durcir `clamp` (garde `lo<=hi`, rejet des
  entrées non finies) ou est-ce hors périmètre pour un smoke test de driver ? Aucun
  oracle actuel ne tranche — décision humaine.

## FORGE_CAUSAL_LINEAGE_V2

**why_task_existed:**
- **problem** : non transmis explicitement au red-team. Constaté : étape de
  red-team code (s11) déclenchée par le pipeline driver après un s9-build de patch
  (fix `clamp` incomplet → complet) et un s10a-oracle-code OK.
- **oracle** : le déclenchement de s11 vient du séquençage du driver
  (`state.json` : s10a OK → s11 RUNNING), pas d'un oracle rouge — activation par
  la mécanique de run, non par une mesure de défaut.
- **root_cause** : non établie (aucune faille bloquante dans le code audité ; le
  s9 antérieur — `Math.max(x,lo)` seul, sans borne haute — est déjà corrigé dans
  le code que j'audite).
- **action_reason** : produire un rapport de failles INDÉPENDANT, non biaisé par le
  raisonnement du builder, pour alimenter `redteam_advisory` du verdict signé.

**result:** Audit livré. Code `clamp` correct et prouvé par l'oracle
(3/3, returncode 0). 2 failles LOW advisory (bornes inversées non gardées ;
NaN/entrée non finie propagée), chacune avec reproduction déterministe. Aucune
preuve factice, aucune zone morte, aucun `>=` tautologique. `rapport_redteam_code.md`
écrit (seul livrable autorisé).

**proof:** Ancre non exécutée par moi (`run: aucun`) — je cite l'ancre déjà
produite : `evidence/oracle_driver_smoke_v5_20260808.log` →
`✔ pass 3 / ✖ fail 0`, `duration_ms 47.07`, et `state.json.steps.s10a-oracle-code
= {status: OK, returncode: 0, evidence_path: <log>}`. Reproductions des failles :
2 commandes `node --input-type=module -e ...` ci-dessus (sorties déterministes
`0` et `true`), exécutables par un oracle non-LLM en aval.

**learning:** Un `clamp` minimal `min(max())` est correct ET ses 3 tests stricts
tuent déjà les mutants de bornes — mais la même expression laisse passer sans trace
les bornes inversées (résultat = `hi`) et `NaN`. Sur ce type de fonction utilitaire,
le red-team utile n'est pas « le mécanisme est-il faux » (oracle le prouve) mais
« quelle précondition non gardée cassera silencieusement en aval ».

**next_reason:** Chaîne causale FERMÉE au niveau red-team. Aucune cause non résolue
ni preuve manquante : le software_verdict d'audit est OK, les 2 failles sont LOW
advisory et leur arbitrage (durcir ou non) est un fog HumanGate, pas une escalade
technique. s12-verdict agit ensuite normalement (findings → `redteam_advisory`,
jamais `humangate_flags`/`software_verdict` directement).

## SKIPPED_VALIDATION

| item | périmètre | statut | raison |
|---|---|---|---|
| Exécution des reproductions `node -e` | `src/logic.mjs` | non fait | contrat `run: aucun` — sorties dérivées de la sémantique déterministe `Math.min/max` (vérifiables en aval par un oracle) |
| Oracle de mutation réel (Stryker/équiv.) | `src/` | non fait | pas d'outil de mutation câblé sur ce run ; analyse de mutation faite À LA MAIN, à confirmer mécaniquement en aval |
| Audit hors `src/` (log d'oracle mojibaké `âœ"` dans le fichier evidence) | `evidence/*.log` | hors périmètre | mon scope est le code produit à s9 ; l'encodage de capture du log n'est pas du code `logic.mjs` — signalé ici pour traçabilité, non compté comme faille |
| Consommation des justifications du builder | `artifacts/s9-build.txt` | volontairement non fait | posture aveuglée (garde-fou) — ne pas reconstituer le raisonnement du builder |

```json
{"findings": [{"angle": "robustesse d'entrée / précondition lo<=hi", "faille": "Bornes inversées (lo>hi) silencieusement mal gérées : clamp(5,10,0) renvoie 0 (=hi) au lieu de signaler l'erreur ou renvoyer x ; aucun garde, aucun test ne couvre lo>hi.", "severite": "LOW", "reproduction": "cwd=src/ : node --input-type=module -e \"import {clamp} from './logic.mjs'; import a from 'node:assert/strict'; a.equal(clamp(5,10,0), 0)\" => exit 0 (l'assertion 0 passe, prouvant le résultat hors-plage)"}, {"angle": "validation d'entrée (NaN / non numérique)", "faille": "clamp n'a aucune garde de type : clamp(NaN,0,10), clamp(5,NaN,10) et clamp('abc',0,10) renvoient NaN silencieusement au lieu de rejeter/normaliser ; aucun test ne couvre une entrée non finie.", "severite": "LOW", "reproduction": "cwd=src/ : node --input-type=module -e \"import {clamp} from './logic.mjs'; console.log(Number.isNaN(clamp(NaN,0,10)))\" => affiche true"}]}
```
