# Studio Control Index

status: DOCUMENTED_ONLY

## Purpose
This index maps the active Studio Control surfaces after the compact topology migration.

## Active Surfaces
The current top-level Studio Control topology is compact:

- `00_MASTER_DOCS`: master documentation and current-state summaries.
- `01_SYSTEM`: indexes, maps, navigation, registries, boundaries, forms, Codex docs, RAG docs, and related system sources.
- `02_PIPELINE`: pipeline packages, core packages, and bootstrap/profile surfaces.
- `99_ARCHIVE`: archive, records, plans, and status evidence.

Historical direct-prefix folders such as `00_INDEX`, `01_MAPS`, `02_NAVIGATION`, `07_FORMS`, and `10_ROADMAP` are superseded as top-level routing targets. Current nested routes are documented by `99_ARCHIVE/records/STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md`.

## Main Read-First Truth Set
Do not treat all non-archive Markdown as main truth. The practical daily navigation set is this source-backed nucleus:

| Status | Source | Role |
| --- | --- | --- |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/01_SYSTEM/index/READ_FIRST.md` | Studio Control opening order and source-set compression rule. |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/00_MASTER_DOCS/DOCS_STATUS.md` | Current documentation classification anchor. |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/00_MASTER_DOCS/CURRENT_STATE_INDEX.md` | Current-state navigation and demotion index. |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/00_MASTER_DOCS/01_CURRENT_STATE.md` | Current project state summary. |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/00_MASTER_DOCS/03_KNOWN_ISSUES.md` | Canonical active issue list. |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/00_MASTER_DOCS/05_ARCHITECTURE.md` | Architecture authority order and runtime boundary. |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/01_SYSTEM/navigation/STUDIO_SOURCE_ANCHORING_V0.md` | Source-state separation and source loading rules. |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/01_SYSTEM/maps/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` | Output routing and duplicate-prevention authority. |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/01_SYSTEM/index/CONTROL_INDEX.md` | Compact Studio Control topology index. |

## Reference / On-Demand Sources
Most contracts, forms, registries, policies, passive specs, and roadmaps are on-demand reference sources.

Secondary reference docs:
- `00_STUDIO_CONTROL/00_MASTER_DOCS/00_EXEC_SUMMARY.md`
- `00_STUDIO_CONTROL/00_MASTER_DOCS/02_COMMAND_CHEATSHEET.md`
- `00_STUDIO_CONTROL/00_MASTER_DOCS/06_DECISION_LOG.md`
- `00_STUDIO_CONTROL/00_MASTER_DOCS/07_PROJECT_HISTORY.md`
- `00_STUDIO_CONTROL/00_MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md`

Temporary task reports and Codex audit reports remain task-specific unless HumanGate promotes them.

## Agentic Pyramid Sources
- `01_MAPS/STUDIO_AGENTIC_PYRAMID_ARCHITECTURE_V0.md`: Studio-wide agentic architecture plan; status `DOCUMENTED_ONLY`; runtime authority `NONE`.
- `10_ROADMAP/STUDIO_AGENTIC_PYRAMID_ACTIVATION_ROADMAP_V0.md`: activation roadmap; status `DOCUMENTED_ONLY`; activation authority `BLOCKED` unless separately approved by HumanGate.

## Routing Authority
Use `01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` for output placement and duplicate prevention. Use `02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md` for source registration, loading, enforcement, and evidence.

Current compact paths:
- `01_SYSTEM/maps/STUDIO_OUTPUT_ROUTING_POLICY_V0.md`
- `01_SYSTEM/navigation/STUDIO_SOURCE_ANCHORING_V0.md`

Older direct-prefix paths remain historical drift unless a task explicitly reads and verifies them.

## Local-Only Control Room Policy

`00_STUDIO_CONTROL/` is the local-only control cockpit by HumanGate decision. It is intentionally untracked and GitHub presence is not expected.

`?? 00_STUDIO_CONTROL/` in `git status --short` is `INFO_ONLY` and `PASSIVE`; it is not a critical GitHub sync defect. Do not `git add`, commit, push, or otherwise track the local control room unless HumanGate explicitly authorizes that later.

Local cleanliness remains strict: duplicate docs, placeholder records, invalid statuses, unrouted local control files, missing owner/consumer/route evidence, runtime edits, test or CI edits, and model/dataset/LoRA edits remain blocked or unknown according to the status taxonomy.

## Control Room Entry Point

This index is the control-room entrypoint for the LLM -> Codex -> LLM -> Codex documentation loop. A separate `CONTROL_ROOM.md` was not created because this file already owns the routed `00_INDEX` entrypoint role and the noise gate blocks duplicate entrypoint documents.

| Question | Go to | Purpose |
| --- | --- | --- |
| What is the repo world map? | `01_MAPS/STUDIO_MAP.md` | Surface-separated map and known gaps. |
| Which files are registered for the loop? | `03_REGISTRIES/FILE_REGISTRY.yaml` | File route, owner, consumer, status, and evidence. |
| Which agents may participate? | `03_REGISTRIES/AGENT_REGISTRY.yaml` | Agent read/write limits and launch blockers. |
| Which loops are registered? | `03_REGISTRIES/LOOP_REGISTRY.yaml` | Loop sequence, routing, and blocked conditions. |
| What is the current truth snapshot? | `05_STATUS/REPO_TRUTH_SNAPSHOT.yaml` | Machine-readable status by surface. |
| What hygiene or floating items exist? | `04_BOUNDARIES/REPO_HYGIENE.md` | Hygiene rules, floating-item report, and noise-gate blocks. |
| Which claims are allowed or blocked? | `04_BOUNDARIES/CLAIMS_LEDGER.yaml` | Evidence-bound claim ledger. |
| What is the teacher loop? | `06_CODEX/LLM_CODEX_LOOP_V0.md` | Local LLM candidate, Codex teacher, retry, final validation, and HumanGate. |
| Which roadmap docs exist? | `10_ROADMAP/ROADMAP_INDEX.md` | Roadmap-only grouping. |
| Which architecture plans exist? | `01_MAPS/ARCHITECTURE_PLANS_INDEX.md` | Architecture-plan grouping. |

## Launch Rule For Agents And Loops

No agent or loop may be launched from a name in conversation alone. The agent or loop must be registered, routed, owner/consumer/status/evidence fields must be present, and HumanGate remains final authority. Local LLM outputs are candidate-only. Codex teacher corrections and final validation are evidence-bound and do not become final truth without evidence and HumanGate review.

## Status Legend

Use only `IMPLEMENTED`, `TESTED`, `DOCUMENTED_ONLY`, `PASSIVE`, `BLOCKED`, `NOT_FOUND`, and `UNKNOWN`. `UNKNOWN => BLOCKED` for any action with effects.

For control-room coherence work, documentation, policy, registry, template, roadmap, and plan edits are `DOCUMENTED_ONLY`. `IMPLEMENTED` requires active runtime code evidence. `TESTED` requires validation or test evidence for the relevant surface and must not be inferred from file existence alone.

Surface reporting must stay separated across active runtime code, tests, runtime outputs, canonical docs, roadmap docs only, and inference.

Classic/Rocky runtime claims require code/test evidence, not docs-only evidence.

`no_global_ready_verdict: true`

For source-state work:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

Created != registered != loaded != enforced != evidenced.

Canonical internal surfaces must remain stable. Report labels such as `runtime_outputs` may summarize the canonical `artifacts_runtime_outputs` surface, but aliases do not create new surfaces unless an explicit mapping is added to the routing policy and registries.

`03_REGISTRIES/FILE_REGISTRY.yaml` is the route, owner, consumer, status, and evidence authority for registered control-room files when a file body does not repeat all metadata locally.

## Noise Gate Summary

Block any action that creates a file without route, owner, consumer, status, evidence, registry/index link, or a declared reason for existence. Duplicate maps, duplicate truth snapshots, unindexed roadmap or architecture docs, unregistered agents, unregistered loops, unregistered outputs, and unsupported claims are `BLOCKED`.

## Floating Items Summary

Floating items are repo or workflow elements lacking route, owner, consumer, status, evidence, or reason for existence. They are reported in `04_BOUNDARIES/REPO_HYGIENE.md`; destructive cleanup, moves, deletion, and archiving remain blocked unless separately authorized by HumanGate.

## Non-Active Sources
Do not treat snapshots, imports, backups, archives, or legacy folders as active sources unless a later HumanGate task explicitly promotes them.
