# ROLE_REPAIR_RUNTIME_V2 — proposition fondée sur l'existant

*2026-08-04. **`scripts/forge/contracts/roles.yaml` n'est PAS modifié par ce document.**
Remplace `ROLE_REPAIR_RUNTIME_PROPOSAL_V1.md`, qui décrivait un rôle à construire. Celui-ci
décrit le rôle **qui tourne déjà** — il s'agit de le déclarer, pas de le créer.*

---

```yaml
role_name: repair_runtime

implementation:
  entrypoint:  scripts/forge/repair_step.mjs        # existant, NON modifié
  logic:       scripts/forge/repair_loop.mjs        # existant, NON modifié
  adapter:     scripts/forge/repair_runtime_adapter.mjs   # ajouté : contrat -> existant
  called_by:   scripts/forge/run_real.py:1164 (run_repair_step, 5 étapes amont)

model:
  provider:    lmstudio
  id:          qwen2.5-14b-instruct
  temperature: 0
  max_tokens:  400            # valeur RÉELLE du code (repair_step.mjs:93), pas un souhait
  fallback:    aucun          # pas d'escalade : un échec de réparation doit rester visible

cost:
  mesuré:      68 · 70 · 151 tokens de complétion   # 3 exécutions versionnées
  bande:       ~70 à ~150 tokens par réparation (1 à 2 champs)
  latence:     1,1 à 3 s

inputs:   contrat REPAIR_RUNTIME_CONTRACT_V1 — finding_id · root_problem_id ·
          artifact_ref · evidence_ref · allowed_fields · forbidden_fields
outputs:  patch · before · after · oracle_before · oracle_after · evidence_created ·
          mutation_used   (+ quality_not_proven, constant)

constraints:
  oracle_unchanged:  l'oracle est rejoué par l'appelant, jamais fourni par le runtime
  metrics_unchanged: aucune écriture dans capabilities.json / mutation_registry.json /
                     root_problems.json / le ledger / memory/
  scope_limited:     toute écriture hors `allowed_fields` annule la réparation entière
                     et restaure l'artefact (repair_runtime_adapter.mjs)
  no_verdict:        le runtime ne fixe pas ok/fail — capteur, pas juge
  kill_switch:       FORGE_REPAIR=0 le désactive entièrement
```

---

## Correction par rapport à la V1

La V1 annonçait « ~70 tokens » sur deux mesures (68 et 70). Le rejeu de la chaîne
`world_scan_repair_v1` à travers l'adaptateur en a donné **151** pour le même travail
(2 champs, même entrée, même modèle, température 0). Le résultat est identique — 18/18,
oracle vert, 0 régression — mais **le coût varie du simple au double**.

Deux conséquences, toutes deux honnêtes à porter :

- la bande annoncée devient **~70 à ~150 tokens**, pas « ~70 » ;
- `max_tokens` déclaré passe de la valeur souhaitée (256) à la valeur **réelle du code**
  (400). Déclarer un chiffre que l'implémentation contredit est exactement le défaut
  « une décision qui vit à côté d'une donnée qui la contredit » que `roles.yaml` documente
  déjà dans son propre en-tête.

---

## Preuve de fonctionnement — rejeu du 2026-08-04

Chaîne `world_scan_repair_v1`, exécutée **à travers l'adaptateur** :

| maillon | mode | résultat |
|---|---|---|
| `instance_separation` | repris de `M-ws5/after.json`, sha256 `0f7865ebd9a8a751` **vérifié** | 16/18 = **0,889** · oracle **FAIL** (2 problèmes) |
| `targeted_field_repair` | **rejoué en vrai** (LM Studio, temp 0) | 18/18 = **1,0** · oracle **OK** · 0 régression · 151 tokens |

`contract_status: CONFORME` · `mutation_used: REPAIR-LOOP-V1` · patch strictement dans le
périmètre déclaré. Preuve : `lab/forge_evidence/REPAIR_RUNTIME_V1/` (9 fichiers, dont la
requête de contrat et la commande de reproduction).

Le maillon de génération n'a pas été régénéré : sa sortie versionnée est **l'entrée exacte**
du maillon de réparation, vérifiée par empreinte. La chaîne est réellement chaînée, pas
juxtaposée.

## `quality_not_proven` — ce que ce rejeu ne prouve pas

L'oracle est vert. Voici ce qui a été écrit :

> `games[0].retention_answer` ← « J'ai apprécié de jouer à Cookie Clicker et j'ai trouvé
> cela une expérience agréable. »

C'est une réponse de rétention qui ne dit **rien** de la rétention. Le défaut mesuré est
fermé ; la qualité ne l'est pas. Le drapeau `quality_not_proven: true` est **constant dans
le code** — aucune exécution de ce runtime ne peut le faire tomber, parce qu'il faudrait
pour cela une mesure de qualité, qui n'existe pas à cet étage.

Les deux capacités qui attaqueraient ce défaut (`duplicate_content_detection`,
`cross_field_copy_detection`, `detection_rate = 1,0`) n'ont toujours **aucun rôle runtime**
et ne figurent dans **aucune recette**.

---

## Ce qui change mécaniquement si tu acceptes

1. `roles.yaml` : une entrée `repair_runtime` sous `lmstudio/qwen2.5-14b-instruct` ;
2. `capabilities.json` : `targeted_field_repair` → `executor_status: EXECUTABLE`,
   `capability_status: PROVEN_EXECUTABLE` (les 4 autres conditions sont déjà vraies) ;
3. `agent_recipes.json` : `world_scan_repair_v1` → `recipe_status: EXECUTABLE`, et
   `runtime_roles` cesse de déclarer `null` ;
4. `production_ready` reste **false** — c'est une décision séparée, jamais dérivée.

Rien de tout cela n'est fait tant que tu n'as pas tranché.

## Décision — prise le 2026-08-04

☐ **Accepter** `repair_runtime` tel que décrit (implémentation existante + adaptateur)

☐ **Refuser** — la recette reste `BLOCKED`, l'exécuteur continue de tourner hors registre

☑ **Accepter sous condition** — Pierre (HumanGate), 2026-08-04. Conditions portées dans le
  contrat lui-même, pas dans une note : `production_ready: false` et
  `quality_not_proven: true`, tous deux inscrits dans `roles.yaml`, `capabilities.json` et
  `agent_recipes.json`.

### Ce qui a été fait en conséquence

| fichier | changement |
|---|---|
| `scripts/forge/contracts/roles.yaml` | `repair_runtime` déclaré sous `lmstudio/qwen2.5-14b-instruct` + section `runtime_contracts` (mission, 6 entrées, 7 sorties, contraintes, limites) |
| `scripts/forge/capabilities.json` | `targeted_field_repair` : `PROVEN_BLOCKED_RUNTIME` → **`PROVEN_EXECUTABLE`** (dérivé, pas écrit à la main) |
| `scripts/forge/agent_recipes.json` | `world_scan_repair_v1` : `BLOCKED` → **`EXECUTABLE`**, `runtime_roles` ne déclare plus `null` |
| `scripts/forge/agent_recipe.schema.json` | enum des rôles resynchronisé sur `roles.yaml` (16) |

**Non modifiés** : `repair_step.mjs`, `repair_loop.mjs`, les oracles. Le code réel n'a pas
bougé — c'est sa déclaration qui a rattrapé son retard.
