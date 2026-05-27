# Studio Control Topology Migration V1

Status: DOCUMENTED_ONLY
Scope: 00_STUDIO_CONTROL compact topology status
Runtime authority: NONE
Agent activation: BLOCKED
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Model promotion: BLOCKED
Chess960 activation: BLOCKED
DecisionController activation: BLOCKED
Claim posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true

---

## 1. Purpose

This record documents the current compact physical topology of `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL` after the earlier Studio Control topology migration.

The current top-level routing surface is compact:

- `00_MASTER_DOCS`
- `01_SYSTEM`
- `02_PIPELINE`
- `99_ARCHIVE`

This record supersedes stale descriptions that present direct root folders such as `00_INDEX`, `01_MAPS`, `02_NAVIGATION`, `07_FORMS`, or `10_ROADMAP` as current top-level Studio Control targets.

This record is documentation and routing evidence only. It does not authorize runtime implementation, tests, ML changes, training, benchmarks, dataset generation or reset, model or checkpoint creation, model promotion, agent activation, Chess960 activation, DecisionController activation, staging, commits, pushes, branch creation, or pull requests.

---

## 2. Current Compact Top-Level Topology

| Directory | Current role | Status |
| --- | --- | --- |
| `00_MASTER_DOCS` | Master documentation and current-state summaries | DOCUMENTED_ONLY |
| `01_SYSTEM` | System policies, maps, navigation, forms, boundaries, registries, codex docs, RAG docs, and related control sources | DOCUMENTED_ONLY |
| `02_PIPELINE` | Pipeline packages and bootstrap/core pipeline surfaces | DOCUMENTED_ONLY |
| `99_ARCHIVE` | Archive, records, plans, and status evidence | DOCUMENTED_ONLY |

Current visible disk evidence shows these as the only top-level directories under `00_STUDIO_CONTROL` for this status update.

---

## 3. Current Nested Source Anchors

The current source anchors are nested under the compact topology. Future routing and source-anchoring work must use these nested paths unless a later HumanGate routing decision changes them.

| Anchor | Current path | Status |
| --- | --- | --- |
| Source anchoring | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/navigation/STUDIO_SOURCE_ANCHORING_V0.md` | DOCUMENTED_ONLY |
| Studio output routing policy | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/maps/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` | DOCUMENTED_ONLY |
| AutoDev I/O contract | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md` | DOCUMENTED_ONLY |
| Task charter template | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/TASK_CHARTER_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY |
| Executor report template | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/EXECUTOR_REPORT_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY |
| Analysis agent record template | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/ANALYSIS_AGENT_RECORD_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY |
| Topology migration status | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/99_ARCHIVE/records/STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md` | DOCUMENTED_ONLY |

Archive and status evidence for this migration record now routes through `99_ARCHIVE/records`.

---

## 4. Superseded Topology

The following direct-prefix folders are historical context only and must not be treated as current top-level Studio Control routing targets:

| Superseded direct root target | Current compact route | Status |
| --- | --- | --- |
| `00_INDEX` | `01_SYSTEM/index` or `00_MASTER_DOCS` depending on document class | DOCUMENTED_ONLY |
| `01_MAPS` | `01_SYSTEM/maps` | DOCUMENTED_ONLY |
| `02_NAVIGATION` | `01_SYSTEM/navigation` | DOCUMENTED_ONLY |
| `03_REGISTRIES` | `01_SYSTEM/registries` | DOCUMENTED_ONLY |
| `04_BOUNDARIES` | `01_SYSTEM/boundaries` | DOCUMENTED_ONLY |
| `05_STATUS` | `99_ARCHIVE/records` for status records, unless a later routing decision says otherwise | DOCUMENTED_ONLY |
| `06_CODEX` | `01_SYSTEM/codex` | DOCUMENTED_ONLY |
| `07_FORMS` | `01_SYSTEM/forms` | DOCUMENTED_ONLY |
| `08_MIGRATION` | `99_ARCHIVE/records` or `99_ARCHIVE/plans` depending on evidence or plan class | DOCUMENTED_ONLY |
| `09_CYBERDEFENSE` | `01_SYSTEM/cyberdefense` | DOCUMENTED_ONLY |
| `10_ROADMAP` | `99_ARCHIVE/plans` or another HumanGate-approved roadmap destination | DOCUMENTED_ONLY |
| `11_PIPELINE_CORE` | `02_PIPELINE/core` | DOCUMENTED_ONLY |
| `12_PIPELINE_OPENING_LEGACY` | Historical/passive archive or pipeline route only when explicitly scoped | PASSIVE |
| `13_BOOTSTRAP_PROFILES` | `02_PIPELINE/bootstrap` | DOCUMENTED_ONLY |

Old direct-root path references in stale docs are document drift until refreshed by a scoped docs task. They do not override live disk topology or current source-index references.

---

## 5. Current Routing Implication

Future Studio Control outputs must route through the compact topology unless a later HumanGate routing decision says otherwise.

Required routing posture:

- source anchoring and navigation docs route through `01_SYSTEM/navigation`;
- maps, routing, topology, and path contracts route through `01_SYSTEM/maps`;
- AutoDev contracts and templates route through `01_SYSTEM/forms`;
- boundaries and guardrails route through `01_SYSTEM/boundaries`;
- registries route through `01_SYSTEM/registries`;
- status evidence and archive records route through `99_ARCHIVE/records`;
- activation roadmaps or future plans route through an explicitly approved archive or plan route.

Created, registered, loaded, enforced, and evidenced remain separate states:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

A file path appearing in this record does not by itself prove project-source loading, runtime enforcement, activation, promotion, or claim validation.

---

## 6. Path Rewrite Scope

This status update corrects the topology record only.

It does not update GPT Navigator files, source indexes, routing policies, source-anchoring docs, templates, runtime code, tests, ML code, datasets, models, generated outputs, branches, pull requests, commits, or pushes.

Any remaining stale direct-root references outside this file require a separate scoped HumanGate task.

---

## 7. Validation Summary

Required validation for this documentation-only status update:

- confirm target file exists before update;
- confirm only one matching target file exists under `00_STUDIO_CONTROL`;
- inspect current `00_STUDIO_CONTROL` disk topology;
- read back the updated target file;
- verify required topology and non-authorization terms are present;
- run `git diff --check`;
- verify only the target file changed relative to pre-existing worktree status.

Detailed command evidence belongs in the executor final report.

---

## 8. Blocked Actions

This migration record update does not authorize:

- runtime code changes;
- test changes;
- ML or dataset code changes;
- runtime execution;
- test execution;
- training;
- benchmarks;
- performance runs as proof;
- dataset generation or reset;
- `latest.json` creation;
- lab run creation;
- model or checkpoint creation;
- model promotion;
- agent activation;
- Chess960 activation;
- DecisionController activation;
- staging;
- commit;
- push;
- branch creation;
- pull request creation;
- network access;
- Git fetch;
- broad refactors;
- historical snapshot rewriting.

---

## 9. Final Verdicts

software_verdict:

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: DOCUMENTED_ONLY
- roadmap_docs_only: PASSIVE
- inference: PASSIVE

evidence_verdict:

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: TESTED
- roadmap_docs_only: PASSIVE
- inference: PASSIVE

claim_verdict:

- active_runtime_code: NO_CLAIM_ALLOWED
- tests: NO_CLAIM_ALLOWED
- artifacts_runtime_outputs: NO_CLAIM_ALLOWED
- canonical_docs: NO_CLAIM_ALLOWED
- roadmap_docs_only: NO_CLAIM_ALLOWED
- inference: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
