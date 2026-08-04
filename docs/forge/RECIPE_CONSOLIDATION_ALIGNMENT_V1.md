# RECIPE_CONSOLIDATION_ALIGNMENT_V1

*2026-08-04. **Aucune capacité créée, aucun rôle créé, aucune couche ajoutée.** Trois
écarts entre ce que la Forge déclare et ce qu'elle fait ont été corrigés ; un quatrième a
été mesuré et **laissé en l'état, faute de preuve d'association**.*

---

## BEFORE_STATE

```
duplicate_content_detection   MEASURED_NOT_EXECUTABLE  NON_UTILISEE_EN_RECETTE  runtime_role=null
cross_field_copy_detection    MEASURED_NOT_EXECUTABLE  NON_UTILISEE_EN_RECETTE  runtime_role=null
proven_chains[0]              {id, solves, capabilities, evidence, result}   ← doublon de la recette
root_problem.lesson_ids       [] sur les 4 problemes
```

## AFTER_STATE

```
duplicate_content_detection   PROVEN_EXECUTED_EMBEDDED  EMBEDDED_IN_RUNTIME  runtime_role=deterministic
cross_field_copy_detection    PROVEN_EXECUTED_EMBEDDED  EMBEDDED_IN_RUNTIME  runtime_role=deterministic
proven_chains[0]              {id, source_of_truth, note, evidence}          ← pointeur, preuve conservee
root_problem.lesson_ids       [] sur les 4 problemes                          ← INCHANGE, a dessein
```

---

## PHASE 1 — Capability Reality Alignment

**Le statut était faux, pas la capacité.** `MEASURED_NOT_EXECUTABLE` disait « ne s'exécute
pas » alors que le code tourne à **chaque réparation** :

```
scripts/forge/oracle_quality.mjs      mesurerSignalSemantique  ← repair_step.mjs:126, :192
scripts/forge/cross_field_quality.mjs mesurerCroise            ← repair_step.mjs:175, :193
```

### Quel rôle runtime est correct ?

**`deterministic`** — et il **existe déjà** (`deterministic/non-llm`, provider `forge`,
`roles.yaml`), il sert déjà aux oracles 10a/10b/10c et au verdict signé. La détection est
du **code pur** : aucun modèle n'intervient. Seule la *réparation* du signal appelle un
modèle, et elle appartient à `repair_runtime`.

C'était le piège de cet alignement : proposer un rôle `detection` aurait créé une entité
pour décrire un fait que le vocabulaire existant décrivait déjà.

### Quel contrat est nécessaire ?

**Aucun nouveau.** Un `runtime_contract` décrit ce qu'un runtime a le droit de faire avec
un modèle et des fichiers. Ces capacités ne font ni l'un ni l'autre : elles lisent un objet
en mémoire et rendent des compteurs. Le contrat qui les borne est celui de leur hôte —
`repair_runtime`, dont la contrainte `scope_limited` s'applique déjà à toute écriture.

### Quelle preuve doit être publiée ?

C'était le vrai maillon manquant. Les détecteurs s'exécutaient **sans laisser d'empreinte**
— indiscernables, dans la trace, de capacités qui ne tournent pas. `repair.result` porte
désormais un bloc additif :

```json
"embedded_capabilities": [
 {"capability_id": "duplicate_content_detection", "runtime_role": "deterministic",
  "verdict_before": "FAIL", "verdict_after": "PASS",
  "signals_before": {"DISCRIMINANCE": 2}, "signals_after": {"DISCRIMINANCE": 0}},
 {"capability_id": "cross_field_copy_detection", "runtime_role": "deterministic",
  "verdict_before": "PASS", "verdict_after": "PASS"}
]
```

Liste **vide** si la phase qualité n'a pas tourné : « ne pas détecter » et « ne pas
s'exécuter » sont deux faits différents, et un test le verrouille.

### Vocabulaire ajouté — deux mots, définis

| valeur | signification |
|---|---|
| `executor_status: EMBEDDED_IN_RUNTIME` | s'exécute **à l'intérieur** d'un autre runtime, non sélectionnable indépendamment |
| `capability_status: PROVEN_EXECUTED_EMBEDDED` | preuve + mesure + exécution réelle, **sans** recette propre |

`NON_UTILISEE_EN_RECETTE` restait vrai mais taisait l'exécution ;
`MEASURED_NOT_EXECUTABLE` était factuellement faux. `production_ready` reste `false` —
décision HumanGate, jamais dérivée.

---

## PHASE 2 — Une seule source de vérité pour la recette

**Source retenue : `scripts/forge/agent_recipes.json`.** Les quatre critères tranchent sans
ambiguïté :

| critère | `agent_recipes.json` | `proven_chains` |
|---|---|---|
| lu par `execution_binding` | **oui** | non |
| lu par `candidate_selector` | **oui** | non |
| versionnable | oui | oui |
| prouvable (`evidence_requirements` vérifiés) | **oui** | partiel |

`proven_chains[0]` devient un **pointeur**, et **aucune preuve n'est supprimée** : le chemin
`lab/forge_evidence/PROMPT_FIELD_OMISSION/M-ws6/measured_metrics.json` est conservé, et les
chiffres mesurés (0,889 → 1,0 · oracle FAIL → OK · 0 régression · 70 tokens) vivent dans ce
fichier versionné, pas dans la déclaration.

---

## PHASE 3 — Lessons binding : **rien complété, et c'est le résultat**

Vérification mécanique de la chaîne `lesson → supporting_runs → evidence → root_problem` :

```
18 lecons validees · 11 supporting_runs distincts
  breakout_v2 · breakout_v2-run1-* · pong_r2 · pong_r3 · snake-_run_* · tetris-fullgodot-*

associations CERTAINES trouvees : 0
```

La cause est structurelle, pas un oubli de saisie : les leçons proviennent de **runs de
jeu**, les problèmes racines de **expériences sur les workers** (`lab/forge_evidence/<ROOT_PROBLEM>/`).
Deux univers de preuve disjoints. Aucune leçon ne cite une preuve d'un problème racine, et
aucun problème racine ne cite un run de jeu.

**`lesson_ids` reste vide sur les 4 problèmes.** Le remplir par ressemblance sémantique
(`forge.broken_loop_repair_not_report` « ressemble » à `REPAIR_NON_CONVERGENCE`) aurait
fabriqué un lien que la preuve ne porte pas — exactement ce que la consigne interdit.

---

## PHASE 4 — Non converties, conformément aux exclusions

`M-rep-forme-fictive` · `M-conv-decroissance-stricte` · `M-rep-par-champ` · `Q2-LANGUE` ·
`Q3-RECOPIE` · `M-workflow-oracle-moment` · `M-workflow-capteur-pas-juge` ·
`M-schema-artefacts-amont` · `M-schema-claim`.

**Aucune touchée.** `mutation historique ≠ capacité composable` : ce sont des faits sur la
machinerie (forme d'un prompt, règle d'arrêt d'une boucle, moment d'appel d'un oracle).
Leur `recipe_missing` reste le bon verdict.

---

## PHASE 5 — Inventaire réutilisable (identification seule, aucun dataset créé)

```
COMPONENT:      6 checkers mecaniques (worldscan · prisme · decompo · blueprint · wiremap · artbible)
TYPE:           oracle deterministe, non-LLM
INPUT:          artefact JSON de l etape
OUTPUT:         {ok, verdict, problems[]} — chemins de champs + raisons
EVIDENCE:       6 fichiers .test.mjs, tous verts
TRAINING_VALUE: ELEVE — paires (artefact defectueux -> diagnostic precis) generables a volonte,
                sans etiquetage humain. C est la seule surface du depot qui produit un
                label mecanique.

COMPONENT:      49 contrats d etape (scripts/forge/contracts/*.yaml)
TYPE:           specification d agent (17 champs, schema SCHEMA.md)
INPUT:          objectif · in_scope · permissions · gardeFou
OUTPUT:         prompt rendu + payload de dispatch
EVIDENCE:       consommes par prepare_dispatch, traces dans dispatch_audit.jsonl (SIGNED)
TRAINING_VALUE: MOYEN — 0 sur 49 porte un root_problem_id ; sans lui, un contrat est une
                intention, pas un couple (probleme, solution).

COMPONENT:      33 verdicts signes (lab/forge_runs/*/verdict.json)
TYPE:           resultat d execution scelle par HMAC
INPUT:          run complet d un projet
OUTPUT:         software/evidence/claim + oracles + git_head
EVIDENCE:       hmac verifiable par verify_run
TRAINING_VALUE: ELEVE en volume, FAIBLE en exploitabilite immediate — un verdict dit qu un
                run a marche, jamais quelle metrique il a deplacee ni pour quel probleme.

COMPONENT:      18 lecons validees (lab/reports/lessons.jsonl)
TYPE:           enonce cause -> effet, avec supporting_runs
INPUT:          echec observe en run reel
OUTPUT:         statement + caused_by + counter_examples
EVIDENCE:       evidence_count >= 1, retrieval cable (premortem_lessons -> prompt)
TRAINING_VALUE: ELEVE — deja consomme en production comme contexte de prompt. C est le seul
                composant du depot dont la boucle apprentissage est FERMEE.

COMPONENT:      reparations completes (REPAIR-LOOP-V1, M-ws6, REPAIR_RUNTIME_V1)
TYPE:           trajectoire before -> oracle -> patch -> after -> oracle
INPUT:          artefact rejete + problems[]
OUTPUT:         paires {path, value} + verdict recalcule
EVIDENCE:       before/after/oracle_before/oracle_after/measured_metrics versionnes, sha verifies
TRAINING_VALUE: TRES ELEVE — la trajectoire complete est capturee, avec le verdict d un juge
                non-LLM aux deux bouts. Reserve connue : la sortie ferme le defaut MESURE,
                pas le defaut reel (quality_not_proven = true partout).
```

---

## STATUS_BY_SURFACE

| surface | statut | fait |
|---|---|---|
| **capabilities** | **IMPLEMENTED + TESTED** | 4 capacités, 2 réalignées sur leur exécution réelle, 2 tests ajoutés |
| **recipes** | **IMPLEMENTED + TESTED** | 1 recette, source de vérité unique, doublon résolu en pointeur |
| **lessons** | **BLOCKED** | 18 validées, retrieval câblé, **0 association certaine** vers un root_problem |
| **evidence** | **IMPLEMENTED + TESTED** | aucune preuve supprimée ; une trace d'exécution ajoutée (`embedded_capabilities`) |
| **mutations** | **IMPLEMENTED + TESTED** | 25 au registre, 9 explicitement non converties |

Pas de verdict global.

---

## Preuves de non-régression

- **aucun runtime ajouté** — `roles.yaml` non modifié (16 rôles, inchangé) ; `deterministic` existait déjà ;
- **aucune capacité inventée** — `capabilities.json` : 4 avant, 4 après ;
- **aucun LLM appelé, aucun réseau** — les changements sont des éditions de fichiers et un bloc de trace ;
- **aucun changement de philosophie** — `production_ready: false` partout, `quality_not_proven: true` maintenu, `claim_verdict: NO_CLAIM_ALLOWED` ;
- **chaîne de décision inchangée** — `REPAIR-LOOP-V1 → executable=true` et `REPAIR_NON_CONVERGENCE → 1 retenu / 5 rejetés`, identiques à avant l'alignement.

**Tests** : pytest **1404 pass / 1 fail pré-existant** (+2) · node **601 · 600 pass / 1 fail pré-existant**.
