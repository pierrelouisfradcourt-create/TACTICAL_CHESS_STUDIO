# Q1_DISCRIMINANCE_EXECUTION_PROOF_V1

*2026-08-04. **MATCH sur une troisième famille d'exécution.** Aucun runtime créé, aucun
rôle créé, aucune capacité créée. `candidate_selector` et `mcts_selector` non modifiés,
`execution_binding` non contourné. Aucun LLM, aucun réseau.*

---

## BEFORE / AFTER

```
BEFORE   2 MATCH, tous deux via repair_runtime / adapter / request_file
         La branche deterministic n avait jamais ete exercee.

AFTER    3 MATCH, 3 familles distinctes :
         repair_runtime  · adapter    · request_file          REPAIR-LOOP-V1
         repair_runtime  · adapter    · request_file          M-ws6 (composition, 2 maillons)
         deterministic   · entrypoint · positional_artifact   Q1-DISCRIMINANCE
```

## Vérification préalable — faite avant toute modification

| élément | attendu | mesuré |
|---|---|---|
| recette `duplicate_content_gate_v1` | `ORACLE_FALSE_NEGATIVE` → `duplicate_content_detection` → `deterministic` | ✅ exact, `recipe_status: EXECUTABLE`, `proven: true` |
| capacité `duplicate_content_detection` | evidence présente, runtime identifiable | ✅ 4 `evidence_refs`, `runtime_role: deterministic` |
| statut de capacité | *(la mission attendait `PROVEN_EXECUTED_EMBEDDED`)* | **`PROVEN_EXECUTABLE`** — passé à ce statut lors de la consolidation du 2026-08-04, quand la capacité a reçu sa recette. C'est le seul statut que `execution_binding` accepte, donc la condition est plus forte que celle attendue. |
| rôle `deterministic` | déjà dans `roles.yaml → runtime_contracts` | ✅ déclaré le 2026-08-04, aucun runtime nouveau |

## Le plan résolu

```
# exec-f8dc0875a246dd23 — executable=true  mode=PLAN_ONLY
  recipe      duplicate_content_gate_v1
  runtime     deterministic <- roles.yaml#runtime_contracts.deterministic
  entrypoints oracle_quality.mjs, cross_field_quality.mjs, check_worldscan.mjs
  modele      aucun · coupure -
  chaine      duplicate_content_detection
    maillon   deterministic (runtime_contract) callable=scripts/forge/oracle_quality.mjs
  entrees     artifact_ref
  sorties     verdict, signaux, compte
```

## Le verdict

```
MATCH  (0 ecart)
  OK  runtime_called      appele=oracle_quality.mjs · declare parmi 3 entrypoints
  OK  files_in_scope      0 fichier(s) touche(s)          <- le runtime n ECRIT RIEN, verifie
  OK  expected_outputs    attendues=3 · observees=3
  OK  evidence_targets    3 cible(s) presentes
  OK  root_problem_stable plan=ORACLE_FALSE_NEGATIVE · observe=null
  OK  mutation_used       plan=Q1-DISCRIMINANCE · observe=null · acceptables=Q1-DISCRIMINANCE
  OK  required_inputs     1 fournie(s) / 1 declaree(s)
```

Trace : `lab/forge_evidence/Q1_DISCRIMINANCE_PROOF_V1/` — plan, requête, `execution_trace.json`, verdict.

## Ce que cette branche a exercé, que les deux autres n'exerçaient pas

| axe | les 2 MATCH précédents | celui-ci |
|---|---|---|
| runtime | `repair_runtime` | **`deterministic`** |
| niveau d'appel | `adapter` | **`entrypoint` direct** |
| convention d'invocation | `request_file` | **`positional_artifact`** |
| modèle | `qwen2.5-14b-instruct` | **aucun** |
| écritures | 4 à 7 fichiers | **0 — vérifié, pas supposé** |
| lecture de sortie | JSON strict | **`trailing_json`** (ligne humaine puis JSON) |

---

## Deux corrections, toutes deux « déclarer l'existant »

**1. Le contrat mentait sur le nom de sa propre sortie.** `roles.yaml` déclarait
`outputs: [verdict, signaux, compteurs]` ; `mesurerSignalSemantique` rend
`{verdict, signaux, compte}`. J'avais inventé un nom plausible au lieu de lire le code.
**Corrigé dans le contrat, pas dans le code** — un contrat qui invente le nom de sa sortie
ne peut vérifier personne. Un test verrouille désormais le cas.

**2. La convention d'invocation n'était nulle part.** Le premier callable lit un fichier
de requête, le second prend un chemin d'artefact en argument. La couche de preuve
l'aurait deviné. `invocation:` est désormais déclaré dans les deux contrats
(`request_file` / `positional_artifact`), et `argumentsDInvocation` le suit sans jamais
l'inférer.

*(Ainsi qu'une capacité d'observation : la sortie du CLI d'oracle n'est pas du JSON pur —
une ligne lisible précède le bloc. `parserSortie` essaie le strict puis le bloc final, et
**enregistre lequel a marché** dans la trace. Un parseur permissif qui tait son indulgence
transforme une observation en supposition.)*

---

## TESTS

`execution_proof` **33/33** (+9 pour cette branche) : runtime `deterministic` valide ·
entrypoint direct valide · runtime incorrect rejeté · sortie aux mauvais noms rejetée ·
evidence absente rejetée · mutation étrangère rejetée · `argumentsDInvocation` suit la
convention déclarée et refuse d'inventer un chemin · `parserSortie` enregistre son mode ·
zéro écriture vérifiée · déterminisme.

Suites complètes : node **670 · 669 pass · 1 fail pré-existant** · pytest **1404 pass ·
1 fail pré-existant**. Les deux MATCH précédents ont été **rejoués** après ces
changements : toujours MATCH, aucune régression.

---

## LIMITES

1. **Deux vérifications sont vides sur cette famille.** Le runtime déterministe ne
   rapporte ni `root_problem_id` ni `mutation_used` — c'est une mesure pure. Les checks 5
   et 6 passent **sans rien affirmer** (`observe=null`). Ils ne mordent que sur les
   runtimes qui échotent ces champs. Un MATCH ici est donc *moins contraignant* qu'un
   MATCH sur `repair_runtime`.
2. **Le MATCH prouve la conformité du plan, jamais la qualité.** L'artefact mesuré n'a pas
   été jugé bon ; il a été mesuré. `quality_not_proven: true` reste vrai partout.
3. **`positional_artifact` n'a été exercé qu'avec un seul argument.** Un contrat à
   plusieurs entrées positionnelles n'existe pas encore, et n'est pas géré.
4. **`trailing_json` est une tolérance.** Elle est enregistrée dans la trace, mais elle
   reste une tolérance : un CLI qui écrirait deux blocs JSON tromperait le parseur.
5. **Trois MATCH, trois chemins.** Rien ne dit que le quatrième se comportera pareil.

---

## Critère de fin de mission

```
MATCH repair_runtime          exec-…  REPAIR-LOOP-V1      ✅
MATCH composition M-ws6       exec-…  2 maillons          ✅
MATCH deterministic Q1        exec-f8dc0875a246dd23       ✅
```

Les trois sont présents. `AGENT_FACTORY_EXECUTE_V1` peut être ouverte **sous les cinq
conditions** de son contrat — HumanGate par exécution · scope obligatoire · MISMATCH =
arrêt · aucune boucle · aucun pouvoir de dispatch ajouté à la Factory.

`--execute` **n'est pas écrit**. La décision d'ouvrir reste à Pierre.

```
quality_not_proven: true
production_ready: false
claim_verdict: NO_CLAIM_ALLOWED
```
