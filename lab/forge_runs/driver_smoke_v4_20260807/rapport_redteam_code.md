# Rapport red-team CODE — driver_smoke_v4_20260807 (run1 / s11-redteam-code)

> Sous-agent AVEUGLÉ. Consomme uniquement le code de l'étape 9 (`src/logic.mjs`,
> `src/logic.test.mjs`) + les ancres non-LLM du run (oracle log, `oracles_override.json`,
> `state.json`), SANS les justifications du builder. Advisory : ne remplace pas les oracles.
> Permissions : read seul, `run: aucun` → toutes les reproductions sont des **ancres statiques**
> ou des **assertions exécutables par un oracle non-LLM en aval**, jamais exécutées ici.

## Contexte constaté (ancres)
- `src/logic.mjs` (3 lignes) : `export function clamp(x, lo, hi) { return Math.max(Math.min(x, hi), lo); }`
- `src/logic.test.mjs` : 3 tests — `clamp(15,0,10)===10`, `clamp(-5,0,10)===0`, `clamp(5,0,10)===5`.
- `state.json` : `is_game: false`, `profile: "patch"`, projet nommé « driver_smoke » → **run de fumée du driver**, pas un jeu.
- `evidence/oracle_driver_smoke_v4_20260807.log` : run **indépendant** `node --test logic.test.mjs` → `pass 3 | fail 0`. La preuve d'exécution existe et corrobore le rapport du builder (pas de preuve factice sur ce point).

## Séparation des verdicts
- **software_verdict:** OK — le code `clamp` est correct sur le domaine standard `lo<=hi` ; l'oracle indépendant (`evidence/oracle_driver_smoke_v4_20260807.log`) prouve 3/3 pass.
- **evidence_verdict:** MECHANICAL_VALIDATION_ONLY — appuyé sur l'oracle `node:test` re-exécuté indépendamment.
- **claim_verdict:** NO_CLAIM_ALLOWED.

Aucune faille HIGH. Le code est trivial et correct ; je refuse d'inventer une sévérité. Les constats ci-dessous sont des **faiblesses d'oracle et de garde-fou**, tous prouvés par une ancre statique reproductible.

---

## Faille 1 — Oracle mince : échantillon happy-path, aucun bord ni cas dégradé
- **angle :** test-coverage / force de l'oracle (pré-mortem s10a : « JAMAIS de test tautologique / une mécanique morte passe si l'oracle est mince »).
- **faille :** l'oracle ne teste que 3 points intérieurs/extérieurs. **Non couverts** : bornes exactes (`x==lo`, `x==hi`), bornes inversées (`lo>hi`), `NaN`, entrées non numériques. Une régression future qui casserait le comportement aux bornes exactes (ex. un passage à `>`/`<` strict, ou un `clamp` remplacé par une implémentation off-by-one) **ne serait pas détectée** par cette suite. Le vert de l'oracle prouve moins que ce que son nom (« clamp bounds a value ») promet.
- **sévérité :** MEDIUM.
- **reproduction :** ancre statique — `src/logic.test.mjs` lignes 5–15 ne contiennent aucune assertion sur `clamp(0,0,10)` / `clamp(10,0,10)` / `clamp(NaN,0,10)` / `clamp(5,10,0)`. Assertions **exécutables par un oracle non-LLM en aval** qui manquent et devraient passer/être décidées :
  `assert.equal(clamp(0,0,10),0)`, `assert.equal(clamp(10,0,10),10)` (bornes inclusives, actuellement vertes mais non pinnées).

## Faille 2 — Aucune validation d'invariant d'entrée : bornes inversées silencieuses
- **angle :** garde-fou / validation d'entrée (CLAUDE.md « Validation → invariants … en entrée de fonction »).
- **faille :** `clamp` ne vérifie pas la précondition `lo <= hi`. Avec des bornes inversées, la fonction renvoie `lo` en ignorant silencieusement `hi`, sans erreur ni signal. Comportement non spécifié et non signalé — classique « input non validé en entrée de fonction ».
- **sévérité :** LOW (dépend d'une intention non transmise : est-ce hors contrat ? → fog HumanGate).
- **reproduction :** ancre statique sur `src/logic.mjs:2`. Calcul déterministe reproductible par oracle : `clamp(5, 10, 0)` = `Math.max(Math.min(5,0),10)` = `Math.max(0,10)` = **10** — renvoie `lo`, hors de tout intervalle sensé. Assertion aval : `assert.equal(clamp(5,10,0),10)` documente le comportement actuel (à décider : bug ou hors-scope).

## Faille 3 — Propagation de `NaN` non gardée
- **angle :** robustesse / cas dégradé numérique.
- **faille :** aucune garde `NaN`/non-numérique. `clamp(NaN,0,10)` propage `NaN` au lieu de renvoyer une valeur de l'intervalle. Si un appelant compte sur un résultat borné, la garantie « valeur dans [lo,hi] » est violée sur entrée non numérique.
- **sévérité :** LOW (intention non transmise → fog).
- **reproduction :** ancre statique sur `src/logic.mjs:2`. Déterministe : `clamp(NaN,0,10)` = `Math.max(Math.min(NaN,10),0)` = `Math.max(NaN,0)` = **NaN**. Assertion aval : `assert.equal(Number.isNaN(clamp(NaN,0,10)), true)` prouve le passthrough.

---

## Ce que j'ai cherché et NON trouvé (transparence adverse)
- **Preuve factice / oracle circulaire :** cherché — **absent**. Le test importe réellement `clamp` depuis `logic.mjs` et l'oracle log est un run indépendant re-exécuté (`evidence/…log`), pas une recopie du texte du builder.
- **Test tautologique (`>=` masquant une mécanique morte) :** cherché — **absent**. Les tests utilisent `assert.equal` strict ; les tests A et B ensemble pinnent bien les DEUX bornes (une implémentation `Math.max`-only échoue A ; une `Math.min`-only échoue B).
- **Écart contrat/code sur la nature du livrable :** `is_game: false` → l'exigence de SOLVABILITÉ du pré-mortem s10a **ne s'applique pas** ici (voir SKIPPED_VALIDATION).
- **Mismatch build↔code :** le builder prétend avoir corrigé `Math.max`-only → `Math.max(Math.min(...))` ; `logic.mjs` EST la version corrigée. Cohérent, pas de mismatch.

## RETURN LINEAGE — s11-redteam-code:driver_smoke_v4_20260807-run1
- **why_task_existed:**
  - **problem:** non transmis (aveuglé). Constaté : run de fumée du driver Forge (`state.json` `is_game:false`, `profile:"patch"`, nom « driver_smoke_v4 ») — le but mesuré est d'exercer le pipeline s9→s12, pas de produire un artefact riche.
  - **oracle:** `node:test` sur `logic.test.mjs`, re-exécuté indépendamment → `evidence/oracle_driver_smoke_v4_20260807.log` (`pass 3 | fail 0`).
  - **root_cause:** non établie (aveuglé) — pour l'objet de MA tâche (red-team) : le code est correct sur son domaine standard ; les faiblesses sont côté **oracle mince** et **absence de garde d'entrée**, pas côté correction fonctionnelle.
  - **action_reason:** audit adverse à contexte vierge du diff s9, avec reproduction statique pour chaque constat (permission `run: aucun`).
- **result:** rapport produit. 3 constats advisory (1 MEDIUM oracle-thinness, 2 LOW garde-fou/robustesse), 0 HIGH, aucune preuve factice ni test tautologique détectés.
- **proof:** ancres statiques citées — `src/logic.mjs:2`, `src/logic.test.mjs:5-15`, `evidence/oracle_driver_smoke_v4_20260807.log`, `state.json` (`is_game:false`). Calculs déterministes reproductibles par oracle aval fournis dans chaque faille. (Je n'exécute pas : `run: aucun`.)
- **learning:** un artefact peut être **fonctionnellement correct** et porter une **suite d'oracle qui prouve moins que son nom** ; sur un `clamp`, l'oracle mince laisse passer toute régression aux bornes exactes, inversées ou NaN. La force de l'oracle se juge sur la variance des cas, pas sur le nombre de verts.
- **next_reason:** lignée FERMÉE pour ce niveau. Aucune faille bloquante ; les findings sont **advisory** → `redteam_advisory` du verdict signé (jamais `software_verdict`/`humangate_flags` directement). Les 2 LOW (bornes inversées, NaN) reposent sur une **intention non transmise** → remontée fog à HumanGate (voir ci-dessous), pas escalade auto.

## fog → HumanGate (jugement de Pierre requis)
- Le contrat de `clamp` autorise-t-il des bornes inversées (`lo>hi`) et des entrées `NaN`, ou doivent-elles lever/être gardées ? Sans cette intention, Faille 2 et Faille 3 restent des **observations non tranchables** par oracle → NO_CLAIM_ALLOWED.

## SKIPPED_VALIDATION
- **item :** exécution réelle des reproductions · **périmètre :** `src/logic.*` · **statut :** non fait · **raison :** permission `run: aucun` (red-team CRITIQUE, l'oracle PROUVE). Reproductions fournies comme calculs déterministes exécutables par un oracle non-LLM en aval.
- **item :** oracle de SOLVABILITÉ (un bot doit gagner, pré-mortem s10a) · **périmètre :** projet · **statut :** non applicable · **raison :** `state.json` `is_game:false` — pas de boucle de jeu à rendre solvable.
- **item :** décision merge/reject des Failles 2 & 3 · **périmètre :** garde-fou d'entrée `clamp` · **statut :** hors périmètre red-team · **raison :** dépend d'une intention non transmise → remonté en fog HumanGate, jamais tranché ici.

```json
{"findings": [{"angle": "test-coverage / force de l'oracle", "faille": "L'oracle ne teste que 3 points happy-path (15->10, -5->0, 5->5) ; aucune assertion sur les bornes exactes (x==lo, x==hi), bornes inversees (lo>hi), NaN, ou entrees non numeriques. Une regression future aux bornes exactes ne serait pas detectee : l'oracle prouve moins que son nom promet.", "severite": "MEDIUM", "reproduction": "Ancre statique src/logic.test.mjs:5-15 : aucune assertion sur clamp(0,0,10)/clamp(10,0,10)/clamp(NaN,0,10)/clamp(5,10,0). Assertions manquantes executables par oracle aval : assert.equal(clamp(0,0,10),0) ; assert.equal(clamp(10,0,10),10)."}, {"angle": "garde-fou / validation d'entree", "faille": "clamp ne verifie pas l'invariant lo<=hi ; avec des bornes inversees la fonction renvoie lo en ignorant silencieusement hi, sans erreur ni signal (CLAUDE.md : valider les invariants en entree de fonction).", "severite": "LOW", "reproduction": "Ancre statique src/logic.mjs:2. Deterministe : clamp(5,10,0)=Math.max(Math.min(5,0),10)=Math.max(0,10)=10. Assertion aval : assert.equal(clamp(5,10,0),10)."}, {"angle": "robustesse / cas degrade numerique", "faille": "Aucune garde NaN/non-numerique : clamp(NaN,0,10) propage NaN au lieu de renvoyer une valeur de l'intervalle, violant la garantie 'resultat dans [lo,hi]' sur entree non numerique.", "severite": "LOW", "reproduction": "Ancre statique src/logic.mjs:2. Deterministe : clamp(NaN,0,10)=Math.max(Math.min(NaN,10),0)=Math.max(NaN,0)=NaN. Assertion aval : assert.equal(Number.isNaN(clamp(NaN,0,10)),true)."}]}
```
