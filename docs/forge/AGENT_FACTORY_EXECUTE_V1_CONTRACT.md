# AGENT_FACTORY_EXECUTE_V1 — contrat de préparation

*2026-08-04. **Contrat seul. Aucune implémentation.** `--execute` n'existe pas et ne doit
pas être écrit avant que les conditions ci-dessous soient tenues.*

---

## Ce qui est acquis

**Trois MATCH mesurés**, chacun sur une exécution réelle sous observation, dans **trois
familles d'exécution distinctes** :

| chemin | runtime | niveau d'appel | invocation | verdict |
|---|---|---|---|---|
| `REPAIR-LOOP-V1` | `repair_runtime` | adapter | `request_file` | **MATCH** 8/8 |
| `M-ws6` — composition, 2 maillons | `repair_runtime` | adapter | `request_file` | **MATCH** 8/8 |
| `Q1-DISCRIMINANCE` | **`deterministic`** | **entrypoint** | **`positional_artifact`** | **MATCH** 7/7 |

Preuves : `lab/forge_evidence/EXECUTION_PROOF_V0/` · `EXECUTION_PROOF_MWS6/` ·
`Q1_DISCRIMINANCE_PROOF_V1/`. Détail du troisième :
`Q1_DISCRIMINANCE_EXECUTION_PROOF_V1.md`.

Les deux conditions successives sont remplies : un second chemin **structurellement
différent** (composition, dont un maillon non appelable directement), puis une **famille
de runtime différente** (aucun modèle, aucune écriture, entrypoint direct).

## Les trois ambiguïtés levées, et ce qu'elles ont coûté

| # | ambiguïté | comment elle s'est manifestée | correction |
|---|---|---|---|
| 1 | `entrypoints` vs `adapter` : lequel accepte les entrées ? | la couche de preuve devait deviner | le plan porte `callable` + `callable_level`, tranchés par la Factory |
| 2 | une composition n'exposait qu'**un** `runtime_to_call` | le maillon `worldscan` était invisible dans le plan | `runtime_chain` — un maillon par capacité, avec son contrat et son `callable` |
| 3 | `mutation_used` : niveau plan ou niveau maillon ? | **MISMATCH réel sur M-ws6** — plan `M-ws6`, runtime `REPAIR-LOOP-V1` | la vérification accepte la mutation du plan **ou** celle du maillon exécuté, et rien d'autre |

Chacune a été trouvée par une exécution, pas par relecture. Le troisième cas est le plus
instructif : les deux valeurs étaient justes **à leur niveau**, et c'est la comparaison qui
était fausse.

*(Une quatrième, dans la couche de preuve elle-même : les chemins Windows ne
correspondaient jamais au périmètre déclaré en POSIX, donc tout fichier écrit passait pour
hors scope. Corrigée, testée.)*

---

## Ce que `--execute` devra faire — et rien de plus

```
FactoryExecutionPlan (executable=true)
        ↓
  [HumanGate explicite, par exécution]
        ↓
  execution_proof.executerSousObservation   ← le MÊME code que la preuve
        ↓
  execution_proof.comparer                  ← les MÊMES 8 vérifications
        ↓
  MATCH   -> l'exécution est retenue, la trace est versionnée
  MISMATCH -> l'exécution est SIGNALÉE, jamais corrigée, jamais réessayée
```

**`--execute` n'est pas un nouveau chemin d'exécution.** C'est le chemin de la preuve,
avec la trace conservée. S'il exécutait autrement que la preuve, la preuve ne prouverait
plus rien.

## Conditions d'ouverture — les cinq

1. **HumanGate par exécution, jamais par session.** Un `--confirm` ne vaut que pour l'appel
   qui le porte. Aucun mode « toujours autoriser », aucun fichier de configuration qui
   pré-approuve.
2. **Périmètre déclaré obligatoire.** `--scope` explicite ; toute écriture hors périmètre
   est un `MISMATCH`, et l'exécution est marquée non retenue.
3. **MISMATCH = arrêt.** Aucune reprise automatique, aucune correction, aucun second essai.
   La seule sortie d'un MISMATCH est un humain qui lit la trace.
4. **Aucune boucle.** Une invocation, une exécution. Pas d'enchaînement de plans, pas de
   file d'attente, pas de déclenchement par événement.
5. **Les compositions restent partielles.** Un maillon sans `callable` (rôle d'étape,
   dispatché par le driver) ne s'exécute pas ici : il doit être **repris sous empreinte
   vérifiée** ou l'exécution s'arrête. Faire exécuter `worldscan` par la Factory
   reviendrait à lui donner le pouvoir de dispatcher des agents — un pouvoir qu'elle n'a
   pas et ne doit pas prendre.

## Ce que `--execute` ne devra jamais faire

- choisir un plan (c'est `mcts_selector`) ;
- réparer un plan invalide ;
- élargir un périmètre ;
- réessayer après un MISMATCH ;
- écrire dans un registre (`mutation_registry`, `capabilities`, `agent_recipes`,
  `root_problems`, le ledger, `memory/`) ;
- transformer un MATCH en `production_ready`.

## Ce qu'un MATCH ne prouve toujours pas

**La conformité n'est pas la qualité.** Les deux MATCH disent que le plan décrit fidèlement
l'exécution. Ils ne disent rien de la valeur de ce qui a été écrit : `quality_not_proven`
reste `true` sur toute la chaîne, et l'artefact réparé porte encore des phrases comme
« J'ai apprécié de jouer à Cookie Clicker ».

**Aucun MATCH sur un rôle dispatché par le driver.** `worldscan` n'a jamais été exécuté
par cette chaîne : il est repris sous empreinte vérifiée. Un `--execute` ne pourra donc
jamais couvrir une composition en entier.

**Deux vérifications sont vides sur la famille `deterministic`** : ce runtime ne rapporte
ni `root_problem_id` ni `mutation_used`, donc les checks 5 et 6 passent sans rien
affirmer. Un MATCH y est moins contraignant qu'un MATCH sur `repair_runtime`.

---

## Décision demandée

☐ **Ouvrir `--execute`** sous les cinq conditions ci-dessus — les trois MATCH exigés sont
  présents

☐ **Ne pas ouvrir** — la Factory reste `PLAN_ONLY`, l'exécution reste manuelle et gatée

☐ **Ouvrir en restreignant** — par exemple aux seuls plans à un maillon, ou aux seuls
  runtimes qui échotent `mutation_used` (donc en excluant `deterministic`, dont le MATCH
  est le moins contraignant)

Tant qu'aucune case n'est cochée, `agent_factory.mjs --execute` continue de refuser, avec
son message.
