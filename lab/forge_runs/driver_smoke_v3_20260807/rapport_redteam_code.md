# Rapport Red-Team CODE — driver_smoke_v3_20260807-run1 / s11-redteam-code

> Auditeur AVEUGLÉ (contexte vierge). Advisory uniquement — ne remplace aucun oracle.
> Périmètre lu : `lab/forge_runs/driver_smoke_v3_20260807/src/logic.mjs` + `logic.test.mjs`.
> Contexte : `is_game: false`, `profile: patch` (smoke test du driver Forge, pas un jeu).

## Surface auditée

```js
// logic.mjs
export function clamp(x, lo, hi) {
  return Math.min(Math.max(x, lo), hi);
}
```

```js
// logic.test.mjs — 3 tests
clamp(15, 0, 10) === 10   // au-dessus
clamp(-5, 0, 10) === 0    // en-dessous
clamp(5,  0, 10) === 5    // dans la plage
```

L'implémentation `clamp` est **correcte** pour `lo <= hi` et `x` numérique. Les 3 assertions sont
en égalité **stricte** (`assert.equal`), pas de `>=` tautologique — conforme au pré-mortem sur ce point.
L'oracle recorded (`evidence/oracle_driver_smoke_v3_20260807.log`) est **authentique** (sortie
`node --test` réelle, `returncode=0`, `pass 3 / fail 0`) : **aucune preuve factice** détectée côté oracle.

Les failles ci-dessous portent sur l'**adéquation des tests** (ce que l'oracle prouve réellement),
pas sur la correction de la ligne heureuse.

---

## Faille 1 — L'oracle ne prouve PAS que `clamp` utilise ses paramètres `lo`/`hi` (zone morte de test)

- **angle** : adéquation de test / mutation (mécanique non prouvée branchée)
- **sévérité** : MEDIUM
- **faille** : Les 3 tests appellent tous `clamp` avec **`lo=0, hi=10`** — jamais aucune autre borne.
  En conséquence, un mutant qui **ignore complètement** les paramètres `lo`/`hi` et code les bornes
  en dur passe **3/3**. L'oracle valide donc « le résultat pour (0,10) », pas « clamp respecte les
  bornes qu'on lui passe ». C'est précisément le mode de panne visé par le pré-mortem s10a
  (« un jeu aux objectifs inatteignables passe tous les tests unitaires » / « un `>=` masque une
  mécanique morte ») transposé à un paramètre non exercé : la mécanique « clamp lit ses bornes »
  est **non couverte**.
- **reproduction** (exécutable par un oracle non-LLM en aval — mutation test) :
  Remplacer `logic.mjs` par le mutant, puis `node --test logic.test.mjs` dans `src/` :
  ```js
  export function clamp(x, lo, hi) { return Math.min(Math.max(x, 0), 10); } // lo,hi ignorés
  ```
  Résultat attendu : `pass 3 / fail 0` (le mutant SURVIT). Preuve mécanique que la suite ne tue pas
  un clamp aux bornes hard-codées → couverture insuffisante. Un test discriminant serait p.ex.
  `assert.equal(clamp(5, 20, 30), 20)` (le mutant renverrait `10`, l'implémentation correcte `20`).

---

## Faille 2 — Bornes exactes (valeurs AU niveau de `lo` et `hi`) jamais assertées

- **angle** : couverture des cas limites
- **sévérité** : LOW
- **faille** : Aucun test n'assère le comportement pour `x == lo` ni `x == hi`
  (`clamp(0,0,10)` et `clamp(10,0,10)`). Ce sont les frontières exactes de la fonction ; leur
  absence laisse un mutant à comparaison stricte mal orientée potentiellement non détecté et, plus
  généralement, ne verrouille pas le contrat aux points les plus fragiles d'un clamp.
- **reproduction** (statique + oracle) : recherche dans `logic.test.mjs` — aucune occurrence de
  `clamp(0, 0, 10)` ni `clamp(10, 0, 10)`. Ajout suggéré, vérifiable :
  ```js
  assert.equal(clamp(0, 0, 10), 0);
  assert.equal(clamp(10, 0, 10), 10);
  ```
  puis `node --test logic.test.mjs` (doit rester vert sur l'implémentation actuelle — sert à figer
  la frontière contre les régressions futures).

---

## Faille 3 — Aucune précondition ni robustesse : bornes inversées et NaN silencieux

- **angle** : robustesse / préconditions d'entrée (règle CLAUDE.md « validation en entrée de fonction »)
- **sévérité** : LOW
- **faille** : `clamp` n'a **aucune** validation d'entrée. Deux comportements non spécifiés et
  silencieux :
  1. **Bornes inversées** (`lo > hi`) : `clamp(5, 10, 0)` renvoie `0` (=`hi`) sans erreur — le
     contrat « borne » est incohérent mais accepté silencieusement.
  2. **NaN** : `clamp(NaN, 0, 10)` renvoie `NaN` (propagation `Math.min/max`) au lieu d'échouer ou
     de retourner une borne.
  Aucun spec n'est fourni pour ces cas (profil `patch`, smoke), donc **advisory** : ce n'est pas
  prouvable comme « bug » sans intention déclarée. Remonté comme fog HumanGate, pas comme claim.
- **reproduction** (déterministe, exécutable par oracle non-LLM) :
  ```js
  import { clamp } from './logic.mjs';
  console.log(clamp(5, 10, 0));   // -> 0   (bornes inversées, silencieux)
  console.log(clamp(NaN, 0, 10)); // -> NaN (propagation silencieuse)
  ```
  Sortie attendue : `0` puis `NaN`. Un oracle peut asserter le comportement voulu une fois qu'un
  spec est ratifié (Pierre) — d'ici là : **NO_CLAIM_ALLOWED**, besoin HumanGate.

---

## RAPPORT FINAL

- **software_verdict** : `OK` — appuyé par l'oracle recorded `node --test logic.test.mjs`
  (`evidence/oracle_driver_smoke_v3_20260807.log`, `returncode=0`, `pass 3 / fail 0`) : la ligne
  heureuse de `clamp` est mécaniquement validée. Les failles 1-3 sont des **écarts d'adéquation de
  test / robustesse**, advisory — elles ne contredisent pas le vert de l'oracle, elles en bornent la
  portée.
- **evidence_verdict** : `MECHANICAL_VALIDATION_ONLY` — faille 1 et 2 réfutables/confirmables par
  mutation/ajout de test (oracle `node --test`) ; faille 3 démontrable par exécution déterministe
  mais sans spec de référence.
- **claim_verdict** : `NO_CLAIM_ALLOWED` — la faille 3 (comportement bornes-inversées / NaN) relève
  du **jugement** : sans intention produit déclarée, on ne peut pas trancher « bug » vs « accepté ».
  **fog → HumanGate (Pierre)** : faut-il durcir `clamp` (assert `lo <= hi`, rejet NaN) ou l'accepter
  tel quel pour un utilitaire de smoke ?

### RETURN LINEAGE (FORGE_CAUSAL_LINEAGE_V2 §3)

```
why_task_existed:
  problem: "non transmis — s11-redteam-code activé par la chaîne du driver (état s10a OK -> s11), pas de problème mesuré hérité en entrée"
  oracle: "aucun — activation par ordonnancement de la chaîne Forge, décision de dispatch (pas une mesure)"
  root_cause: "non établie — red-team advisory à contexte vierge, pas d'incident amont fourni"
  action_reason: "auditer le code produit à s9 pour écarts contrat/code, preuves factices et zones mortes avant le verdict s12"

result: "3 failles advisory produites, chacune avec reproduction exécutable par oracle non-LLM ; aucune preuve factice détectée sur l'oracle recorded ; software_verdict oracle (OK) non contredit"

proof: |
  Lecture seule (permissions run: aucun) :
  - src/logic.mjs (clamp = Math.min(Math.max(x,lo),hi)) et src/logic.test.mjs (3 tests, tous lo=0/hi=10)
  - evidence/oracle_driver_smoke_v3_20260807.log : "pass 3 / fail 0", returncode=0 (oracle authentique)
  Reproductions fournies (mutant hard-codé bornes, tests de frontière, cas lo>hi/NaN) exécutables par
  `node --test` en aval — NON exécutées ici (run: aucun).

learning: "Un oracle vert sur des tests dont TOUS les appels partagent les mêmes bornes (lo=0,hi=10) ne prouve pas que la fonction lit ses paramètres : un mutant qui hard-code les bornes survit 3/3. La couverture d'un paramètre exige de le FAIRE VARIER, pas seulement de faire varier l'entrée."

next_reason: "Chaîne FERMÉE pour le red-team : findings advisory transmis au verdict s12 via le bloc JSON (extract_redteam_findings -> redteam_advisory, jamais software_verdict). La faille 3 porte un besoin HumanGate (durcissement clamp ?) que seul Pierre tranche ; failles 1-2 sont des propositions de test qu'un oracle peut vérifier si une étape ultérieure les adopte."
```

### SKIPPED_VALIDATION

- **item** : exécution des reproductions (`node --test` avec mutant / tests de frontière) ·
  **périmètre** : `src/logic.test.mjs`, `src/logic.mjs` ·
  **statut** : non fait ·
  **raison** : permissions du contrat `run: aucun` — le red-team CRITIQUE, les oracles PROUVENT ;
  reproductions fournies pour exécution par un oracle non-LLM en aval.
- **item** : vérification du diff git réel « avant/après » de `clamp` ·
  **périmètre** : historique de `src/logic.mjs` ·
  **statut** : non fait ·
  **raison** : agent aveuglé (pas d'accès aux justifications builder ni au diff versionné) ; l'audit
  porte sur l'état livré du code, pas sur la narration du changement.
- **item** : audit d'architecture / wiremap / solvabilité produit ·
  **périmètre** : projet global ·
  **statut** : hors périmètre ·
  **raison** : `is_game: false` (smoke test du driver) — pas de boucle de jeu à prouver solvable ;
  couvert par les oracles archi/wiremap dédiés, pas par le red-team code.
```

```json
{"findings": [{"angle": "adéquation de test / mutation (mécanique non prouvée branchée)", "faille": "Les 3 tests appellent tous clamp avec lo=0,hi=10 ; un mutant qui ignore lo/hi et code les bornes en dur (Math.min(Math.max(x,0),10)) passe 3/3. L'oracle ne prouve pas que clamp lit ses paramètres de bornes — mécanique non couverte (mode de panne pré-mortem : mécanique morte passe tous les tests).", "severite": "MEDIUM", "reproduction": "Remplacer logic.mjs par: export function clamp(x, lo, hi) { return Math.min(Math.max(x, 0), 10); } puis, dans src/, node --test logic.test.mjs => pass 3/fail 0 (mutant survit). Test discriminant: assert.equal(clamp(5,20,30),20) (mutant renverrait 10)."}, {"angle": "couverture des cas limites", "faille": "Aucun test n'assère les valeurs exactement aux bornes: clamp(0,0,10) et clamp(10,0,10). Les frontières exactes de la fonction ne sont pas verrouillées.", "severite": "LOW", "reproduction": "grep dans src/logic.test.mjs: aucune occurrence de clamp(0, 0, 10) ni clamp(10, 0, 10). Ajout vérifiable: assert.equal(clamp(0,0,10),0); assert.equal(clamp(10,0,10),10); puis node --test logic.test.mjs (reste vert)."}, {"angle": "robustesse / préconditions d'entrée", "faille": "clamp n'a aucune validation: bornes inversées (lo>hi) renvoient hi silencieusement, et NaN se propage silencieusement. Sans spec produit, non tranchable comme bug -> fog HumanGate, pas de claim.", "severite": "LOW", "reproduction": "import { clamp } from './logic.mjs'; console.log(clamp(5,10,0)) => 0 ; console.log(clamp(NaN,0,10)) => NaN. Comportements déterministes reproductibles par node."}]}
```