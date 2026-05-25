# Studio Control Index

status: DOCUMENTED_ONLY

## Purpose
This index maps the active Studio Control surfaces after the unique-prefix migration.

## Active Surfaces
- `00_INDEX`: entrypoints and status legend.
- `01_MAPS`: maps, topology, routing, and path contracts.
- `02_NAVIGATION`: source anchoring and navigator rules.
- `03_REGISTRIES`: registries.
- `04_BOUNDARIES`: guardrails and boundaries.
- `05_STATUS`: status and migration records.
- `06_CODEX`: Codex operating documents.
- `07_FORMS`: AutoDev contracts and templates.
- `08_MIGRATION`: migration runbooks and future cleanup plans.
- `09_CYBERDEFENSE`: CyberSentinel control documents.
- `10_ROADMAP`: roadmap-only documents.
- `11_PIPELINE_CORE`: generic pipeline core package.
- `12_PIPELINE_OPENING_LEGACY`: PASSIVE legacy traceability.
- `13_BOOTSTRAP_PROFILES`: machine-specific bootstrap profiles.

## Agentic Pyramid Sources
- `01_MAPS/STUDIO_AGENTIC_PYRAMID_ARCHITECTURE_V0.md`: Studio-wide agentic architecture plan; status `DOCUMENTED_ONLY`; runtime authority `NONE`.
- `10_ROADMAP/STUDIO_AGENTIC_PYRAMID_ACTIVATION_ROADMAP_V0.md`: activation roadmap; status `DOCUMENTED_ONLY`; activation authority `BLOCKED` unless separately approved by HumanGate.

## Routing Authority
Use `01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` for output placement and duplicate prevention. Use `02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md` for source registration, loading, enforcement, and evidence.

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

Canonical internal surfaces must remain stable. Report labels such as `runtime_outputs` may summarize the canonical `artifacts_runtime_outputs` surface, but aliases do not create new surfaces unless an explicit mapping is added to the routing policy and registries.

`03_REGISTRIES/FILE_REGISTRY.yaml` is the route, owner, consumer, status, and evidence authority for registered control-room files when a file body does not repeat all metadata locally.

## Noise Gate Summary

Block any action that creates a file without route, owner, consumer, status, evidence, registry/index link, or a declared reason for existence. Duplicate maps, duplicate truth snapshots, unindexed roadmap or architecture docs, unregistered agents, unregistered loops, unregistered outputs, and unsupported claims are `BLOCKED`.

## Floating Items Summary

Floating items are repo or workflow elements lacking route, owner, consumer, status, evidence, or reason for existence. They are reported in `04_BOUNDARIES/REPO_HYGIENE.md`; destructive cleanup, moves, deletion, and archiving remain blocked unless separately authorized by HumanGate.

## Non-Active Sources
Do not treat snapshots, imports, backups, archives, or legacy folders as active sources unless a later HumanGate task explicitly promotes them.
