# Forge — état réel gelé, 2026-07-13

> Source : session du 2026-07-13 (Tier 0 → Tier 2.5), commits `cf6d4f9`..`db5fc95`
> sur `feat/forge-oracle-gate`. Photographie factuelle — pas une roadmap, pas une
> déclaration d'intention. Statuts : **IMPLEMENTED** (code existe) /
> **TESTED** (couvert par des tests automatisés) / **DOCUMENTED_ONLY** (décrit
> mais aucun code) / **BLOCKED** (bloqué par une dépendance ou une limite connue).
> `claim_verdict: NO_CLAIM_ALLOWED` — ce document décrit ce qui existe, il ne
> certifie pas que c'est suffisant pour un usage donné.

## 1. Driver (`scripts/forge/driver.py`)

**Statut : IMPLEMENTED + TESTED.**

Machine à états déterministe, un run = une instance. État persistant
(`state.json`, écriture atomique tmp+replace), reprise après interruption sans
rejouer une étape terminée (OK/FAIL/BLOCKED/SKIPPED). N'exécute jamais de LLM
lui-même — délègue à un `executor(payload, decision, context) -> dict` injecté.

- **Entrée** : `ForgeDriver(project, run_id, run_dir, profile, executor, src_root,
  is_game, oracle_config, key_file, audit_path, telemetry_path,
  builder_runs_path, caps_path, logic_files, mutation_runner,
  mutation_test_argv, mutation_baseline_runner, pool_size)`.
- **Sortie** : `.run() -> dict` — `{status, software_verdict, evidence_verdict,
  claim_verdict, decision, humangate_flags, verdict_path, state_path, reason}`.
- **Contrat executor** : `(payload: DispatchPayload, decision: RouteDecision,
  context: dict) -> {ok: bool, output?: str, blocked?: bool, findings?: list,
  tokens?: int, duration_s?: float, cost_usd?: float, reason?: str}`.
  `context` = `{run_id, project, run_dir, model_override, dispatch_marker,
  attempt, premortem}`.
- **Premier run réel** (pas seulement `StubExecutor`) : `lab/forge_runs/driver_smoke/`
  (`scripts/forge/run_real.py`), profil `patch`, verdict signé vérifié authentique
  par `forge.verify_run` (exit 0).
- **Limite connue** : aucun run réel du profil `full` (13 étapes) n'a encore eu
  lieu — seul `patch` (4 étapes) a été prouvé de bout en bout avec un exécuteur
  réel. Le profil `full` n'est exercé qu'avec `StubExecutor` (tests).
- **Limite connue** : `run_real.py` n'a pas de CLI pour le profil `full` avec
  panel Prisme + tous les contrats en amont (blueprint, wiremap réels) — le
  smoke test panel Prisme (`lab/forge_runs/prisme_smoke/`) appelle
  `forge.panel.panel_prisme_executor` directement, hors `ForgeDriver`.

## 2. Oracle (`scripts/forge/oracle.py`, `gate.py`, `static_oracles.py`)

**Statut : IMPLEMENTED + TESTED.**

- `oracle.py` : résout et exécute la commande déterministe d'un projet
  (`scripts/forge/oracles.json`), timeout actif (300s défaut), capture
  stdout/stderr en évidence.
- `gate.py::forge_gate()` : oracle → verdict signé (`Verdict`), jamais
  ne lève pour un échec opérationnel (toujours un verdict).
- `static_oracles.py` : `check_architecture`, `check_wiremap`,
  `check_feature_set_frozen`, `check_e2e_harness`, `check_reuse_ratio_wired`
  (Tier 1 #2) — tous non-LLM, déterministes, regex/AST.
- **Limite connue (documentée, pas corrigée)** : `check_e2e_harness` et
  `check_reuse_ratio_wired` acceptent un token présent dans une chaîne
  littérale d'exécution (`console.log("__game")`) — acceptable tant que les
  builders Forge ne sont pas adversariaux et que HumanGate reste terminal.

## 3. Escalade de modèle (`scripts/forge/escalate.py`)

**Statut : IMPLEMENTED + TESTED.**

Échelle `haiku -> sonnet -> opus` (familles, jamais de version en dur).
`escalation_decision(current_model, oracle_ok, agent_requested, ...)
-> EscalationDecision(escalate, next_model, reason)`. Cap `MAX_ESCALATIONS=2`.
Au sommet avec échec → pas de boucle, remonte HumanGate.

## 4. Pool de builders (`scripts/forge/pool.py`) — Tier 2 #5

**Statut : IMPLEMENTED + TESTED, PROUVÉ RÉEL (mécanisme, pas via un run `claude -p`
en pool — voir limite).**

Concept A (choisi par Pierre parmi 3) : best-of-N réactif au MÊME tier avant
d'escalader de modèle. `pool_decision(oracle_ok, attempts_at_current_tier,
pool_size=2) -> PoolDecision(retry_same_tier, reason)`. S'insère dans
`ForgeDriver._maybe_escalate` avant `escalation_decision`. `pool_size<=1`
désactive le pool (comportement pré-Tier-2).

- **Prouvé** : `test_pool_rattrape_un_fail_transitoire_sans_escalader_de_modele`
  (oracle FAIL puis OK au même tier, `escalations=0`) — via `StubExecutor`,
  pas un run réel `claude -p` avec un FAIL transitoire réel (aucun tel cas
  n'a été observé naturellement ; le test simule l'aléa via un oracle qui
  échoue une fois par construction).
- **Limite connue** : la réconciliation est purement séquentielle (retry, pas
  de vrai fan-out concurrent de N candidats) — cf. Concept A vs B/C écartés
  pour raison de coût. WFL-01 (labo) n'a jamais été un mécanisme réel — ce
  module ne "promeut" rien de labo, c'est une conception neuve.

## 5. Observabilité du pool (`scripts/forge/studio_link.py`) — Tier 2.5 étape 2

**Statut : IMPLEMENTED + TESTED.**

`record_builder_run()` — un enregistrement par tentative s9-build
(`lab/forge_evidence/forge_builder_runs.jsonl`, propose-only, gitignoré) :
`{task_id, tier, builder_id, strategy, duration_s, oracle_result,
retry_number, tokens_estimated, cost_estimated, ts}`. `pool_stats(run_id)`
agrège : tentatives sauvées par le pool, coût des sauvetages, taux
d'échec par builder.

- **Limite connue** : `escalations_avoided_cost_usd` est une approximation
  (somme des coûts des retries réussis), pas un contrefactuel exact de ce
  qu'une escalade de modèle aurait coûté en plus.
- **Limite connue** : coût réel capturé seulement côté `run_real.py`
  (`total_cost_usd` du CLI `claude -p --output-format json`) — un exécuteur
  tiers qui ne remonte pas `cost_usd` produira des `0.0` silencieux (pas une
  erreur, mais un chiffre trompeur si non su).

## 6. Panel Prisme (`scripts/forge/panel.py`, `scripts/forge/prisme/`) — Tier 2 #6

**Statut : IMPLEMENTED + TESTED + PROUVÉ RÉEL** (3 vrais appels `claude -p`,
`lab/forge_runs/prisme_smoke/`).

`panel_prisme_executor(claude_call, charter_path, run_dir, lenses=LENSES)` —
contrôle (producteur normal du contrat) + N lenses (ceo/game_designer/
front/back/joueur) en contexte vierge, vérifiés par `check_prisme.mjs`
(forme uniquement), recombinés par `merge_prisme.mjs` (union par critère
charter cité, zéro LLM-arbitre). `run_real.py --charter <path>` l'active à
l'étape `s1-prisme`.

- **Architecture formalisée (Tier 2.5 étape 3)** : Builder → Artifact → Prisme
  (détecte, `check_prisme.mjs`) → Oracle réel → Decision Gate. Les findings
  Prisme sont remontés dans `humangate_flags` du verdict signé
  (`verdict.py::build_aggregate_verdict(..., extra_advisory=...)`) mais
  **n'entrent jamais** dans `software_verdict` — même statut que le red-team.
- **Limite connue (héritée de WFL-02, pas corrigée)** : `merge_prisme.mjs`
  n'extrait que les tags STRUCTURÉS de `criteres_succes:` — une exigence qui
  ne vit QUE dans la prose libre (`objectif:`, `hors_scope:`) n'a pas de tag
  et ne peut pas être détectée comme gap.
- **Limite connue** : coûte N+1 appels au lieu de 1, uniquement à `s1-prisme`
  (profil `full`) — décision de coût assumée, jamais cachée.
- **Non fait** : pas de panel équivalent pour `s3-decompo` (la roadmap
  originale visait "s1/s3" ; `check_prisme.mjs`/`merge_prisme.mjs` sont
  spécifiques au format `product_snapshot.md` de s1, pas généralisables à
  s3 sans adaptation).

## 7. Routing runtime (`scripts/forge/runtime.py`, `contract.py`, `dispatch.py`)

**Statut : IMPLEMENTED + TESTED** (préexistant à cette session, vérifié en
passant).

`route_step(payload) -> RouteDecision(runner, reviewer, reason)` — honore
`payload.provider` (`lmstudio`/`claude-local`/`forge`), dégrade proprement
(Qwen down → `claude-blind`, jamais une exception). `prepare_dispatch(etape,
run_id)` = porte unique, contrat validé + audit HMAC. Aucun spawn direct
sans passer par cette porte (disciplinaire + porte Python, pas encore un
hook dur au niveau settings — cf. FORGE_2_DESIGN.md limites v0).

## 8. Manifests / evidence

**Statut : IMPLEMENTED + TESTED.**

- `verdict.json` (par run) : agrégat signé HMAC, re-vérifiable
  (`forge.verify_run`), inclut désormais `extra_advisory` (Prisme) en plus
  du red-team dans `humangate_flags`.
- `state.json` (par run) : machine à états, non signé (éditable) —
  la game-ness et les preuves mutation sont re-dérivées de signaux
  objectifs on-disk à la vérification (P0.3), pas crues du state.
- `lab/forge_evidence/forge_telemetry.jsonl`, `forge_builder_runs.jsonl` :
  propose-only, gitignorés, jamais lus par le calcul du verdict.
- `lab/forge_evidence/dispatch_audit.jsonl` : une ligne HMAC par dispatch.

## Ce qui reste hors de ce snapshot (Tier 3+, non commencé)

- **#7 Art Director + Asset Contract** — DOCUMENTED_ONLY (discuté, rien codé).
  Pierre a noté qu'un `asset_request: {type, style, references, constraints,
  acceptance_tests}` devrait précéder le rôle, sinon Art Director n'est
  "qu'un prompt de plus".
- **#8 Import des 49 rôles externes** — DOCUMENTED_ONLY. Volontairement
  après #7 : 49 rôles × pool × oracle × routing = explosion combinatoire si
  le routing n'est pas stabilisé d'abord (le pool/panel viennent tout juste
  de l'être, cf. §4-6 ci-dessus).
