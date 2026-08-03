# TETRIS_RUN_REPORT — run de référence Claude, profil `full_godot`

*Généré le 2026-08-03. Source : `lab/forge_runs/tetris/` (state.json, verdict.json),
`lab/reports/observer/tetris/`, sortie de `forge.verify_run`.*
*Mission Pierre 2026-08-03 « Tetris Godot Full Forge Run V1 ». Ce document rapporte, il ne ratifie rien.*

```
software_verdict: FAIL
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED
```

---

## STATUS

**FAIL / BLOCKED — verdict signé, intégrité AUTHENTIQUE.** La chaîne a été parcourue en entier :
14 étapes sur 14 exécutées, `run_status: DONE`, aucune étape sautée. Le verdict est un échec
**honnête** au sens de la doctrine : `verify_run` sort en **exit 0** (`HMAC OK`, `évidence intacte`,
`preuve mutation intacte`), c'est-à-dire que l'échec est authentiquement prouvé, pas subi.

`humangate_notes` du driver : *« escalade refusée : déjà au tier max (opus) — escalade impossible,
remonter HumanGate »*. Le comportement attendu : la Forge n'a ni bouclé ni maquillé, elle a rendu la
main.

## PROFILE

`full_godot` (créé ce jour, commit `336e5d1`) — 14 étapes :
`s0-contrat · s1-prisme · s2-worldscan · s3-decompo · s4-archi · s5-wiremap · s6-redteam-plan ·
s9-build-godot-standard · s10a-oracle-code · s10b-oracle-archi · s10c-oracle-wiremap ·
s10s-oracle-standard · s11-redteam-code · s12-verdict`

Run : `tetris-fullgodot-20260803-084719`.

## PHASES_DONE

| étape | statut |
|---|---|
| s0-contrat | OK |
| s1-prisme | OK |
| s2-worldscan | OK |
| s3-decompo | OK |
| s4-archi | OK |
| s5-wiremap | OK |
| s6-redteam-plan | OK |
| s9-build-godot-standard | OK |
| s10a-oracle-code | **FAIL** |
| s10b-oracle-archi | OK |
| s10c-oracle-wiremap | OK |
| s10s-oracle-standard | **FAIL** |
| s11-redteam-code | OK |
| s12-verdict | OK |

**Ce que ce run prouve pour la première fois dans le studio** :
`lab/forge_runs/tetris/wiremap_frozen.json` **existe, avec 9 règles gelées**. Aucun jeu Godot
n'avait jamais figé son jeu de règles — `standard_godot` n'émet aucun événement de gel. Et
`s10b-oracle-archi` / `s10c-oracle-wiremap`, les deux oracles portés en `SKIPPED` sur breakout_v2 et
acceptés en `humangate_flags`, sont ici **exécutés et verts**. Les deux flags structurels de Breakout
ne sont donc plus une fatalité de profil.

## FILES_CHANGED

Jeu produit sous `games/tetris/` — **12 systèmes GDScript** (`collision`, `debug_state`, `game_loop`,
`game_state`, `gravity`, `input_rules`, `line_clear`, `lock_rules`, `params`, `piece_bag`,
`rotation_rules`, `scoring`), **12 tests unitaires** sous `07_TESTS/unit/`, un adaptateur
`06_RUNTIME/adapters/runtime_loop.gd`, `solvability.gd`, `project.godot`, `main.tscn`.
Outillage : `scripts/forge/dispatch.py` (profil `full_godot`), `scripts/forge/oracles.json`
(enregistrement `tetris`), `scripts/observer/command.py` (correctif, cf. OBSERVER_STATUS).

## TESTS

Suite globale : **200 passés, 8 421 sous-tests passés, 5 échecs**. Les 5 échecs sont
**préexistants et hors périmètre** (studioV2 — lane gelée, ML train, roadmap→ledger, dataset
admission) ; vérifié : aucun de ces fichiers de test ne référence `dispatch`. Deux erreurs de
collecte également préexistantes (`scripts/control_plane/` absent).

## OBSERVER_STATUS

**L'Observer a d'abord planté sur ce run** : `KeyError: 'query'` dans `command.py::view_docloop`.
Cause exacte : `_find_mechanical_consumer` a deux canaux, et le canal n°2 (`artefact_execution`,
ajouté le 2026-08-03 même) renvoie `{canal, citation, source}` là où le rendu supposait la forme du
canal n°1 (`query`/`matchCount`/`ts`). Le canal n°2 n'avait jamais été déclenché ; il l'a été parce
que les 5 leçons Breakout, promues au catalogue le matin même, sont désormais citées dans des
artefacts de run. **Correctif appliqué** : branchement explicite sur le canal déclaré — pas un
`.get()` permissif, qui aurait masqué la provenance.

Après correctif, l'Observer traite le run : **2 048 événements, 28 types**.

| donnée demandée | capté ? | preuve |
|---|---|---|
| agent | OUI | `agent.session` ×20 |
| modèle | OUI | `actor.model` sur chaque `llm.usage` |
| prompt d'étape | PARTIEL | `run.task_prompt` / `dispatch.reasoning` ×19 — la tâche assignée, **pas** le prompt système |
| contexte injecté | OUI | `dispatch.context_manifest` ×28 (porte `contract_sha256`) |
| contrats | OUI | `dispatch.prepared` ×19, `dispatch.tools` ×19 |
| outils | OUI | `tool.call` ×273 / `tool.result` ×273 |
| fichiers lus | OUI | `file.read` ×116 (chemin réel + `tool_use_id`) |
| fichiers écrits | OUI | `file.write` ×43, `file.edit` ×8 |
| tokens | OUI | `llm.usage` ×519 (input/output/cache) |
| durée | OUI | horodatage ISO par événement, `telemetry.step` ×10 |
| artefacts produits | PARTIEL | `artifact.self_declared` ×9 — **auto-déclaré**, pas mécanique |

**Manquent toujours, mesuré sur ce run** : le **prompt système réel** du sous-agent
(`system_prompt` : 0 occurrence) et les **skills chargés** (aucun champ dédié). Ce sont les deux
mêmes trous que sur breakout_v2 — le run Tetris ne les a pas comblés et ne pouvait pas les combler.

**Consommateurs** : inchangé et non résolu — `observer_run.json` et `events.jsonl` sont lus par les
modules `scripts/observer/*` eux-mêmes ; `RECONSTRUCTION.md`, `decisions_normalized.jsonl`,
`planning_PROPOSED.yaml` n'ont **aucun lecteur** hors de ce dossier. Aucun skill ne lance l'Observer.
`events.jsonl` n'est écrit que si l'on passe `--events` — absent par défaut.

## EVIDENCE

- `lab/forge_runs/tetris/verdict.json` — verdict signé HMAC.
- `forge.verify_run` : `INTÉGRITÉ : AUTHENTIQUE`, exit 0, `VERDICT LOGICIEL : FAIL / BLOCKED`.
- `lab/forge_runs/tetris/wiremap_frozen.json` — 9 règles gelées.
- `lab/forge_runs/tetris/state.json` — 14/14 étapes, `run_status: DONE`.
- `lab/reports/observer/tetris/` — 2 048 événements reconstruits.
- Dispatch : 19 préparés, 19 distincts, **19 exécutés, 0 « authorized »**.

## RISKS

1. **`s10a-oracle-code` est web-shaped.** Son échec est `e2e: run-oracle.mjs absent, e2e.mjs absent`.
   Ce sont des artefacts **Node/web** ; un projet Godot ne les produit pas. La garde e2e générique
   demande donc à un jeu Godot des fichiers que son builder n'a aucune raison d'écrire. Tant que ce
   n'est pas traité, `s10a` ne peut pas verdir sur la piste Godot. La mutation, elle, s'est faite en
   « évaluation de forme seule — aucun mutation_result fourni » : elle n'a pas réellement muté.
2. **`s10s-oracle-standard` rouge sur 6 volets** : `collisions`, `genre_coverage`, `index`,
   `line_states`, `observable_coverage`, `placement`. Le volet `collisions` donne la cause la plus
   nette : **14 identifiants inconnus** (`core.game_loop:game.gravity`, `core.piece_bag:game.piece_source`,
   `core.rotation_rules:game.rotation`…). Tetris introduit des capacités que la table figée du
   standard (`scripts/forge/standard/capabilities.yaml`) ne connaît pas. Ce n'est pas un bug du run,
   c'est la loi d'empilement qui fait son travail sur un genre neuf.
   `budget` et `contract_completeness` sont **verts** : le jeu n'a pas débordé son budget.
3. **`line_states` rouge — prédit.** C'est le validateur ratifié le 2026-07-30 comme « validateur
   sans producteur » : il vérifie `EXPECTED` / `ADDITIONS` / `source_role` que **rien n'écrit**.
   Le run le confirme en conditions réelles. Le travail est en amont, pas dans le durcissement.
4. **Red-team dégradé, à nouveau** : `humangate_flags` porte *« reviewer indépendant n'a pas tourné
   (fallback) »*, alors que LM Studio répondait et que `s6-redteam-plan` résout bien vers
   `qwen2.5-14b-instruct`. À instruire — ce flag est identique à celui de Breakout.
5. **`authorized: 0` sur 19 dispatches exécutés** — le compteur d'autorisation de spawn reste à zéro,
   cohérent avec le trou décrit par `DISPATCH_SPAWN_AUTHORITY_V1` (decision-log 2026-07-23), non
   corrigé à ce jour.
6. **Solvabilité non définie.** `tetris` est enregistré dans `oracles.json` **sans bloc
   `solvability`**, délibérément : le marathon n'a pas d'état gagné, et les valeurs de Breakout ne
   devaient pas être recopiées. Le critère de survie reste à trancher (HumanGate).

## NEXT

Rien n'est à relancer en l'état : l'escalade est au tier maximum et la Forge a rendu la main. Les
décisions qui débloquent, par ordre de dépendance : (a) le critère de solvabilité Tetris ; (b) le
sort de la garde e2e générique sur la piste Godot ; (c) l'enregistrement des capacités Tetris dans
la table du standard ; (d) le producteur manquant de `line_states`.

---
*claim_verdict: NO_CLAIM_ALLOWED — aucune affirmation de ce document ne vaut décision. HumanGate Pierre.*
